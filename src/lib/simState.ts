import { DisasterScenario, EvacuationAgent, SimulationState } from '../types/simulation';
import { INITIAL_CITY_NODES, INITIAL_ROAD_EDGES, INITIAL_SHELTERS } from '../data/greenfieldCity';
import { generatePopulation, stepSimulation } from './simulationEngine';
import { initializeRescueFleet, stepRescueFleet } from './rescueService';
import { autoDispatchRescue } from './rescueDispatch';

export type LogKind = 'info' | 'warn' | 'dispatch' | 'success' | 'alert';

export interface LogEntry {
  id: number;
  timeSec: number;
  kind: LogKind;
  text: string;
}

export interface Sim {
  state: SimulationState;
  log: LogEntry[];
  seq: number;
  autoDispatch: boolean;
}

export interface AgentCounts {
  total: number;
  evacuated: number;
  moving: number;
  waiting: number;
  trapped: number;
  rerouting: number;
}

export function countAgents(agents: EvacuationAgent[]): AgentCounts {
  const c: AgentCounts = { total: agents.length, evacuated: 0, moving: 0, waiting: 0, trapped: 0, rerouting: 0 };
  for (const a of agents) {
    if (a.status === 'evacuated') c.evacuated++;
    else if (a.status === 'moving') c.moving++;
    else if (a.status === 'waiting') c.waiting++;
    else if (a.status === 'trapped') c.trapped++;
    else if (a.status === 'rerouting') c.rerouting++;
  }
  return c;
}

export function buildSim(scenario: DisasterScenario, seed: number, speed: number, autoDispatch = true): Sim {
  const roads = INITIAL_ROAD_EDGES.map((e) => {
    const isBlocked = scenario.blockedRoadIds.includes(e.id);
    return {
      ...e,
      isBlocked,
      status: isBlocked ? ('blocked' as const) : ('open' as const),
      isContraFlow: scenario.strategy.useContraFlow && (e.roadType === 'arterial' || e.roadType === 'highway'),
      currentLoad: 0,
      congestionRatio: 0,
    };
  });
  const { agents, updatedShelters } = generatePopulation(scenario, INITIAL_CITY_NODES, roads, INITIAL_SHELTERS, seed);

  return {
    state: {
      scenario,
      status: 'idle',
      elapsedSec: 0,
      speedMultiplier: speed,
      agents,
      shelters: updatedShelters,
      roads,
      nodes: INITIAL_CITY_NODES,
      activeBottlenecks: [],
      recentHistory: [],
      isDeterministic: true,
      randomSeed: seed,
      rescueUnits: initializeRescueFleet(INITIAL_CITY_NODES),
      activeSafeRoute: null,
    },
    log: [{ id: 0, timeSec: 0, kind: 'info', text: `Scenario loaded: ${scenario.title}. ${agents.length} residents registered.` }],
    seq: 1,
    autoDispatch,
  };
}

export function appendLog(sim: Sim, entries: { kind: LogKind; text: string }[]): Sim {
  if (entries.length === 0) return sim;
  let seq = sim.seq;
  const added = entries.map((e) => ({ ...e, id: seq++, timeSec: Math.round(sim.state.elapsedSec) }));
  return { ...sim, seq, log: [...added.reverse(), ...sim.log].slice(0, 120) };
}

export function isRescueBusy(sim: Sim): boolean {
  const units = sim.state.rescueUnits ?? [];
  if (units.some((u) => u.status !== 'idle')) return true;
  return sim.autoDispatch && units.length > 0 && sim.state.agents.some((a) => a.status === 'trapped');
}

/**
 * Advances evacuation and rescue fleet by one real-time tick.
 */
export function advanceSim(sim: Sim, dtSec: number): Sim {
  let state = sim.state;
  const logs: { kind: LogKind; text: string }[] = [];

  if (state.status === 'running') {
    const before = new Set(state.activeBottlenecks.map((b) => b.edgeId));
    state = stepSimulation(state, dtSec).nextState;
    for (const b of state.activeBottlenecks) {
      if (!before.has(b.edgeId)) {
        logs.push({ kind: 'warn', text: `Bottleneck on ${b.roadName}: ${b.queueLength} vehicles queued (${Math.round(b.densityRatio * 100)}% load).` });
      }
    }
    if (state.status === 'completed') {
      const c = countAgents(state.agents);
      logs.push({ kind: 'success', text: `Evacuation complete: ${c.evacuated} reached shelters, ${c.trapped} awaiting rescue.` });
    }
  } else if (state.status !== 'completed') {
    return sim;
  }

  const effectiveDt = dtSec * state.speedMultiplier;
  let units = state.rescueUnits ?? [];
  let agents = state.agents;
  const shelters = state.shelters.map((s) => ({ ...s }));

  if (sim.autoDispatch) {
    const r = autoDispatchRescue(units, agents, state.nodes, state.roads, shelters, state.scenario.hazard);
    units = r.units;
    r.messages.forEach((text) => logs.push({ kind: 'dispatch', text }));
  }

  const stepped = stepRescueFleet(units, effectiveDt, state.nodes, shelters);
  const finalUnits = stepped.map((u, i) => {
    const prev = units[i];
    if (prev.status === 'dispatched' && u.status === 'transporting') {
      // Pick up trapped evacuees at the scene
      let picked = 0;
      agents = agents.map((a) => {
        if (picked < u.maxCapacity && a.status === 'trapped' && a.currentNodeId === prev.targetNodeId) {
          picked++;
          return { ...a, status: 'evacuated' as const, targetShelterId: u.assignedShelterId };
        }
        return a;
      });
      const shelterName = shelters.find((s) => s.id === u.assignedShelterId)?.name ?? 'shelter';
      logs.push({
        kind: picked > 0 ? 'alert' : 'info',
        text: picked > 0
          ? `${u.callSign} on scene: ${picked} evacuee(s) loaded, en route to ${shelterName}.`
          : `${u.callSign} swept ${prev.targetDescription.split(' at ').pop()}: no casualties found. Returning.`,
      });
      return { ...u, patientsCarried: picked };
    }
    if (prev.status === 'transporting' && u.status === 'idle' && prev.patientsCarried > 0) {
      logs.push({ kind: 'success', text: u.logMessage });
    }
    return u;
  });

  return appendLog({ ...sim, state: { ...state, agents, shelters, rescueUnits: finalUnits } }, logs);
}

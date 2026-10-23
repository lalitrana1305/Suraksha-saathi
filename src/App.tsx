import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DisasterScenario, SimulationRunResult } from './types/simulation';
import { advanceSim, appendLog, buildSim, countAgents, isRescueBusy, Sim } from './lib/simState';
import { calculateUserSafeRoute } from './lib/safeRouteService';
import { dispatchUnitToNode } from './lib/rescueDispatch';
import { buildRunResult, deleteScenario, getStoredResults, getStoredScenarios, saveScenario, saveSimulationResult, exportTimelineAsCSV } from './lib/storage';
import { soundEffects } from './lib/soundEffects';
import { CityMap } from './components/CityMap';
import { BottleneckList, KpiRow, ShelterList, TimelineChart } from './components/StatsPanels';
import { EventLog, HistoryPanel, RescuePanel, SafeRoutePanel } from './components/OpsPanels';
import { ScenarioList, StrategyPanel } from './components/ScenarioPanel';
import { formatTime, Panel } from './components/ui';

const SPEEDS = [1, 2, 5, 10];
type Tab = 'route' | 'rescue' | 'log' | 'history';

export default function App() {
  const [scenarios, setScenarios] = useState<DisasterScenario[]>(() => getStoredScenarios());
  const [results, setResults] = useState<SimulationRunResult[]>(() => getStoredResults());
  const [draft, setDraft] = useState<DisasterScenario>(() => scenarios[0]);
  const [speed, setSpeed] = useState(2);
  const [sim, setSim] = useState<Sim>(() => buildSim(scenarios[0], 42, 2));
  const [origin, setOrigin] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('route');
  const savedRef = useRef(false);

  const { state } = sim;
  const locked = state.status !== 'idle';

  const load = useCallback(
    (s: DisasterScenario) => {
      savedRef.current = false;
      setDraft(s);
      setSim((prev) => buildSim(s, 42, speed, prev.autoDispatch));
    },
    [speed]
  );

  // Rebuild population when the draft changes before a run starts
  useEffect(() => {
    if (!locked) setSim((prev) => buildSim(draft, 42, speed, prev.autoDispatch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    const active = state.status === 'running' || (state.status === 'completed' && isRescueBusy(sim));
    if (!active) return;
    const id = setInterval(() => setSim((s) => advanceSim(s, 0.25)), 100);
    return () => clearInterval(id);
  }, [state.status, sim]);

  useEffect(() => {
    if (state.status === 'completed' && !savedRef.current) {
      savedRef.current = true;
      saveSimulationResult(buildRunResult(state));
      setResults(getStoredResults());
      soundEffects.playSuccessComplete();
    }
  }, [state]);

  const safeRoute = useMemo(
    () => (origin ? calculateUserSafeRoute(origin, state.nodes, state.roads, state.shelters, state.scenario.hazard) : null),
    [origin, state.nodes, state.roads, state.shelters, state.scenario.hazard]
  );
  const mapState = useMemo(() => ({ ...state, activeSafeRoute: safeRoute }), [state, safeRoute]);
  const counts = countAgents(state.agents);
  const avgSpeed = state.recentHistory.at(-1)?.averageSpeedKmh ?? 0;

  const toggleRoad = (ids: string[]) => {
    soundEffects.playRoadToggled();
    if (!locked) {
      const blocked = ids.some((id) => draft.blockedRoadIds.includes(id));
      setDraft({ ...draft, blockedRoadIds: blocked ? draft.blockedRoadIds.filter((id) => !ids.includes(id)) : [...draft.blockedRoadIds, ...ids] });
      return;
    }
    setSim((s) => {
      const roads = s.state.roads.map((r) => (ids.includes(r.id) ? { ...r, isBlocked: !r.isBlocked } : r));
      const r = roads.find((x) => ids.includes(x.id))!;
      return appendLog({ ...s, state: { ...s.state, roads } }, [{ kind: 'warn', text: `${r.name} ${r.isBlocked ? 'closed' : 'reopened'} by command.` }]);
    });
  };

  const toggleShelter = (id: string) => {
    const ids = draft.activeShelterIds.includes(id) ? draft.activeShelterIds.filter((x) => x !== id) : [...draft.activeShelterIds, id];
    setDraft({ ...draft, activeShelterIds: ids });
  };

  const startPause = () => {
    if (state.status === 'running') {
      soundEffects.playPause();
      setSim((s) => ({ ...s, state: { ...s.state, status: 'paused' } }));
    } else if (state.status !== 'completed') {
      soundEffects.playStartAlert();
      setSim((s) => ({ ...s, state: { ...s.state, status: 'running' } }));
    }
  };

  const changeSpeed = (v: number) => {
    setSpeed(v);
    setSim((s) => ({ ...s, state: { ...s.state, speedMultiplier: v } }));
  };

  const dispatchSweep = (unitId: string) => {
    setSim((s) => {
      const units = s.state.rescueUnits ?? [];
      const hz = s.state.scenario.hazard;
      const target = [...s.state.nodes]
        .filter((n) => n.type !== 'shelter')
        .sort((a, b) => Math.hypot(a.position.x - hz.epicenter.x, a.position.y - hz.epicenter.y) - Math.hypot(b.position.x - hz.epicenter.x, b.position.y - hz.epicenter.y))[0];
      const unit = units.find((u) => u.id === unitId);
      if (!unit || !target) return s;
      const d = dispatchUnitToNode(unit, target.id, s.state.nodes, s.state.roads, s.state.shelters, hz, 'Hazard zone sweep');
      if (!d) return appendLog(s, [{ kind: 'warn', text: `${unit.callSign}: no passable route to ${target.name}.` }]);
      soundEffects.playDispatchChime();
      return appendLog({ ...s, state: { ...s.state, rescueUnits: units.map((u) => (u.id === unitId ? d : u)) } }, [{ kind: 'dispatch', text: d.logMessage }]);
    });
  };

  const saveCustom = () => {
    const custom: DisasterScenario = { ...draft, id: `custom-${Date.now()}`, title: `${draft.title} (custom)`, isPreset: false, createdAt: new Date().toISOString() };
    saveScenario(custom);
    setScenarios(getStoredScenarios());
    setDraft(custom);
  };

  const removeScenario = (id: string) => {
    deleteScenario(id);
    const all = getStoredScenarios();
    setScenarios(all);
    if (draft.id === id) load(all[0]);
  };

  const tabs: [Tab, string][] = [['route', 'Safe route'], ['rescue', 'Rescue fleet'], ['log', 'Event log'], ['history', 'Run history']];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Suraksha Saathi</h1>
          <p className="text-xs text-slate-500">Simulate today. Save lives tomorrow.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl tabular-nums text-slate-200">T+{formatTime(state.elapsedSec)}</span>
          <div className="flex rounded-lg bg-slate-900 p-1">
            {SPEEDS.map((v) => (
              <button key={v} type="button" onClick={() => changeSpeed(v)} className={`rounded-md px-2.5 py-1 font-mono text-xs ${speed === v ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>
                {v}×
              </button>
            ))}
          </div>
          <button type="button" onClick={startPause} disabled={state.status === 'completed'} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40">
            {state.status === 'running' ? 'Pause' : state.status === 'paused' ? 'Resume' : state.status === 'completed' ? 'Completed' : 'Start evacuation'}
          </button>
          <button type="button" onClick={() => load(draft)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500">
            Reset
          </button>
          <button type="button" disabled={state.recentHistory.length === 0} onClick={() => exportTimelineAsCSV('suraksha-timeline.csv', state.recentHistory)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-slate-500 disabled:opacity-40">
            CSV
          </button>
        </div>
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[300px_1fr_320px]">
        <div className="space-y-4">
          <ScenarioList scenarios={scenarios} activeId={draft.id} onSelect={load} onDelete={removeScenario} locked={locked} />
          <StrategyPanel scenario={draft} locked={locked} onChange={setDraft} onSave={saveCustom} />
        </div>

        <div className="space-y-4">
          <div className="aspect-[10/7] overflow-hidden rounded-xl border border-slate-800">
            <CityMap state={mapState} safeRouteOrigin={origin} editable={!locked} onToggleRoad={toggleRoad} onToggleShelter={toggleShelter} onSelectNode={(id) => { setOrigin(id); setTab('route'); }} />
          </div>
          <section className="rounded-xl border border-slate-800 bg-slate-900/70">
            <nav className="flex gap-1 border-b border-slate-800 px-2">
              {tabs.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={`border-b-2 px-3 py-2.5 text-sm ${tab === id ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </nav>
            <div className="p-4">
              {tab === 'route' && <SafeRoutePanel state={mapState} origin={origin} onOriginChange={setOrigin} />}
              {tab === 'rescue' && (
                <RescuePanel
                  units={state.rescueUnits ?? []}
                  autoDispatch={sim.autoDispatch}
                  onAutoDispatchChange={(v) => setSim((s) => ({ ...s, autoDispatch: v }))}
                  onDispatch={dispatchSweep}
                  canDispatch={locked}
                />
              )}
              {tab === 'log' && <EventLog log={sim.log} />}
              {tab === 'history' && <HistoryPanel results={results} />}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <Panel title="Live status">
            <KpiRow counts={counts} avgSpeed={avgSpeed} />
          </Panel>
          <TimelineChart history={state.recentHistory} />
          <BottleneckList state={state} />
          <ShelterList state={state} />
        </div>
      </main>
    </div>
  );
}

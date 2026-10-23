import {
  DisasterScenario,
  CityNode,
  RoadEdge,
  Shelter,
  EvacuationAgent,
  BottleneckEvent,
  SimulationSnapshot,
  SimulationState,
  HazardZone,
} from '../types/simulation';
import { assignBestShelter, findShortestPath } from './dijkstra';

// Seeded pseudorandom number generator for deterministic simulations
export class SimpleRNG {
  private m = 0x80000000; // 2**31
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextFloat(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  range(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  choice<T>(items: T[]): T {
    const idx = Math.floor(this.nextFloat() * items.length);
    return items[idx];
  }
}

/**
 * Generates synthetic population of agents distributed realistically across neighborhoods
 */
export function generatePopulation(
  scenario: DisasterScenario,
  nodes: CityNode[],
  edges: RoadEdge[],
  shelters: Shelter[],
  seed: number = 42
): { agents: EvacuationAgent[]; updatedShelters: Shelter[] } {
  const rng = new SimpleRNG(seed);
  const agents: EvacuationAgent[] = [];

  // Reset shelter assigned counts
  const updatedShelters = shelters.map((s) => ({
    ...s,
    currentOccupancy: 0,
    assignedCount: 0,
    isOpen: scenario.activeShelterIds.includes(s.id),
  }));

  // Identify residential and commercial starting nodes (exclude dedicated shelters initially)
  const candidateStartNodes = nodes.filter(
    (n) => n.type === 'intersection' || n.type === 'neighborhood' || n.type === 'transit_hub'
  );

  // Weight nodes in hazard affected zones higher to represent vulnerable origin zones
  const weightedNodes: CityNode[] = [];
  for (const node of candidateStartNodes) {
    let weight = 2;
    if (scenario.hazard.affectedNeighborhoods.includes(node.neighborhoodId)) {
      weight = 6; // higher risk zone has more evacuees needing egress
    }
    for (let w = 0; w < weight; w++) {
      weightedNodes.push(node);
    }
  }

  const { standardPercent, reducedMobilityPercent, familyGroupsPercent } = scenario.mobilityBreakdown;

  for (let i = 0; i < scenario.populationSize; i++) {
    const startNode = rng.choice(weightedNodes);

    // Determine mobility category
    const roll = rng.range(0, 100);
    let mobilityCategory: EvacuationAgent['mobilityCategory'] = 'standard';
    let baseSpeedMps = rng.range(10.5, 13.5); // ~38-48 km/h vehicle speed

    if (roll < reducedMobilityPercent) {
      mobilityCategory = 'reduced';
      baseSpeedMps = rng.range(4.5, 7.0); // slower transit/elderly driving or walking
    } else if (roll < reducedMobilityPercent + familyGroupsPercent) {
      mobilityCategory = 'group_family';
      baseSpeedMps = rng.range(8.0, 10.5); // moderate family vehicle
    } else if (roll > 92) {
      mobilityCategory = 'rapid';
      baseSpeedMps = rng.range(14.0, 16.5); // rapid motorcycle or emergency vehicle
    }

    // Staggered departure delay (simulating awareness and packing time)
    // S-curve distribution: early alert (0-30s), main wave (30-90s), stragglers (90-180s)
    let departureDelaySec = 0;
    if (scenario.strategy.staggeredEvacuation) {
      // In staggered strategy, hazardous zones evacuate immediately, others wait
      const isUrgent = scenario.hazard.affectedNeighborhoods.includes(startNode.neighborhoodId);
      departureDelaySec = isUrgent ? rng.range(5, 35) : rng.range(45, 140);
    } else {
      // Uncontrolled simultaneous surge
      departureDelaySec = rng.range(5, 75);
    }

    // Find best shelter assignment
    const assignment = assignBestShelter(
      startNode.id,
      updatedShelters,
      nodes,
      edges,
      scenario.strategy.shelterAssignmentAlgorithm,
      scenario.hazard,
      scenario.strategy.useContraFlow
    );

    if (assignment) {
      const { shelter, route } = assignment;
      shelter.assignedCount += 1;

      agents.push({
        id: `agent-${i + 1}`,
        startNodeId: startNode.id,
        currentNodeId: startNode.id,
        targetShelterId: shelter.id,
        status: 'waiting',
        mobilityCategory,
        baseSpeedMps,
        currentSpeedMps: baseSpeedMps,
        currentEdgeId: route.edgeIds[0] || undefined,
        progressOnEdge: 0.0,
        route: route.nodeIds,
        routeEdgeIds: route.edgeIds,
        currentRouteIndex: 0,
        departureDelaySec: Math.round(departureDelaySec),
        distanceTraveledMeters: 0,
        totalTimeSec: 0,
        delayTimeSec: 0,
        rerouteCount: 0,
      });
    } else {
      // No reachable shelter exists
      agents.push({
        id: `agent-${i + 1}`,
        startNodeId: startNode.id,
        currentNodeId: startNode.id,
        targetShelterId: '',
        status: 'trapped',
        mobilityCategory,
        baseSpeedMps,
        currentSpeedMps: 0,
        progressOnEdge: 0.0,
        route: [],
        routeEdgeIds: [],
        currentRouteIndex: 0,
        departureDelaySec: 0,
        distanceTraveledMeters: 0,
        totalTimeSec: 0,
        delayTimeSec: 0,
        rerouteCount: 0,
      });
    }
  }

  return { agents, updatedShelters };
}

/**
 * Advances the simulation by dtSec seconds
 */
export function stepSimulation(
  state: SimulationState,
  dtSec: number
): {
  nextState: SimulationState;
  newBottlenecks: BottleneckEvent[];
} {
  const { scenario, elapsedSec, speedMultiplier } = state;
  const effectiveDt = dtSec * speedMultiplier;
  const currentElapsed = elapsedSec + effectiveDt;

  // Clone structures
  const nodes = state.nodes;
  const edges = state.roads.map((e) => ({ ...e, currentLoad: 0, congestionRatio: 0 }));
  const shelters = state.shelters.map((s) => ({ ...s }));
  const edgesMap = new Map<string, RoadEdge>();
  edges.forEach((e) => edgesMap.set(e.id, e));

  const sheltersMap = new Map<string, Shelter>();
  shelters.forEach((s) => sheltersMap.set(s.id, s));

  // Update dynamic hazard zone spread (if applicable)
  let updatedHazard: HazardZone = { ...scenario.hazard };
  if (scenario.hazard.spreadRateMetersPerMin > 0 && currentElapsed > 0) {
    const spreadExpansion = (scenario.hazard.spreadRateMetersPerMin / 60) * effectiveDt;
    updatedHazard = {
      ...scenario.hazard,
      radiusMeters: Math.min(550, scenario.hazard.radiusMeters + spreadExpansion),
    };
  }

  // 1. Tally edge loads from agents currently moving along edges
  for (const agent of state.agents) {
    if ((agent.status === 'moving' || agent.status === 'rerouting') && agent.currentEdgeId) {
      const edge = edgesMap.get(agent.currentEdgeId);
      if (edge) {
        edge.currentLoad += 1;
      }
    }
  }

  // 2. Compute edge congestion ratios and flag bottlenecks
  const activeBottlenecks: BottleneckEvent[] = [];
  for (const edge of edges) {
    // Capacity normalization: capacityPerMin scaled to a 3-minute traffic flow bucket
    const nominalCapacityBucket = Math.max(10, edge.capacityPerMin * (edge.isContraFlow ? 2.0 : 1.0) * 0.75);
    edge.congestionRatio = Number((edge.currentLoad / nominalCapacityBucket).toFixed(3));

    // Determine status
    if (edge.isBlocked) {
      edge.status = 'blocked';
    } else if (edge.congestionRatio > 0.85) {
      edge.status = 'congested';
      activeBottlenecks.push({
        edgeId: edge.id,
        roadName: edge.name,
        fromNode: edge.fromNodeId,
        toNode: edge.toNodeId,
        timeSec: Math.round(currentElapsed),
        densityRatio: edge.congestionRatio,
        queueLength: edge.currentLoad,
        averageSpeedMps: Math.max(1.5, (edge.baseSpeedKmh * 1000) / 3600 * (1 - Math.min(0.85, edge.congestionRatio))),
      });
    } else {
      edge.status = 'open';
    }
  }

  // 3. Update agent movements
  const updatedAgents: EvacuationAgent[] = [];
  let evacuatedCount = 0;
  let trappedCount = 0;
  let movingCount = 0;
  let waitingCount = 0;
  let reroutingCount = 0;

  for (const agent of state.agents) {
    const updatedAgent: EvacuationAgent = { ...agent };

    if (updatedAgent.status === 'evacuated') {
      evacuatedCount++;
      updatedAgents.push(updatedAgent);
      continue;
    }

    if (updatedAgent.status === 'trapped') {
      trappedCount++;
      updatedAgents.push(updatedAgent);
      continue;
    }

    // Check departure delay for waiting agents
    if (updatedAgent.status === 'waiting') {
      if (currentElapsed >= updatedAgent.departureDelaySec) {
        updatedAgent.status = 'moving';
        updatedAgent.currentRouteIndex = 0;
        updatedAgent.currentEdgeId = updatedAgent.routeEdgeIds[0];
        updatedAgent.progressOnEdge = 0.0;
        movingCount++;
      } else {
        waitingCount++;
      }
      updatedAgents.push(updatedAgent);
      continue;
    }

    // Moving or rerouting agent
    updatedAgent.totalTimeSec += effectiveDt;

    const currentEdge = updatedAgent.currentEdgeId ? edgesMap.get(updatedAgent.currentEdgeId) : undefined;

    // Check if current edge or target shelter became blocked/compromised
    const targetShelter = sheltersMap.get(updatedAgent.targetShelterId);
    const shelterClosedOrFull = !targetShelter || !targetShelter.isOpen || (targetShelter.currentOccupancy >= targetShelter.totalCapacity && targetShelter.totalCapacity > 0);
    const edgeBlocked = currentEdge && currentEdge.isBlocked;

    if (edgeBlocked || shelterClosedOrFull) {
      // Dynamic re-routing required
      updatedAgent.rerouteCount += 1;
      const reassign = assignBestShelter(
        updatedAgent.currentNodeId,
        shelters,
        nodes,
        edges,
        scenario.strategy.shelterAssignmentAlgorithm,
        updatedHazard,
        scenario.strategy.useContraFlow
      );

      if (reassign && reassign.route.edgeIds.length > 0) {
        updatedAgent.targetShelterId = reassign.shelter.id;
        updatedAgent.route = reassign.route.nodeIds;
        updatedAgent.routeEdgeIds = reassign.route.edgeIds;
        updatedAgent.currentRouteIndex = 0;
        updatedAgent.currentEdgeId = reassign.route.edgeIds[0];
        updatedAgent.progressOnEdge = 0.0;
        updatedAgent.status = 'rerouting';
        reroutingCount++;
      } else {
        // Trapped with no valid egress path
        updatedAgent.status = 'trapped';
        trappedCount++;
        updatedAgents.push(updatedAgent);
        continue;
      }
    }

    // Move along edge
    if (currentEdge) {
      // Congestion slowdown factor: Greenshields model
      const congestionSlowdown = Math.max(0.2, 1.0 - 0.7 * Math.pow(Math.min(1.0, currentEdge.congestionRatio), 1.8));
      const effectiveSpeedMps = updatedAgent.baseSpeedMps * congestionSlowdown;
      updatedAgent.currentSpeedMps = effectiveSpeedMps;

      // Track delays if traveling under 65% base speed
      if (congestionSlowdown < 0.65) {
        updatedAgent.delayTimeSec += effectiveDt;
      }

      const distanceCovered = effectiveSpeedMps * effectiveDt;
      updatedAgent.distanceTraveledMeters += distanceCovered;

      const progressDelta = distanceCovered / Math.max(10, currentEdge.lengthMeters);
      updatedAgent.progressOnEdge += progressDelta;

      if (updatedAgent.progressOnEdge >= 1.0) {
        // Agent reached destination node of current edge
        updatedAgent.currentNodeId = currentEdge.toNodeId;
        updatedAgent.progressOnEdge = 0.0;
        updatedAgent.currentRouteIndex += 1;

        // Check if agent reached target shelter
        const reachedTargetNode = targetShelter && updatedAgent.currentNodeId === targetShelter.nodeId;
        if (reachedTargetNode) {
          updatedAgent.status = 'evacuated';
          updatedAgent.currentEdgeId = undefined;
          targetShelter.currentOccupancy += 1;
          evacuatedCount++;
        } else if (updatedAgent.currentRouteIndex < updatedAgent.routeEdgeIds.length) {
          // Advance to next edge
          updatedAgent.currentEdgeId = updatedAgent.routeEdgeIds[updatedAgent.currentRouteIndex];
          updatedAgent.status = 'moving';
          movingCount++;
        } else {
          // Reached end of path but not recognized as shelter; mark evacuated if close or re-route
          if (targetShelter) {
            updatedAgent.status = 'evacuated';
            targetShelter.currentOccupancy += 1;
            evacuatedCount++;
          } else {
            updatedAgent.status = 'trapped';
            trappedCount++;
          }
        }
      } else {
        // Still traversing current edge
        if (updatedAgent.status === 'rerouting') {
          reroutingCount++;
        } else {
          movingCount++;
        }
      }
    } else {
      // No active edge, mark evacuated or trapped
      if (targetShelter && updatedAgent.currentNodeId === targetShelter.nodeId) {
        updatedAgent.status = 'evacuated';
        targetShelter.currentOccupancy += 1;
        evacuatedCount++;
      } else {
        updatedAgent.status = 'trapped';
        trappedCount++;
      }
    }

    updatedAgents.push(updatedAgent);
  }

  // Create snapshot record
  const shelterUtilizationMap: Record<string, number> = {};
  shelters.forEach((s) => {
    shelterUtilizationMap[s.id] = s.currentOccupancy;
  });

  const totalPop = updatedAgents.length;
  const snapshot: SimulationSnapshot = {
    timeSec: Math.round(currentElapsed),
    evacuatedCount,
    movingCount,
    waitingCount,
    trappedCount,
    reroutingCount,
    totalPopulation: totalPop,
    activeBottlenecks: activeBottlenecks.length,
    averageSpeedKmh: Number(
      (
        (updatedAgents.reduce((sum, a) => sum + (a.status === 'moving' ? a.currentSpeedMps : 0), 0) /
          Math.max(1, movingCount)) *
        3.6
      ).toFixed(1)
    ),
    shelterUtilizationMap,
  };

  // Keep up to 150 snapshots sampled smoothly
  const recentHistory = [...state.recentHistory];
  if (
    recentHistory.length === 0 ||
    currentElapsed - recentHistory[recentHistory.length - 1].timeSec >= 5 ||
    evacuatedCount + trappedCount >= totalPop
  ) {
    recentHistory.push(snapshot);
    if (recentHistory.length > 200) {
      recentHistory.shift();
    }
  }

  // Check if simulation completed
  const isCompleted = evacuatedCount + trappedCount >= totalPop || (movingCount === 0 && waitingCount === 0);

  const nextState: SimulationState = {
    ...state,
    scenario: {
      ...state.scenario,
      hazard: updatedHazard,
    },
    status: isCompleted ? 'completed' : state.status,
    elapsedSec: currentElapsed,
    agents: updatedAgents,
    shelters,
    roads: edges,
    activeBottlenecks,
    recentHistory,
  };

  return { nextState, newBottlenecks: activeBottlenecks };
}

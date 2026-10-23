import { RescueUnit, CityNode, RoadEdge, Shelter, EvacuationAgent, HazardZone } from '../types/simulation';
import { findShortestPath } from './dijkstra';

export function initializeRescueFleet(nodes: CityNode[]): RescueUnit[] {
  const getNodePos = (nodeId: string) => {
    const n = nodes.find((node) => node.id === nodeId);
    return n ? { x: n.position.x, y: n.position.y } : { x: 500, y: 350 };
  };

  const posE2 = getNodePos('E2'); // St. Jude Hospital
  const posD1 = getNodePos('D1'); // Metro Civic
  const posN3 = getNodePos('N3'); // North Hills
  const posR3 = getNodePos('R3'); // River Entry
  const posH3 = getNodePos('H3'); // Harbor Sports Complex

  return [
    {
      id: 'rescue-amb-101',
      callSign: 'Ambulance 101 (ALS Trauma)',
      type: 'ambulance',
      status: 'idle',
      currentNodeId: 'E2',
      targetNodeId: 'E2',
      targetDescription: 'Standby at St. Jude Hospital Station',
      currentX: posE2.x,
      currentY: posE2.y,
      progress: 0,
      routeNodeIds: ['E2'],
      routeIndex: 0,
      patientsCarried: 0,
      maxCapacity: 4,
      speedMps: 18, // ~65 km/h emergency speed
      assignedShelterId: 'shelter-5',
      logMessage: 'ALS Ambulance 101 ready for emergency medical triage dispatch.',
    },
    {
      id: 'rescue-amb-102',
      callSign: 'Ambulance 102 (Rapid Triage)',
      type: 'ambulance',
      status: 'idle',
      currentNodeId: 'D1',
      targetNodeId: 'D1',
      targetDescription: 'Standby at Metro Civic Center',
      currentX: posD1.x,
      currentY: posD1.y,
      progress: 0,
      routeNodeIds: ['D1'],
      routeIndex: 0,
      patientsCarried: 0,
      maxCapacity: 4,
      speedMps: 17,
      assignedShelterId: 'shelter-3',
      logMessage: 'Rapid Triage Ambulance 102 on standby.',
    },
    {
      id: 'rescue-ndrf-1',
      callSign: 'NDRF Rescue Squad Alpha',
      type: 'rescue_truck',
      status: 'idle',
      currentNodeId: 'N3',
      targetNodeId: 'N3',
      targetDescription: 'Heavy Rescue Base North Hills',
      currentX: posN3.x,
      currentY: posN3.y,
      progress: 0,
      routeNodeIds: ['N3'],
      routeIndex: 0,
      patientsCarried: 0,
      maxCapacity: 8,
      speedMps: 14,
      assignedShelterId: 'shelter-1',
      logMessage: 'NDRF Heavy Rescue Squad Alpha equipped with hydraulic cutters and extraction gear.',
    },
    {
      id: 'rescue-boat-1',
      callSign: 'River Rescue Zodiac-1',
      type: 'boat',
      status: 'idle',
      currentNodeId: 'R3',
      targetNodeId: 'R3',
      targetDescription: 'River Basin Rapid Deployment Dock',
      currentX: posR3.x,
      currentY: posR3.y,
      progress: 0,
      routeNodeIds: ['R3'],
      routeIndex: 0,
      patientsCarried: 0,
      maxCapacity: 6,
      speedMps: 15,
      assignedShelterId: 'shelter-4',
      logMessage: 'Inflatable flood rescue watercraft on standby for low-lying water extraction.',
    },
    {
      id: 'rescue-heli-1',
      callSign: 'Suraksha Air Rescue 1',
      type: 'helicopter',
      status: 'idle',
      currentNodeId: 'D1',
      targetNodeId: 'D1',
      targetDescription: 'Metro Helipad Flight Deck',
      currentX: posD1.x,
      currentY: posD1.y,
      progress: 0,
      routeNodeIds: ['D1'],
      routeIndex: 0,
      patientsCarried: 0,
      maxCapacity: 4,
      speedMps: 32, // ~115 km/h aerial speed
      assignedShelterId: 'shelter-3',
      logMessage: 'Medical Evacuation Helicopter fueled and ready on Helipad Alpha.',
    },
  ];
}

/**
 * Checks emergency conditions and auto-dispatches rescue teams to trapped agents or critical bottlenecks
 */
export function checkAndAutoDispatch(
  units: RescueUnit[],
  agents: EvacuationAgent[],
  nodes: CityNode[],
  edges: RoadEdge[],
  shelters: Shelter[],
  hazard?: HazardZone
): { updatedUnits: RescueUnit[]; dispatchedMessages: string[] } {
  const updatedUnits = units.map((u) => ({ ...u }));
  const dispatchedMessages: string[] = [];

  // Find trapped or stranded agents needing rescue
  const trappedAgents = agents.filter((a) => a.status === 'trapped');
  const openMedicalShelters = shelters.filter((s) => s.isOpen && s.medicalLevel !== 'none');
  const fallbackShelter = openMedicalShelters[0] || shelters[0];

  for (const unit of updatedUnits) {
    if (unit.status !== 'idle') continue;

    // 1. If trapped agents exist, dispatch to nearest trapped agent's location
    if (trappedAgents.length > 0) {
      const targetAgent = trappedAgents[0];
      const targetNodeId = targetAgent.currentNodeId || targetAgent.startNodeId;

      const path = findShortestPath(unit.currentNodeId, targetNodeId, nodes, edges, hazard, true);
      if (path && path.nodeIds.length > 0) {
        unit.status = 'dispatched';
        unit.targetNodeId = targetNodeId;
        unit.targetDescription = `Emergency extraction for stranded evacuees at Node ${targetNodeId}`;
        unit.routeNodeIds = path.nodeIds;
        unit.routeIndex = 0;
        unit.progress = 0;
        unit.logMessage = `🚨 AUTO-DISPATCHED: ${unit.callSign} en route to trapped citizens at Node ${targetNodeId}`;
        dispatchedMessages.push(unit.logMessage);
        continue;
      }
    }

    // 2. If hazard is wildfire or flood encroaching near residential zones, deploy air reconnaissance
    if (unit.type === 'helicopter' && hazard && hazard.intensity > 0.7) {
      const affectedNode = nodes.find((n) => hazard.affectedNeighborhoods.includes(n.neighborhoodId));
      if (affectedNode && unit.currentNodeId !== affectedNode.id) {
        unit.status = 'dispatched';
        unit.targetNodeId = affectedNode.id;
        unit.targetDescription = `Air surveillance & medical evac over ${affectedNode.name}`;
        unit.routeNodeIds = [unit.currentNodeId, affectedNode.id];
        unit.routeIndex = 0;
        unit.progress = 0;
        unit.logMessage = `🚁 AERIAL SORTIE LAUNCHED: ${unit.callSign} vectoring to hazard perimeter at ${affectedNode.name}`;
        dispatchedMessages.push(unit.logMessage);
      }
    }
  }

  return { updatedUnits, dispatchedMessages };
}

/**
 * Step movement of rescue units along their routes
 */
export function stepRescueFleet(
  units: RescueUnit[],
  dtSec: number,
  nodes: CityNode[],
  shelters: Shelter[]
): RescueUnit[] {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]));

  return units.map((unit) => {
    if (unit.status === 'idle') return unit;

    const u = { ...unit };
    const currNode = nodesMap.get(u.currentNodeId);
    const nextNodeId = u.routeNodeIds[u.routeIndex + 1];
    const nextNode = nextNodeId ? nodesMap.get(nextNodeId) : null;

    if (!currNode || !nextNode) {
      // Reached destination or single node
      if (u.status === 'dispatched' || u.status === 'on_scene') {
        u.status = 'on_scene';
        u.patientsCarried = Math.min(u.maxCapacity, 3);
        u.logMessage = `🚑 ${u.callSign} ON SCENE at Node ${u.currentNodeId}. Stabilizing and loading 3 evacuees.`;
        // Prepare return route to assigned shelter
        const targetShelter = shelters.find((s) => s.id === u.assignedShelterId) || shelters[0];
        if (targetShelter) {
          u.targetNodeId = targetShelter.nodeId;
          u.targetDescription = `Transporting patients to ${targetShelter.name}`;
          u.routeNodeIds = [u.currentNodeId, targetShelter.nodeId];
          u.routeIndex = 0;
          u.progress = 0;
          u.status = 'transporting';
        }
      } else if (u.status === 'transporting') {
        // Delivered patients to shelter
        const targetShelter = shelters.find((s) => s.id === u.assignedShelterId);
        if (targetShelter) {
          targetShelter.currentOccupancy = Math.min(
            targetShelter.totalCapacity,
            targetShelter.currentOccupancy + u.patientsCarried
          );
        }
        u.logMessage = `✓ ${u.callSign} safely delivered ${u.patientsCarried} evacuees to medical triage. Returning to standby.`;
        u.patientsCarried = 0;
        u.status = 'idle';
      }
      return u;
    }

    // Interpolate movement between currNode and nextNode
    const dist = Math.hypot(nextNode.position.x - currNode.position.x, nextNode.position.y - currNode.position.y);
    const speedCoord = (u.speedMps / Math.max(10, dist * 2)) * dtSec;
    u.progress += speedCoord;

    if (u.progress >= 1.0) {
      u.currentNodeId = nextNode.id;
      u.currentX = nextNode.position.x;
      u.currentY = nextNode.position.y;
      u.progress = 0;
      u.routeIndex += 1;

      // Leg completion (arrival on scene / patient delivery) is handled on the next step
      // by the end-of-route branch above, so units never stall in 'on_scene'.
    } else {
      u.currentX = currNode.position.x + (nextNode.position.x - currNode.position.x) * u.progress;
      u.currentY = currNode.position.y + (nextNode.position.y - currNode.position.y) * u.progress;
    }

    return u;
  });
}

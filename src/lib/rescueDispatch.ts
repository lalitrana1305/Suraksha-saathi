import { CityNode, EvacuationAgent, HazardZone, RescueUnit, RoadEdge, Shelter } from '../types/simulation';
import { findShortestPath } from './dijkstra';

const AIRBORNE_OR_WATER: RescueUnit['type'][] = ['helicopter', 'boat'];

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Picks the best receiving shelter for a rescue unit: open, with spare capacity,
 * preferring medical facilities and proximity to the incident.
 */
function pickReceivingShelter(target: CityNode, shelters: Shelter[]): Shelter | undefined {
  const open = shelters.filter((s) => s.isOpen && s.currentOccupancy < s.totalCapacity);
  const pool = open.length > 0 ? open : shelters;
  const medicalBonus: Record<Shelter['medicalLevel'], number> = {
    none: 0,
    first_aid: 60,
    advanced_triage: 120,
    hospital: 180,
  };
  return [...pool].sort(
    (a, b) =>
      distance(target.position, a.position) - medicalBonus[a.medicalLevel] -
      (distance(target.position, b.position) - medicalBonus[b.medicalLevel])
  )[0];
}

/**
 * Sends a unit to a node. Ground units follow the road graph (respecting closures);
 * helicopters and boats travel directly.
 */
export function dispatchUnitToNode(
  unit: RescueUnit,
  targetNodeId: string,
  nodes: CityNode[],
  roads: RoadEdge[],
  shelters: Shelter[],
  hazard: HazardZone | undefined,
  reason: string
): RescueUnit | null {
  const target = nodes.find((n) => n.id === targetNodeId);
  if (!target) return null;

  let routeNodeIds: string[];
  if (AIRBORNE_OR_WATER.includes(unit.type)) {
    routeNodeIds = unit.currentNodeId === targetNodeId ? [targetNodeId] : [unit.currentNodeId, targetNodeId];
  } else {
    const route = findShortestPath(unit.currentNodeId, targetNodeId, nodes, roads, hazard, true);
    if (!route) return null;
    routeNodeIds = route.nodeIds;
  }

  const shelter = pickReceivingShelter(target, shelters);
  return {
    ...unit,
    status: 'dispatched',
    targetNodeId,
    targetDescription: `${reason} at ${target.name}`,
    routeNodeIds,
    routeIndex: 0,
    progress: 0,
    assignedShelterId: shelter?.id ?? unit.assignedShelterId,
    logMessage: `${unit.callSign} dispatched to ${target.name} (${reason.toLowerCase()}).`,
  };
}

/**
 * Assigns idle rescue units to nodes where evacuees are trapped, nearest first.
 */
export function autoDispatchRescue(
  units: RescueUnit[],
  agents: EvacuationAgent[],
  nodes: CityNode[],
  roads: RoadEdge[],
  shelters: Shelter[],
  hazard?: HazardZone
): { units: RescueUnit[]; messages: string[] } {
  const trappedByNode = new Map<string, number>();
  for (const a of agents) {
    if (a.status === 'trapped') trappedByNode.set(a.currentNodeId, (trappedByNode.get(a.currentNodeId) ?? 0) + 1);
  }
  if (trappedByNode.size === 0) return { units, messages: [] };

  const nodesMap = new Map(nodes.map((n) => [n.id, n]));
  const targeted = new Set(units.filter((u) => u.status === 'dispatched').map((u) => u.targetNodeId));
  const messages: string[] = [];

  const updated = units.map((unit) => {
    if (unit.status !== 'idle') return unit;
    const candidates = [...trappedByNode.keys()]
      .filter((id) => !targeted.has(id))
      .map((id) => nodesMap.get(id)!)
      .filter(Boolean)
      .sort(
        (a, b) =>
          distance({ x: unit.currentX, y: unit.currentY }, a.position) -
          distance({ x: unit.currentX, y: unit.currentY }, b.position)
      );

    for (const node of candidates) {
      const dispatched = dispatchUnitToNode(unit, node.id, nodes, roads, shelters, hazard, 'Trapped evacuees');
      if (dispatched) {
        targeted.add(node.id);
        messages.push(`${unit.callSign} → ${node.name}: ${trappedByNode.get(node.id)} trapped evacuee(s) reported.`);
        return dispatched;
      }
    }
    return unit;
  });

  return { units: updated, messages };
}

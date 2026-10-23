import { CityNode, RoadEdge, Shelter, HazardZone } from '../types/simulation';

export interface RouteResult {
  nodeIds: string[];
  edgeIds: string[];
  totalCost: number;
  totalDistanceMeters: number;
  estimatedDurationSec: number;
}

export function calculateEdgeCost(
  edge: RoadEdge,
  nodesMap: Map<string, CityNode>,
  hazard?: HazardZone,
  contraFlowActive: boolean = false
): number {
  if (edge.isBlocked || edge.status === 'blocked') {
    return Infinity;
  }

  // Base travel time in seconds
  let effectiveSpeedKmh = edge.baseSpeedKmh;
  if (contraFlowActive && edge.isContraFlow) {
    effectiveSpeedKmh *= 1.25; // Contra-flow increases throughput
  }

  const baseSpeedMps = Math.max(2, (effectiveSpeedKmh * 1000) / 3600);
  const baseTravelTimeSec = edge.lengthMeters / baseSpeedMps;

  // Congestion factor based on Greenshields / BPR model
  // As congestionRatio approaches 1.0 or beyond, travel time multiplies heavily
  const congestionRatio = Math.max(0, edge.congestionRatio || 0);
  let congestionPenalty = 1.0;
  if (congestionRatio > 0.3) {
    congestionPenalty = 1.0 + 3.0 * Math.pow(congestionRatio, 2);
  }

  // Hazard exposure penalty
  let hazardPenalty = 1.0;
  if (hazard) {
    const fromNode = nodesMap.get(edge.fromNodeId);
    const toNode = nodesMap.get(edge.toNodeId);
    if (fromNode && toNode) {
      const midX = (fromNode.position.x + toNode.position.x) / 2;
      const midY = (fromNode.position.y + toNode.position.y) / 2;
      const distToEpicenter = Math.hypot(midX - hazard.epicenter.x, midY - hazard.epicenter.y);
      // Coordinate scale: 1 unit ~ 1 meter in this fictional model
      if (distToEpicenter < hazard.radiusMeters) {
        // Road is inside the active danger perimeter
        hazardPenalty = 8.0 * (1 + (hazard.radiusMeters - distToEpicenter) / hazard.radiusMeters);
      } else if (distToEpicenter < hazard.radiusMeters * 1.35) {
        // Road is in buffer smoke / surge zone
        hazardPenalty = 2.5;
      }
    }
  }

  return baseTravelTimeSec * congestionPenalty * hazardPenalty;
}

/**
 * High-performance Dijkstra algorithm on the road graph
 */
export function findShortestPath(
  startNodeId: string,
  targetNodeId: string,
  nodes: CityNode[],
  edges: RoadEdge[],
  hazard?: HazardZone,
  contraFlowActive: boolean = false
): RouteResult | null {
  if (startNodeId === targetNodeId) {
    return {
      nodeIds: [startNodeId],
      edgeIds: [],
      totalCost: 0,
      totalDistanceMeters: 0,
      estimatedDurationSec: 0,
    };
  }

  const nodesMap = new Map<string, CityNode>();
  nodes.forEach((n) => nodesMap.set(n.id, n));

  // Build adjacency list: node -> outgoing edges
  const adj = new Map<string, RoadEdge[]>();
  for (const edge of edges) {
    if (!adj.has(edge.fromNodeId)) {
      adj.set(edge.fromNodeId, []);
    }
    adj.get(edge.fromNodeId)!.push(edge);
  }

  const distances = new Map<string, number>();
  const previousNode = new Map<string, string | null>();
  const previousEdge = new Map<string, RoadEdge | null>();
  const visited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Infinity);
    previousNode.set(node.id, null);
    previousEdge.set(node.id, null);
  }
  distances.set(startNodeId, 0);

  // Priority queue emulation (for small-to-medium graphs, min search is ultra-fast)
  const unvisitedNodes = new Set<string>(nodes.map((n) => n.id));

  while (unvisitedNodes.size > 0) {
    let currentMinNode: string | null = null;
    let currentMinDist = Infinity;

    for (const nodeId of unvisitedNodes) {
      const d = distances.get(nodeId)!;
      if (d < currentMinDist) {
        currentMinDist = d;
        currentMinNode = nodeId;
      }
    }

    if (!currentMinNode || currentMinDist === Infinity) {
      break; // Remaining nodes unreachable
    }

    if (currentMinNode === targetNodeId) {
      break; // Reached destination
    }

    unvisitedNodes.delete(currentMinNode);
    visited.add(currentMinNode);

    const outgoing = adj.get(currentMinNode) || [];
    for (const edge of outgoing) {
      const neighborId = edge.toNodeId;
      if (visited.has(neighborId)) continue;

      const edgeCost = calculateEdgeCost(edge, nodesMap, hazard, contraFlowActive);
      if (edgeCost === Infinity) continue;

      const newDist = currentMinDist + edgeCost;
      if (newDist < distances.get(neighborId)!) {
        distances.set(neighborId, newDist);
        previousNode.set(neighborId, currentMinNode);
        previousEdge.set(neighborId, edge);
      }
    }
  }

  if (distances.get(targetNodeId) === Infinity) {
    return null; // No path found
  }

  // Reconstruct path
  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  let curr: string | null = targetNodeId;
  let totalDistance = 0;
  let totalDuration = 0;

  while (curr) {
    pathNodes.unshift(curr);
    const edge = previousEdge.get(curr);
    if (edge) {
      pathEdges.unshift(edge.id);
      totalDistance += edge.lengthMeters;
      totalDuration += (edge.lengthMeters / Math.max(2, (edge.baseSpeedKmh * 1000) / 3600));
    }
    curr = previousNode.get(curr) ?? null;
  }

  return {
    nodeIds: pathNodes,
    edgeIds: pathEdges,
    totalCost: distances.get(targetNodeId)!,
    totalDistanceMeters: totalDistance,
    estimatedDurationSec: Math.round(totalDuration),
  };
}

/**
 * Capacity-aware shelter allocation
 */
export function assignBestShelter(
  startNodeId: string,
  shelters: Shelter[],
  nodes: CityNode[],
  edges: RoadEdge[],
  algorithm: 'nearest' | 'capacity_balanced' | 'multi_objective' = 'capacity_balanced',
  hazard?: HazardZone,
  contraFlowActive: boolean = false
): { shelter: Shelter; route: RouteResult } | null {
  const openShelters = shelters.filter((s) => s.isOpen);
  if (openShelters.length === 0) return null;

  let bestChoice: { shelter: Shelter; route: RouteResult; score: number } | null = null;

  for (const shelter of openShelters) {
    const route = findShortestPath(startNodeId, shelter.nodeId, nodes, edges, hazard, contraFlowActive);
    if (!route) continue; // Unreachable

    const remainingCapacity = shelter.totalCapacity - shelter.assignedCount;
    const occupancyRatio = shelter.assignedCount / Math.max(1, shelter.totalCapacity);

    let score = route.totalCost;

    if (algorithm === 'nearest') {
      // Pure shortest route, ignoring capacity until full
      if (remainingCapacity <= 0) {
        score += 10000; // Heavily penalize full shelters
      }
    } else if (algorithm === 'capacity_balanced') {
      // Avoid overcrowding: if occupancy > 70%, add progressive penalty
      if (remainingCapacity <= 0) {
        score += 20000;
      } else if (occupancyRatio > 0.8) {
        score += 400 * Math.pow(occupancyRatio, 3);
      }
    } else if (algorithm === 'multi_objective') {
      // Considers medical level, priority score, and capacity
      const priorityBonus = (shelter.priorityScore || 3) * 30;
      const medicalBonus = shelter.medicalLevel === 'hospital' ? 40 : 15;
      score = route.totalCost - priorityBonus - medicalBonus;
      if (remainingCapacity <= 0) {
        score += 15000;
      } else if (occupancyRatio > 0.85) {
        score += 350;
      }
    }

    if (!bestChoice || score < bestChoice.score) {
      bestChoice = { shelter, route, score };
    }
  }

  return bestChoice ? { shelter: bestChoice.shelter, route: bestChoice.route } : null;
}

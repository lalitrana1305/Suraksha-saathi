import {
  CityNode,
  RoadEdge,
  Shelter,
  HazardZone,
  UserSafeRoute,
  UserSafeRouteStep,
} from '../types/simulation';
import { findShortestPath, assignBestShelter } from './dijkstra';
import { GREENFIELD_NEIGHBORHOODS } from '../data/greenfieldCity';

export function calculateUserSafeRoute(
  originNodeId: string,
  nodes: CityNode[],
  edges: RoadEdge[],
  shelters: Shelter[],
  hazard?: HazardZone
): UserSafeRoute | null {
  const nodesMap = new Map(nodes.map((n) => [n.id, n]));
  const edgesMap = new Map(edges.map((e) => [e.id, e]));
  const originNode = nodesMap.get(originNodeId);
  if (!originNode) return null;

  const neighborhood =
    GREENFIELD_NEIGHBORHOODS.find((nh) => nh.id === originNode.neighborhoodId) ||
    GREENFIELD_NEIGHBORHOODS[0];

  // Capacity-aware shelter assignment
  const bestShelterResult = assignBestShelter(
    originNodeId,
    shelters,
    nodes,
    edges,
    'capacity_balanced',
    hazard,
    true
  );

  if (!bestShelterResult) {
    return null;
  }

  const { shelter, route } = bestShelterResult;

  // Build step-by-step directions
  const steps: UserSafeRouteStep[] = [];
  let totalDist = 0;
  let minHazardDistance = Infinity;

  for (let i = 0; i < route.edgeIds.length; i++) {
    const edgeId = route.edgeIds[i];
    const edge = edgesMap.get(edgeId);
    if (!edge) continue;

    const fromNode = nodesMap.get(edge.fromNodeId);
    const toNode = nodesMap.get(edge.toNodeId);
    totalDist += edge.lengthMeters;

    // Check distance to hazard epicenter
    let isHazardNearby = false;
    if (hazard && fromNode) {
      const d = Math.hypot(fromNode.position.x - hazard.epicenter.x, fromNode.position.y - hazard.epicenter.y);
      if (d < minHazardDistance) minHazardDistance = d;
      if (d < hazard.radiusMeters * 1.3) {
        isHazardNearby = true;
      }
    }

    let instruction = `Follow ${edge.name} towards ${toNode?.name || edge.toNodeId}`;
    if (i === 0) {
      instruction = `Head ${edge.roadType === 'bridge' ? 'across' : 'along'} ${edge.name} from ${fromNode?.name}`;
    } else if (i === route.edgeIds.length - 1) {
      instruction = `Continue on ${edge.name} to enter safe gate at ${shelter.name}`;
    }

    const stepStatus: UserSafeRouteStep['status'] = edge.congestionRatio > 0.8 ? 'congested' : isHazardNearby ? 'caution' : 'clear';

    steps.push({
      stepIndex: i + 1,
      instruction,
      roadName: edge.name,
      distanceMeters: edge.lengthMeters,
      isHazardNearby,
      status: stepStatus,
    });
  }

  // Hazard clearance score: 100% if far away, lower if path clips near buffer
  let hazardScore = 95;
  if (hazard) {
    if (minHazardDistance < hazard.radiusMeters) {
      hazardScore = 65;
    } else if (minHazardDistance < hazard.radiusMeters * 1.4) {
      hazardScore = 82;
    } else {
      hazardScore = 98;
    }
  }

  // Estimated transit time in minutes (accounting for average vehicle/group speed)
  const estimatedMin = Math.max(2, Math.round((totalDist / 600))); // ~36 km/h city evacuation speed

  return {
    originNeighborhoodId: neighborhood.id,
    originNeighborhoodName: neighborhood.name,
    originNodeId,
    assignedShelter: shelter,
    routeNodeIds: route.nodeIds,
    routeEdgeIds: route.edgeIds,
    totalDistanceMeters: totalDist,
    estimatedMinutes: estimatedMin,
    hazardAvoidanceScore: hazardScore,
    steps,
    stepByStep: steps,
  };
}

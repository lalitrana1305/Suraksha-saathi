export type DisasterType = 'flood' | 'wildfire' | 'earthquake' | 'chemical' | 'hurricane';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

export type AgentStatus = 'waiting' | 'moving' | 'rerouting' | 'evacuated' | 'trapped';

export type RoadType = 'arterial' | 'collector' | 'bridge' | 'highway' | 'local';

export type RoadStatus = 'open' | 'congested' | 'blocked' | 'hazard_zone' | 'contra_flow';

export interface GeoPoint {
  x: number; // 0 to 1000 coordinate space
  y: number; // 0 to 700 coordinate space
  lat?: number;
  lng?: number;
}

export interface CityNode {
  id: string;
  name: string;
  type: 'intersection' | 'neighborhood' | 'shelter' | 'bridge_entry' | 'transit_hub';
  position: GeoPoint;
  neighborhoodId: string;
  elevation?: number; // meters
}

export interface Neighborhood {
  id: string;
  name: string;
  center: GeoPoint;
  color: string;
  description: string;
  typicalPopulation: number;
  vulnerabilityIndex: number; // 0.1 to 1.0 (higher = more elderly/vulnerable)
}

export interface RoadEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  name: string;
  roadType: RoadType;
  lengthMeters: number;
  baseSpeedKmh: number;
  capacityPerMin: number; // Max vehicles per minute before jam
  lanes: number;
  status: RoadStatus;
  isBlocked: boolean;
  isContraFlow?: boolean; // Double capacity in one direction
  hazardExposureScore?: number; // 0 to 1
  currentLoad: number; // active agents currently on this segment
  congestionRatio: number; // currentLoad / (capacity * factor)
}

export interface Shelter {
  id: string;
  name: string;
  nodeId: string;
  neighborhoodId: string;
  position: GeoPoint;
  totalCapacity: number;
  currentOccupancy: number;
  assignedCount: number;
  isOpen: boolean;
  priorityScore: number; // 1 to 5
  medicalLevel: 'none' | 'first_aid' | 'advanced_triage' | 'hospital';
  facilities: string[];
  contactPerson?: string;
}

export interface HazardZone {
  id: string;
  disasterType: DisasterType;
  epicenter: GeoPoint;
  radiusMeters: number;
  intensity: number; // 0.1 to 1.0
  spreadRateMetersPerMin: number;
  affectedNeighborhoods: string[];
  description: string;
}

export interface EvacuationAgent {
  id: string;
  startNodeId: string;
  currentNodeId: string;
  targetShelterId: string;
  status: AgentStatus;
  mobilityCategory: 'standard' | 'reduced' | 'group_family' | 'rapid';
  baseSpeedMps: number; // meters per second (~8 to 15 m/s for cars, ~1.2 m/s for foot)
  currentSpeedMps: number;
  currentEdgeId?: string;
  progressOnEdge: number; // 0.0 to 1.0
  route: string[]; // sequence of node IDs
  routeEdgeIds: string[];
  currentRouteIndex: number;
  departureDelaySec: number; // staggered start
  distanceTraveledMeters: number;
  totalTimeSec: number;
  delayTimeSec: number;
  rerouteCount: number;
}

export interface BottleneckEvent {
  edgeId: string;
  roadName: string;
  fromNode: string;
  toNode: string;
  timeSec: number;
  densityRatio: number;
  queueLength: number;
  averageSpeedMps: number;
}

export interface SimulationSnapshot {
  timeSec: number;
  evacuatedCount: number;
  movingCount: number;
  waitingCount: number;
  trappedCount: number;
  reroutingCount: number;
  totalPopulation: number;
  activeBottlenecks: number;
  averageSpeedKmh: number;
  shelterUtilizationMap: Record<string, number>; // shelterId -> occupancy
}

export interface SimulationStrategy {
  id: string;
  name: string;
  description: string;
  useContraFlow: boolean;
  staggeredEvacuation: boolean; // Zone-by-zone evacuation
  shelterAssignmentAlgorithm: 'nearest' | 'capacity_balanced' | 'multi_objective';
  speedMultiplier: number;
}

export interface DisasterScenario {
  id: string;
  title: string;
  description: string;
  disasterType: DisasterType;
  severity: SeverityLevel;
  populationSize: number;
  mobilityBreakdown: {
    standardPercent: number;
    reducedMobilityPercent: number;
    familyGroupsPercent: number;
  };
  hazard: HazardZone;
  blockedRoadIds: string[];
  activeShelterIds: string[];
  strategy: SimulationStrategy;
  createdAt: string;
  isPreset?: boolean;
}

export interface SimulationRunResult {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  disasterType: DisasterType;
  totalPopulation: number;
  evacuatedCount: number;
  trappedCount: number;
  totalDurationSec: number;
  averageEvacuationTimeSec: number;
  peakBottlenecks: number;
  criticalRoads: { roadId: string; roadName: string; maxCongestion: number; durationSec: number }[];
  shelterSummaries: { shelterId: string; name: string; capacity: number; finalOccupancy: number; peakOccupancy: number }[];
  timeline: SimulationSnapshot[];
  bottlenecksDetected: BottleneckEvent[];
  strategyUsed: SimulationStrategy;
  completedAt: string;
}

export interface RescueUnit {
  id: string;
  callSign: string;
  type: 'ambulance' | 'rescue_truck' | 'boat' | 'helicopter';
  status: 'idle' | 'dispatched' | 'on_scene' | 'transporting' | 'completed';
  currentNodeId: string;
  targetNodeId: string;
  targetDescription: string;
  currentX: number;
  currentY: number;
  progress: number; // 0.0 to 1.0 along current leg
  routeNodeIds: string[];
  routeIndex: number;
  patientsCarried: number;
  maxCapacity: number;
  speedMps: number;
  assignedShelterId: string;
  logMessage: string;
}

export interface UserSafeRouteStep {
  stepIndex: number;
  instruction: string;
  roadName: string;
  distanceMeters: number;
  isHazardNearby: boolean;
  status: 'clear' | 'caution' | 'congested';
}

export interface UserSafeRoute {
  originNeighborhoodId: string;
  originNeighborhoodName: string;
  originNodeId: string;
  assignedShelter: Shelter;
  routeNodeIds: string[];
  routeEdgeIds: string[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  hazardAvoidanceScore: number; // 0 to 100%
  stepByStep: UserSafeRouteStep[];
  steps: UserSafeRouteStep[];
}

export interface SimulationState {
  scenario: DisasterScenario;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'reset';
  elapsedSec: number;
  speedMultiplier: number; // 1, 2, 5, 10
  agents: EvacuationAgent[];
  shelters: Shelter[];
  roads: RoadEdge[];
  nodes: CityNode[];
  activeBottlenecks: BottleneckEvent[];
  recentHistory: SimulationSnapshot[];
  isDeterministic: boolean;
  randomSeed: number;
  rescueUnits?: RescueUnit[];
  activeSafeRoute?: UserSafeRoute | null;
}


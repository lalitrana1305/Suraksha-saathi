import { CityNode, RoadEdge, Shelter, Neighborhood } from '../types/simulation';

export const GREENFIELD_NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'north_hills',
    name: 'North Hills',
    center: { x: 320, y: 120 },
    color: '#0284c7', // sky
    description: 'Elevated residential ridge with winding two-lane roads and scenic lookouts.',
    typicalPopulation: 320,
    vulnerabilityIndex: 0.35,
  },
  {
    id: 'pine_valley',
    name: 'Pine Valley',
    center: { x: 740, y: 130 },
    color: '#16a34a', // green
    description: 'Densely wooded suburban valley surrounded by state forest and pine timberlands.',
    typicalPopulation: 450,
    vulnerabilityIndex: 0.65,
  },
  {
    id: 'riverside_west',
    name: 'Riverside West',
    center: { x: 260, y: 320 },
    color: '#06b6d4', // cyan
    description: 'Low-lying riverfront district vulnerable to seasonal surge and flash flooding.',
    typicalPopulation: 520,
    vulnerabilityIndex: 0.75,
  },
  {
    id: 'old_town',
    name: 'Old Town Heritage',
    center: { x: 490, y: 300 },
    color: '#f59e0b', // amber
    description: 'Historic district with masonry architecture, tight intersections, and narrow lanes.',
    typicalPopulation: 380,
    vulnerabilityIndex: 0.8,
  },
  {
    id: 'downtown',
    name: 'Downtown Metro Hub',
    center: { x: 500, y: 460 },
    color: '#6366f1', // indigo
    description: 'Central business corridor with multi-lane boulevards and high daytime population.',
    typicalPopulation: 680,
    vulnerabilityIndex: 0.45,
  },
  {
    id: 'harbor_bay',
    name: 'Harbor Bay & Port',
    center: { x: 210, y: 550 },
    color: '#3b82f6', // blue
    description: 'Coastal logistics port, warehouse yards, and petrochemical transit terminal.',
    typicalPopulation: 290,
    vulnerabilityIndex: 0.7,
  },
  {
    id: 'eastside',
    name: 'Eastside Meadows',
    center: { x: 800, y: 460 },
    color: '#8b5cf6', // purple
    description: 'Expansive master-planned community with open parks, schools, and wide arterials.',
    typicalPopulation: 540,
    vulnerabilityIndex: 0.4,
  },
];

export const INITIAL_CITY_NODES: CityNode[] = [
  // North Hills
  { id: 'N1', name: 'North Ridge Junction', type: 'intersection', position: { x: 220, y: 90 }, neighborhoodId: 'north_hills', elevation: 110 },
  { id: 'N2', name: 'Highland Crest', type: 'intersection', position: { x: 380, y: 110 }, neighborhoodId: 'north_hills', elevation: 125 },
  { id: 'N3', name: 'North Hills School Grounds', type: 'shelter', position: { x: 320, y: 180 }, neighborhoodId: 'north_hills', elevation: 95 },

  // Pine Valley
  { id: 'P1', name: 'Pine Ridge Gate', type: 'intersection', position: { x: 670, y: 100 }, neighborhoodId: 'pine_valley', elevation: 140 },
  { id: 'P2', name: 'Valley Forest Cross', type: 'intersection', position: { x: 820, y: 120 }, neighborhoodId: 'pine_valley', elevation: 90 },
  { id: 'P3', name: 'Pine Valley Red Cross Post', type: 'shelter', position: { x: 740, y: 190 }, neighborhoodId: 'pine_valley', elevation: 85 },

  // Riverside West
  { id: 'R1', name: 'West Levee Access', type: 'intersection', position: { x: 160, y: 260 }, neighborhoodId: 'riverside_west', elevation: 12 },
  { id: 'R2', name: 'Riverside Promenade', type: 'intersection', position: { x: 280, y: 320 }, neighborhoodId: 'riverside_west', elevation: 14 },
  { id: 'R3', name: 'River Bridge West Entry', type: 'bridge_entry', position: { x: 370, y: 270 }, neighborhoodId: 'riverside_west', elevation: 18 },

  // Old Town
  { id: 'O1', name: 'Founders Square', type: 'intersection', position: { x: 480, y: 250 }, neighborhoodId: 'old_town', elevation: 35 },
  { id: 'O2', name: 'Old Market Arch', type: 'intersection', position: { x: 570, y: 310 }, neighborhoodId: 'old_town', elevation: 32 },
  { id: 'O3', name: 'St. Leopold Heritage Plaza', type: 'intersection', position: { x: 430, y: 340 }, neighborhoodId: 'old_town', elevation: 30 },

  // Downtown
  { id: 'D1', name: 'Metro Civic Center Plaza', type: 'shelter', position: { x: 500, y: 410 }, neighborhoodId: 'downtown', elevation: 25 },
  { id: 'D2', name: 'Central Boulevard Hub', type: 'transit_hub', position: { x: 410, y: 470 }, neighborhoodId: 'downtown', elevation: 22 },
  { id: 'D3', name: 'Financial Tower Cross', type: 'intersection', position: { x: 580, y: 470 }, neighborhoodId: 'downtown', elevation: 24 },
  { id: 'D4', name: 'South Metro Expressway Ramp', type: 'intersection', position: { x: 510, y: 560 }, neighborhoodId: 'downtown', elevation: 18 },

  // Harbor Bay
  { id: 'H1', name: 'Harbor Gate Checkpoint', type: 'intersection', position: { x: 150, y: 480 }, neighborhoodId: 'harbor_bay', elevation: 5 },
  { id: 'H2', name: 'Marina Cargo Wharf', type: 'intersection', position: { x: 230, y: 580 }, neighborhoodId: 'harbor_bay', elevation: 4 },
  { id: 'H3', name: 'South Coast Sports Arena', type: 'shelter', position: { x: 320, y: 610 }, neighborhoodId: 'harbor_bay', elevation: 8 },

  // Eastside Meadows
  { id: 'E1', name: 'Meadowlands Parkway', type: 'intersection', position: { x: 740, y: 360 }, neighborhoodId: 'eastside', elevation: 45 },
  { id: 'E2', name: 'St. Jude Hospital Annex', type: 'shelter', position: { x: 860, y: 420 }, neighborhoodId: 'eastside', elevation: 48 },
  { id: 'E3', name: 'East Freeway Junction', type: 'intersection', position: { x: 890, y: 550 }, neighborhoodId: 'eastside', elevation: 38 },
  { id: 'E4', name: 'Sunrise Crossing', type: 'intersection', position: { x: 730, y: 540 }, neighborhoodId: 'eastside', elevation: 42 },

  // Critical Crossings & Bridges
  { id: 'B1', name: 'Memorial Bridge East Entry', type: 'bridge_entry', position: { x: 420, y: 270 }, neighborhoodId: 'old_town', elevation: 20 },
  { id: 'B2', name: 'Pine River Bridge North', type: 'bridge_entry', position: { x: 620, y: 210 }, neighborhoodId: 'pine_valley', elevation: 55 },
];

export const INITIAL_SHELTERS: Shelter[] = [
  {
    id: 'shelter-1',
    name: 'Greenfield High School Arena',
    nodeId: 'N3',
    neighborhoodId: 'north_hills',
    position: { x: 320, y: 180 },
    totalCapacity: 500,
    currentOccupancy: 0,
    assignedCount: 0,
    isOpen: true,
    priorityScore: 5,
    medicalLevel: 'first_aid',
    facilities: ['Backup Generator', 'Emergency Food & Water', 'Showers', 'Heated Gym'],
    contactPerson: 'Director Sarah Vance',
  },
  {
    id: 'shelter-2',
    name: 'Pine Valley Red Cross Post',
    nodeId: 'P3',
    neighborhoodId: 'pine_valley',
    position: { x: 740, y: 190 },
    totalCapacity: 400,
    currentOccupancy: 0,
    assignedCount: 0,
    isOpen: true,
    priorityScore: 4,
    medicalLevel: 'advanced_triage',
    facilities: ['Mobile Clinic', 'Satellite Comms', 'Cots & Blankets'],
    contactPerson: 'Capt. Marcus Reynolds',
  },
  {
    id: 'shelter-3',
    name: 'Metro Civic & Convention Hall',
    nodeId: 'D1',
    neighborhoodId: 'downtown',
    position: { x: 500, y: 410 },
    totalCapacity: 850,
    currentOccupancy: 0,
    assignedCount: 0,
    isOpen: true,
    priorityScore: 5,
    medicalLevel: 'hospital',
    facilities: ['Full EMT Post', 'Helipad', 'Emergency Power 72h', 'ADA Accessible'],
    contactPerson: 'Chief Evacuation Coordinator Chen',
  },
  {
    id: 'shelter-4',
    name: 'South Coast Sports Complex',
    nodeId: 'H3',
    neighborhoodId: 'harbor_bay',
    position: { x: 320, y: 610 },
    totalCapacity: 650,
    currentOccupancy: 0,
    assignedCount: 0,
    isOpen: true,
    priorityScore: 3,
    medicalLevel: 'first_aid',
    facilities: ['Field Hospital Beds', 'Logistics Dock', 'Industrial Kitchen'],
    contactPerson: 'Lt. Dan Miller',
  },
  {
    id: 'shelter-5',
    name: 'St. Jude Hospital Annex Gym',
    nodeId: 'E2',
    neighborhoodId: 'eastside',
    position: { x: 860, y: 420 },
    totalCapacity: 550,
    currentOccupancy: 0,
    assignedCount: 0,
    isOpen: true,
    priorityScore: 5,
    medicalLevel: 'hospital',
    facilities: ['Trauma Center Adjacent', 'Oxygen Supply', 'Pediatric Care', 'Wheelchair Ramps'],
    contactPerson: 'Dr. Evelyn Morales',
  },
];

// Helper to create bidirectional edges
let edgeCounter = 1;
function makeEdge(
  fromNodeId: string,
  toNodeId: string,
  name: string,
  roadType: RoadEdge['roadType'],
  lengthMeters: number,
  baseSpeedKmh: number,
  capacityPerMin: number,
  lanes: number
): RoadEdge {
  const id = `edge-${edgeCounter++}`;
  return {
    id,
    fromNodeId,
    toNodeId,
    name,
    roadType,
    lengthMeters,
    baseSpeedKmh,
    capacityPerMin,
    lanes,
    status: 'open',
    isBlocked: false,
    currentLoad: 0,
    congestionRatio: 0,
  };
}

export const INITIAL_ROAD_EDGES: RoadEdge[] = [
  // North Ridge & Hills network
  makeEdge('N1', 'N2', 'North Ridge Parkway', 'arterial', 950, 50, 90, 2),
  makeEdge('N2', 'N1', 'North Ridge Parkway', 'arterial', 950, 50, 90, 2),
  makeEdge('N1', 'N3', 'Highland School Way', 'collector', 600, 40, 50, 1),
  makeEdge('N3', 'N1', 'Highland School Way', 'collector', 600, 40, 50, 1),
  makeEdge('N2', 'N3', 'Hillside Drive', 'collector', 550, 40, 50, 1),
  makeEdge('N3', 'N2', 'Hillside Drive', 'collector', 550, 40, 50, 1),

  // Connecting North Hills to Pine Valley
  makeEdge('N2', 'P1', 'Skyline Scenic Bypass', 'arterial', 1400, 60, 80, 2),
  makeEdge('P1', 'N2', 'Skyline Scenic Bypass', 'arterial', 1400, 60, 80, 2),

  // Pine Valley network
  makeEdge('P1', 'P2', 'Pine Timberline Blvd', 'arterial', 1050, 50, 75, 2),
  makeEdge('P2', 'P1', 'Pine Timberline Blvd', 'arterial', 1050, 50, 75, 2),
  makeEdge('P1', 'P3', 'Red Cross Shelter Trail', 'collector', 650, 40, 45, 1),
  makeEdge('P3', 'P1', 'Red Cross Shelter Trail', 'collector', 650, 40, 45, 1),
  makeEdge('P2', 'P3', 'Valley Creek Access', 'collector', 620, 35, 45, 1),
  makeEdge('P3', 'P2', 'Valley Creek Access', 'collector', 620, 35, 45, 1),

  // North Hills down to Riverside
  makeEdge('N1', 'R1', 'Levee Overlook Road', 'collector', 1100, 45, 60, 1),
  makeEdge('R1', 'N1', 'Levee Overlook Road', 'collector', 1100, 45, 60, 1),
  makeEdge('N3', 'R3', 'North Bridge Descent', 'arterial', 850, 45, 80, 2),
  makeEdge('R3', 'N3', 'North Bridge Descent', 'arterial', 850, 45, 80, 2),

  // Riverside West
  makeEdge('R1', 'R2', 'Riverside Promenade', 'collector', 800, 40, 60, 2),
  makeEdge('R2', 'R1', 'Riverside Promenade', 'collector', 800, 40, 60, 2),
  makeEdge('R2', 'R3', 'Green River Loop', 'collector', 680, 35, 50, 1),
  makeEdge('R3', 'R2', 'Green River Loop', 'collector', 680, 35, 50, 1),

  // Memorial Bridge crossing Green River (Critical Chokepoint)
  makeEdge('R3', 'B1', 'Memorial Bridge (Eastbound)', 'bridge', 500, 40, 70, 2),
  makeEdge('B1', 'R3', 'Memorial Bridge (Westbound)', 'bridge', 500, 40, 70, 2),

  // Old Town Heritage roads (narrow, vulnerable)
  makeEdge('B1', 'O1', 'Old Town Heritage Gate', 'local', 450, 30, 40, 1),
  makeEdge('O1', 'B1', 'Old Town Heritage Gate', 'local', 450, 30, 40, 1),
  makeEdge('O1', 'O2', 'Founders Cobblestone Ave', 'local', 600, 30, 35, 1),
  makeEdge('O2', 'O1', 'Founders Cobblestone Ave', 'local', 600, 30, 35, 1),
  makeEdge('O1', 'O3', 'Church Steeple Street', 'local', 520, 30, 35, 1),
  makeEdge('O3', 'O1', 'Church Steeple Street', 'local', 520, 30, 35, 1),
  makeEdge('O3', 'O2', 'Market Square Pass', 'local', 650, 30, 40, 1),
  makeEdge('O2', 'O3', 'Market Square Pass', 'local', 650, 30, 40, 1),

  // Pine River Bridge connecting Old Town & Pine Valley
  makeEdge('O2', 'B2', 'Pine River Causeway South', 'bridge', 550, 45, 65, 2),
  makeEdge('B2', 'O2', 'Pine River Causeway South', 'bridge', 550, 45, 65, 2),
  makeEdge('B2', 'P3', 'Pine Valley South Connector', 'arterial', 700, 50, 80, 2),
  makeEdge('P3', 'B2', 'Pine Valley South Connector', 'arterial', 700, 50, 80, 2),

  // Downtown Metro arteries
  makeEdge('O3', 'D1', 'Civic Center Boulevard', 'arterial', 580, 50, 100, 3),
  makeEdge('D1', 'O3', 'Civic Center Boulevard', 'arterial', 580, 50, 100, 3),
  makeEdge('D1', 'D2', 'Central Transit Concourse', 'arterial', 540, 45, 90, 2),
  makeEdge('D2', 'D1', 'Central Transit Concourse', 'arterial', 540, 45, 90, 2),
  makeEdge('D1', 'D3', 'Financial Corridor East', 'arterial', 520, 50, 100, 3),
  makeEdge('D3', 'D1', 'Financial Corridor East', 'arterial', 520, 50, 100, 3),
  makeEdge('D2', 'D4', 'Metro South Link', 'highway', 680, 60, 120, 3),
  makeEdge('D4', 'D2', 'Metro South Link', 'highway', 680, 60, 120, 3),
  makeEdge('D3', 'D4', 'Expressway Incline', 'highway', 620, 60, 110, 3),
  makeEdge('D4', 'D3', 'Expressway Incline', 'highway', 620, 60, 110, 3),

  // Riverside to Downtown & Harbor
  makeEdge('R2', 'D2', 'Riverbank Arterial South', 'arterial', 1100, 50, 85, 2),
  makeEdge('D2', 'R2', 'Riverbank Arterial South', 'arterial', 1100, 50, 85, 2),
  makeEdge('R2', 'H1', 'Harbor Industrial Access', 'collector', 900, 45, 65, 2),
  makeEdge('H1', 'R2', 'Harbor Industrial Access', 'collector', 900, 45, 65, 2),

  // Harbor Bay
  makeEdge('H1', 'H2', 'Port Container Way', 'arterial', 800, 45, 75, 2),
  makeEdge('H2', 'H1', 'Port Container Way', 'arterial', 800, 45, 75, 2),
  makeEdge('H2', 'H3', 'Sports Complex Causeway', 'collector', 550, 40, 60, 2),
  makeEdge('H3', 'H2', 'Sports Complex Causeway', 'collector', 550, 40, 60, 2),
  makeEdge('D2', 'H3', 'Waterfront Bay Expressway', 'highway', 1050, 65, 130, 3),
  makeEdge('H3', 'D2', 'Waterfront Bay Expressway', 'highway', 1050, 65, 130, 3),
  makeEdge('D4', 'H3', 'South Shore Boulevard', 'arterial', 950, 50, 90, 2),
  makeEdge('H3', 'D4', 'South Shore Boulevard', 'arterial', 950, 50, 90, 2),

  // Eastside Meadows
  makeEdge('O2', 'E1', 'East Gateway Parkway', 'arterial', 950, 50, 90, 2),
  makeEdge('E1', 'O2', 'East Gateway Parkway', 'arterial', 950, 50, 90, 2),
  makeEdge('P3', 'E1', 'Forest Meadows Spur', 'collector', 900, 45, 60, 1),
  makeEdge('E1', 'P3', 'Forest Meadows Spur', 'collector', 900, 45, 60, 1),
  makeEdge('E1', 'E2', 'Hospital Medical Mile', 'arterial', 680, 45, 90, 2),
  makeEdge('E2', 'E1', 'Hospital Medical Mile', 'arterial', 680, 45, 90, 2),
  makeEdge('D3', 'E4', 'Eastside Expressway West', 'highway', 1000, 65, 130, 3),
  makeEdge('E4', 'D3', 'Eastside Expressway West', 'highway', 1000, 65, 130, 3),
  makeEdge('E4', 'E2', 'St. Jude Access Way', 'collector', 600, 40, 60, 1),
  makeEdge('E2', 'E4', 'St. Jude Access Way', 'collector', 600, 40, 60, 1),
  makeEdge('E2', 'E3', 'Sunrise Regional Beltway', 'highway', 750, 65, 120, 2),
  makeEdge('E3', 'E2', 'Sunrise Regional Beltway', 'highway', 750, 65, 120, 2),
  makeEdge('E4', 'E3', 'Meadowlands Loop', 'collector', 700, 45, 65, 1),
  makeEdge('E3', 'E4', 'Meadowlands Loop', 'collector', 700, 45, 65, 1),
  makeEdge('D4', 'E4', 'South Ring Corridor', 'arterial', 980, 55, 95, 2),
  makeEdge('E4', 'D4', 'South Ring Corridor', 'arterial', 980, 55, 95, 2),
];

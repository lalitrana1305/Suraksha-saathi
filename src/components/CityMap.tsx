import { memo, useMemo } from 'react';
import { GREENFIELD_NEIGHBORHOODS } from '../data/greenfieldCity';
import { DisasterType, EvacuationAgent, RoadEdge, SimulationState } from '../types/simulation';

const HAZARD_COLORS: Record<DisasterType, string> = {
  flood: '#38bdf8',
  wildfire: '#f97316',
  earthquake: '#eab308',
  chemical: '#a3e635',
  hurricane: '#c084fc',
};

const AGENT_COLORS: Record<EvacuationAgent['status'], string> = {
  waiting: '#94a3b8',
  moving: '#38bdf8',
  rerouting: '#fbbf24',
  evacuated: '#34d399',
  trapped: '#f43f5e',
};

const UNIT_GLYPH = { ambulance: 'A', rescue_truck: 'R', boat: 'B', helicopter: 'H' } as const;

interface RoadSegment {
  key: string;
  edges: RoadEdge[];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function roadColor(seg: RoadSegment): string {
  if (seg.edges.some((e) => e.isBlocked)) return '#ef4444';
  const load = Math.max(...seg.edges.map((e) => e.congestionRatio));
  if (load > 0.85) return '#f59e0b';
  if (load > 0.45) return '#facc15';
  if (seg.edges.some((e) => e.isContraFlow)) return '#5eead4';
  return '#475569';
}

interface Props {
  state: SimulationState;
  safeRouteOrigin: string | null;
  editable: boolean;
  onToggleRoad: (edgeIds: string[]) => void;
  onToggleShelter: (shelterId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

function CityMapInner({ state, safeRouteOrigin, editable, onToggleRoad, onToggleShelter, onSelectNode }: Props) {
  const { nodes, roads, shelters, agents, scenario, activeSafeRoute, rescueUnits } = state;
  const nodesMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const segments = useMemo(() => {
    const map = new Map<string, RoadSegment>();
    for (const e of roads) {
      const key = [e.fromNodeId, e.toNodeId].sort().join('|');
      const a = nodesMap.get(e.fromNodeId);
      const b = nodesMap.get(e.toNodeId);
      if (!a || !b) continue;
      const seg = map.get(key);
      if (seg) seg.edges.push(e);
      else map.set(key, { key, edges: [e], x1: a.position.x, y1: a.position.y, x2: b.position.x, y2: b.position.y });
    }
    return [...map.values()];
  }, [roads, nodesMap]);

  const edgesMap = useMemo(() => new Map(roads.map((e) => [e.id, e])), [roads]);

  const agentDots = useMemo(() => {
    const dots: { id: string; x: number; y: number; color: string }[] = [];
    for (const a of agents) {
      if (a.status === 'evacuated') continue;
      const j1 = hash(a.id) - 0.5;
      const j2 = hash(a.id + 'y') - 0.5;
      let x: number;
      let y: number;
      const edge = a.currentEdgeId ? edgesMap.get(a.currentEdgeId) : undefined;
      if ((a.status === 'moving' || a.status === 'rerouting') && edge) {
        const from = nodesMap.get(edge.fromNodeId)!;
        const to = nodesMap.get(edge.toNodeId)!;
        const t = Math.min(1, a.progressOnEdge);
        x = from.position.x + (to.position.x - from.position.x) * t + j1 * 6;
        y = from.position.y + (to.position.y - from.position.y) * t + j2 * 6;
      } else {
        const n = nodesMap.get(a.currentNodeId);
        if (!n) continue;
        x = n.position.x + j1 * 34;
        y = n.position.y + j2 * 34;
      }
      dots.push({ id: a.id, x, y, color: AGENT_COLORS[a.status] });
    }
    return dots;
  }, [agents, edgesMap, nodesMap]);

  const safePath = useMemo(() => {
    if (!activeSafeRoute) return null;
    return activeSafeRoute.routeNodeIds
      .map((id) => nodesMap.get(id))
      .filter(Boolean)
      .map((n) => `${n!.position.x},${n!.position.y}`)
      .join(' ');
  }, [activeSafeRoute, nodesMap]);

  const hazard = scenario.hazard;
  const hazardColor = HAZARD_COLORS[hazard.disasterType];

  return (
    <svg viewBox="0 0 1000 700" className="h-full w-full select-none" role="img" aria-label="Greenfield city evacuation map">
      <defs>
        <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.6" />
        </pattern>
        <radialGradient id="hazardGrad">
          <stop offset="0%" stopColor={hazardColor} stopOpacity="0.55" />
          <stop offset="70%" stopColor={hazardColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={hazardColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1000" height="700" fill="#0b1120" />
      <rect width="1000" height="700" fill="url(#grid)" />

      {/* Coastline & river */}
      <path d="M0 640 Q 140 600 260 690 L 260 700 L 0 700 Z" fill="#0c4a6e" opacity="0.45" />
      <path d="M 395 0 C 400 120, 385 220, 395 300 S 330 470, 300 520 S 250 640, 230 700" fill="none" stroke="#0e7490" strokeWidth="18" opacity="0.35" strokeLinecap="round" />
      <path d="M 1000 260 C 860 250, 700 230, 620 210 S 470 260, 398 280" fill="none" stroke="#0e7490" strokeWidth="10" opacity="0.3" strokeLinecap="round" />

      {GREENFIELD_NEIGHBORHOODS.map((nh) => (
        <g key={nh.id}>
          <circle cx={nh.center.x} cy={nh.center.y} r="105" fill={nh.color} opacity="0.07" />
          <text x={nh.center.x} y={nh.center.y - 78} textAnchor="middle" className="fill-slate-400 text-[13px] font-semibold uppercase tracking-[0.18em]">
            {nh.name}
          </text>
        </g>
      ))}

      {/* Hazard */}
      <g pointerEvents="none">
        <circle cx={hazard.epicenter.x} cy={hazard.epicenter.y} r={hazard.radiusMeters} fill="url(#hazardGrad)" />
        <circle cx={hazard.epicenter.x} cy={hazard.epicenter.y} r={hazard.radiusMeters} fill="none" stroke={hazardColor} strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" className="hazard-ring" />
        <circle cx={hazard.epicenter.x} cy={hazard.epicenter.y} r="7" fill={hazardColor} className="hazard-core" />
      </g>

      {/* Roads */}
      {segments.map((seg) => {
        const blocked = seg.edges.some((e) => e.isBlocked);
        const lanes = Math.max(...seg.edges.map((e) => e.lanes));
        const color = roadColor(seg);
        const name = seg.edges[0].name;
        return (
          <g key={seg.key} className="cursor-pointer" onClick={() => onToggleRoad(seg.edges.map((e) => e.id))}>
            <title>{`${name} — ${blocked ? 'CLOSED' : 'open'} (click to ${blocked ? 'reopen' : 'close'})`}</title>
            <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="transparent" strokeWidth="16" />
            <line
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={color}
              strokeWidth={2 + lanes * 1.5}
              strokeLinecap="round"
              strokeDasharray={blocked ? '8 6' : undefined}
              opacity={blocked ? 0.9 : 0.85}
              className="transition-colors duration-300 hover:opacity-100"
            />
          </g>
        );
      })}

      {safePath && (
        <polyline points={safePath} fill="none" stroke="#34d399" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" className="safe-route" pointerEvents="none" />
      )}

      {/* Agents */}
      <g pointerEvents="none">
        {agentDots.map((d) => (
          <circle key={d.id} cx={d.x} cy={d.y} r="2.3" fill={d.color} opacity="0.9" />
        ))}
      </g>

      {/* Nodes */}
      {nodes
        .filter((n) => n.type !== 'shelter')
        .map((n) => (
          <g key={n.id} className="cursor-pointer" onClick={() => onSelectNode(n.id)}>
            <title>{`${n.name} — click for safest route`}</title>
            <circle cx={n.position.x} cy={n.position.y} r="12" fill="transparent" />
            <circle
              cx={n.position.x}
              cy={n.position.y}
              r={n.id === safeRouteOrigin ? 7 : 4.5}
              fill={n.id === safeRouteOrigin ? '#34d399' : '#0f172a'}
              stroke={n.type === 'bridge_entry' ? '#22d3ee' : '#cbd5e1'}
              strokeWidth="1.5"
            />
          </g>
        ))}

      {/* Shelters */}
      {shelters.map((s) => {
        const pct = s.totalCapacity > 0 ? Math.min(1, s.currentOccupancy / s.totalCapacity) : 0;
        const r = 15;
        const circ = 2 * Math.PI * r;
        const fill = !s.isOpen ? '#334155' : pct > 0.9 ? '#f43f5e' : pct > 0.65 ? '#f59e0b' : '#34d399';
        return (
          <g
            key={s.id}
            className={editable ? 'cursor-pointer' : 'cursor-default'}
            onClick={() => editable && onToggleShelter(s.id)}
          >
            <title>{`${s.name}: ${s.currentOccupancy}/${s.totalCapacity} ${s.isOpen ? '' : '(closed)'}${editable ? ' — click to open/close' : ''}`}</title>
            <circle cx={s.position.x} cy={s.position.y} r={r} fill="#0f172a" stroke="#1e293b" strokeWidth="5" />
            <circle
              cx={s.position.x}
              cy={s.position.y}
              r={r}
              fill="none"
              stroke={fill}
              strokeWidth="5"
              strokeDasharray={`${circ * pct} ${circ}`}
              transform={`rotate(-90 ${s.position.x} ${s.position.y})`}
            />
            <rect x={s.position.x - 6} y={s.position.y - 6} width="12" height="12" rx="2" fill={s.isOpen ? '#34d399' : '#475569'} />
            <path d={`M ${s.position.x - 3.5} ${s.position.y} h 7 M ${s.position.x} ${s.position.y - 3.5} v 7`} stroke="#0f172a" strokeWidth="2" />
          </g>
        );
      })}

      {/* Rescue units */}
      <g pointerEvents="none">
        {(rescueUnits ?? []).map((u) => {
          const target = nodesMap.get(u.targetNodeId);
          const active = u.status !== 'idle';
          return (
            <g key={u.id}>
              {active && target && (
                <line x1={u.currentX} y1={u.currentY} x2={target.position.x} y2={target.position.y} stroke="#f472b6" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.8" />
              )}
              <circle cx={u.currentX} cy={u.currentY} r="9" fill={active ? '#db2777' : '#1e293b'} stroke="#f9a8d4" strokeWidth="1.5" className={active ? 'unit-active' : undefined} />
              <text x={u.currentX} y={u.currentY + 3.5} textAnchor="middle" className="fill-white font-mono text-[10px] font-bold">
                {UNIT_GLYPH[u.type]}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export const CityMap = memo(CityMapInner);

import { SimulationSnapshot, SimulationState } from '../types/simulation';
import { AgentCounts } from '../lib/simState';
import { Panel } from './ui';

const SERIES = [
  { key: 'evacuatedCount', label: 'Evacuated', color: '#34d399' },
  { key: 'movingCount', label: 'Moving', color: '#38bdf8' },
  { key: 'reroutingCount', label: 'Rerouting', color: '#fbbf24' },
  { key: 'waitingCount', label: 'Waiting', color: '#64748b' },
  { key: 'trappedCount', label: 'Trapped', color: '#f43f5e' },
] as const;

export function KpiRow({ counts, avgSpeed }: { counts: AgentCounts; avgSpeed: number }) {
  const pct = counts.total > 0 ? Math.round((counts.evacuated / counts.total) * 100) : 0;
  const tiles = [
    { label: 'Evacuated', value: counts.evacuated, sub: `${pct}% of ${counts.total}`, color: 'text-emerald-400' },
    { label: 'In transit', value: counts.moving + counts.rerouting, sub: `${counts.rerouting} rerouting`, color: 'text-sky-400' },
    { label: 'Awaiting', value: counts.waiting, sub: 'departure', color: 'text-slate-300' },
    { label: 'Trapped', value: counts.trapped, sub: 'need rescue', color: 'text-rose-400' },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t.label}</div>
            <div className={`font-mono text-2xl font-semibold tabular-nums ${t.color}`}>{t.value}</div>
            <div className="text-[11px] text-slate-500">{t.sub}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-slate-500">
          <span>Evacuation progress</span>
          <span className="font-mono">{avgSpeed.toFixed(1)} km/h avg</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
          {[
            [counts.evacuated, 'bg-emerald-400'],
            [counts.moving + counts.rerouting, 'bg-sky-400'],
            [counts.trapped, 'bg-rose-500'],
          ].map(([v, cls], i) => (
            <div key={i} className={`${cls} transition-all duration-300`} style={{ width: `${counts.total ? ((v as number) / counts.total) * 100 : 0}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimelineChart({ history }: { history: SimulationSnapshot[] }) {
  const W = 320;
  const H = 130;
  if (history.length < 2) {
    return (
      <Panel title="Evacuation timeline">
        <div className="flex h-[130px] items-center justify-center text-sm text-slate-500">Start the simulation to chart progress.</div>
      </Panel>
    );
  }
  const total = Math.max(1, history[history.length - 1].totalPopulation);
  const t0 = history[0].timeSec;
  const t1 = Math.max(t0 + 1, history[history.length - 1].timeSec);
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (v: number) => H - (v / total) * H;

  // Stacked areas, bottom to top
  const cumulative = history.map(() => 0);
  const areas = SERIES.map((s) => {
    const lower = [...cumulative];
    history.forEach((h, i) => (cumulative[i] += h[s.key]));
    const top = history.map((h, i) => `${x(h.timeSec)},${y(cumulative[i])}`);
    const bottom = history.map((h, i) => `${x(h.timeSec)},${y(lower[i])}`).reverse();
    return { ...s, d: `M${top.join(' L')} L${bottom.join(' L')} Z` };
  });
  const last = history[history.length - 1];

  return (
    <Panel title="Evacuation timeline">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[130px] w-full" preserveAspectRatio="none">
        {areas.map((a) => (
          <path key={a.key} d={a.d} fill={a.color} opacity="0.85" />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#0f172a" strokeWidth="1" />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label} <span className="font-mono text-slate-300">{last[s.key]}</span>
          </span>
        ))}
      </div>
    </Panel>
  );
}

export function ShelterList({ state }: { state: SimulationState }) {
  return (
    <Panel title="Shelter capacity">
      <ul className="space-y-2.5">
        {state.shelters.map((s) => {
          const pct = s.totalCapacity ? Math.min(100, (s.currentOccupancy / s.totalCapacity) * 100) : 0;
          const bar = pct > 90 ? 'bg-rose-500' : pct > 65 ? 'bg-amber-400' : 'bg-emerald-400';
          return (
            <li key={s.id} className={s.isOpen ? '' : 'opacity-40'}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-slate-200">{s.name}</span>
                <span className="shrink-0 font-mono text-xs text-slate-400">
                  {s.isOpen ? `${s.currentOccupancy}/${s.totalCapacity}` : 'CLOSED'}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full ${bar} transition-all duration-300`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-0.5 text-[11px] capitalize text-slate-500">{s.medicalLevel.replace('_', ' ')} · priority {s.priorityScore}</div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function BottleneckList({ state }: { state: SimulationState }) {
  const items = [...state.activeBottlenecks].sort((a, b) => b.densityRatio - a.densityRatio).slice(0, 6);
  return (
    <Panel title={`Active bottlenecks · ${state.activeBottlenecks.length}`}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No congested corridors detected.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.edgeId} className="flex items-center justify-between gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-sm">
              <span className="truncate text-amber-200">{b.roadName}</span>
              <span className="shrink-0 font-mono text-xs text-amber-300">
                {b.queueLength} veh · {Math.round(b.densityRatio * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

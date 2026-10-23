import { GREENFIELD_NEIGHBORHOODS } from '../data/greenfieldCity';
import { RescueUnit, SimulationRunResult, SimulationState } from '../types/simulation';
import { LogEntry } from '../lib/simState';
import { exportDatasetAsJSON } from '../lib/storage';
import { formatTime, Toggle } from './ui';

export function SafeRoutePanel({
  state,
  origin,
  onOriginChange,
}: {
  state: SimulationState;
  origin: string | null;
  onOriginChange: (nodeId: string) => void;
}) {
  const route = state.activeSafeRoute;
  const selectable = state.nodes.filter((n) => n.type !== 'shelter');
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="space-y-3">
        <p className="text-sm text-slate-400">Pick where you are — or click any junction on the map — to get the safest route to an open shelter with space.</p>
        <select
          value={origin ?? ''}
          onChange={(e) => onOriginChange(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="" disabled>
            Select your location…
          </option>
          {GREENFIELD_NEIGHBORHOODS.map((nh) => (
            <optgroup key={nh.id} label={nh.name}>
              {selectable
                .filter((n) => n.neighborhoodId === nh.id)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {route && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Distance', `${(route.totalDistanceMeters / 1000).toFixed(1)} km`],
              ['ETA', `${route.estimatedMinutes} min`],
              ['Safety', `${route.hazardAvoidanceScore}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-950/70 py-2">
                <div className="font-mono text-base text-emerald-300">{v}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        {!origin ? (
          <div className="flex h-full min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">No location selected</div>
        ) : !route ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            No safe route available — all paths are closed or shelters are full. Shelter in place and request rescue.
          </div>
        ) : (
          <div>
            <div className="mb-2 text-sm text-slate-300">
              Go to <span className="font-semibold text-emerald-300">{route.assignedShelter.name}</span>
            </div>
            <ol className="space-y-1.5">
              {route.steps.map((s) => (
                <li key={s.stepIndex} className="flex gap-3 rounded-md bg-slate-950/60 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-slate-500">{String(s.stepIndex).padStart(2, '0')}</span>
                  <span className="flex-1 text-slate-200">{s.instruction}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase leading-5 ${
                      s.status === 'clear' ? 'bg-emerald-500/15 text-emerald-300' : s.status === 'caution' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-400">{(s.distanceMeters / 1000).toFixed(2)} km</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

const UNIT_LABEL: Record<RescueUnit['type'], string> = {
  ambulance: 'Ambulance',
  rescue_truck: 'Rescue truck',
  boat: 'Boat',
  helicopter: 'Helicopter',
};

const STATUS_STYLE: Record<RescueUnit['status'], string> = {
  idle: 'bg-slate-700/60 text-slate-300',
  dispatched: 'bg-pink-500/20 text-pink-300',
  on_scene: 'bg-amber-500/20 text-amber-300',
  transporting: 'bg-sky-500/20 text-sky-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
};

export function RescuePanel({
  units,
  autoDispatch,
  onAutoDispatchChange,
  onDispatch,
  canDispatch,
}: {
  units: RescueUnit[];
  autoDispatch: boolean;
  onAutoDispatchChange: (v: boolean) => void;
  onDispatch: (unitId: string) => void;
  canDispatch: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Units respond to trapped evacuees automatically, or send them to sweep the hazard zone.</p>
        <div className="w-56">
          <Toggle label="Auto-dispatch to trapped" checked={autoDispatch} onChange={onAutoDispatchChange} />
        </div>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {units.map((u) => (
          <li key={u.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-100">{u.callSign}</div>
                <div className="text-[11px] text-slate-500">
                  {UNIT_LABEL[u.type]} · capacity {u.maxCapacity}
                  {u.patientsCarried > 0 && ` · carrying ${u.patientsCarried}`}
                </div>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[u.status]}`}>{u.status.replace('_', ' ')}</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="line-clamp-2 text-xs text-slate-400">{u.status === 'idle' ? u.logMessage : u.targetDescription}</p>
              {u.status === 'idle' && (
                <button
                  type="button"
                  disabled={!canDispatch}
                  onClick={() => onDispatch(u.id)}
                  className="shrink-0 rounded-md bg-pink-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sweep zone
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LOG_STYLE: Record<LogEntry['kind'], string> = {
  info: 'text-slate-400',
  warn: 'text-amber-300',
  dispatch: 'text-pink-300',
  success: 'text-emerald-300',
  alert: 'text-sky-300',
};

export function EventLog({ log }: { log: LogEntry[] }) {
  return (
    <ul className="max-h-72 space-y-1 overflow-y-auto font-mono text-xs">
      {log.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className="shrink-0 text-slate-600">T+{formatTime(e.timeSec)}</span>
          <span className={LOG_STYLE[e.kind]}>{e.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function HistoryPanel({ results }: { results: SimulationRunResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-slate-500">Completed runs are saved in this browser and appear here for comparison.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-1.5 pr-3 font-semibold">Scenario</th>
            <th className="py-1.5 pr-3 font-semibold">Strategy</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Evacuated</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Trapped</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Duration</th>
            <th className="py-1.5 pr-3 text-right font-semibold">Avg time</th>
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {results.map((r) => (
            <tr key={r.id}>
              <td className="max-w-56 truncate py-2 pr-3 text-slate-200">{r.scenarioTitle}</td>
              <td className="max-w-44 truncate py-2 pr-3 text-slate-400">{r.strategyUsed.name}</td>
              <td className="py-2 pr-3 text-right font-mono text-emerald-300">
                {r.totalPopulation ? Math.round((r.evacuatedCount / r.totalPopulation) * 100) : 0}%
              </td>
              <td className="py-2 pr-3 text-right font-mono text-rose-300">{r.trappedCount}</td>
              <td className="py-2 pr-3 text-right font-mono text-slate-300">{formatTime(r.totalDurationSec)}</td>
              <td className="py-2 pr-3 text-right font-mono text-slate-300">{formatTime(r.averageEvacuationTimeSec)}</td>
              <td className="py-2 text-right">
                <button type="button" onClick={() => exportDatasetAsJSON(`suraksha-run-${r.id}.json`, r)} className="text-xs text-sky-400 hover:text-sky-300">
                  JSON
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

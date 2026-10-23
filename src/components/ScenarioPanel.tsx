import { DisasterScenario, DisasterType, SimulationStrategy } from '../types/simulation';
import { Panel, Toggle } from './ui';

export const DISASTER_META: Record<DisasterType, { label: string; dot: string }> = {
  flood: { label: 'Flood', dot: 'bg-sky-400' },
  wildfire: { label: 'Wildfire', dot: 'bg-orange-500' },
  earthquake: { label: 'Earthquake', dot: 'bg-yellow-400' },
  chemical: { label: 'Chemical', dot: 'bg-lime-400' },
  hurricane: { label: 'Hurricane', dot: 'bg-purple-400' },
};

const SEVERITY_STYLE = {
  low: 'text-emerald-300 border-emerald-500/40',
  moderate: 'text-yellow-300 border-yellow-500/40',
  high: 'text-orange-300 border-orange-500/40',
  critical: 'text-rose-300 border-rose-500/40',
};

const ALGORITHMS: { id: SimulationStrategy['shelterAssignmentAlgorithm']; label: string }[] = [
  { id: 'nearest', label: 'Nearest shelter' },
  { id: 'capacity_balanced', label: 'Capacity balanced' },
  { id: 'multi_objective', label: 'Multi-objective' },
];

export function ScenarioList({
  scenarios,
  activeId,
  onSelect,
  onDelete,
  locked,
}: {
  scenarios: DisasterScenario[];
  activeId: string;
  onSelect: (s: DisasterScenario) => void;
  onDelete: (id: string) => void;
  locked: boolean;
}) {
  return (
    <Panel title="Disaster scenarios">
      <ul className="space-y-1.5">
        {scenarios.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={locked && !active}
                onClick={() => onSelect(s)}
                className={`group w-full rounded-lg border px-3 py-2 text-left transition ${
                  active ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DISASTER_META[s.disasterType].dot}`} />
                  <span className="line-clamp-1 flex-1 text-sm font-medium text-slate-100">{s.title}</span>
                  {!s.isPreset && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Delete scenario"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                      className="hidden text-xs text-slate-500 hover:text-rose-400 group-hover:inline"
                    >
                      ✕
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className={`rounded border px-1.5 uppercase ${SEVERITY_STYLE[s.severity]}`}>{s.severity}</span>
                  <span>{s.populationSize.toLocaleString()} residents</span>
                  {!s.isPreset && <span className="text-sky-400">custom</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function StrategyPanel({
  scenario,
  locked,
  onChange,
  onSave,
}: {
  scenario: DisasterScenario;
  locked: boolean;
  onChange: (s: DisasterScenario) => void;
  onSave: () => void;
}) {
  const st = scenario.strategy;
  const setStrategy = (patch: Partial<SimulationStrategy>) =>
    onChange({ ...scenario, strategy: { ...st, ...patch, id: 'strat-custom', name: 'Custom strategy' } });

  return (
    <Panel
      title="Evacuation strategy"
      action={
        <button type="button" onClick={onSave} disabled={locked} className="text-xs font-medium text-sky-400 hover:text-sky-300 disabled:opacity-40">
          Save as custom
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-slate-400">{scenario.description}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Population</span>
            <span className="font-mono text-slate-200">{scenario.populationSize}</span>
          </div>
          <input
            type="range"
            min={200}
            max={2000}
            step={50}
            value={scenario.populationSize}
            disabled={locked}
            onChange={(e) => onChange({ ...scenario, populationSize: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Shelter assignment</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-950 p-1">
            {ALGORITHMS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={locked}
                onClick={() => setStrategy({ shelterAssignmentAlgorithm: a.id })}
                className={`rounded-md px-1 py-1.5 text-[11px] font-medium leading-tight transition disabled:opacity-50 ${
                  st.shelterAssignmentAlgorithm === a.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Contra-flow on arterials" checked={st.useContraFlow} disabled={locked} onChange={(v) => setStrategy({ useContraFlow: v })} />
        <Toggle label="Staggered zone departure" checked={st.staggeredEvacuation} disabled={locked} onChange={(v) => setStrategy({ staggeredEvacuation: v })} />
        <p className="text-[11px] text-slate-500">
          {locked ? 'Reset the run to change strategy.' : 'Click roads on the map to close or reopen them, and shelters to open or close them.'}
        </p>
      </div>
    </Panel>
  );
}

import { DisasterScenario, SimulationRunResult, SimulationState } from '../types/simulation';
import { PRESET_SCENARIOS } from '../data/presetScenarios';

const SCENARIOS_KEY = 'bharat_suraksha_scenarios_v1';
const RESULTS_KEY = 'bharat_suraksha_results_v1';
const SETTINGS_KEY = 'bharat_suraksha_settings_v1';

export interface AppSettings {
  soundEnabled: boolean;
  theme: 'dark' | 'light';
  defaultSpeed: number;
  renderMode: 'agents' | 'density' | 'both';
  autoReRouteBlocked: boolean;
  staggerDepartureDefault: boolean;
  showContours: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  theme: 'dark',
  defaultSpeed: 2,
  renderMode: 'both',
  autoReRouteBlocked: true,
  staggerDepartureDefault: true,
  showContours: true,
};

export function getStoredScenarios(): DisasterScenario[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) {
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(PRESET_SCENARIOS));
      return PRESET_SCENARIOS;
    }
    const parsed: DisasterScenario[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : PRESET_SCENARIOS;
  } catch {
    return PRESET_SCENARIOS;
  }
}

export function saveScenario(scenario: DisasterScenario): void {
  try {
    const all = getStoredScenarios();
    const existingIndex = all.findIndex((s) => s.id === scenario.id);
    if (existingIndex >= 0) {
      all[existingIndex] = scenario;
    } else {
      all.unshift(scenario);
    }
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save scenario:', err);
  }
}

export function deleteScenario(id: string): void {
  try {
    const all = getStoredScenarios();
    const filtered = all.filter((s) => s.id !== id);
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete scenario:', err);
  }
}

export function getStoredResults(): SimulationRunResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSimulationResult(result: SimulationRunResult): void {
  try {
    const all = getStoredResults();
    all.unshift(result);
    // Keep top 25 recent runs
    const trimmed = all.slice(0, 25);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save simulation result:', err);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

/**
 * Compiles a comprehensive SimulationRunResult from a SimulationState
 */
export function buildRunResult(state: SimulationState): SimulationRunResult {
  const { scenario, elapsedSec, agents, shelters, roads, activeBottlenecks, recentHistory } = state;
  const evacuatedAgents = agents.filter((a) => a.status === 'evacuated');
  const trappedAgents = agents.filter((a) => a.status === 'trapped');

  const avgEvacTime =
    evacuatedAgents.length > 0
      ? evacuatedAgents.reduce((sum, a) => sum + a.totalTimeSec, 0) / evacuatedAgents.length
      : 0;

  // Find most critical roads
  const criticalRoads = roads
    .filter((r) => r.congestionRatio > 0.4 || r.isBlocked)
    .sort((a, b) => b.congestionRatio - a.congestionRatio)
    .slice(0, 6)
    .map((r) => ({
      roadId: r.id,
      roadName: r.name,
      maxCongestion: r.congestionRatio,
      durationSec: Math.round(elapsedSec * 0.6),
    }));

  const shelterSummaries = shelters.map((s) => ({
    shelterId: s.id,
    name: s.name,
    capacity: s.totalCapacity,
    finalOccupancy: s.currentOccupancy,
    peakOccupancy: Math.max(s.currentOccupancy, s.assignedCount),
  }));

  return {
    id: `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    disasterType: scenario.disasterType,
    totalPopulation: agents.length,
    evacuatedCount: evacuatedAgents.length,
    trappedCount: trappedAgents.length,
    totalDurationSec: Math.round(elapsedSec),
    averageEvacuationTimeSec: Math.round(avgEvacTime),
    peakBottlenecks: Math.max(activeBottlenecks.length, ...recentHistory.map((h) => h.activeBottlenecks)),
    criticalRoads,
    shelterSummaries,
    timeline: recentHistory,
    bottlenecksDetected: activeBottlenecks,
    strategyUsed: scenario.strategy,
    completedAt: new Date().toISOString(),
  };
}

export function exportDatasetAsJSON(filename: string, data: unknown): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTimelineAsCSV(filename: string, timeline: SimulationState['recentHistory']): void {
  if (timeline.length === 0) return;
  const headers = ['Time_Sec', 'Evacuated', 'Moving', 'Waiting', 'Trapped', 'Bottlenecks', 'Avg_Speed_kmh'];
  const rows = timeline.map((t) => [
    t.timeSec,
    t.evacuatedCount,
    t.movingCount,
    t.waitingCount,
    t.trappedCount,
    t.activeBottlenecks,
    t.averageSpeedKmh,
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

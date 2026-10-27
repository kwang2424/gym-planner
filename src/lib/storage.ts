import { estimate1RM } from './rpe';
import type { AppState } from './types';

const KEY = 'gym-planner:v1';

/** Starting point, seeded from the numbers you gave (squat 235×4 treated as a max-effort 4, incline DB 40×6). */
export function initialState(now: Date = new Date()): AppState {
  const date = now.toISOString();
  const squat = Math.round(estimate1RM(235, 4, 10) * 10) / 10;
  return {
    version: 1,
    week: 1,
    day: 0,
    lifts: {
      back_squat: { e1rm: squat, missStreak: 0, history: [{ date, value: squat }] },
      incline_db: { load: 40, missStreak: 0, history: [{ date, value: 40 }] },
    },
    swaps: {},
    sessions: [],
    settings: { restMainSec: 180, restAccSec: 90, barWeight: 45 },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return parseState(raw);
  } catch {
    // Storage blocked or corrupt — start fresh.
  }
  return initialState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode errors; export is the durable backup.
  }
}

export function parseState(raw: string): AppState {
  const data = JSON.parse(raw) as Partial<AppState>;
  if (data.version !== 1 || typeof data.week !== 'number' || typeof data.day !== 'number') {
    throw new Error('Not a Gym Planner backup');
  }
  const base = initialState();
  return {
    ...base,
    ...data,
    lifts: data.lifts ?? {},
    swaps: data.swaps ?? {},
    sessions: data.sessions ?? [],
    settings: { ...base.settings, ...(data.settings ?? {}) },
  } as AppState;
}

import { estimate1RM } from './rpe';
import type { AppState, Session } from './types';

const KEY = 'gym-planner:v1';

/** Date of the seed workout (Lower A, done before the app existed). */
export const SEED_DATE = '2026-10-27T18:00:00.000Z';

/**
 * Starting point, seeded from the workout you logged on Oct 27:
 *   Back squat 225×4, then 235 for 4 sets of 3
 *   Bulgarian split squat 15 lb dumbbells, 4×8
 * Squat estimate assumes the last 235×3 set was RPE 9 (~1 rep left).
 * Incline DB 40×6 comes from what you reported earlier.
 * That workout counts as Lower A, so the program starts at Upper A.
 */
export function initialState(): AppState {
  const date = SEED_DATE;
  const squat = Math.round(estimate1RM(235, 3, 9) * 10) / 10;
  const seed: Session = {
    id: 'seed-2026-10-27',
    date,
    week: 1,
    day: 0,
    readiness: 'ok',
    entries: [
      {
        slotKey: 'd1-main',
        exerciseId: 'back_squat',
        scheme: { type: 'topBackoff' },
        planned: [
          { kind: 'top', reps: 4, rpe: 8 },
          ...Array.from({ length: 4 }, () => ({ kind: 'backoff' as const, reps: 3, rpe: 9 })),
        ],
        logged: [
          { load: 225, reps: 4 },
          ...Array.from({ length: 4 }, () => ({ load: 235, reps: 3 })),
        ],
      },
      {
        slotKey: 'd1-single',
        exerciseId: 'rfess',
        scheme: { type: 'double', sets: 4, repMin: 6, repMax: 10, rir: 2 },
        planned: Array.from({ length: 4 }, () => ({ kind: 'work' as const, reps: 6, repMax: 10, rir: 2, load: 15 })),
        logged: Array.from({ length: 4 }, () => ({ load: 15, reps: 8 })),
      },
    ],
  };
  return {
    version: 1,
    updatedAt: 0,
    week: 1,
    day: 1,
    lifts: {
      back_squat: { e1rm: squat, missStreak: 0, lastDone: date, history: [{ date, value: squat }] },
      rfess: { load: 15, missStreak: 0, lastDone: date, history: [{ date, value: 15 }] },
      incline_db: { load: 40, missStreak: 0, history: [{ date, value: 40 }] },
    },
    swaps: {},
    sessions: [seed],
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
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  } as AppState;
}

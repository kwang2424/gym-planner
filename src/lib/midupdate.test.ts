import { expect, it } from 'vitest';
import { applySession } from './progression';
import { parseState, initialState } from './storage';
import type { Session } from './types';

// A workout started on an older version: old Upper A order, landmine press, plain pull-ups.
it('a workout started before an update survives reload and finishes normally', () => {
  const active: Session = {
    id: 'old', date: '2026-10-29T18:00:00Z', week: 1, day: 1, readiness: 'ok',
    entries: [
      { slotKey: 'd2-main', exerciseId: 'bench', scheme: { type: 'topBackoff' },
        planned: [{ kind: 'calibrate', reps: 6, rpe: 7 }, { kind: 'backoff', reps: 6, rpe: 6 }],
        logged: [{ load: 115, reps: 6, rir: 3 }, null] },
      { slotKey: 'd2-press', exerciseId: 'landmine_press', scheme: { type: 'double', sets: 3, repMin: 8, repMax: 12, rir: 2 },
        planned: Array.from({ length: 3 }, () => ({ kind: 'work' as const, reps: 8, repMax: 12, rir: 2 })),
        logged: [{ load: 25, reps: 10 }, null, null] },
      { slotKey: 'd2-vpull', exerciseId: 'pullup', scheme: { type: 'double', sets: 3, repMin: 5, repMax: 10, rir: 2 },
        planned: Array.from({ length: 3 }, () => ({ kind: 'work' as const, reps: 5, repMax: 10, rir: 2, load: 0 })),
        logged: [null, null, null] },
    ],
  };
  const saved = JSON.stringify({ ...initialState(), updatedAt: 123, active, lifts: { back_squat: { e1rm: 263, missStreak: 0, history: [] } } });
  const st = parseState(saved);
  expect(st.active?.entries.map((e) => e.exerciseId)).toEqual(['bench', 'landmine_press', 'pullup']);
  expect(st.active?.entries[0].logged[0]).toEqual({ load: 115, reps: 6, rir: 3 });
  const { state } = applySession(st, st.active!);
  expect(state.lifts.bench.e1rm).toBeGreaterThan(130);
  expect(state.sessions.at(-1)?.id).toBe('old');
  expect(state.active).toBeUndefined();
});

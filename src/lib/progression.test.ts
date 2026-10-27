import { describe, expect, it } from 'vitest';
import { weekInfo } from './program';
import { applySession, buildSession, replan } from './progression';
import { estimate1RM, loadFor, pctOf1RM } from './rpe';
import { initialState } from './storage';
import type { AppState, Entry, Session } from './types';

const NOW = new Date('2026-11-02T18:00:00Z');

function fresh(): AppState {
  return initialState(NOW);
}

function entry(s: Session, key: string): Entry {
  const e = s.entries.find((x) => x.slotKey === key);
  if (!e) throw new Error(key);
  return e;
}

describe('rpe math', () => {
  it('1 rep at RPE 10 is 100%', () => {
    expect(pctOf1RM(1, 10)).toBe(1);
  });
  it('round-trips load and e1RM', () => {
    const e1 = estimate1RM(235, 4, 10);
    expect(loadFor(e1, 4, 10)).toBeCloseTo(235, 5);
    expect(e1).toBeGreaterThan(260);
    expect(e1).toBeLessThan(266);
  });
  it('half RPE steps interpolate', () => {
    expect(pctOf1RM(5, 8.5)).toBeLessThan(pctOf1RM(5, 9));
    expect(pctOf1RM(5, 8.5)).toBeGreaterThan(pctOf1RM(5, 8));
  });
});

describe('weekInfo', () => {
  it('ramps effort and drops reps across blocks', () => {
    expect(weekInfo(1)).toMatchObject({ topReps: 6, topRpe: 7, deload: false });
    expect(weekInfo(3)).toMatchObject({ topReps: 6, topRpe: 8 });
    expect(weekInfo(4)).toMatchObject({ deload: true, topRpe: 6 });
    expect(weekInfo(5)).toMatchObject({ topReps: 4, topRpe: 7.5 });
    expect(weekInfo(11)).toMatchObject({ topReps: 3, topRpe: 9 });
    expect(weekInfo(12)).toMatchObject({ test: true, topReps: 1, backoffSets: 0 });
    expect(weekInfo(13)).toMatchObject({ cycle: 2, topReps: 6, topRpe: 7 });
  });
});

describe('buildSession', () => {
  it('prescribes squat from the seeded estimate', () => {
    const s = buildSession(fresh(), 'good', NOW);
    const sq = entry(s, 'd1-main');
    expect(sq.exerciseId).toBe('back_squat');
    expect(sq.planned[0]).toMatchObject({ kind: 'top', reps: 6, rpe: 7 });
    expect(sq.planned[0].load! % 5).toBe(0);
    expect(sq.planned).toHaveLength(4);
  });

  it('asks to calibrate lifts with no history', () => {
    const st = { ...fresh(), day: 1 };
    const bench = entry(buildSession(st, 'good', NOW), 'd2-main');
    expect(bench.planned[0].kind).toBe('calibrate');
    expect(bench.planned[0].load).toBeUndefined();
    expect(bench.note).toMatch(/No estimate/);
  });

  it('rough day trims a set and lowers effort', () => {
    const good = entry(buildSession(fresh(), 'good', NOW), 'd1-main');
    const rough = entry(buildSession(fresh(), 'rough', NOW), 'd1-main');
    expect(rough.planned.length).toBe(good.planned.length - 1);
    expect(rough.planned[0].load!).toBeLessThan(good.planned[0].load!);
  });

  it('eases off after two weeks away from a lift', () => {
    const st = fresh();
    st.lifts.back_squat = { ...st.lifts.back_squat, lastDone: '2026-10-01T00:00:00Z' };
    const sq = entry(buildSession(st, 'good', NOW), 'd1-main');
    const normal = entry(buildSession(fresh(), 'good', NOW), 'd1-main');
    expect(sq.planned[0].load!).toBeLessThan(normal.planned[0].load!);
    expect(sq.note).toMatch(/2\+ weeks/);
  });

  it('uses swaps', () => {
    const st = { ...fresh(), day: 1, swaps: { 'd2-main': 'floor_press' } };
    expect(entry(buildSession(st, 'good', NOW), 'd2-main').exerciseId).toBe('floor_press');
  });
});

describe('replan during a session', () => {
  it('lowers back-offs when the top set misses reps', () => {
    const s = buildSession(fresh(), 'good', NOW);
    const sq = entry(s, 'd1-main');
    const top = sq.planned[0];
    const after = replan({ ...sq, logged: [{ load: top.load!, reps: top.reps - 2 }, null, null, null] }, 45);
    expect(after.planned[1].load!).toBeLessThan(sq.planned[1].load!);
    expect(after.note).toMatch(/harder than planned/);
  });

  it('raises back-offs when the top set was easy (reported RIR)', () => {
    const sq = entry(buildSession(fresh(), 'good', NOW), 'd1-main');
    const top = sq.planned[0];
    const after = replan({ ...sq, logged: [{ load: top.load!, reps: top.reps, rir: 5 }, null, null, null] }, 45);
    expect(after.planned[1].load!).toBeGreaterThan(sq.planned[1].load!);
  });

  it('drops the rest of the back-offs after a missed back-off', () => {
    const sq = entry(buildSession(fresh(), 'good', NOW), 'd1-main');
    const [top, b1] = sq.planned;
    const after = replan(
      { ...sq, logged: [{ load: top.load!, reps: top.reps }, { load: b1.load!, reps: b1.reps - 2 }, null, null] },
      45,
    );
    expect(after.planned[2].load!).toBeLessThan(sq.planned[2].load!);
  });

  it('drops accessory load ~10% after falling below the rep range', () => {
    const rdl = entry(buildSession(fresh(), 'good', NOW), 'd1-hinge');
    const after = replan({ ...rdl, logged: [{ load: 135, reps: 4 }, null, null] }, 45);
    expect(after.planned[1].load).toBe(120);
    expect(after.planned[2].load).toBe(120);
  });

  it('carries a first-time accessory load forward', () => {
    const rdl = entry(buildSession(fresh(), 'good', NOW), 'd1-hinge');
    const after = replan({ ...rdl, logged: [{ load: 135, reps: 8 }, null, null] }, 45);
    expect(after.planned[1].load).toBe(135);
  });
});

describe('applySession', () => {
  function finish(st: AppState, mutate: (s: Session) => void) {
    const s = buildSession(st, 'good', NOW);
    mutate(s);
    return applySession(st, s);
  }

  it('advances the day and wraps the week', () => {
    let st = fresh();
    for (let i = 0; i < 4; i++) st = finish(st, () => {}).state;
    expect(st.week).toBe(2);
    expect(st.day).toBe(0);
    expect(st.sessions).toHaveLength(4);
  });

  it('raises e1RM (capped) when everything is hit', () => {
    const st = fresh();
    const before = st.lifts.back_squat.e1rm!;
    const { state, changes } = finish(st, (s) => {
      const i = s.entries.findIndex((e) => e.slotKey === 'd1-main');
      const e = s.entries[i];
      // Top set done for 2 extra reps at the same weight.
      s.entries[i] = { ...e, logged: e.planned.map((p, k) => ({ load: p.load!, reps: k === 0 ? p.reps + 2 : p.reps })) };
    });
    const after = state.lifts.back_squat.e1rm!;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(before * 1.05 + 0.1);
    expect(changes.find((c) => c.exerciseId === 'back_squat')!.status).toBe('up');
  });

  it('one miss moves the estimate halfway; two misses reset it', () => {
    const missSquat = (s: Session) => {
      const i = s.entries.findIndex((e) => e.slotKey === 'd1-main');
      const e = s.entries[i];
      s.entries[i] = { ...e, logged: e.planned.map((p) => ({ load: p.load!, reps: p.reps - 2 })) };
    };
    const st0 = fresh();
    const e0 = st0.lifts.back_squat.e1rm!;
    const r1 = finish(st0, missSquat);
    const e1 = r1.state.lifts.back_squat.e1rm!;
    expect(e1).toBeLessThan(e0);
    expect(r1.state.lifts.back_squat.missStreak).toBe(1);

    // Jump back to Lower A next week and miss again.
    const st1 = { ...r1.state, day: 0 };
    const r2 = finish(st1, missSquat);
    const c = r2.changes.find((x) => x.exerciseId === 'back_squat')!;
    expect(c.status).toBe('reset');
    expect(r2.state.lifts.back_squat.missStreak).toBe(0);
    expect(r2.state.lifts.back_squat.e1rm!).toBeLessThan(e1);
  });

  it('calibrates a new lift from the logged set', () => {
    const st = { ...fresh(), day: 1 };
    const { state } = finish(st, (s) => {
      const i = s.entries.findIndex((e) => e.slotKey === 'd2-main');
      const e = s.entries[i];
      s.entries[i] = { ...e, logged: e.planned.map((p) => ({ load: 125, reps: p.reps, rir: 3 })) };
    });
    expect(state.lifts.bench.e1rm).toBeCloseTo(estimate1RM(125, 6, 7), 0);
  });

  it('double progression: bumps at top of range, holds in range, drops after two misses', () => {
    const st = { ...fresh(), day: 3 };
    const setRows = (reps: number) => (s: Session) => {
      const i = s.entries.findIndex((e) => e.slotKey === 'd4-press');
      const e = s.entries[i];
      s.entries[i] = { ...e, logged: e.planned.map((p) => ({ load: p.load!, reps })) };
    };
    expect(finish(st, setRows(10)).state.lifts.incline_db.load).toBe(45);
    expect(finish(st, setRows(8)).state.lifts.incline_db.load).toBe(40);
    const m1 = finish(st, setRows(4));
    expect(m1.state.lifts.incline_db.load).toBe(40);
    const m2 = finish({ ...m1.state, day: 3 }, setRows(4));
    expect(m2.state.lifts.incline_db.load).toBe(35);
  });

  it('skipped exercises leave lifts untouched', () => {
    const st = fresh();
    const { state } = finish(st, () => {});
    expect(state.lifts.back_squat).toEqual(st.lifts.back_squat);
  });
});

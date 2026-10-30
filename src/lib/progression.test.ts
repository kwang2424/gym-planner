import { describe, expect, it } from 'vitest';
import { weekInfo } from './program';
import { applySession, buildSession, effectiveRpe, isMiss, replan } from './progression';
import { estimate1RM, loadFor, pctOf1RM } from './rpe';
import { initialState } from './storage';
import type { AppState, Entry, Session } from './types';

const NOW = new Date('2026-11-02T18:00:00Z');

/** Seeded state, rewound to the start of the week with no history. */
function fresh(): AppState {
  return { ...initialState(), day: 0, sessions: [] };
}

function entry(s: Session, key: string): Entry {
  const e = s.entries.find((x) => x.slotKey === key);
  if (!e) throw new Error(key);
  return e;
}

describe('seed from the Oct 27 workout', () => {
  it('starts at Upper A with squat and split squat numbers', () => {
    const st = initialState();
    expect(st.day).toBe(1);
    expect(st.sessions).toHaveLength(1);
    expect(st.lifts.back_squat.e1rm).toBeCloseTo(estimate1RM(235, 3, 9), 0);
    expect(st.lifts.rfess.load).toBe(15);
  });
});

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
    expect(weekInfo(1)).toMatchObject({ topReps: 5, topRpe: 7, deload: false, single: false });
    expect(weekInfo(3)).toMatchObject({ topReps: 5, topRpe: 8 });
    expect(weekInfo(5)).toMatchObject({ topReps: 4, topRpe: 7.5, single: true });
    expect(weekInfo(11)).toMatchObject({ topReps: 3, topRpe: 9, single: true });
    expect(weekInfo(12)).toMatchObject({ test: true, topReps: 1, backoffSets: 0, single: false });
    expect(weekInfo(13)).toMatchObject({ cycle: 2, topReps: 5, topRpe: 7 });
  });

  it('lighter weeks cut volume but keep a heavy-ish top set', () => {
    expect(weekInfo(4)).toMatchObject({ deload: true, topRpe: 7, backoffSets: 1, single: false });
    expect(weekInfo(8)).toMatchObject({ deload: true, topRpe: 7, backoffSets: 1 });
  });
});

describe('buildSession', () => {
  it('prescribes squat from the seeded estimate', () => {
    const s = buildSession(fresh(), 'good', NOW);
    const sq = entry(s, 'd1-main');
    expect(sq.exerciseId).toBe('back_squat');
    expect(sq.planned[0]).toMatchObject({ kind: 'top', reps: 5, rpe: 7 });
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
    expect(state.lifts.bench.e1rm).toBeCloseTo(estimate1RM(125, 5, 6.75), 0); // 3 reported left, +0.25 bias correction
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

describe('heavier, evidence-aligned progression', () => {
  it('adds a heavy single before the top set in Build/Peak blocks', () => {
    const st = { ...fresh(), week: 5 };
    const sq = entry(buildSession(st, 'good', NOW), 'd1-main');
    expect(sq.planned[0]).toMatchObject({ kind: 'single', reps: 1, rpe: 8 });
    expect(sq.planned[1].kind).toBe('top');
    expect(sq.planned[0].load!).toBeGreaterThan(sq.planned[1].load!);
  });

  it('skips the single on a rough day', () => {
    const sq = entry(buildSession({ ...fresh(), week: 5 }, 'rough', NOW), 'd1-main');
    expect(sq.planned[0].kind).toBe('top');
  });

  it('an easy single raises the top set; a grinder lowers it', () => {
    const sq = entry(buildSession({ ...fresh(), week: 5 }, 'good', NOW), 'd1-main');
    const blank = sq.planned.map(() => null);
    const easy = replan({ ...sq, logged: [{ load: sq.planned[0].load!, reps: 1, rir: 4 }, ...blank.slice(1)] }, 45);
    const hard = replan({ ...sq, logged: [{ load: sq.planned[0].load!, reps: 1, rir: 0 }, ...blank.slice(1)] }, 45);
    expect(easy.planned[1].load!).toBeGreaterThan(sq.planned[1].load!);
    expect(easy.planned[1].load!).toBeLessThanOrEqual(Math.ceil((sq.planned[1].load! * 1.05) / 5) * 5);
    expect(hard.planned[1].load!).toBeLessThan(sq.planned[1].load!);
  });

  it('e1RM is updated from the top set, not the single', () => {
    const st = { ...fresh(), week: 5 };
    const s = buildSession(st, 'good', NOW);
    const i = s.entries.findIndex((e) => e.slotKey === 'd1-main');
    const e = s.entries[i];
    s.entries[i] = {
      ...e,
      logged: e.planned.map((p) => ({ load: p.load!, reps: p.reps, rir: p.kind === 'single' ? 0 : 10 - p.rpe! })),
    };
    const { state } = applySession(st, s);
    // Top set hit exactly on target: not counted as a miss.
    expect(state.lifts.back_squat.missStreak).toBe(0);
  });

  it('a made set with no reps-left logged never lowers the estimate (the 12-week test covers the climb)', () => {
    const st = fresh();
    const before = st.lifts.back_squat.e1rm!;
    const s = buildSession(st, 'good', NOW);
    const i = s.entries.findIndex((e) => e.slotKey === 'd1-main');
    s.entries[i] = { ...s.entries[i], logged: s.entries[i].planned.map((p) => ({ load: p.load!, reps: p.reps })) };
    expect(applySession(st, s).state.lifts.back_squat.e1rm!).toBeGreaterThanOrEqual(before);
  });

  it('adds back a quarter rep to reported reps-left, except at 0', () => {
    const plan = { kind: 'top' as const, reps: 5, rpe: 8 };
    expect(effectiveRpe({ load: 200, reps: 5, rir: 2 }, plan)).toBe(7.75);
    expect(effectiveRpe({ load: 200, reps: 5, rir: 0 }, plan)).toBe(10);
  });

  it('reporting one rep fewer left than planned is not a miss (normal guessing error)', () => {
    const plan = { kind: 'top' as const, reps: 5, rpe: 8 };
    expect(isMiss({ load: 200, reps: 5, rir: 1 }, plan)).toBe(false); // RPE 9 vs 8
    expect(isMiss({ load: 200, reps: 5, rir: 0 }, plan)).toBe(true); // RPE 10 vs 8
  });

  it('12 weeks of hitting targets moves the squat estimate meaningfully', () => {
    let st: AppState = fresh();
    let t = NOW.getTime();
    const start = st.lifts.back_squat.e1rm!;
    for (let n = 0; n < 48; n++) {
      const s = buildSession(st, 'ok', new Date(t));
      for (const e of s.entries) e.logged = e.planned.map((p) => ({ load: p.load ?? 0, reps: p.reps }));
      st = applySession(st, s).state;
      t += 2 * 86_400_000;
    }
    const gain = st.lifts.back_squat.e1rm! / start - 1;
    // Roughly 0.5–1% a week when every target is simply met.
    expect(gain).toBeGreaterThan(0.04);
    expect(gain).toBeLessThan(0.15);
  });
});

describe('assisted pull-ups (load = counterweight)', () => {
  const upperA = (st: AppState) => ({ ...st, day: 1 });
  const logPullups = (reps: number) => (s: Session) => {
    const i = s.entries.findIndex((e) => e.slotKey === 'd2-vpull');
    const e = s.entries[i];
    s.entries[i] = { ...e, logged: e.planned.map((p) => ({ load: p.load!, reps })) };
  };
  function finish(st: AppState, mutate: (s: Session) => void) {
    const s = buildSession(st, 'good', NOW);
    mutate(s);
    return applySession(st, s);
  }

  it('starts from the 46 lb counterweight', () => {
    const e = entry(buildSession(upperA(fresh()), 'good', NOW), 'd2-vpull');
    expect(e.exerciseId).toBe('assisted_pullup');
    expect(e.planned[0].load).toBe(46);
  });

  it('hitting the top of the range removes assistance', () => {
    const { state, changes } = finish(upperA(fresh()), logPullups(10));
    expect(state.lifts.assisted_pullup.load).toBe(41);
    expect(changes.find((c) => c.exerciseId === 'assisted_pullup')!.message).toMatch(/less assistance/);
  });

  it('two sessions below the range add assistance', () => {
    const r1 = finish(upperA(fresh()), logPullups(3));
    expect(r1.state.lifts.assisted_pullup.load).toBe(46);
    const r2 = finish(upperA(r1.state), logPullups(3));
    expect(r2.state.lifts.assisted_pullup.load).toBe(56);
  });

  it('missing the range mid-session adds assistance for the remaining sets', () => {
    const e = entry(buildSession(upperA(fresh()), 'good', NOW), 'd2-vpull');
    const after = replan({ ...e, logged: [{ load: 46, reps: 3 }, null, null] }, 45);
    expect(after.planned[1].load).toBe(56);
  });

  it('never goes below zero assistance and suggests regular pull-ups', () => {
    const st = upperA(fresh());
    st.lifts = { ...st.lifts, assisted_pullup: { load: 0, missStreak: 0, history: [] } };
    const { state, changes } = finish(st, logPullups(10));
    expect(state.lifts.assisted_pullup.load).toBe(0);
    expect(changes.find((c) => c.exerciseId === 'assisted_pullup')!.message).toMatch(/regular pull-ups/);
  });
});

describe('chest-supported lateral raises', () => {
  it('start at 7.5 lb and move in 2.5 lb steps', () => {
    const st = { ...fresh(), day: 1 };
    const s = buildSession(st, 'good', NOW);
    const i = s.entries.findIndex((e) => e.slotKey === 'd2-delts');
    expect(s.entries[i].planned[0].load).toBe(7.5);
    s.entries[i] = { ...s.entries[i], logged: s.entries[i].planned.map((p) => ({ load: p.load!, reps: 15 })) };
    expect(applySession(st, s).state.lifts.cs_lateral_raise.load).toBe(10);
  });

  it('a 10% drop rounds to the nearest 2.5 lb', () => {
    const e = entry(buildSession({ ...fresh(), day: 1 }, 'good', NOW), 'd2-delts');
    const after = replan({ ...e, logged: [{ load: 15, reps: 6 }, null, null] }, 45);
    expect(after.planned[1].load).toBe(12.5);
  });
});

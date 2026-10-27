// The progression engine: builds today's workout from the program + your
// history, re-plans the rest of an exercise while you lift, and updates your
// numbers when you finish.
//
// How missed sets are handled:
//  - During a session: if a top set is harder than planned, back-off sets are
//    recalculated from what you actually did. Missing reps on a back-off or an
//    accessory set drops the rest of that exercise (~5% / ~10%).
//  - After a session: one bad day only moves your estimate halfway down.
//    A second miss in a row resets it to what you actually lifted, minus a
//    little, so you can build back up.
//  - Coming back after 2+ weeks off a lift: loads start 5% lighter.
import { DAYS, exercise, weekInfo } from './program';
import { estimate1RM, loadFor, roundTo } from './rpe';
import type {
  AppState,
  Entry,
  ExerciseDef,
  LiftState,
  LoggedSet,
  PlannedSet,
  Readiness,
  Session,
} from './types';

const DAY_MS = 86_400_000;
export const DETRAIN_DAYS = 14;
export const MAX_GAIN_PER_SESSION = 0.05;

export function emptyLift(): LiftState {
  return { missStreak: 0, history: [] };
}

export function minLoad(ex: ExerciseDef, barWeight: number): number {
  return ex.loadType === 'barbell' ? barWeight : 0;
}

function round(ex: ExerciseDef, value: number, barWeight: number): number {
  return roundTo(value, ex.increment || 5, minLoad(ex, barWeight));
}

/** RPE implied by a logged set: reported RIR if given; otherwise target if reps were made, else failure. */
export function effectiveRpe(set: LoggedSet, plan: PlannedSet): number {
  if (set.rir !== undefined) return 10 - set.rir;
  const target = plan.rpe ?? (plan.rir !== undefined ? 10 - plan.rir : 8);
  return set.reps >= plan.reps ? target : 10;
}

export function setE1RM(set: LoggedSet, plan: PlannedSet): number {
  return estimate1RM(set.load, set.reps, effectiveRpe(set, plan));
}

/** True when the set fell short of what was prescribed. */
export function isMiss(set: LoggedSet, plan: PlannedSet): boolean {
  if (set.reps < plan.reps) return true;
  if (plan.rpe !== undefined && set.rir !== undefined && 10 - set.rir >= plan.rpe + 1) return true;
  return false;
}

export function resolveExerciseId(state: AppState, slotKey: string, defaultId: string): string {
  return state.swaps[slotKey] ?? defaultId;
}

// ---------------------------------------------------------------------------
// Build today's workout
// ---------------------------------------------------------------------------
export function buildSession(state: AppState, readiness: Readiness, now: Date = new Date()): Session {
  const info = weekInfo(state.week);
  const day = DAYS[state.day];
  const rough = readiness === 'rough';
  const lighter = info.deload || info.test;
  const bar = state.settings.barWeight;

  const entries: Entry[] = day.slots.map((slot) => {
    const exId = resolveExerciseId(state, slot.key, slot.exerciseId);
    const ex = exercise(exId);
    const lift = state.lifts[exId];
    const scheme = slot.scheme;
    const notes: string[] = [];
    let planned: PlannedSet[] = [];

    const stale =
      lift?.lastDone !== undefined && now.getTime() - new Date(lift.lastDone).getTime() > DETRAIN_DAYS * DAY_MS;

    if (scheme.type === 'topBackoff' || scheme.type === 'straight') {
      let e1rm = lift?.e1rm;
      if (e1rm && stale) {
        e1rm *= 0.95;
        notes.push('Been 2+ weeks — eased off 5%.');
      }
      if (scheme.type === 'topBackoff') {
        const rpe = Math.max(6, info.topRpe - (rough ? 1 : 0));
        const backRpe = Math.max(5, rpe - 1);
        const nBack = Math.max(info.backoffSets > 0 ? 1 : 0, info.backoffSets - (rough ? 1 : 0));
        planned.push({
          kind: e1rm ? 'top' : 'calibrate',
          reps: info.topReps,
          rpe,
          load: e1rm ? round(ex, loadFor(e1rm, info.topReps, rpe), bar) : undefined,
        });
        const backReps = info.test ? 3 : info.topReps;
        for (let i = 0; i < nBack; i++) {
          planned.push({
            kind: 'backoff',
            reps: backReps,
            rpe: backRpe,
            load: e1rm ? round(ex, loadFor(e1rm, backReps, backRpe), bar) : undefined,
          });
        }
        if (!e1rm) notes.push(`No estimate yet: work up in small jumps to ${info.topReps} reps leaving ~${10 - rpe} in the tank. Log it and the back-offs fill in.`);
      } else {
        const rpe = Math.max(6, info.straightRpe - (rough ? 1 : 0));
        const n = Math.max(1, info.straightSets - (rough ? 1 : 0));
        for (let i = 0; i < n; i++) {
          planned.push({
            kind: e1rm || i > 0 ? 'work' : 'calibrate',
            reps: info.straightReps,
            rpe,
            load: e1rm ? round(ex, loadFor(e1rm, info.straightReps, rpe), bar) : undefined,
          });
        }
        if (!e1rm) notes.push(`No estimate yet: pick a weight for ${info.straightReps} reps leaving ~${10 - rpe} in the tank. The next sets adjust to it.`);
      }
    } else if (scheme.type === 'double') {
      const n = Math.max(1, scheme.sets - (lighter ? 1 : 0) - (rough ? 1 : 0));
      const rir = scheme.rir + (lighter ? 2 : 0) + (rough ? 1 : 0);
      const fixedZero = ex.increment === 0;
      let load = fixedZero ? 0 : lift?.load;
      if (load !== undefined && stale && load > 0) {
        load = round(ex, load * 0.95, bar);
        notes.push('Been 2+ weeks — eased off 5%.');
      }
      for (let i = 0; i < n; i++) {
        planned.push({ kind: 'work', reps: scheme.repMin, repMax: scheme.repMax, rir, load });
      }
      if (load === undefined) {
        notes.push(`First time: pick a weight you could do for ~${scheme.repMax} reps with ${scheme.rir} left. It's remembered after this.`);
      }
    } else {
      const n = Math.max(1, scheme.sets - (lighter || rough ? 1 : 0));
      for (let i = 0; i < n; i++) planned.push({ kind: 'work', reps: scheme.reps, load: 0 });
    }

    return {
      slotKey: slot.key,
      exerciseId: exId,
      scheme,
      planned,
      logged: planned.map(() => null),
      note: notes.join(' ') || undefined,
    };
  });

  return {
    id: `${now.getTime().toString(36)}-${state.week}-${state.day}`,
    date: now.toISOString(),
    week: state.week,
    day: state.day,
    readiness,
    entries,
  };
}

// ---------------------------------------------------------------------------
// Live re-planning after each logged set
// ---------------------------------------------------------------------------
export function replan(entry: Entry, barWeight: number): Entry {
  const ex = exercise(entry.exerciseId);
  const { scheme } = entry;
  const planned = entry.planned.map((p) => ({ ...p }));
  let note = entry.note;
  const lastIdx = lastLoggedIndex(entry);
  if (lastIdx < 0) return entry;

  const open = (i: number) => entry.logged[i] === null;

  if (scheme.type === 'topBackoff') {
    const top = entry.logged[0];
    if (top) {
      let e1 = setE1RM(top, entry.planned[0]);
      const backMisses = entry.logged.slice(1).filter((s, k) => s && isMiss(s, entry.planned[k + 1])).length;
      const factor = Math.pow(0.95, backMisses);
      for (let i = 1; i < planned.length; i++) {
        if (!open(i)) continue;
        planned[i].load = round(ex, loadFor(e1, planned[i].reps, planned[i].rpe ?? 7) * factor, barWeight);
      }
      if (isMiss(top, entry.planned[0])) note = 'Top set was harder than planned — back-offs recalculated from it.';
      if (backMisses > 0) note = `Missed reps on a back-off — dropped the rest ~${Math.round((1 - factor) * 100)}%.`;
    }
  } else if (scheme.type === 'straight') {
    const last = entry.logged[lastIdx]!;
    const e1 = setE1RM(last, entry.planned[lastIdx]);
    const missed = isMiss(last, entry.planned[lastIdx]);
    for (let i = lastIdx + 1; i < planned.length; i++) {
      if (!open(i)) continue;
      planned[i].load = round(ex, loadFor(e1, planned[i].reps, planned[i].rpe ?? 7), barWeight);
    }
    if (missed) note = 'Last set was short — remaining sets recalculated.';
  } else if (scheme.type === 'double') {
    const last = entry.logged[lastIdx]!;
    let next = last.load;
    if (last.reps < scheme.repMin && last.load > 0) {
      next = round(ex, last.load * 0.9, barWeight);
      note = 'Below the rep range — dropped ~10% for the rest.';
    } else if (last.reps > scheme.repMax + 2 && ex.increment > 0) {
      next = last.load + ex.increment;
      note = 'Way past the range — bumped the weight.';
    }
    for (let i = lastIdx + 1; i < planned.length; i++) {
      if (open(i) && ex.increment > 0) planned[i].load = next;
    }
  }
  return { ...entry, planned, note };
}

function lastLoggedIndex(entry: Entry): number {
  for (let i = entry.logged.length - 1; i >= 0; i--) if (entry.logged[i]) return i;
  return -1;
}

// ---------------------------------------------------------------------------
// Finishing a session
// ---------------------------------------------------------------------------
export interface LiftChange {
  exerciseId: string;
  kind: 'e1rm' | 'load';
  before?: number;
  after: number;
  status: 'up' | 'hold' | 'down' | 'reset' | 'new';
  message: string;
}

export function applySession(state: AppState, session: Session): { state: AppState; changes: LiftChange[] } {
  const lifts: Record<string, LiftState> = { ...state.lifts };
  const changes: LiftChange[] = [];
  const bar = state.settings.barWeight;

  for (const entry of session.entries) {
    const done = entry.logged
      .map((s, i) => (s ? { set: s, plan: entry.planned[i] } : null))
      .filter((x): x is { set: LoggedSet; plan: PlannedSet } => x !== null);
    if (done.length === 0) continue;
    const ex = exercise(entry.exerciseId);
    const prev = lifts[ex.id] ?? emptyLift();
    const lift: LiftState = { ...prev, history: [...prev.history], lastDone: session.date };
    const { scheme } = entry;

    if (scheme.type === 'topBackoff' || scheme.type === 'straight') {
      const e1s = done.map((d) => setE1RM(d.set, d.plan));
      const sessE1 = scheme.type === 'topBackoff' && entry.logged[0] ? e1s[0] : Math.max(...e1s);
      const missed = done.some((d) => isMiss(d.set, d.plan));
      const old = prev.e1rm;
      let next: number;
      let status: LiftChange['status'];
      let message: string;

      if (old === undefined) {
        next = sessE1;
        status = 'new';
        message = 'Calibrated from today.';
        lift.missStreak = 0;
      } else if (!missed) {
        next = Math.max(old, Math.min(sessE1, old * (1 + MAX_GAIN_PER_SESSION)));
        status = next > old + 0.5 ? 'up' : 'hold';
        message = status === 'up' ? 'Hit everything — estimate up.' : 'Hit everything — holding.';
        lift.missStreak = 0;
      } else {
        lift.missStreak = prev.missStreak + 1;
        if (lift.missStreak >= 2) {
          next = Math.min(old, sessE1) * 0.97;
          status = 'reset';
          message = 'Second miss in a row — reset a bit below today so you can build back.';
          lift.missStreak = 0;
        } else {
          next = sessE1 < old ? old - 0.5 * (old - sessE1) : old;
          status = next < old - 0.5 ? 'down' : 'hold';
          message = 'Missed reps — eased the estimate halfway down. Another miss resets it.';
        }
      }
      lift.e1rm = Math.round(next * 10) / 10;
      lift.history.push({ date: session.date, value: lift.e1rm });
      changes.push({ exerciseId: ex.id, kind: 'e1rm', before: old, after: lift.e1rm, status, message });
    } else if (scheme.type === 'double' && ex.increment > 0) {
      const base = done[0].set.load;
      const all = entry.logged.every((s) => s !== null);
      const allTop = all && done.every((d) => d.set.reps >= scheme.repMax);
      const anyBelow = done.some((d) => d.set.reps < scheme.repMin);
      const old = prev.load;
      let next = base;
      let status: LiftChange['status'];
      let message: string;

      if (allTop) {
        next = base + ex.increment;
        status = old === undefined ? 'new' : 'up';
        message = 'Top of the range on every set — weight goes up.';
        lift.missStreak = 0;
      } else if (anyBelow) {
        lift.missStreak = prev.missStreak + 1;
        if (lift.missStreak >= 2) {
          next = round(ex, base * 0.9, bar);
          status = 'reset';
          message = 'Below the range twice in a row — dropped ~10%.';
          lift.missStreak = 0;
        } else {
          status = 'hold';
          message = 'Below the range — same weight next time.';
        }
      } else {
        status = old === undefined ? 'new' : 'hold';
        message = 'In the range — same weight, aim for more reps.';
        lift.missStreak = 0;
      }
      lift.load = next;
      lift.history.push({ date: session.date, value: next });
      changes.push({ exerciseId: ex.id, kind: 'load', before: old, after: next, status, message });
    }
    lifts[ex.id] = lift;
  }

  let day = state.day + 1;
  let week = state.week;
  if (day >= DAYS.length) {
    day = 0;
    week += 1;
  }

  return {
    state: { ...state, lifts, week, day, active: undefined, sessions: [...state.sessions, session] },
    changes,
  };
}

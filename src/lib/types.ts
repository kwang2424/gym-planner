export type LoadType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight';

export interface ExerciseDef {
  id: string;
  name: string;
  loadType: LoadType;
  /** Smallest load jump in lb (per dumbbell for dumbbells). */
  increment: number;
  /** Shown under the exercise name. */
  cue?: string;
  /** Exercises that can stand in for this one (e.g. on a cranky-shoulder day). */
  swaps?: string[];
}

/** Heavy top set, then back-off sets — driven by the lift's estimated 1RM. */
export interface TopBackoffScheme {
  type: 'topBackoff';
}
/** Straight sets at a target RPE — also driven by estimated 1RM. */
export interface StraightScheme {
  type: 'straight';
}
/** Rep range with double progression (accessories). */
export interface DoubleScheme {
  type: 'double';
  sets: number;
  repMin: number;
  repMax: number;
  rir: number;
}
/** Fixed sets/reps or seconds, no load tracking (jumps, core, Copenhagen). */
export interface FixedScheme {
  type: 'fixed';
  sets: number;
  reps: number;
  unit: 'reps' | 'sec';
  perSide?: boolean;
}
export type Scheme = TopBackoffScheme | StraightScheme | DoubleScheme | FixedScheme;

export interface SlotDef {
  /** Stable key, e.g. "d1-main". Swaps are stored against this. */
  key: string;
  exerciseId: string;
  scheme: Scheme;
}

export interface DayDef {
  name: string;
  focus: string;
  slots: SlotDef[];
}

export type SetKind = 'top' | 'backoff' | 'work' | 'calibrate';

export interface PlannedSet {
  kind: SetKind;
  reps: number;
  /** Target RPE (main lifts). */
  rpe?: number;
  /** Target reps in reserve (accessories). */
  rir?: number;
  /** Suggested load in lb. Undefined = not known yet (calibration). */
  load?: number;
  /** Upper end of a rep range (accessories). */
  repMax?: number;
}

export interface LoggedSet {
  load: number;
  reps: number;
  /** Reps in reserve the lifter reported. Undefined = not reported. */
  rir?: number;
}

export interface Entry {
  slotKey: string;
  exerciseId: string;
  scheme: Scheme;
  planned: PlannedSet[];
  /** Same length as planned; null = not done yet. */
  logged: (LoggedSet | null)[];
  /** Note shown to the lifter, e.g. why a load changed. */
  note?: string;
}

export type Readiness = 'good' | 'ok' | 'rough';

export interface Session {
  id: string;
  date: string; // ISO
  week: number;
  day: number;
  readiness: Readiness;
  entries: Entry[];
}

export interface LiftHistoryPoint {
  date: string;
  /** e1RM for strength-tracked lifts, working load for accessories. */
  value: number;
}

export interface LiftState {
  e1rm?: number;
  /** Working load for double-progression lifts. */
  load?: number;
  /** Consecutive sessions where prescribed reps were missed. */
  missStreak: number;
  lastDone?: string;
  history: LiftHistoryPoint[];
}

export interface Settings {
  restMainSec: number;
  restAccSec: number;
  barWeight: number;
}

export interface AppState {
  version: 1;
  week: number; // 1-based, keeps counting past 12 (cycles repeat)
  day: number; // 0..3
  lifts: Record<string, LiftState>;
  swaps: Record<string, string>;
  sessions: Session[];
  active?: Session;
  settings: Settings;
}

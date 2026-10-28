import type { DayDef, ExerciseDef } from './types';

// ---------------------------------------------------------------------------
// Exercise library. Shoulder-friendly options are favoured for pressing
// (subacromial impingement), and there is no conventional deadlift.
// ---------------------------------------------------------------------------
const list: ExerciseDef[] = [
  // Squat pattern
  { id: 'back_squat', name: 'Back squat', loadType: 'barbell', increment: 5, cue: 'Brace, sit between the hips, drive up.', swaps: ['ssb_squat', 'front_squat'] },
  { id: 'ssb_squat', name: 'Safety bar squat', loadType: 'barbell', increment: 5, cue: 'Easier on the shoulders than a straight bar.', swaps: ['back_squat', 'front_squat'] },
  { id: 'front_squat', name: 'Front squat', loadType: 'barbell', increment: 5, swaps: ['back_squat', 'ssb_squat'] },
  { id: 'pause_squat', name: 'Pause squat (2s)', loadType: 'barbell', increment: 5, cue: 'Dead stop 2s in the hole, stay tight.', swaps: ['front_squat', 'ssb_squat'] },

  // Bench / pressing
  { id: 'bench', name: 'Bench press (1s pause)', loadType: 'barbell', increment: 5, cue: 'Pain-free grip width, elbows ~45°, shoulder blades pinned.', swaps: ['floor_press', 'pin_press', 'db_bench_neutral'] },
  { id: 'floor_press', name: 'Floor press', loadType: 'barbell', increment: 5, cue: 'Shorter range, easier on the shoulder.', swaps: ['bench', 'pin_press', 'db_bench_neutral'] },
  { id: 'pin_press', name: 'Pin press', loadType: 'barbell', increment: 5, cue: 'Set pins just above the painful range.', swaps: ['bench', 'floor_press', 'db_bench_neutral'] },
  { id: 'db_bench_neutral', name: 'Neutral-grip DB bench', loadType: 'dumbbell', increment: 5, cue: 'Palms facing in. Load is per dumbbell.', swaps: ['bench', 'floor_press'] },
  // No longer programmed; kept so older logged workouts still display.
  { id: 'landmine_press', name: 'Half-kneeling landmine press', loadType: 'machine', increment: 5 },
  { id: 'incline_db', name: 'Incline DB press (neutral grip)', loadType: 'dumbbell', increment: 5, cue: 'Low incline (15–30°). Per dumbbell.', swaps: ['machine_incline', 'push_up'] },
  { id: 'machine_incline', name: 'Machine incline press', loadType: 'machine', increment: 5, swaps: ['incline_db', 'push_up'] },
  { id: 'push_up', name: 'Push-up', loadType: 'bodyweight', increment: 5, cue: 'Load = added weight (vest/plate).', swaps: ['incline_db'] },

  // Shoulders (raises stay below shoulder height for the impingement)
  { id: 'cs_lateral_raise', name: 'Chest-supported lateral raise', loadType: 'dumbbell', increment: 5, cue: 'Chest on an incline bench, raise to just below shoulder height. Per dumbbell.', swaps: ['cable_lateral_raise'] },
  { id: 'cable_lateral_raise', name: 'Cable lateral raise', loadType: 'machine', increment: 2.5, cue: 'Raise to just below shoulder height.', swaps: ['cs_lateral_raise'] },

  // Pulling
  { id: 'cs_row', name: 'Chest-supported row', loadType: 'dumbbell', increment: 5, cue: 'Per dumbbell. Squeeze blades back.', swaps: ['cable_row', 't_bar_row'] },
  { id: 'cable_row', name: 'Seated cable row', loadType: 'machine', increment: 5, swaps: ['cs_row', 't_bar_row'] },
  { id: 't_bar_row', name: 'T-bar row', loadType: 'machine', increment: 5, swaps: ['cs_row', 'cable_row'] },
  { id: 'bb_row', name: 'Barbell row', loadType: 'barbell', increment: 5, cue: 'Torso ~45°, pull to lower ribs.', swaps: ['t_bar_row', 'cable_row'] },
  { id: 'pullup', name: 'Neutral-grip pull-up', loadType: 'bodyweight', increment: 5, cue: 'Load = added weight. Use a band/assist if needed (log 0).', swaps: ['lat_pulldown'] },
  { id: 'lat_pulldown', name: 'Neutral-grip lat pulldown', loadType: 'machine', increment: 5, swaps: ['pullup'] },
  { id: 'face_pull', name: 'Face pull', loadType: 'machine', increment: 5, cue: 'Pull to the eyes, rotate out.', swaps: ['band_pull_apart'] },
  { id: 'band_pull_apart', name: 'Band pull-apart', loadType: 'bodyweight', increment: 0, swaps: ['face_pull'] },
  { id: 'cable_er', name: 'Cable external rotation', loadType: 'machine', increment: 2.5, cue: 'Elbow at side, slow. Rotator-cuff health.', swaps: ['band_er'] },
  { id: 'band_er', name: 'Band external rotation', loadType: 'bodyweight', increment: 0, swaps: ['cable_er'] },

  // Hinge / posterior chain (no conventional deadlift)
  { id: 'rdl', name: 'Romanian deadlift', loadType: 'barbell', increment: 5, cue: 'Hips back, soft knees, stop at mid-shin.', swaps: ['db_rdl', 'back_ext'] },
  { id: 'db_rdl', name: 'DB Romanian deadlift', loadType: 'dumbbell', increment: 5, swaps: ['rdl', 'back_ext'] },
  { id: 'hip_thrust', name: 'Barbell hip thrust', loadType: 'barbell', increment: 5, cue: 'Chin tucked, full lockout, 1s squeeze.', swaps: ['back_ext', 'glute_bridge_machine'] },
  { id: 'glute_bridge_machine', name: 'Machine hip thrust', loadType: 'machine', increment: 5, swaps: ['hip_thrust', 'back_ext'] },
  { id: 'back_ext', name: '45° back extension', loadType: 'bodyweight', increment: 5, cue: 'Load = plate held.', swaps: ['hip_thrust', 'rdl'] },
  { id: 'leg_curl', name: 'Seated leg curl', loadType: 'machine', increment: 5, swaps: ['lying_leg_curl', 'nordic'] },
  { id: 'lying_leg_curl', name: 'Lying leg curl', loadType: 'machine', increment: 5, swaps: ['leg_curl', 'nordic'] },
  { id: 'nordic', name: 'Nordic curl (eccentric)', loadType: 'bodyweight', increment: 0, cue: 'Lower as slowly as you can.', swaps: ['leg_curl'] },

  // Single-leg / frontal plane — hockey carry-over
  { id: 'rfess', name: 'Rear-foot-elevated split squat', loadType: 'dumbbell', increment: 5, cue: 'Per dumbbell, reps per leg.', swaps: ['walking_lunge', 'step_up'] },
  { id: 'walking_lunge', name: 'DB walking lunge', loadType: 'dumbbell', increment: 5, cue: 'Per dumbbell, reps per leg.', swaps: ['rfess', 'step_up'] },
  { id: 'step_up', name: 'DB step-up', loadType: 'dumbbell', increment: 5, cue: 'Per dumbbell, reps per leg.', swaps: ['rfess', 'walking_lunge'] },
  { id: 'lateral_lunge', name: 'Lateral lunge', loadType: 'dumbbell', increment: 5, cue: 'Goblet-hold one DB. Reps per side.', swaps: ['cossack_squat'] },
  { id: 'cossack_squat', name: 'Cossack squat', loadType: 'dumbbell', increment: 5, cue: 'Reps per side.', swaps: ['lateral_lunge'] },
  { id: 'adductor_machine', name: 'Hip adduction machine', loadType: 'machine', increment: 5, cue: 'Groin-strain insurance for skating.', swaps: ['cable_adduction'] },
  { id: 'cable_adduction', name: 'Cable hip adduction', loadType: 'machine', increment: 2.5, swaps: ['adductor_machine'] },
  { id: 'copenhagen', name: 'Copenhagen plank', loadType: 'bodyweight', increment: 0, cue: 'Short lever (knee on bench) to start. Add 5s when easy.', swaps: ['side_plank'] },
  { id: 'side_plank', name: 'Side plank', loadType: 'bodyweight', increment: 0, swaps: ['copenhagen'] },

  // Power & trunk
  { id: 'box_jump', name: 'Box jump', loadType: 'bodyweight', increment: 0, cue: 'Max intent, step down. Full rest.', swaps: ['broad_jump'] },
  { id: 'broad_jump', name: 'Broad jump', loadType: 'bodyweight', increment: 0, cue: 'Stick the landing.', swaps: ['box_jump'] },
  { id: 'skater_bound', name: 'Lateral skater bound', loadType: 'bodyweight', increment: 0, cue: 'Push sideways like a stride, stick 1s.', swaps: ['lateral_box_jump'] },
  { id: 'lateral_box_jump', name: 'Lateral box jump', loadType: 'bodyweight', increment: 0, swaps: ['skater_bound'] },
  { id: 'pallof', name: 'Pallof press', loadType: 'bodyweight', increment: 0, cue: 'Anti-rotation. 2s hold each rep.', swaps: ['dead_bug'] },
  { id: 'dead_bug', name: 'Dead bug', loadType: 'bodyweight', increment: 0, swaps: ['pallof'] },

  // Arms
  { id: 'db_curl', name: 'DB curl', loadType: 'dumbbell', increment: 5, swaps: ['cable_curl'] },
  { id: 'cable_curl', name: 'Cable curl', loadType: 'machine', increment: 5, swaps: ['db_curl'] },
  { id: 'pushdown', name: 'Rope pushdown', loadType: 'machine', increment: 5, swaps: ['db_skull'] },
  { id: 'db_skull', name: 'DB skull crusher (neutral)', loadType: 'dumbbell', increment: 5, swaps: ['pushdown'] },
];

export const EXERCISES: Record<string, ExerciseDef> = Object.fromEntries(list.map((e) => [e.id, e]));

export function exercise(id: string): ExerciseDef {
  const e = EXERCISES[id];
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
}

// ---------------------------------------------------------------------------
// The 4-day upper/lower week. Lower volume is kept moderate because of
// 2–3 skates a week.
// ---------------------------------------------------------------------------
export const DAYS: DayDef[] = [
  {
    name: 'Lower A',
    focus: 'Squat strength',
    slots: [
      { key: 'd1-power', exerciseId: 'box_jump', scheme: { type: 'fixed', sets: 3, reps: 3, unit: 'reps' } },
      { key: 'd1-main', exerciseId: 'back_squat', scheme: { type: 'topBackoff' } },
      { key: 'd1-hinge', exerciseId: 'rdl', scheme: { type: 'double', sets: 3, repMin: 6, repMax: 10, rir: 2 } },
      { key: 'd1-single', exerciseId: 'rfess', scheme: { type: 'double', sets: 2, repMin: 6, repMax: 10, rir: 2 } },
      { key: 'd1-groin', exerciseId: 'copenhagen', scheme: { type: 'fixed', sets: 2, reps: 20, unit: 'sec', perSide: true } },
    ],
  },
  {
    name: 'Upper A',
    focus: 'Bench strength',
    slots: [
      { key: 'd2-main', exerciseId: 'bench', scheme: { type: 'topBackoff' } },
      { key: 'd2-row', exerciseId: 'cs_row', scheme: { type: 'double', sets: 3, repMin: 8, repMax: 12, rir: 2 } },
      { key: 'd2-delts', exerciseId: 'cs_lateral_raise', scheme: { type: 'double', sets: 3, repMin: 10, repMax: 15, rir: 1 } },
      { key: 'd2-vpull', exerciseId: 'pullup', scheme: { type: 'double', sets: 3, repMin: 5, repMax: 10, rir: 2 } },
      { key: 'd2-cuff', exerciseId: 'cable_er', scheme: { type: 'double', sets: 2, repMin: 12, repMax: 15, rir: 2 } },
      { key: 'd2-face', exerciseId: 'face_pull', scheme: { type: 'double', sets: 2, repMin: 12, repMax: 20, rir: 1 } },
    ],
  },
  {
    name: 'Lower B',
    focus: 'Squat volume + athletic',
    slots: [
      { key: 'd3-power', exerciseId: 'skater_bound', scheme: { type: 'fixed', sets: 3, reps: 3, unit: 'reps', perSide: true } },
      { key: 'd3-main', exerciseId: 'pause_squat', scheme: { type: 'straight' } },
      { key: 'd3-hip', exerciseId: 'hip_thrust', scheme: { type: 'double', sets: 3, repMin: 6, repMax: 10, rir: 2 } },
      { key: 'd3-lateral', exerciseId: 'lateral_lunge', scheme: { type: 'double', sets: 2, repMin: 6, repMax: 10, rir: 2 } },
      { key: 'd3-curl', exerciseId: 'leg_curl', scheme: { type: 'double', sets: 2, repMin: 8, repMax: 12, rir: 1 } },
      { key: 'd3-add', exerciseId: 'adductor_machine', scheme: { type: 'double', sets: 2, repMin: 10, repMax: 15, rir: 2 } },
      { key: 'd3-core', exerciseId: 'pallof', scheme: { type: 'fixed', sets: 2, reps: 10, unit: 'reps', perSide: true } },
    ],
  },
  {
    name: 'Upper B',
    focus: 'Bench volume + back',
    slots: [
      { key: 'd4-main', exerciseId: 'bench', scheme: { type: 'straight' } },
      { key: 'd4-row', exerciseId: 'bb_row', scheme: { type: 'double', sets: 3, repMin: 6, repMax: 10, rir: 2 } },
      { key: 'd4-vpull', exerciseId: 'lat_pulldown', scheme: { type: 'double', sets: 3, repMin: 8, repMax: 12, rir: 2 } },
      { key: 'd4-press', exerciseId: 'incline_db', scheme: { type: 'double', sets: 3, repMin: 6, repMax: 10, rir: 2 } },
      { key: 'd4-bi', exerciseId: 'db_curl', scheme: { type: 'double', sets: 2, repMin: 10, repMax: 15, rir: 1 } },
      { key: 'd4-tri', exerciseId: 'pushdown', scheme: { type: 'double', sets: 2, repMin: 10, repMax: 15, rir: 1 } },
    ],
  },
];

// ---------------------------------------------------------------------------
// 12-week cycle: three 4-week blocks (3 build weeks + 1 lighter week).
// Reps drop and effort rises block to block. The cycle repeats after week 12
// using the updated strength estimates.
// ---------------------------------------------------------------------------
export const CYCLE_WEEKS = 12;
const BLOCK_NAMES = ['Base', 'Build', 'Peak'];

export interface WeekInfo {
  week: number;
  cycle: number; // 1-based
  block: number; // 0..2
  blockName: string;
  weekInBlock: number; // 0..3
  deload: boolean;
  test: boolean; // last week of the cycle: heavy single
  /** Main lift top set. */
  topReps: number;
  topRpe: number;
  backoffSets: number;
  /** Secondary (straight) sets on e1RM-driven lifts. */
  straightSets: number;
  straightReps: number;
  straightRpe: number;
  label: string;
}

export function weekInfo(week: number): WeekInfo {
  const w = Math.max(1, Math.floor(week));
  const cw = (w - 1) % CYCLE_WEEKS;
  const cycle = Math.floor((w - 1) / CYCLE_WEEKS) + 1;
  const block = Math.floor(cw / 4);
  const weekInBlock = cw % 4;
  const deload = weekInBlock === 3;
  const test = deload && block === 2;
  const topReps = [6, 4, 3][block];
  const straightReps = [6, 5, 4][block];

  let topRpe = 7 + block * 0.5 + weekInBlock * 0.5;
  let backoffSets = [3, 3, 2][block];
  let straightSets = 3;
  let straightRpe = Math.min(8, 6.5 + block * 0.5 + weekInBlock * 0.5);
  let label = `${BLOCK_NAMES[block]} block · wk ${weekInBlock + 1} of 4`;

  if (test) {
    topRpe = 9;
    backoffSets = 0;
    straightSets = 2;
    straightRpe = 6;
    label = 'Test week · heavy single, then rest up';
  } else if (deload) {
    topRpe = 6;
    backoffSets = 1;
    straightSets = 2;
    straightRpe = 6;
    label = `${BLOCK_NAMES[block]} · lighter week`;
  }

  return {
    week: w,
    cycle,
    block,
    blockName: BLOCK_NAMES[block],
    weekInBlock,
    deload,
    test,
    topReps: test ? 1 : topReps,
    topRpe,
    backoffSets,
    straightSets,
    straightReps,
    straightRpe,
    label,
  };
}

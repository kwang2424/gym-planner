// RPE / reps-in-reserve math.
//
// %1RM for a set taken to failure (RPE 10), indexed by reps. Values follow the
// widely used RTS / Tuchscherer chart. A set at RPE r with n reps is treated as
// a set to failure with n + (10 - r) reps ("effective reps").
const PCT_AT_FAILURE: number[] = [
  1.0, // 1 rep (index 0)
  0.955,
  0.922,
  0.892,
  0.863,
  0.837,
  0.811,
  0.786,
  0.762,
  0.739,
  0.707,
  0.68,
  0.653,
  0.626,
  0.599,
  0.574, // 16 reps
];

/** Fraction of 1RM you can lift for `reps` reps at `rpe` (6–10, half steps ok). */
export function pctOf1RM(reps: number, rpe: number): number {
  const effective = Math.max(1, reps + (10 - clampRpe(rpe)));
  const i = effective - 1;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  const last = PCT_AT_FAILURE.length - 1;
  if (lo >= last) {
    // Past the table: keep falling ~2.6% per rep.
    return Math.max(0.3, PCT_AT_FAILURE[last] - 0.026 * (i - last));
  }
  const frac = i - lo;
  return PCT_AT_FAILURE[lo] * (1 - frac) + PCT_AT_FAILURE[hi] * frac;
}

/** Estimated 1RM from a logged set. */
export function estimate1RM(load: number, reps: number, rpe: number): number {
  if (reps <= 0 || load <= 0) return 0;
  return load / pctOf1RM(reps, rpe);
}

/** Load to use for `reps` at `rpe` given an e1RM. Not rounded. */
export function loadFor(e1rm: number, reps: number, rpe: number): number {
  return e1rm * pctOf1RM(reps, rpe);
}

export function clampRpe(rpe: number): number {
  return Math.min(10, Math.max(4, rpe));
}

/** Round to the nearest multiple of `step` (e.g. 5 lb), never below `min`. */
export function roundTo(value: number, step: number, min = 0): number {
  if (step <= 0) return Math.max(min, Math.round(value));
  return Math.max(min, Math.round(value / step) * step);
}

/** RIR chip value -> RPE. */
export function rirToRpe(rir: number): number {
  return clampRpe(10 - rir);
}

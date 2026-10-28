import type { ExerciseDef, PlannedSet, Scheme } from './types';

const PLATES = [45, 35, 25, 10, 5, 2.5];

/** Plates per side for a barbell load, e.g. "45 + 25 + 5". */
export function platesPerSide(load: number, bar: number): string | null {
  let side = (load - bar) / 2;
  if (side < 0) return null;
  if (side === 0) return 'empty bar';
  const out: number[] = [];
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      out.push(p);
      side -= p;
    }
  }
  if (side > 0.01) return null;
  return out.join(' + ');
}

export function fmtLb(n: number | undefined): string {
  if (n === undefined) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

export function setLabel(p: PlannedSet, index: number): string {
  switch (p.kind) {
    case 'single':
      return 'Heavy single';
    case 'top':
      return 'Top set';
    case 'backoff':
      return 'Back-off';
    case 'calibrate':
      return 'Find it';
    default:
      return `Set ${index + 1}`;
  }
}

export function targetText(p: PlannedSet, scheme: Scheme): string {
  if (scheme.type === 'fixed') {
    return `${p.reps}${scheme.unit === 'sec' ? 's' : ' reps'}${scheme.perSide ? ' / side' : ''}`;
  }
  if (p.repMax !== undefined) return `${p.reps}–${p.repMax} reps · ${p.rir} in tank`;
  if (p.rpe !== undefined) return `${p.reps} rep${p.reps === 1 ? '' : 's'} · RPE ${p.rpe} (~${fmtRir(10 - p.rpe)} left)`;
  return `${p.reps} reps`;
}

function fmtRir(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

export function tracksLoad(ex: ExerciseDef, scheme: Scheme): boolean {
  return scheme.type !== 'fixed' && ex.increment > 0;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

import { describe, expect, it } from 'vitest';
import { applyRemoteMeta, applyRemoteSessions, metaOf, sessionsToUpload, shouldUploadMeta } from './merge';
import { initialState } from './storage';
import type { AppState, Session } from './types';

function state(over: Partial<AppState> = {}): AppState {
  return { ...initialState(), ...over };
}
function session(id: string, date: string): Session {
  return { id, date, week: 1, day: 0, readiness: 'ok', entries: [] };
}

describe('meta merge', () => {
  it('takes newer remote meta but keeps local sessions', () => {
    const local = state({ updatedAt: 100, week: 1 });
    const remote = { ...metaOf(state({ week: 3 })), updatedAt: 200 };
    const merged = applyRemoteMeta(local, remote);
    expect(merged.week).toBe(3);
    expect(merged.sessions).toBe(local.sessions);
  });

  it('ignores older or equal remote meta', () => {
    const local = state({ updatedAt: 300, week: 2 });
    expect(applyRemoteMeta(local, { ...metaOf(state({ week: 5 })), updatedAt: 300 })).toBe(local);
    expect(applyRemoteMeta(local, { ...metaOf(state({ week: 5 })), updatedAt: 10 })).toBe(local);
    expect(applyRemoteMeta(local, null)).toBe(local);
  });

  it('a fresh device (updatedAt 0) always takes the cloud copy', () => {
    const fresh = state();
    const remote = { ...metaOf(state({ week: 7 })), updatedAt: 1 };
    expect(applyRemoteMeta(fresh, remote).week).toBe(7);
  });

  it('clears a finished active workout from the other device', () => {
    const local = state({ updatedAt: 1, active: session('a', '2026-10-28') });
    const remote = { ...metaOf(state()), updatedAt: 2 };
    expect(applyRemoteMeta(local, remote).active).toBeUndefined();
  });

  it('upload decisions', () => {
    expect(shouldUploadMeta(state({ updatedAt: 0 }), null)).toBe(true);
    expect(shouldUploadMeta(state({ updatedAt: 5 }), 4)).toBe(true);
    expect(shouldUploadMeta(state({ updatedAt: 5 }), 5)).toBe(false);
  });
});

describe('session merge', () => {
  it('unions by id, sorted by date', () => {
    const local = state({ sessions: [session('b', '2026-10-29'), session('a', '2026-10-27')] });
    const merged = applyRemoteSessions(local, [session('c', '2026-10-28'), session('a', '2026-10-27')]);
    expect(merged.sessions.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('returns the same object when nothing is new', () => {
    const local = state();
    expect(applyRemoteSessions(local, local.sessions)).toBe(local);
  });

  it('finds sessions to upload', () => {
    const local = state({ sessions: [session('a', '1'), session('b', '2')] });
    expect(sessionsToUpload(local, new Set(['a'])).map((s) => s.id)).toEqual(['b']);
  });
});

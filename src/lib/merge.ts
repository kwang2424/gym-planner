// Pure merge rules for cloud sync.
//
// The cloud keeps two things per user:
//   users/{uid}/meta/state       -> everything except finished sessions
//   users/{uid}/sessions/{id}    -> one doc per finished workout (never edited)
//
// Sessions merge as a union by id. Everything else is last-writer-wins on
// `updatedAt`, which every local change bumps.
import { initialState } from './storage';
import type { AppState, Session } from './types';

export type CloudMeta = Omit<AppState, 'sessions'>;

export function metaOf(state: AppState): CloudMeta {
  const { sessions: _sessions, ...meta } = state;
  void _sessions;
  return meta;
}

/** Take the remote meta if it is newer than ours; keep our sessions either way. */
export function applyRemoteMeta(local: AppState, remote: CloudMeta | null): AppState {
  if (!remote || remote.version !== 1 || remote.updatedAt <= local.updatedAt) return local;
  return {
    ...local,
    ...remote,
    settings: { ...local.settings, ...remote.settings },
    // Default starting numbers fill in only for lifts the cloud copy doesn't have.
    lifts: { ...initialState().lifts, ...(remote.lifts ?? {}) },
    swaps: remote.swaps ?? {},
    active: remote.active ?? undefined,
    sessions: local.sessions,
  };
}

/** Add any remote sessions we don't have yet. Returns `local` unchanged if nothing is new. */
export function applyRemoteSessions(local: AppState, remote: Session[]): AppState {
  const have = new Set(local.sessions.map((s) => s.id));
  const fresh = remote.filter((s) => s && typeof s.id === 'string' && !have.has(s.id));
  if (fresh.length === 0) return local;
  const sessions = [...local.sessions, ...fresh].sort((a, b) => a.date.localeCompare(b.date));
  return { ...local, sessions };
}

/** Local sessions the cloud doesn't have yet. */
export function sessionsToUpload(local: AppState, remoteIds: Set<string>): Session[] {
  return local.sessions.filter((s) => !remoteIds.has(s.id));
}

/** Whether our meta should be written to the cloud. */
export function shouldUploadMeta(local: AppState, remoteUpdatedAt: number | null): boolean {
  return remoteUpdatedAt === null || local.updatedAt > remoteUpdatedAt;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cloud } from './cloud';
import { firebaseConfig } from './firebaseConfig';
import {
  applyRemoteMeta,
  applyRemoteSessions,
  metaOf,
  sessionsToUpload,
  shouldUploadMeta,
  type CloudMeta,
} from './merge';
import type { AppState, Session } from './types';

export type SyncStatus =
  | 'off' // Firebase not configured
  | 'loading'
  | 'signed-out'
  | 'connecting' // signed in, waiting for the server's copy
  | 'synced'
  | 'pending' // local changes waiting for a connection
  | 'error';

export interface CloudSync {
  status: SyncStatus;
  email: string | null;
  error: string | null;
  lastSynced: number | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const PUSH_DELAY_MS = 800;

/**
 * Keeps local state and Firestore in step.
 * `applyRemote` must update state WITHOUT bumping updatedAt.
 */
export function useCloudSync(state: AppState, applyRemote: (fn: (s: AppState) => AppState) => void): CloudSync {
  const [cloud, setCloud] = useState<Cloud | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>(firebaseConfig ? 'loading' : 'off');
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  // Newest local change the server has confirmed.
  const [ackedAt, setAckedAt] = useState(0);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // What we believe the server holds.
  const remoteUpdatedAt = useRef<number | null>(null);
  const remoteIds = useRef<Set<string>>(new Set());
  const seen = useRef({ meta: false, sessions: false });

  // Load Firebase lazily.
  useEffect(() => {
    if (!firebaseConfig) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    import('./cloud')
      .then(({ createCloud }) => {
        if (cancelled) return;
        const c = createCloud(firebaseConfig!);
        setCloud(c);
        unsub = c.onUser((user) => {
          setUid(user?.uid ?? null);
          setEmail(user?.email ?? null);
          setStatus(user ? 'connecting' : 'signed-out');
        });
      })
      .catch((e: Error) => {
        setStatus('error');
        setError(`Couldn't load sync: ${e.message}`);
      });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // Watch the user's cloud data.
  useEffect(() => {
    if (!cloud || !uid) return;
    seen.current = { meta: false, sessions: false };
    remoteUpdatedAt.current = null;
    remoteIds.current = new Set();
    setReady(false);
    setAckedAt(0);

    const markSeen = (k: 'meta' | 'sessions') => {
      seen.current[k] = true;
      if (seen.current.meta && seen.current.sessions) {
        setReady(true);
        setLastSynced(Date.now());
      }
    };

    return cloud.watch(
      uid,
      (meta: CloudMeta | null) => {
        remoteUpdatedAt.current = meta ? meta.updatedAt ?? 0 : null;
        if (meta) setAckedAt((a) => Math.max(a, meta.updatedAt ?? 0));
        if (meta) applyRemote((s) => applyRemoteMeta(s, meta));
        markSeen('meta');
      },
      (sessions: Session[]) => {
        remoteIds.current = new Set(sessions.map((s) => s.id));
        applyRemote((s) => applyRemoteSessions(s, sessions));
        markSeen('sessions');
      },
      (e) => {
        setStatus('error');
        setError(e.message);
      },
    );
  }, [cloud, uid, applyRemote]);

  // Push local changes once we've seen the server's copy.
  useEffect(() => {
    if (!cloud || !uid || !ready) return;
    const t = setTimeout(() => {
      const uploadMeta = shouldUploadMeta(state, remoteUpdatedAt.current);
      const newSessions = sessionsToUpload(state, remoteIds.current);
      if (!uploadMeta && newSessions.length === 0) {
        setStatus('synced');
        setAckedAt((a) => Math.max(a, state.updatedAt));
        return;
      }
      // Optimistically record what we sent so we don't resend.
      if (uploadMeta) remoteUpdatedAt.current = state.updatedAt;
      newSessions.forEach((s) => remoteIds.current.add(s.id));
      const sentAt = state.updatedAt;

      // Firestore queues these offline and sends them when back online.
      Promise.all([
        newSessions.length ? cloud.pushSessions(uid, newSessions) : null,
        uploadMeta ? cloud.pushMeta(uid, metaOf(state)) : null,
      ])
        .then(() => {
          setAckedAt((a) => Math.max(a, sentAt));
          setStatus('synced');
          setError(null);
          setLastSynced(Date.now());
        })
        .catch((e: Error) => {
          setStatus('error');
          setError(e.message);
          // Allow a retry on the next change.
          remoteUpdatedAt.current = null;
          newSessions.forEach((s) => remoteIds.current.delete(s.id));
        });
    }, PUSH_DELAY_MS);
    return () => clearTimeout(t);
  }, [cloud, uid, ready, state]);

  const need = useCallback(() => {
    if (!cloud) throw new Error('Sync is still loading.');
    return cloud;
  }, [cloud]);

  let shown = status;
  if (uid && status !== 'error') {
    const dirty = !ready || state.updatedAt > ackedAt;
    shown = dirty ? (online ? 'connecting' : 'pending') : 'synced';
  }

  return {
    status: shown,
    email,
    error,
    lastSynced,
    signIn: (e, p) => need().signIn(e, p),
    signUp: (e, p) => need().signUp(e, p),
    resetPassword: (e) => need().resetPassword(e),
    signOut: () => need().signOut(),
  };
}

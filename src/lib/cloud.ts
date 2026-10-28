// Thin wrapper around Firebase Auth + Firestore. Loaded lazily so the app
// stays small and fully usable when sync isn't configured.
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentSingleTabManager,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { FirebaseWebConfig } from './firebaseConfig';
import type { CloudMeta } from './merge';
import type { Session } from './types';

export interface Cloud {
  onUser(cb: (user: User | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  /** Callbacks fire only with server-confirmed data (never from an empty local cache). */
  watch(
    uid: string,
    onMeta: (meta: CloudMeta | null) => void,
    onSessions: (sessions: Session[]) => void,
    onError: (e: Error) => void,
  ): () => void;
  pushMeta(uid: string, meta: CloudMeta): Promise<void>;
  pushSessions(uid: string, sessions: Session[]): Promise<void>;
}

export function createCloud(config: FirebaseWebConfig): Cloud {
  const app = initializeApp(config);
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
  });

  // Local testing against the Firebase emulator suite (e.g. VITE_FIREBASE_EMULATOR_HOST=127.0.0.1).
  const emulator = import.meta.env.VITE_FIREBASE_EMULATOR_HOST as string | undefined;
  if (emulator) {
    connectAuthEmulator(auth, `http://${emulator}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulator, 8080);
  }

  const metaRef = (uid: string) => doc(db, 'users', uid, 'meta', 'state');
  const sessionsRef = (uid: string) => collection(db, 'users', uid, 'sessions');

  return {
    onUser: (cb) => onAuthStateChanged(auth, cb),
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
    watch(uid, onMeta, onSessions, onError) {
      const a = onSnapshot(
        metaRef(uid),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache) return;
          onMeta(snap.exists() ? (snap.data() as CloudMeta) : null);
        },
        onError,
      );
      const b = onSnapshot(
        sessionsRef(uid),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache) return;
          onSessions(snap.docs.map((d) => d.data() as Session));
        },
        onError,
      );
      return () => {
        a();
        b();
      };
    },
    pushMeta: (uid, meta) => setDoc(metaRef(uid), meta),
    async pushSessions(uid, sessions) {
      for (let i = 0; i < sessions.length; i += 400) {
        const batch = writeBatch(db);
        for (const s of sessions.slice(i, i + 400)) batch.set(doc(sessionsRef(uid), s.id), s);
        await batch.commit();
      }
    },
  };
}

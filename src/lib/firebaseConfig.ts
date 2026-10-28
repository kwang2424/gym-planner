// Firebase web config. These values are not secrets: access is controlled by
// Firebase Auth + the Firestore security rules in firestore.rules.
//
// Fill them in here, or set VITE_FIREBASE_* environment variables (e.g. in
// Vercel → Project → Settings → Environment Variables). Leave empty to run
// without cloud sync.
const FILLED_IN = {
  apiKey: 'AIzaSyDVm3hfRC7lnUrO9LvvbDNGLEhnmzbFN-Y',
  authDomain: 'gym-planner-24127.firebaseapp.com',
  projectId: 'gym-planner-24127',
  appId: '1:798558168709:web:8021225d458c7c7f83abec',
};

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const env = import.meta.env;

export const firebaseConfig: FirebaseWebConfig | null = (() => {
  const cfg = {
    apiKey: FILLED_IN.apiKey || env.VITE_FIREBASE_API_KEY || '',
    authDomain: FILLED_IN.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: FILLED_IN.projectId || env.VITE_FIREBASE_PROJECT_ID || '',
    appId: FILLED_IN.appId || env.VITE_FIREBASE_APP_ID || '',
  };
  return cfg.apiKey && cfg.projectId ? cfg : null;
})();

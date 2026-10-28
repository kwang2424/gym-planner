import { useCallback, useEffect, useState } from 'react';
import Plan from './components/Plan';
import Progress from './components/Progress';
import SettingsView from './components/Settings';
import Workout from './components/Workout';
import { loadState, saveState } from './lib/storage';
import type { AppState } from './lib/types';
import { useCloudSync } from './lib/useCloudSync';

type Tab = 'workout' | 'progress' | 'plan' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'workout', label: 'Workout' },
  { id: 'progress', label: 'Progress' },
  { id: 'plan', label: 'Plan' },
  { id: 'settings', label: 'Settings' },
];

export type Update = (fn: (s: AppState) => AppState) => void;

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('workout');

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Local edits bump updatedAt so cloud sync knows this copy is newer.
  const update: Update = (fn) =>
    setState((s) => {
      const next = fn(s);
      return next === s ? s : { ...next, updatedAt: Math.max(Date.now(), s.updatedAt + 1) };
    });
  const replace = (next: AppState) => update(() => next);
  // Changes that came from the cloud keep their timestamp.
  const applyRemote = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const sync = useCloudSync(state, applyRemote);

  return (
    <div className="app">
      <main className="content">
        {tab === 'workout' && <Workout state={state} update={update} />}
        {tab === 'progress' && <Progress state={state} />}
        {tab === 'plan' && <Plan state={state} />}
        {tab === 'settings' && <SettingsView state={state} update={update} replace={replace} sync={sync} />}
      </main>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'workout' && state.active && <span className="dot" aria-label="in progress" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

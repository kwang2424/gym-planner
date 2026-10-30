import { useRef } from 'react';
import type { Update } from '../App';
import { DAYS, exercise } from '../lib/program';
import { emptyLift } from '../lib/progression';
import { initialState, parseState } from '../lib/storage';
import type { AppState } from '../lib/types';
import type { CloudSync } from '../lib/useCloudSync';
import CloudCard from './CloudCard';

interface Props {
  state: AppState;
  update: Update;
  replace: (s: AppState) => void;
  sync: CloudSync;
}

export default function SettingsView({ state, update, replace, sync }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = DAYS.flatMap((d) => d.slots)
    .filter((s) => s.scheme.type !== 'fixed')
    .map((s) => ({ id: state.swaps[s.key] ?? s.exerciseId, e1rm: s.scheme.type !== 'double' }))
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i && exercise(r.id).increment > 0);

  const setLiftValue = (id: string, isE1rm: boolean, raw: string) => {
    const v = raw.trim() === '' ? undefined : Number(raw);
    if (v !== undefined && (!Number.isFinite(v) || v < 0)) return;
    update((s) => {
      const prev = s.lifts[id] ?? emptyLift();
      const next = { ...prev, missStreak: 0, [isE1rm ? 'e1rm' : 'load']: v };
      if (v !== undefined) next.history = [...prev.history, { date: new Date().toISOString(), value: v }];
      return { ...s, lifts: { ...s.lifts, [id]: next } };
    });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-planner-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      replace(parseState(await file.text()));
      alert('Backup restored.');
    } catch (e) {
      alert(`Couldn't read that file: ${(e as Error).message}`);
    }
  };

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Settings</p>
        <h1>Numbers & setup</h1>
      </header>

      <CloudCard sync={sync} />

      <div className="card">
        <h2>Where you are</h2>
        <div className="grid2">
          <label>
            <span className="field-label">Week</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={state.week}
              onChange={(e) => update((s) => ({ ...s, week: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </label>
          <label>
            <span className="field-label">Next day</span>
            <select value={state.day} onChange={(e) => update((s) => ({ ...s, day: Number(e.target.value) }))}>
              {DAYS.map((d, i) => (
                <option key={d.name} value={i}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Lift numbers</h2>
        <p className="muted small">
          Main lifts use an estimated max; accessories use your working weight. Clear a field to re-find it next session.
        </p>
        <ul className="lift-edit">
          {rows.map((r) => {
            const lift = state.lifts[r.id];
            const value = r.e1rm ? lift?.e1rm : lift?.load;
            return (
              <li key={r.id}>
                <span>
                  {exercise(r.id).name}
                  <span className="muted small"> · {r.e1rm ? 'est. max' : exercise(r.id).assisted ? 'assist' : 'weight'}</span>
                </span>
                <input
                  key={`${r.id}-${value ?? ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="find it"
                  defaultValue={value !== undefined ? Math.round(value) : ''}
                  onBlur={(e) => {
                    const cur = value !== undefined ? String(Math.round(value)) : '';
                    if (e.target.value !== cur) setLiftValue(r.id, r.e1rm, e.target.value);
                  }}
                  aria-label={`${exercise(r.id).name} ${r.e1rm ? 'estimated max' : 'working weight'}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card">
        <h2>Gym</h2>
        <div className="grid2">
          <label>
            <span className="field-label">Rest, main lifts (s)</span>
            <input
              type="number"
              inputMode="numeric"
              value={state.settings.restMainSec}
              onChange={(e) =>
                update((s) => ({ ...s, settings: { ...s.settings, restMainSec: Math.max(0, Number(e.target.value) || 0) } }))
              }
            />
          </label>
          <label>
            <span className="field-label">Rest, accessories (s)</span>
            <input
              type="number"
              inputMode="numeric"
              value={state.settings.restAccSec}
              onChange={(e) =>
                update((s) => ({ ...s, settings: { ...s.settings, restAccSec: Math.max(0, Number(e.target.value) || 0) } }))
              }
            />
          </label>
          <label>
            <span className="field-label">Barbell (lb)</span>
            <input
              type="number"
              inputMode="numeric"
              value={state.settings.barWeight}
              onChange={(e) =>
                update((s) => ({ ...s, settings: { ...s.settings, barWeight: Math.max(0, Number(e.target.value) || 0) } }))
              }
            />
          </label>
        </div>
        {Object.keys(state.swaps).length > 0 && (
          <button className="ghost" onClick={() => update((s) => ({ ...s, swaps: {} }))}>
            Reset all exercise swaps
          </button>
        )}
      </div>

      <div className="card">
        <h2>Backup file</h2>
        <p className="muted small">
          {sync.email
            ? 'A file copy of everything, in case you ever want one.'
            : "Data lives only on this device. Export now and then — it's your only copy."}
        </p>
        <div className="btn-row">
          <button className="secondary" onClick={exportData}>
            Export
          </button>
          <button className="secondary" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
        </div>
        {sync.email ? (
          <p className="muted small">Sign out to reset this device.</p>
        ) : (
          <button
            className="danger"
            onClick={() => confirm('Erase all workouts and numbers on this device?') && replace(initialState())}
          >
            Reset everything
          </button>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import type { Update } from '../App';
import { fmtLb, targetText } from '../lib/format';
import { DAYS, exercise, weekInfo } from '../lib/program';
import { applySession, buildSession, replan, type LiftChange } from '../lib/progression';
import type { AppState, Entry, LoggedSet, Readiness } from '../lib/types';
import ExerciseCard from './ExerciseCard';
import RestTimer from './RestTimer';

const READINESS: { id: Readiness; label: string; hint: string }[] = [
  { id: 'good', label: 'Good', hint: 'Fresh, ready to push' },
  { id: 'ok', label: 'OK', hint: 'Normal day' },
  { id: 'rough', label: 'Beat up', hint: 'Skated hard / slept badly: 1 fewer set, easier targets' },
];

export default function Workout({ state, update }: { state: AppState; update: Update }) {
  const [readiness, setReadiness] = useState<Readiness>('ok');
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [summary, setSummary] = useState<LiftChange[] | null>(null);

  const active = state.active;
  const info = weekInfo(active?.week ?? state.week);

  if (summary) return <Summary changes={summary} onClose={() => setSummary(null)} />;

  if (!active) {
    const preview = buildSession(state, readiness);
    return (
      <section>
        <header className="page-head">
          <p className="eyebrow">
            Week {info.week} · {info.label}
          </p>
          <h1>{DAYS[state.day].name}</h1>
          <p className="muted">{DAYS[state.day].focus}</p>
        </header>

        <div className="card">
          <label className="field-label" htmlFor="day-pick">
            Day
          </label>
          <select
            id="day-pick"
            value={state.day}
            onChange={(e) => update((s) => ({ ...s, day: Number(e.target.value) }))}
          >
            {DAYS.map((d, i) => (
              <option key={d.name} value={i}>
                {d.name} — {d.focus}
              </option>
            ))}
          </select>

          <p className="field-label">How do you feel?</p>
          <div className="seg" role="radiogroup" aria-label="Readiness">
            {READINESS.map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={readiness === r.id}
                className={readiness === r.id ? 'seg-btn on' : 'seg-btn'}
                onClick={() => setReadiness(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="muted small">{READINESS.find((r) => r.id === readiness)!.hint}</p>
        </div>

        <ul className="preview">
          {preview.entries.map((e) => {
            const ex = exercise(e.exerciseId);
            const first = e.planned[0];
            return (
              <li key={e.slotKey}>
                <span>{ex.name}</span>
                <span className="muted">
                  {e.planned.length}× {targetText(first, e.scheme).split(' · ')[0]}
                  {first.load ? ` · ${fmtLb(first.load)} lb` : ''}
                </span>
              </li>
            );
          })}
        </ul>

        <button className="primary big" onClick={() => update((s) => ({ ...s, active: buildSession(s, readiness) }))}>
          Start workout
        </button>
      </section>
    );
  }

  const setEntry = (i: number, entry: Entry) =>
    update((s) => {
      if (!s.active) return s;
      const entries = s.active.entries.slice();
      entries[i] = entry;
      return { ...s, active: { ...s.active, entries } };
    });

  const log = (i: number, setIdx: number, set: LoggedSet | null, isMain: boolean) => {
    const entry = active.entries[i];
    const logged = entry.logged.slice();
    logged[setIdx] = set;
    setEntry(i, replan({ ...entry, logged }, state.settings.barWeight));
    if (set) {
      const total = isMain ? state.settings.restMainSec : state.settings.restAccSec;
      setRest({ endsAt: Date.now() + total * 1000, total });
    }
  };

  const swap = (i: number, exerciseId: string) => {
    update((s) => {
      if (!s.active) return s;
      const slotKey = s.active.entries[i].slotKey;
      const next = { ...s, swaps: { ...s.swaps, [slotKey]: exerciseId } };
      const fresh = buildSession({ ...next, day: s.active.day, week: s.active.week }, s.active.readiness);
      const entries = s.active.entries.slice();
      entries[i] = fresh.entries.find((e) => e.slotKey === slotKey)!;
      return { ...next, active: { ...s.active, entries } };
    });
  };

  const remaining = active.entries.reduce((n, e) => n + e.logged.filter((x) => !x).length, 0);
  const logged = active.entries.reduce((n, e) => n + e.logged.filter(Boolean).length, 0);

  const finish = () => {
    if (logged === 0) {
      if (confirm('Nothing logged. Discard this workout?')) update((s) => ({ ...s, active: undefined }));
      return;
    }
    if (remaining > 0 && !confirm(`${remaining} set${remaining === 1 ? '' : 's'} not logged. Finish anyway?`)) return;
    const result = applySession(state, active);
    update(() => result.state);
    setRest(null);
    setSummary(result.changes);
  };

  return (
    <section className="with-timer">
      <header className="page-head">
        <p className="eyebrow">
          Week {info.week} · {info.label}
        </p>
        <h1>{DAYS[active.day].name}</h1>
      </header>
      {active.entries.map((e, i) => (
        <ExerciseCard
          key={`${e.slotKey}-${e.exerciseId}`}
          entry={e}
          barWeight={state.settings.barWeight}
          lift={state.lifts[e.exerciseId]}
          onLog={(setIdx, set) => log(i, setIdx, set, e.scheme.type === 'topBackoff' || e.scheme.type === 'straight')}
          onSwap={(id) => swap(i, id)}
        />
      ))}
      <div className="finish-row">
        <button className="primary big" onClick={finish}>
          Finish workout
        </button>
        <button
          className="ghost"
          onClick={() => confirm('Discard this workout? Nothing will be saved.') && update((s) => ({ ...s, active: undefined }))}
        >
          Discard
        </button>
      </div>
      {rest && <RestTimer {...rest} onAdd={(sec) => setRest({ endsAt: rest.endsAt + sec * 1000, total: rest.total + sec })} onDone={() => setRest(null)} />}
    </section>
  );
}

function Summary({ changes, onClose }: { changes: LiftChange[]; onClose: () => void }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Workout saved</p>
        <h1>Nice work.</h1>
        <p className="muted">Here's how your numbers moved for next time.</p>
      </header>
      <ul className="changes">
        {changes.map((c) => (
          <li key={c.exerciseId} className={`change ${c.status}`}>
            <div className="change-top">
              <span>{exercise(c.exerciseId).name}</span>
              <span className="change-val">
                {c.before !== undefined && Math.round(c.before) !== Math.round(c.after)
                  ? `${fmtLb(Math.round(c.before))} → `
                  : ''}
                {fmtLb(Math.round(c.after))} lb {c.kind === 'e1rm' ? 'est. max' : ''}
              </span>
            </div>
            <span className="muted small">
              <StatusIcon status={c.status} /> {c.message}
            </span>
          </li>
        ))}
        {changes.length === 0 && <li className="muted">No weighted lifts logged.</li>}
      </ul>
      <button className="primary big" onClick={onClose}>
        Done
      </button>
    </section>
  );
}

function StatusIcon({ status }: { status: LiftChange['status'] }) {
  const map = { up: '▲', hold: '■', down: '▼', reset: '↺', new: '●' } as const;
  return <span aria-hidden="true">{map[status]}</span>;
}

import { useState } from 'react';
import { fmtLb, platesPerSide, setLabel, targetText, tracksLoad } from '../lib/format';
import { DAYS, exercise } from '../lib/program';
import type { Entry, ExerciseDef, LiftState, LoggedSet, PlannedSet, Scheme } from '../lib/types';

interface Props {
  entry: Entry;
  lift?: LiftState;
  barWeight: number;
  onLog: (setIdx: number, set: LoggedSet | null) => void;
  onSwap: (exerciseId: string) => void;
}

export default function ExerciseCard({ entry, lift, barWeight, onLog, onSwap }: Props) {
  const ex = exercise(entry.exerciseId);
  const [showSwap, setShowSwap] = useState(false);
  const defaultId = DAYS.flatMap((d) => d.slots).find((s) => s.key === entry.slotKey)?.exerciseId;
  const options = Array.from(new Set([defaultId, ...(ex.swaps ?? [])].filter((id): id is string => !!id && id !== ex.id)));
  const started = entry.logged.some(Boolean);
  const doneAll = entry.logged.every(Boolean);

  return (
    <article className={doneAll ? 'card ex done' : 'card ex'}>
      <div className="ex-head">
        <div>
          <h2>{ex.name}</h2>
          {lift?.e1rm !== undefined && (entry.scheme.type === 'topBackoff' || entry.scheme.type === 'straight') && (
            <p className="muted small">Est. max {fmtLb(Math.round(lift.e1rm))} lb</p>
          )}
        </div>
        {options.length > 0 && !started && (
          <button className="ghost small" onClick={() => setShowSwap((v) => !v)} aria-expanded={showSwap}>
            Swap
          </button>
        )}
      </div>
      {showSwap && (
        <div className="swap-list">
          {options.map((id) => (
            <button
              key={id}
              className="chip"
              onClick={() => {
                setShowSwap(false);
                onSwap(id);
              }}
            >
              {exercise(id).name}
              {id === defaultId ? ' (default)' : ''}
            </button>
          ))}
        </div>
      )}
      {ex.cue && <p className="cue">{ex.cue}</p>}
      {entry.note && <p className="note">{entry.note}</p>}

      <ol className="sets">
        {entry.planned.map((p, i) => (
          <SetRow
            // Remount when the suggestion changes so the inputs pick it up.
            key={`${i}-${p.load ?? 'x'}`}
            index={i}
            plan={p}
            scheme={entry.scheme}
            ex={ex}
            barWeight={barWeight}
            logged={entry.logged[i]}
            prevLogged={entry.logged.slice(0, i).reverse().find((x): x is LoggedSet => !!x)}
            onLog={(s) => onLog(i, s)}
          />
        ))}
      </ol>
    </article>
  );
}

interface RowProps {
  index: number;
  plan: PlannedSet;
  scheme: Scheme;
  ex: ExerciseDef;
  barWeight: number;
  logged: LoggedSet | null;
  prevLogged?: LoggedSet;
  onLog: (s: LoggedSet | null) => void;
}

const RIR_CHIPS = [0, 1, 2, 3, 4];

function SetRow({ index, plan, scheme, ex, barWeight, logged, prevLogged, onLog }: RowProps) {
  const hasLoad = tracksLoad(ex, scheme);
  const startLoad = plan.load ?? prevLogged?.load ?? (ex.loadType === 'barbell' ? barWeight : 0);
  const startReps = plan.repMax ?? plan.reps;
  const [load, setLoad] = useState<number>(startLoad);
  const [reps, setReps] = useState<number>(startReps);
  const [rir, setRir] = useState<number | undefined>(undefined);
  const step = ex.increment || 5;

  if (logged) {
    const missed = logged.reps < plan.reps;
    return (
      <li className={missed ? 'set logged missed' : 'set logged'}>
        <span className="set-label">{setLabel(plan, index)}</span>
        <span className="set-done">
          {hasLoad ? `${fmtLb(logged.load)} × ` : ''}
          {logged.reps}
          {scheme.type === 'fixed' && scheme.unit === 'sec' ? 's' : ''}
          {logged.rir !== undefined ? ` · ${logged.rir} left` : ''}
          {missed ? ' · short' : ''}
        </span>
        <button className="ghost small" onClick={() => onLog(null)} aria-label="Undo set">
          Undo
        </button>
      </li>
    );
  }

  const plates = hasLoad && ex.loadType === 'barbell' ? platesPerSide(load, barWeight) : null;
  const showRir = scheme.type !== 'fixed';

  return (
    <li className="set">
      <div className="set-top">
        <span className="set-label">{setLabel(plan, index)}</span>
        <span className="target">
          {targetText(plan, scheme)}
          {plan.load === undefined && hasLoad ? ' · pick a weight' : ''}
        </span>
      </div>
      <div className="set-inputs">
        {hasLoad && (
          <Stepper label="lb" value={load} step={step} min={0} onChange={setLoad} />
        )}
        <Stepper
          label={scheme.type === 'fixed' && scheme.unit === 'sec' ? 'sec' : 'reps'}
          value={reps}
          step={scheme.type === 'fixed' && scheme.unit === 'sec' ? 5 : 1}
          min={0}
          onChange={setReps}
        />
        <button className="check" aria-label="Log set" onClick={() => onLog({ load: hasLoad ? load : 0, reps, rir })}>
          ✓
        </button>
      </div>
      {plates && <p className="muted small plates">Per side: {plates}</p>}
      {showRir && (
        <div className="rir">
          <span className="muted small">Reps left (optional)</span>
          <div className="rir-chips">
            {RIR_CHIPS.map((n) => (
              <button
                key={n}
                className={rir === n ? 'chip on' : 'chip'}
                aria-pressed={rir === n}
                onClick={() => setRir(rir === n ? undefined : n)}
              >
                {n === 4 ? '4+' : n}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="stepper">
      <button aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>
        −
      </button>
      <label>
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          onFocus={(e) => e.target.select()}
        />
        <span className="unit">{label}</span>
      </label>
      <button aria-label={`More ${label}`} onClick={() => onChange(+(value + step).toFixed(2))}>
        +
      </button>
    </div>
  );
}

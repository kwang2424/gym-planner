import { useEffect, useState } from 'react';

interface Props {
  endsAt: number;
  total: number;
  onAdd: (sec: number) => void;
  onDone: () => void;
}

export default function RestTimer({ endsAt, total, onAdd, onDone }: Props) {
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, Math.round((endsAt - now) / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left === 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // Not supported (iOS) — the bar turning green is the cue.
      }
    }
  }, [left]);

  const pct = total > 0 ? (1 - left / total) * 100 : 100;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className={left === 0 ? 'timer ready' : 'timer'} role="timer" aria-live="polite">
      <div className="timer-fill" style={{ width: `${pct}%` }} />
      <span className="timer-text">{left === 0 ? 'Go — next set' : `Rest ${mm}:${ss}`}</span>
      <button className="ghost small" onClick={() => onAdd(30)}>
        +30s
      </button>
      <button className="ghost small" onClick={onDone}>
        {left === 0 ? 'Close' : 'Skip'}
      </button>
    </div>
  );
}

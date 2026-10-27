import { useMemo, useRef, useState } from 'react';
import { fmtLb, shortDate } from '../lib/format';
import { DAYS, exercise } from '../lib/program';
import type { AppState, LiftHistoryPoint } from '../lib/types';

export default function Progress({ state }: { state: AppState }) {
  const tracked = useMemo(
    () =>
      Object.entries(state.lifts)
        .filter(([id, l]) => l.history.length > 0 && safeName(id))
        .sort(([a], [b]) => rank(a) - rank(b)),
    [state.lifts],
  );
  const [picked, setSelected] = useState<string>('');
  const selected = tracked.some(([id]) => id === picked) ? picked : (tracked[0]?.[0] ?? '');
  const current = state.lifts[selected];
  const isE1rm = current?.e1rm !== undefined;

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Progress</p>
        <h1>Your numbers</h1>
      </header>

      {tracked.length === 0 ? (
        <p className="muted">Finish a workout to start seeing trends.</p>
      ) : (
        <>
          <div className="chip-row" role="tablist" aria-label="Lift">
            {tracked.map(([id]) => (
              <button
                key={id}
                role="tab"
                aria-selected={selected === id}
                className={selected === id ? 'chip on' : 'chip'}
                onClick={() => setSelected(id)}
              >
                {safeName(id)}
              </button>
            ))}
          </div>

          {current && (
            <div className="card">
              <p className="field-label">{isE1rm ? 'Estimated max' : 'Working weight'}</p>
              <p className="hero">
                {fmtLb(Math.round(isE1rm ? current.e1rm! : current.load ?? 0))} <span className="unit">lb</span>
              </p>
              {current.history.length > 1 && <Delta history={current.history} />}
              <LineChart points={current.history} title={`${safeName(selected)} — ${isE1rm ? 'estimated max' : 'working weight'} (lb)`} />
              <details>
                <summary>Show as table</summary>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>{isE1rm ? 'Est. max' : 'Weight'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.history
                      .slice()
                      .reverse()
                      .map((p, i) => (
                        <tr key={i}>
                          <td>{shortDate(p.date)}</td>
                          <td>{fmtLb(Math.round(p.value))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </details>
            </div>
          )}
        </>
      )}

      <h2 className="section-title">Recent workouts</h2>
      {state.sessions.length === 0 && <p className="muted">None yet.</p>}
      <ul className="history">
        {state.sessions
          .slice(-12)
          .reverse()
          .map((s) => {
            const sets = s.entries.reduce((n, e) => n + e.logged.filter(Boolean).length, 0);
            const missed = s.entries.reduce(
              (n, e) => n + e.logged.filter((x, i) => x && x.reps < e.planned[i].reps).length,
              0,
            );
            return (
              <li key={s.id}>
                <details>
                  <summary>
                    <span>
                      {shortDate(s.date)} · {DAYS[s.day].name}
                    </span>
                    <span className="muted small">
                      W{s.week} · {sets} sets{missed ? ` · ${missed} short` : ''}
                    </span>
                  </summary>
                  <ul className="history-sets">
                    {s.entries
                      .filter((e) => e.logged.some(Boolean))
                      .map((e) => (
                        <li key={e.slotKey}>
                          <strong>{safeName(e.exerciseId)}</strong>
                          <span className="muted small">
                            {e.logged
                              .filter((x): x is NonNullable<typeof x> => !!x)
                              .map((x) => (x.load ? `${fmtLb(x.load)}×${x.reps}` : `${x.reps}`))
                              .join(', ')}
                          </span>
                        </li>
                      ))}
                  </ul>
                </details>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

function safeName(id: string): string {
  try {
    return exercise(id).name;
  } catch {
    return '';
  }
}

const ORDER = ['back_squat', 'bench', 'pause_squat'];
function rank(id: string) {
  const i = ORDER.indexOf(id);
  return i < 0 ? 99 : i;
}

function Delta({ history }: { history: LiftHistoryPoint[] }) {
  const d = history[history.length - 1].value - history[0].value;
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  return (
    <p className="muted small">
      {sign}
      {fmtLb(Math.abs(Math.round(d)))} lb since {shortDate(history[0].date)}
    </p>
  );
}

// Single-series line chart: 2px line, 8px markers with a surface ring,
// hairline grid, crosshair + tooltip on hover/touch.
function LineChart({ points, title }: { points: LiftHistoryPoint[]; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 340;
  const H = 180;
  const pad = { l: 40, r: 14, t: 14, b: 26 };

  if (points.length < 2) {
    return <p className="muted small">Log this lift a couple more times to see a trend.</p>;
  }

  const vals = points.map((p) => p.value);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const span = Math.max(10, rawMax - rawMin);
  const tickStep = niceStep(span / 3);
  const yMin = Math.floor((rawMin - span * 0.1) / tickStep) * tickStep;
  const yMax = Math.ceil((rawMax + span * 0.1) / tickStep) * tickStep;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += tickStep) ticks.push(v);

  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const onMove = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const h = hover !== null ? points[hover] : null;
  const last = points.length - 1;

  return (
    <figure className="chart">
      <figcaption className="muted small">{title}</figcaption>
      <div className="chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title}. From ${fmtLb(Math.round(vals[0]))} to ${fmtLb(Math.round(vals[last]))}.`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
              <text className="axis" x={pad.l - 6} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          <text className="axis" x={pad.l} y={H - 6} textAnchor="start">
            {shortDate(points[0].date)}
          </text>
          <text className="axis" x={W - pad.r} y={H - 6} textAnchor="end">
            {shortDate(points[last].date)}
          </text>
          <path className="series" d={path} />
          {hover !== null && <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} />}
          {points.map((p, i) =>
            i === last || i === hover ? (
              <circle key={i} className="marker" cx={x(i)} cy={y(p.value)} r={i === hover ? 5 : 4} />
            ) : null,
          )}
          <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="transparent" />
        </svg>
        {h && hover !== null && (
          <div
            className="tooltip"
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.value) / H) * 100}%` }}
            role="status"
          >
            <strong>{fmtLb(Math.round(h.value))} lb</strong>
            <span>{shortDate(h.date)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

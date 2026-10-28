import { CYCLE_WEEKS, DAYS, exercise, weekInfo } from '../lib/program';
import type { AppState, Scheme } from '../lib/types';

function schemeText(s: Scheme): string {
  switch (s.type) {
    case 'topBackoff':
      return 'Top set + back-offs';
    case 'straight':
      return 'Straight sets @ RPE';
    case 'double':
      return `${s.sets}×${s.repMin}–${s.repMax}`;
    case 'fixed':
      return `${s.sets}×${s.reps}${s.unit === 'sec' ? 's' : ''}${s.perSide ? '/side' : ''}`;
  }
}

const SOURCES = [
  {
    claim: 'Hitting each lift ~2×/week helps strength, mostly by adding weekly volume.',
    cite: 'Grgic et al. 2018, Sports Med',
    url: 'https://vuir.vu.edu.au/37695/',
  },
  {
    claim: 'Strength gains flatten out at fairly low set counts; frequency matters more for strength than size.',
    cite: 'Pelland et al. 2024, preprint',
    url: 'https://sportrxiv.org/index.php/server/preprint/download/537/1148/1071',
  },
  {
    claim: 'Strength gains barely change with proximity to failure, so main lifts stop 1–3 reps short.',
    cite: 'Robinson et al. 2024, Sports Med',
    url: 'https://pubmed.ncbi.nlm.nih.gov/39405023/',
  },
  {
    claim: 'RPE/RIR-based loading is at least as good as fixed percentages for 1RM gains.',
    cite: 'Hickmott et al. 2022, Sports Med Open',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8762534/',
  },
  {
    claim: 'Planned (periodized) programs give slightly larger 1RM gains than unplanned ones.',
    cite: 'Moesgaard et al. 2022, Sports Med',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35044672/',
  },
  {
    claim: 'Heavier loads build more 1RM strength, so blocks are 5s → 3s with heavy singles.',
    cite: 'Lopez et al. 2021, Med Sci Sports Exerc',
    url: 'https://mdpi-res.com/d_attachment/ijerph/ijerph-18-11237/article_deploy/ijerph-18-11237.pdf',
  },
  {
    claim: 'Lifters underestimate reps left by ~1 rep, most accurately on low-rep sets near failure.',
    cite: 'Halperin et al. 2022, Sports Med',
    url: 'https://sportrxiv.org/index.php/server/preprint/view/67',
  },
  {
    claim: 'A full week off mid-program blunted strength gains, so lighter weeks keep a heavy top set.',
    cite: 'Coleman et al. 2024, PeerJ',
    url: 'https://peerj.com/articles/16777',
  },
  {
    claim: 'Adding reps or adding load both work for accessories (double progression).',
    cite: 'Plotkin et al. 2022, PeerJ',
    url: 'https://peerj.com/articles/14142',
  },
  {
    claim: 'Adductor strengthening cut groin strains sharply in pro hockey players.',
    cite: 'NHL groin-injury research (Tyler et al.)',
    url: 'https://read.qxmd.com/read/11528328/risk-factors-for-groin-injuries-in-hockey',
  },
  {
    claim: 'Resistance training is supported for shoulder impingement; specific bench tweaks are clinical judgement — check with your PT.',
    cite: 'Shire et al. 2017, BMC Musculoskelet Disord',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5393017',
  },
];

export default function Plan({ state }: { state: AppState }) {
  const weeks = Array.from({ length: CYCLE_WEEKS }, (_, i) => weekInfo(i + 1));
  const currentCw = ((state.week - 1) % CYCLE_WEEKS) + 1;

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Plan</p>
        <h1>12-week strength cycle</h1>
        <p className="muted">
          Upper/lower, 4 days. Three 4-week blocks (5s → 4s → 3s): effort rises each week, then a lighter week that cuts
          volume but keeps a heavy top set. Build and Peak add a heavy single for practice. Week 12 tests your new max, then
          the cycle repeats from your updated numbers.
        </p>
      </header>

      <div className="card table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Wk</th>
              <th>Block</th>
              <th>Top set</th>
              <th>Back-offs</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.week} className={w.week === currentCw ? 'current' : undefined}>
                <td>{w.week}</td>
                <td>{w.test ? 'Test' : w.deload ? 'Lighter' : w.blockName}</td>
                <td>
                  {w.single ? '1 @ 8, then ' : ''}
                  {w.topReps} @ {w.topRpe}
                </td>
                <td>{w.backoffSets ? `${w.backoffSets}×${w.topReps}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {DAYS.map((d, i) => (
        <div className="card" key={d.name}>
          <h2>
            Day {i + 1}: {d.name}
          </h2>
          <p className="muted small">{d.focus}</p>
          <ul className="plan-list">
            {d.slots.map((s) => {
              const id = state.swaps[s.key] ?? s.exerciseId;
              return (
                <li key={s.key}>
                  <span>
                    {exercise(id).name}
                    {id !== s.exerciseId ? ' (swapped)' : ''}
                  </span>
                  <span className="muted small">{schemeText(s.scheme)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <h2 className="section-title">How it adapts</h2>
      <div className="card prose">
        <ul>
          <li>Weights come from your estimated max and the target effort (RPE). Reps-left is required on the top set — it's the set your estimate is built on.</li>
          <li>Hitting your targets nudges the estimate up (~0.5–1% a week). Sets that feel easier than planned move it faster; harder sets pull it back.</li>
          <li>People tend to guess about one rep too few left, so the app adds back a quarter rep and only treats a set as “too hard” when it's 1.5+ RPE over target.</li>
          <li>Top set harder than planned? Back-offs recalculate on the spot. Missed reps on a back-off or accessory drops the rest of that exercise.</li>
          <li>One rough session only moves your estimate halfway down. Two misses in a row resets it a little below what you did, so you rebuild.</li>
          <li>Accessories: hit the top of the rep range on every set and the weight goes up next time.</li>
          <li>“Beat up” (e.g. after a hard skate) trims a set and lowers targets for that day only.</li>
          <li>Two weeks away from a lift? It comes back 5% lighter.</li>
        </ul>
      </div>

      <h2 className="section-title">Why it's built this way</h2>
      <ul className="sources">
        {SOURCES.map((s) => (
          <li key={s.url}>
            {s.claim}{' '}
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.cite}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

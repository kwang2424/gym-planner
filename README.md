# Gym Planner

A phone-first, offline web app (PWA) that plans and tracks a 4-day upper/lower strength program, and adjusts the weights based on what you actually lift.

## The program

- **Split:** Lower A (squat) · Upper A (bench) · Lower B (pause squat + athletic) · Upper B (bench volume + back).
- **12-week cycle:** three 4-week blocks (Base 6s → Build 4s → Peak 3s). Each block is 3 build weeks plus 1 lighter week. Week 12 is a heavy single, then the cycle repeats from your updated numbers.
- **Main lifts:** one top set at a target RPE, then back-off sets. Loads come from your estimated max.
- **Accessories:** rep ranges with double progression (hit the top of the range on every set → add weight).
- **Hockey:** box jumps and skater bounds for power, single-leg work, lateral lunges, plus Copenhagen planks and adductor work for groin-strain prevention. Lower-body volume is kept moderate for 2–3 skates a week.
- **Shoulder-friendly:** paused bench with pain-free grip, landmine press instead of overhead press, neutral grips, rotator-cuff work. One-tap swaps (floor press, pin press, neutral DB) for flare-up days.
- **No conventional deadlift:** the hinge work is RDLs and hip thrusts.

## How it adapts when you miss

| Situation | What happens |
|---|---|
| Top set harder than planned | Back-offs are recalculated on the spot from what you did |
| Missed reps on a back-off | Remaining back-offs drop ~5% per miss |
| Accessory set below the rep range | Remaining sets drop ~10% |
| One session with missed reps | Estimated max moves halfway toward what you did |
| Two misses in a row on a lift | Estimate resets to slightly below what you did, so you can build back |
| Hit everything | Estimate rises (capped at +5% per session) |
| "Beat up" check-in (e.g. after a hard skate) | One fewer set and easier targets that day |
| 2+ weeks away from a lift | Comes back 5% lighter |

Logging "reps left" (RIR) is optional but sharpens the estimates. If you don't log it, a set where you made the reps counts as being on target, and a set where you missed reps counts as being at failure.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # progression engine tests
npm run build    # production build in dist/
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**. Then open the site on your phone and choose **Add to Home Screen**.

Data is stored on the device (localStorage). Use **Settings → Export** for backups.

## Research basis

- Grgic et al. 2018, *Sports Med*: training frequency and strength
- Pelland et al. 2024 (preprint): volume/frequency dose-response
- Robinson et al. 2024, *Sports Med*: proximity to failure
- Hickmott et al. 2022, *Sports Med Open*: autoregulation vs. percentage-based loading
- Tyler et al. 2001/2002, *AJSM*: adductor strength and groin strains in NHL players
- Shire et al. 2017, *BMC Musculoskelet Disord*: exercise for subacromial impingement

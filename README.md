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

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to the `gh-pages` branch.

- Site: **https://kwang2424.github.io/gym-planner/**
- If the site 404s after the first deploy, turn Pages on once: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
- On your phone, open the site and choose **Share → Add to Home Screen**.

CI (`.github/workflows/ci.yml`) runs the tests and build on every PR.

## Data & cloud sync

Workouts are always saved on the device first, so the app works offline at the gym. If Firebase is configured, signing in (Settings → Cloud backup) also syncs everything to Firestore and across devices:

- `users/{uid}/meta/state`: program position, lift numbers, swaps, settings (last write wins, by `updatedAt`)
- `users/{uid}/sessions/{id}`: one document per finished workout (merged as a union, never overwritten)
- Offline changes are queued and uploaded when the phone is back online.
- `firestore.rules` only lets each signed-in user read and write their own data.

Without Firebase config the app runs on-device only. **Settings → Export** always works as a file backup.

### Firebase setup (free Spark plan, doable from a phone browser)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Create project** (Analytics not needed).
2. **Build → Authentication → Get started → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode). On the **Rules** tab, paste `firestore.rules` and **Publish**.
4. **Project settings → Your apps → Web (`</>`)**: register the app and copy `apiKey`, `authDomain`, `projectId` and `appId` into `src/lib/firebaseConfig.ts`. Alternatively, set them as `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID` in your host's environment variables. These values are not secrets; the security rules protect the data.

To test locally against the emulators, set `VITE_FIREBASE_EMULATOR_HOST=127.0.0.1` and run `firebase emulators:start --only auth,firestore`.

## Research basis

- Grgic et al. 2018, *Sports Med*: training frequency and strength
- Pelland et al. 2024 (preprint): volume/frequency dose-response
- Robinson et al. 2024, *Sports Med*: proximity to failure
- Hickmott et al. 2022, *Sports Med Open*: autoregulation vs. percentage-based loading
- Tyler et al. 2001/2002, *AJSM*: adductor strength and groin strains in NHL players
- Shire et al. 2017, *BMC Musculoskelet Disord*: exercise for subacromial impingement

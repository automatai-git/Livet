# Mobility Section – Progress & To-Do

Living document for the mobility refresh. Status legend: `[ ]` not started · `[~]` in progress · `[x]` done.

---

## Context snapshot (2026-05-14)

- **Where it lives:** `src/pages/Mobility.jsx` (single file, ~295 lines).
- **Routing:** `/mobility` in `src/App.jsx`, behind Supabase auth.
- **Data:** `MOBILITY_DATA` is a hardcoded const inside the page — 7 days × 1–2 routines × exercises with `name / sets / load / purpose / cue`.
- **Persistence:** none. The legacy version (`legacy_static/mobility.js`) wrote history to `localStorage["mobilityHistory"]` and could CSV/JSON export — that capability was dropped in the React port.
- **UI state:** `selectedDay` (defaults to today), `selectedRoutine`. No completion tracking, no progress bar.
- **Styling:** uses shared `tight-card`, `muted-row`, `tag-chip`, `timer-row`, `AppShell` from `src/index.css`. Accent token `--accent-mobility: #6B9E72` (sage).
- **Timer:** `InlineTimer` renders on every exercise card. Hardcoded 60s init, 1m/2m presets. Multiple instances ⇒ multiple independent timers running at once.

## Functional gaps vs. legacy

1. No "mark exercise done" checkbox → no session-level progress.
2. No "complete workout" / session logging → no history.
3. No history view, no export.
4. No training-block / week awareness (legacy called `getTrainingBlock(today)` and `getWeekNumber(today)`).
5. Timer presets fixed at 1m/2m, but several exercises in `MOBILITY_DATA` call for 20s / 30s / 45s holds — the preset row doesn't match the data.
6. Each exercise spawns its own timer; no shared "current exercise" rest timer.
7. Data is duplicated inside the JSX file — not consumable by other pages (e.g. the Dashboard's "Today's Agenda" widget shows workout + meal but not mobility).

## Connections worth knowing

- `Dashboard.jsx` agenda widget hits `supabase.weekly_menu` and `supabase.workouts` for today — mobility is missing from the agenda entirely.
- `services/trainingService.js` exposes `getStartDate()` + `calculateProgramPosition(startDate)` ⇒ `{ week, dayName, ... }`. The mobility page should be able to plug into the same week index instead of just `new Date().getDay()`.
- `AppShell` already paints the sage underline via `accent="var(--accent-mobility)"`.

---

## Status snapshot (2026-05-15) — pick up here next session

The MacroFactor-style remodel is **live and verified in production**. The flow `day-pick → overview → focus → summary` works end-to-end. Direction is solid — next session should build on this rather than revisit it.

### What's shipped

| Area | Files | Notes |
| --- | --- | --- |
| Data model | [src/data/mobilityData.js](../src/data/mobilityData.js), [src/lib/mobility.js](../src/lib/mobility.js) | All 7 days, `tags` / `asymmetric` / `weakSide` / `shoulderManaged` flags. `parseSets`, `formatTarget`, `estimateRoutineSeconds`, `uniqueTags`, `countWeighted`. |
| Overview screen (H1) | [src/components/mobility/RoutineOverview.jsx](../src/components/mobility/RoutineOverview.jsx) | Hero + numbered list + tag union, `Start routine` / `Skip today`. |
| Focus mode (H2) | [src/components/mobility/FocusMode.jsx](../src/components/mobility/FocusMode.jsx) | One exercise per card, swipe l/r, sticky `‹ Prev / N–M / Next ›`, asymmetric + shoulder chips. |
| Per-set ticker (H3) | [src/components/mobility/SetRow.jsx](../src/components/mobility/SetRow.jsx) | Checkbox, weight input with ±2.5 kg steppers, last-weight autofill, reps actual. |
| Rest timer (H6) | [src/components/mobility/RestTimer.jsx](../src/components/mobility/RestTimer.jsx) | Preset from `parseSets`, vibrates at 0:00, honours `prefers-reduced-motion`. |
| Summary (H5) | [src/components/mobility/SessionSummary.jsx](../src/components/mobility/SessionSummary.jsx) | Duration / sets / volume, per-exercise list, PR chip on weighted exercises that beat last logged weight. |
| Schema (H4) | [input/mobility-schema.sql](mobility-schema.sql) | `mobility_sessions` + `mobility_exercise_logs` with RLS. **Applied in Supabase.** |
| Service | [src/services/mobilityService.js](../src/services/mobilityService.js) | `saveSession`, offline queue + flush, `getLastWeightFor(s)`, `getWeeklyCount`, `getBlockWeek`. |
| Orchestrator | [src/pages/Mobility.jsx](../src/pages/Mobility.jsx) | `useReducer` session state, `sessionStorage` resume mid-routine, view state machine. |
| Misc | [src/lib/swipe.js](../src/lib/swipe.js) | Generic swipe helper. |

### Sidequest also fixed

The service worker [public/service-worker.js](../public/service-worker.js) used to be cache-first for `index.html`, which pinned clients to a stale shell after every deploy. It's now **network-first for HTML / cache-first for hashed assets**, with `CACHE_NAME` bumped to `v7`. Future deploys are picked up on the next reload. **When precaching new files** in `SHELL`, still bump the version.

### Known caveats / things to watch

1. **Schema applied with a destructive reset.** [mobility-schema.sql](mobility-schema.sql) currently does `drop table if exists … cascade`. Don't re-run it once real sessions are in there — switch to additive `ALTER TABLE` migrations.
2. **Offline queue is fire-and-forget.** `flushOfflineQueue` runs on mount; failures stay queued. No UI indicator for queued items yet — could add a tiny "syncing…" pill if it becomes relevant.
3. **History view doesn't exist yet** (A3). Finished sessions land in Supabase but there's no in-app way to view them. Next obvious step.
4. **Dashboard agenda still doesn't mention mobility** (D2). Easy win.
5. **PR detection in the summary is weight-only.** Doesn't yet consider volume (weight × reps) or rep-PRs at the same weight. Fine for v1.
6. **Multi-routine days** (Mon/Tue/Thu/Fri/Sun have pre + post): the user has to come back and start the post-* routine separately. There's no "you completed the pre-, want to log the post- when you're done?" continuation.

### Next-session priorities (in order)

1. **A3 — history view at `/mobility/history`.** 4-week calendar strip + drill-down. Without this, logged sessions are invisible inside the app. Probably the next thing to ship.
2. **D2 — mobility card in Dashboard's "Today's Agenda".** Cheap, makes mobility visible from the home screen.
3. **G3 — consistency streak.** "X of last 7 days" widget at the top of `/mobility`. One service call, one line of JSX.
4. **E2 / E3 — shoulder intensity dial + niggle note.** Both need small UI affordances inside the focus card; E3 needs a new `mobility_niggles` table.
5. **B2 sticky bottom timer.** Right now RestTimer lives inside the focus card. A persistent bottom-sheet would be slicker on long routines.
6. **F — a11y polish pass.** Run axe-core, fix the focus-trap when modals appear, double-check keyboard-only flow.
7. **Multi-routine continuation** (item 6 above) — small UX improvement, could fit anywhere.

### How to verify a future change

1. `npx vite build` from the repo root — green build is the bar.
2. `npx vite` + open `http://localhost:5173/Livet/` — auth screen should render.
3. Smoke test: pick a day → start routine → tick a set → finish → save. Confirm a row appears in Supabase `mobility_sessions` and N rows in `mobility_exercise_logs`.
4. On every deploy where the precache shell changes, bump `CACHE_NAME` in the service worker.

---

## Done

- [x] Read docs, codebase, and connections (see above).
- [x] Capture current architecture + gaps in this file.
- [x] Write `input/design-overview.md`.
- [x] A0 — data extracted, parser written, page renders from the data file.
- [x] H1 — routine overview screen.
- [x] H2 — focus mode (one exercise per card, swipe, sticky nav).
- [x] H3 — per-set ticker with weight + reps inputs, last-weight autofill.
- [x] H4 — Supabase schema + `mobilityService` with offline queue. SQL applied.
- [x] H5 — session summary with stats + PR chips.
- [x] H6 — `RestTimer`, `SetRow`, `swipe.js` design-system primitives.
- [x] Service-worker caching strategy fixed (network-first for HTML).

## To do — agreed scope

Tasks are grouped by theme. The MacroFactor-style remodel (section **H**) supersedes the old A1 "tap to tick" pattern with a guided per-exercise / per-set flow.

### A0. Extract data + add metadata fields _(prerequisite)_

- [x] **A0.1. Move `MOBILITY_DATA` out of `Mobility.jsx`** into `src/data/mobilityData.js`.
- [x] **A0.2. Add a sets parser** at `src/lib/mobility.js` exposing `parseSets(setsString)` → `{ setCount, repTarget, holdSeconds, eachSide, extra }`. Handles `"3x10"`, `"3x10/side"`, `"2x20s"`, `"30s each side"`, `"3x8-12/side"`, `"5 transitions"`, `"2x30s + 10 pulses"`, etc. Falls back to `{ setCount: 1 }`.
- [x] **A0.3. Add new fields** on exercises that need them: `tags: string[]` (extract the in-caps body regions like `(HIPS)`, `(ANKLES)` from `purpose`), `asymmetric: true` + optional `weakSide: 'left' | 'right'` (90/90 Flow Wed, ATG Split Squat Sun), `shoulderManaged: true` (Friday's dislocates / ext rotation / Y-T-W).
- [x] **A0.4. Update `Mobility.jsx`** to import from the new data file. No behaviour change yet.
- _Done when:_ the mobility page renders identically to today, but `MOBILITY_DATA` is imported and `parseSets` is callable from a console import.

### A. Session loop + history

- [ ] ~~A1. Mark-done state on each exercise.~~ _Superseded by H1–H5 (MacroFactor-style guided flow). Per-exercise done state is now implicit in the per-set ticker._

- [x] **A2. Cloud-synced session log.** _Folded into H4 — `saveSession` writes to `mobility_sessions` + `mobility_exercise_logs`; offline queue at `localStorage["mobilitySessionQueue"]` replays on next mount._
  - New Supabase table `mobility_sessions` (`id`, `user_id`, `date`, `block`, `week`, `day_name`, `routine_key`, `routine_name`, `completed_names[]`, `skipped_names[]`, `duration_seconds`, `notes`).
  - Finish writes a row, then routes to `/mobility/history`.
  - Local fallback: if write fails, queue to `localStorage["mobilitySessionQueue"]` and retry on next page load.
  - _Done when:_ finishing a session writes a Supabase row, the page navigates to history, and the offline queue replays on reconnect.

- [ ] **A3. History view at `/mobility/history`.**
  - 4-week calendar strip (Mon-anchored), one dot per day: filled sage = session logged, hollow = rest, faded = missed.
  - Tap a day → expanded card with routine name, completed list, skipped list, duration, notes.
  - "Back to today" CTA returns to `/mobility`.
  - _Done when:_ the last 30 days of logged sessions render in under 200 ms with no layout shift; mobile (375 px) shows all 28 dots without horizontal scroll.

### B. Smarter timer

- [x] **B1. Auto-parse durations from `sets` strings.** _Shipped as `parseSets` in [src/lib/mobility.js](../src/lib/mobility.js); `RestTimer` consumes `parsed.holdSeconds` directly._
  - Helper `parseHoldDuration(sets)` extracts the first `\d+s` token (e.g. `"3x45s each"` → 45).
  - If no seconds found, default to 60. If `sets` contains reps only, hide the timer block on that card.
  - _Done when:_ all 12 Wednesday exercises pick the right preset (the ones with seconds) or hide the timer (rep-based ones).

- [ ] **B2. Single bottom-sheet timer.**
  - One persistent timer mounted in `AppShell` body, anchored bottom on mobile.
  - Exercise card has a "Start timer" button that hydrates the sheet with `{ exerciseName, seconds }`.
  - Tabular-nums, ~2 rem display, accent ring while running.
  - Vibrate (`navigator.vibrate(200)`) and short chirp on `0:00`. Honour `prefers-reduced-motion` for the ring animation.
  - _Done when:_ only one timer can run at a time across the page; bottom sheet sits above the iOS home indicator (`env(safe-area-inset-bottom)`).

- [ ] **B3. Optional auto-advance.**
  - Settings toggle (persisted to `localStorage["mobilityPrefs"]`) defaulting to OFF.
  - When ON, hitting 0:00 highlights the next un-done exercise and scrolls it into view (no auto-tick).
  - _Done when:_ toggling off restores manual-advance behaviour; setting survives refresh.

### D. Block / week awareness

- [x] **D1. Use `trainingService.calculateProgramPosition()`.** _Block / week eyebrow renders on the day-picker and overview; `mobilityService.getBlockWeek()` stamps saved sessions._
  - Page reads `getStartDate()` + `calculateProgramPosition()` once on mount; displays a small eyebrow `BLOCK 3 · WEEK 7` above the routine list.
  - `mobility_sessions.block` and `.week` get stamped from this when finishing a session.
  - Fallback: if no program position, hide the eyebrow and stamp `null`.
  - _Done when:_ a logged session in Block 3 Week 7 has those values in the Supabase row; the eyebrow appears on the page.

- [ ] **D2. Mobility card in Dashboard's "Today's Agenda".**
  - Add a third agenda row alongside dinner + workout: icon, label "Mobility", value = today's routine name + exercise count.
  - Click-through goes to `/mobility` and auto-opens the routine.
  - _Done when:_ on a day with one routine, the agenda shows it; on a Wednesday (two-routine day Mon/Tue/Thu/Fri have pre+post) — design decision: show the routine matching the time of day (before 12:00 → pre, after → post). Document the rule in code.

### E. Personalisation hooks

- [x] **E1. Weak-side reminder.** _Data flagged in `mobilityData.js` (`asymmetric` / `weakSide`); the focus card renders a sage `↗ extra on left` chip. Open follow-up: surface this on the overview screen too._
  - Add `asymmetric: true` + optional `weakSide: 'left' | 'right'` fields on exercises that target one side more (90/90 Flow, ATG Split Squat — already encoded in cues as "extra left").
  - UI: small chip `⬅ Extra on left` (or right) on the exercise card.
  - _Done when:_ Wednesday's 90/90 + Sunday's ATG show the chip without manual tagging in the JSX — the data file owns it.

- [ ] **E2. Shoulder intensity toggle.**
  - Tag affected exercises with `shoulderManaged: true` (Friday's dislocates, ext rotation, Y-T-W).
  - On a managed exercise, show a Low / Med / High segmented control. Selection persists per-session and is included in the logged `notes` (`shoulder:med`).
  - _Done when:_ a Friday session logged with two managed exercises at Med shows `shoulder:med ×2` in the notes column of history.

- [ ] **E3. "Something feels off" note button.**
  - Every exercise card gets a discreet `…` menu with one action: "Flag a niggle".
  - Opens a 2-field sheet: severity (1–5) + free-text note.
  - Writes to a new `mobility_niggles` Supabase table (`id`, `user_id`, `date`, `exercise_name`, `severity`, `note`, `session_id` if mid-session).
  - _Done when:_ a flagged niggle shows up under the history detail for that session, and is queryable for the injury-triage workflow.

### F. Accessibility + polish pass

- [ ] **F. Single PR covering:**
  - Day pill row → `role="tablist"`, each pill `role="tab" aria-selected`.
  - Focus-visible outlines on all interactive elements (pills, exercise cards, timer controls).
  - `prefers-reduced-motion` kills the `fadeIn` body animation and dashboard card hover scale.
  - Minimum 44 × 44 px tap targets on day pills, finish/back buttons, timer controls.
  - Empty state when a day has no routines: small illustration + "Rest day — nothing scheduled."
  - Completed state when all exercises ticked: serif "Routine complete" headline + Finish CTA prominent.
  - _Done when:_ axe-core run on `/mobility` returns zero serious/critical issues; keyboard-only walkthrough can pick a day, open a routine, tick all exercises, start/stop the timer, and finish.

### H. MacroFactor-style remodel _(headline change)_

The mobility tracker re-renders to match the MacroFactor workouts UI: a routine **overview** that "zooms" into a **guided focus mode**, one exercise at a time, with a per-set ticker, integrated rest timer, weight logging, and a final summary. Reference: https://macrofactor.com/workouts/.

User flow:

```
Day selected
  ↓
ROUTINE OVERVIEW           ← H1
  Routine name, est. duration, count of weighted exercises,
  full exercise list (one row each: name · sets · target · load).
  Primary CTA: "Start routine"
  ↓
FOCUS MODE                 ← H2
  Big card for current exercise (1 of N), name, cue, purpose.
  Set ticker: one row per set with checkbox + reps/hold + (optional) weight input.
  Inline rest timer auto-arms with parsed duration after ticking a set.
  Bottom bar: ‹ Prev   step N/M   Next ›
  ↓
SUMMARY                    ← H5
  "Routine complete" headline, sage check, duration, sets logged,
  any weight PRs flagged, button: "Save & close" → writes session + per-set logs.
```

- [x] **H1. Routine overview screen.**
  - Replace the current "tap a routine → exercise list" flow with an **overview** card: routine title (serif), small meta row (`12 exercises · ~18 min · 4 weighted`), tag chips for body regions (union of all exercises' `tags`), then a numbered list of exercises (one row each: order, name, parsed `setCount × repTarget|holdSeconds`, load if any). Primary CTA `Start routine`; secondary `Skip today` (writes a "skipped" session row with no exercise logs).
  - Estimated duration = `sum over exercises of setCount × (holdSeconds || REP_TIME) + REST_BETWEEN_SETS × (setCount − 1)`. Default `REP_TIME = 3s`, `REST_BETWEEN_SETS = 45s`. Cap at a sane upper bound.
  - _Done when:_ tapping a routine on Wednesday lands on an overview that shows 12 rows, an estimate around 25 min, and a working `Start routine` button.

- [x] **H2. Focus mode (guided per-exercise view).**
  - Replaces the all-exercises-on-one-page list. One big card at a time:
    - Eyebrow: `EXERCISE N OF M`
    - Title (serif): exercise name + small `BLOCK X · WEEK Y` chip on the right
    - Cue body text, purpose chips below
    - Set ticker (see H3) consuming the parsed `setCount` from `parseSets`
    - Inline rest timer (uses parsed `holdSeconds` for hold-based exercises; uses a configurable rest preset for rep-based — default 45s, persisted in `mobilityPrefs`).
  - Bottom navigation bar: sticky, with `‹ Prev`, current `N/M` step indicator, and `Next ›`. `Next` is disabled until at least one set is logged (or "Skip exercise" is tapped from a kebab menu).
  - Swipe gestures on mobile: swipe-left = next, swipe-right = prev. Honour `prefers-reduced-motion` (no slide animation if set).
  - State held in a `useReducer` keyed by `(date, day, routineKey)` and mirrored to `sessionStorage` so a refresh restores progress.
  - _Done when:_ stepping through a Wednesday routine ticks 12 cards, timer auto-arms on each, and a refresh mid-flow lands you on the same exercise with prior sets retained.

- [x] **H3. Per-set ticker with weight logging.**
  - Each row inside the focus card represents one set, ordered top-to-bottom. Schema:
    - Checkbox (becomes filled sage when set is logged)
    - Set number (`Set 1`, `Set 2`, …)
    - Target column: `10 reps`, `12 reps`, `45s hold`, `8–12 reps`, etc., from `parseSets`
    - "Each side" badge if the parser flagged `eachSide`
    - **Weight input** (kg, decimal step 0.5) — only rendered if the exercise has a non-`None` `load`. Numeric input + small `+/-` steppers (1 kg + 2.5 kg). Auto-filled from the user's most recent log for this exercise (see H4) on first render.
    - Reps actual (optional, defaults to target on tick)
    - Long-press / kebab on a set row: `Mark as failed`, `Add a note` (sent into the session's `notes`).
  - Hitting the checkbox writes a tentative per-set entry to local reducer state. The Supabase write happens on routine finish (H5) — so an aborted session doesn't pollute history.
  - When a set is checked, the rest timer auto-arms and starts counting down (configurable preset). At 0:00, vibrate (200 ms) + short chirp; honour `prefers-reduced-motion`.
  - _Done when:_ a 3-set Cossack Squat shows 3 rows, a weight field with the previous session's value pre-filled, and ticking each set arms the timer.

- [x] **H4. Supabase schema for per-set logs.** _SQL written to [input/mobility-schema.sql](mobility-schema.sql) — run it in the Supabase SQL editor before saves will persist. Service degrades gracefully (offline queue) until then._
  - New table `mobility_sessions`:
    ```
    id uuid pk
    user_id uuid fk auth.users
    date date
    block int null
    week int null
    day_name text          -- "wednesday"
    day_label text         -- "Wednesday - Mobility"
    routine_key text
    routine_name text
    status text            -- 'completed' | 'skipped' | 'partial'
    duration_seconds int
    notes text null
    created_at timestamptz default now()
    ```
  - New table `mobility_exercise_logs` (one row per *set*):
    ```
    id uuid pk
    session_id uuid fk mobility_sessions
    user_id uuid fk auth.users   -- denormalised for RLS / "last weight" queries
    exercise_order int
    exercise_name text
    set_number int
    reps int null
    hold_seconds int null
    weight_kg numeric(5,2) null
    each_side boolean
    side text null         -- 'left' | 'right' | null
    failed boolean default false
    note text null
    completed_at timestamptz default now()
    ```
  - RLS: rows readable/writable only by `auth.uid() = user_id`.
  - Add a small service module `src/services/mobilityService.js` with:
    - `saveSession({ session, sets })` — transactional write of one session + N exercise logs.
    - `getRecentSessions({ days = 30 })` — for the history view.
    - `getLastWeightFor(exerciseName)` — single number, used to pre-fill H3's weight input.
    - `getWeeklyCount()` — count of sessions in the last 7 days, used for G3.
  - Optimistic offline queue in `localStorage["mobilitySessionQueue"]`; flushed on next mount.
  - _Done when:_ finishing a 12-exercise Wednesday session writes exactly 1 `mobility_sessions` row and one row per set in `mobility_exercise_logs`, with weights for the weighted ones; `getLastWeightFor('Cossack Squat')` returns the value from the most recent session.

- [x] **H5. Completion / summary screen.**
  - Triggered by the `Finish` button after the final exercise, or via a `Finish early` action from the focus-mode kebab.
  - Layout:
    - Serif headline `Routine complete` + sage check.
    - Stats row: `duration`, `exercises (X/Y)`, `sets logged`, `total volume kg·reps` (sum of `weight_kg × reps_actual` over weighted sets).
    - PR callouts: any weighted exercise where today's max `weight_kg × reps` exceeds the previous-session max by ≥ 5% gets a small sage "↑ new best" chip.
    - Per-exercise summary list (collapsed by default, expandable).
    - Buttons: `Save & close` (writes via `saveSession`, routes back to `/mobility`), `Discard` (clears reducer state, no write, asks confirm).
  - _Done when:_ finishing a session with one logged PR shows the chip, `Save & close` writes both tables and the dashboard agenda updates on next load.

- [x] **H6. Bonus: design-system additions** _(not pure features, but the remodel needs them)_
  - Add a `.step-indicator` component (`N / M` capsule) + `.set-row` component to `index.css` so they're reusable.
  - Extract a generic `RestTimer` (replacing `InlineTimer`) that accepts `{ presetSeconds, onComplete }`.
  - Add a swipe-gesture helper `src/lib/swipe.js` (touch start/move/end → left/right callbacks, configurable threshold).

### G3. Consistency streak

- [ ] **Small widget at the top of `/mobility`.**
  - "Last 7 days · 5 sessions" — pulls a count of `mobility_sessions` rows where `date >= today - 7`.
  - No badges, no streak fire, no shame for misses. Just the number, muted text, sage accent on the count.
  - _Done when:_ logging a session bumps the number on next render; refresh persists.

---

## Build order suggestion (updated for the H remodel)

1. **A0** — data file + `parseSets` helper. _(in progress this turn)_
2. **H1** — routine overview screen. Small, uses A0 fields. No schema.
3. **H4** — Supabase tables + `mobilityService.js`. Unblocks every write/read after this point.
4. **H2 + H3** — focus mode + per-set ticker with weight input. Biggest chunk; ship behind a feature flag if needed.
5. **H5** — summary screen + finish write. Tests the full loop end-to-end.
6. **A2** — fold into H4/H5 (session write path is the same).
7. **A3** — history view, now showing per-set detail / weight progression.
8. **D1 / D2** — block/week stamp + dashboard agenda card.
9. **B1 / B2 / B3** — B1 is already implicit in A0's parser. B2 (single bottom-sheet timer) is now `RestTimer` from H6 — keep it tight. B3 is a small toggle.
10. **E1, E2, E3** — personalisation hooks on top of focus mode.
11. **F** — full a11y pass on the new UI.
12. **G3** — streak widget, last thing.

---

## Out of scope / parked

- Migrating `MOBILITY_DATA` to Supabase tables (consider once history logging lands — they share the schema).
- Wiring mobility into the legacy Google Sheet / Jotform pipeline (the user has a separate `data-ingestion` skill for that; not a UI concern).

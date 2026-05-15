# Mobility Section – Design Overview

A reference for the visual language and interaction patterns of the mobility tracker. Captures what exists, where it sits inside the hub, and the directions we'd take it when modernising.

---

## As-built (2026-05-15)

The MacroFactor-style remodel from §7 below is **live**. Sections 1–4 (palette, type, components in use, interaction model) still apply with these adjustments:

- **Interaction model is now `day-pick → overview → focus → summary`**, not "day → routine → flat exercise list". See [src/pages/Mobility.jsx](../src/pages/Mobility.jsx) for the state machine, [src/components/mobility/](../src/components/mobility/) for the per-view components.
- **The focus card is the new hero surface.** Big serif name, region/asymmetric/shoulder chips, set ticker, embedded `RestTimer`. Sticky bottom nav (`‹ Prev · N/M · Next ›`) with safe-area padding.
- **Sage left-border + `--success-bg` = set completed.** Same accent doubles as the rest-timer ring while running.
- **Body-region tags are first-class.** Lifted from `(HIPS)` / `(ANKLES)` etc. in `purpose` strings into a `tags: string[]` field on each exercise. Rendered as chips in the overview and focus views.
- **Day pills are a proper tablist** (`role="tablist"` / `aria-selected` / `aria-current`), 44 px tap targets, focus-visible outlines, `prefers-reduced-motion` block at the bottom of [index.css](../src/index.css).
- **Per-exercise per-set state survives a refresh** via `sessionStorage["mobilitySession:active"]` (one active session at a time, auto-cleared after save).

Section 6 ("Where it feels stale or under-baked") is now historical — most of those points are addressed. Section 7's open design questions about table shape and tag enum are settled in code:

- Sessions live in `mobility_sessions`; per-set logs in `mobility_exercise_logs` ([schema](mobility-schema.sql)).
- Body-region tags are free-text in the data file but in practice an enum is in use: `HIPS · ANKLES · GROIN · BUTT WINK · SHOULDER · T-SPINE · CORE`. Add new tags here as needed.
- Timer does **not** auto-advance to the next exercise on 0:00 (off by default, B3 task pending).
- Mobility data still lives in the JSX-adjacent module ([src/data/mobilityData.js](../src/data/mobilityData.js)); not yet in Supabase. Move it the day a routine-editor lands (parked task G1).

Outstanding follow-ups are tracked in [mobility-todo.md](mobility-todo.md) — A3 (history), D2 (dashboard agenda), G3 (streak), E2/E3 (personalisation), B2 (sticky bottom timer), F (a11y sweep). Pick from there.

---

## 1. Where mobility sits in the hub

The hub follows a "one accent per app" system. Mobility's identity is **sage green** — calm, restorative, sits next to (but doesn't compete with) the deep-green `--primary`.

| Token            | Value      | Purpose                                                   |
| ---------------- | ---------- | --------------------------------------------------------- |
| `--primary`      | `#1B3B2F`  | Global anchor, body text, primary buttons                 |
| `--bg`           | `#F2F0EB`  | Warm off-white app background                             |
| `--accent-mobility` | `#6B9E72` | Sage. Card on dashboard, underline in `AppShell` header |
| `--success`      | `#6B9E72`  | Same sage — used for "done" states (intentional overlap) |
| `--success-bg`   | `#EAF4EB`  | Tinted background for completed rows                      |

The Dashboard card sets `--app-accent: var(--accent-mobility)` and the whole tile renders solid sage with white type, line icon in a translucent rounded-square, serif title, short description, CTA chip. The sub-page `AppShell` paints a 2-px sage underline beneath the header.

## 2. Typography

- **Display / serif:** DM Serif Display (regular + italic). Used for the page title (`page-title`), routine name, and the `heading-serif` utility class.
- **Body:** Inter (300 / 400 / 500 / 600). Numbers use `font-variant-numeric: tabular-nums` inside the timer.
- **Scale on the mobility page:** routine title `1.4rem`, routine card title `1.05rem`, exercise name `0.95rem`, supporting meta `0.8rem`, eyebrow / tags `0.68–0.7rem`.

## 3. Components in use

| Class / component | Role on the mobility page                                                |
| ----------------- | ------------------------------------------------------------------------ |
| `AppShell`        | Sticky translucent header, back link, sage underline                     |
| `tight-card`      | White card, 14 px radius, 1 px border, soft shadow — used for routines + exercises |
| `muted-row`       | 0.8 rem secondary text                                                   |
| `tag-chip`        | Small pill for the exercise's "purpose" (e.g. *Ankle prep*)              |
| `kind-chip`       | Coloured pill (`.mobility` = sage). Not currently used on the page but available |
| `timer-row`       | Inline countdown (display + start/pause + reset + presets)               |
| Day chip row      | Inline-styled in JSX: pill row, `--primary` fill when selected, dotted outline when today |

## 4. Current interaction model

```
Page load
  ↓
auto-select today's pill           (uses new Date().getDay())
  ↓
render routine cards for the day   (e.g. "Pre-Workout Support", "Post-Workout Support")
  ↓
tap a routine
  ↓
render exercise list               (each card: order/name, sets, load, cue, purpose chip, own timer)
  ↓
"← Back" returns to routine list
```

No state survives a refresh. No completion or history.

## 5. What works well today

1. **Single-glance day picker.** The horizontal pill row with a "TODAY" marker is fast and unambiguous on mobile.
2. **Information density per exercise.** Order number, sets, load, cue, and purpose all fit in one tight card without scrolling per item on a phone.
3. **Inline timer.** Living inside the exercise card (vs. a global modal) is the right call for hold-based work.
4. **Visual restraint.** Sage accent + warm bg keeps the page calm — appropriate for a mobility / recovery context, not the place for loud gamification.

## 6. Where it feels stale or under-baked

- **Inert exercises.** No way to mark an exercise done, no progress bar, no session summary. The legacy static page had this; the React port lost it.
- **Timer presets don't match the data.** Page offers `1m / 2m`, but `MOBILITY_DATA` calls for `20s`, `30s`, `45s` holds. Either presets should derive from each exercise's `sets` string, or each card should auto-load the right preset.
- **Multiple live timers.** Every exercise card mounts its own `InlineTimer`; tap "Start" on three and three clocks tick in parallel. A single shared "current rest" timer would be tighter.
- **Repetition inside the page.** Pre- and post-run routines on Tue / Thu / Sun are near-duplicates. The data model could collapse these, or the UI could show a "common warmup" + "today's specifics" split.
- **No context.** Page knows nothing about the active 12-week block, the current week, the user's known issues (butt wink, groin, hips, ankles, right shoulder). The cues encode the issue tags in CAPS inside `purpose` strings — that's a smell.
- **Day pill row is non-trivial to expand.** Adding "Skip", "Swap", "Mark rest" needs a different shape (long-press menu or a small action sheet) — the current pill doesn't have anywhere to grow.
- **No empty / completed states.** Days with no routines render a one-line muted message. Sessions that wrap up just bounce back with no celebration or summary.
- **No accessibility affordances.** No `role="tab"` on the day row, no `aria-current`, no focus-visible styles, no reduced-motion fallback for the fadeIn.

## 7. Modernisation direction (design intent, not commitments)

These are choices we'd make if/when functions get added. The to-do file is the source of truth for what actually ships.

1. **Lean into the sage palette.**
   - Use `--accent-mobility` as the "in-progress" accent for the current exercise card (1 px left border or pill background).
   - Keep `--success` (deeper green) for completed state so "active vs done" reads at a glance.
   - Reserve `--primary` for chrome (back link, header) — don't compete with the app accent.
2. **One card, three layers of information.**
   - Top row: order + name + sets (already exists).
   - Middle: cue in body text, no italic (the legacy italic was twee).
   - Bottom: chips for `purpose`, optional `tag` for body region (HIPS / ANKLES / GROIN / BUTT WINK / SHOULDER), and a single context-aware action — `Done`, `Skip`, `Hold 30s`.
3. **Promote the timer.**
   - One persistent bottom-sheet timer (sticky on mobile) rather than per-card timers. Tap an exercise → auto-populates the duration parsed from `sets`.
   - `tabular-nums`, larger display (current 0.92 rem is small for arms-length on the floor).
   - Audible chirp + haptic at 0:00 (`navigator.vibrate(200)`).
4. **Body-region tags as first-class data.**
   - Move `(HIPS)`, `(ANKLES)`, `(BUTT WINK)`, `(GROIN)`, `(SHOULDER)` out of the `purpose` string into a `tags: []` array on each exercise.
   - Render them as coloured chips so the user can scan a routine and immediately see which issues today's session targets.
5. **Session shell.**
   - Header inside a routine: routine name + progress (e.g. `3/8 · 4:21`) + a "Finish" button when ≥1 exercise is marked done.
   - Finishing writes to Supabase (mirror of the legacy `mobilityHistory` localStorage entry, but cloud-synced), then routes to a `/mobility/history` view.
6. **History as a calendar strip.**
   - 4-week strip across the top: each day a small dot in `--success` (done), `--border` (rest), or empty (missed). Tap a day → drill into the logged session.
7. **Today's agenda integration.**
   - Add a `mobility` card to the Dashboard's "Today's Agenda" alongside `dinner` and `workout`. Pulls the routine name + exercise count for the selected day.
8. **Accessibility pass.**
   - Day pills as `role="tablist"`, `aria-selected`, focus-visible outlines.
   - `prefers-reduced-motion`: kill the fadeIn + scale-rotate hover on the dashboard card.
   - All timer controls reachable via keyboard, `Space` toggles play/pause when focused on the display.
9. **Mobile-first tweaks.**
   - Safe-area padding at the bottom of the page so the timer sheet doesn't sit under the iOS home indicator.
   - 44 × 44 minimum tap targets (the current day pills are ~30 px tall — borderline).

## 8. Open design questions

- Should completed sessions roll into the existing Supabase `workouts` table (one row per session) or a new `mobility_sessions` table? Affects how the Dashboard agenda and the user's external Google Sheet pipeline read it.
- Do we keep mobility data hardcoded in JSX, move it to `src/data/mobilityData.js`, or push it to Supabase? Editability vs. simplicity.
- Body-region chips: hard-coded enum (`HIPS | ANKLES | GROIN | BUTT WINK | SHOULDER | T-SPINE | CORE`) or free-text? Enum is cleaner but locks future-you in.
- Does the timer auto-advance to the next exercise when it hits zero? Friction vs. flow.

---

_Source files for the current implementation:_

- [src/pages/Mobility.jsx](../src/pages/Mobility.jsx)
- [src/components/AppShell.jsx](../src/components/AppShell.jsx)
- [src/index.css](../src/index.css) (search `tight-card`, `timer-row`, `--accent-mobility`)
- [legacy_static/mobility.js](../legacy_static/mobility.js) (history + export logic worth porting)

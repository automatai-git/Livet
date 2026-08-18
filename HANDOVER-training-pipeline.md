# HANDOVER — Training pipeline (NAS collector → Supabase → Livet /training)

**From:** Personal trainer Cowork project (coach instance) · 2026-08-18
**To:** (A) Claude Code instance on the NAS repo (`NAS-setup and system`) · (B) Claude Code instance on the Livet repo (`GitHub/Timeline`)
**Read the whole doc before starting your section. The data contract in §2 binds both sides — neither side changes it unilaterally; contract changes go back through the coach project.**

---

## 1. System context (both instances)

Andreas's training system was rearchitected 2026-08-18 (full rationale: `SYSTEM_ARCHITECTURE.md` in the Personal trainer Cowork project). The pipeline this handover implements:

```
Runna/watch → Strava → intervals.icu ─┐   (running + all watch activities,
Apple Watch → HealthFit → intervals.icu│    HRV/sleep/RHR wellness;
Hevy (strength logging, Pro API) ─────┘    intervals.icu computes CTL/ATL/TSB)
            │
            ▼  collector.py, cron 3×/day on NAS (STAGE 1 — delivered, installing)
   /workspace/nas-data/training/*.csv  ──rclone──▶  Drive:Training/   ← Claude coach reads HERE
            │
            ▼  supabase_sync (STAGE 2 — NAS instance builds, §3)
        Supabase: training_sessions / training_wellness / training_blocks
            │
            ▼  (Livet instance builds, §4)
        Livet app /training sub-app — human dashboard, offline-capable
```

Non-negotiable design rules inherited from the architecture review:
1. **No LLM-computed load metrics.** CTL/ATL/TSB/training load come from intervals.icu columns; volume comes from Hevy sums. Downstream code displays, never re-derives (client-side weekly aggregation for charts is fine; fitness modelling is not).
2. **The Drive CSV mirror is permanent, not transitional.** The Claude coach runs in a cloud sandbox with NO egress to intervals.icu/Hevy/Strava — and none to Supabase either. Drive is the coach's only read path. Stage 2 ADDS Supabase for the app; it never replaces the Drive mirror. (The stage-1 doc `setup/15-training-pipeline.md` says "retire the Drive CSV once Livet is live" — **that line is superseded by this handover.** Keep both outputs.)
3. **Personal lane.** Everything here lives in the personal `claude-scheduler` stack, `<pool>/nas-data/`, personal Google account, personal Supabase project (the same project Livet already uses). Nothing touches the business container, business rclone remote, or business Notion (D6 discipline from setup/14).
4. **Hevy is the strength source of truth.** intervals.icu activities of type WeightTraining/Workout are excluded from session rows to avoid double-count (watch-recorded gym sessions still exist in the raw activities CSV for HR/load reference).
5. **Never write to Hevy or intervals.icu from this pipeline.** Read-only. Hevy API has no delete and duplicates on retried creates; program-writing to Hevy is done interactively by the coach instance, not by cron.

Existing prior art to reuse (both instances should read these first):
- `NAS-setup and system/property-search/` — collector → Supabase pattern: `supabase_sync.py` (upsert), `db.py`, `config.yaml`, retention via pg_cron (`input/property-listings-retention.sql` in Livet repo).
- Livet repo `CLAUDE.md` — v3 shell conventions (AppShellV3 slots, appRegistry, services pattern, cache-first offline, RLS zero-row gotcha) and `HANDOVER-property-search.md` — the ownership-split precedent this contract copies.
- `tasks/training-sync/collector.py` + `setup/15-training-pipeline.md` — stage 1, already delivered.

---

## 2. DATA CONTRACT — Supabase schema (binding)

Same Supabase project as Livet. NAS owns all writes via service-role key; the app role is **read-only in v1** (no user-editable columns yet — if session notes/ratings from the app are wanted later, follow the property pattern: dedicated `user_*` columns with column-level grants, NAS upsert never sends them).

```sql
-- training_sessions: one row per executed session
create table if not exists public.training_sessions (
  source_id     text primary key,          -- 'intervals:<id>' | 'hevy:<id>'
  source        text not null check (source in ('intervals','hevy')),
  start_time    timestamptz not null,
  block         int,                       -- from BLOCKS calendar; null pre-Block-5
  week          int,                       -- 1-based within block
  day           int,                       -- ISO weekday 1–7
  domain        text not null check (domain in ('run','strength','mobility','sport','support','other')),
  okt_type      text,                      -- Jotform vocabulary, e.g. 'Run - Distance', 'Strength - Upper'
  title         text,
  distance_m    int,
  moving_time_s int,
  avg_hr        int,
  max_hr        int,
  pace_s_per_km int,
  training_load real,                      -- intervals.icu icu_training_load (null for hevy rows)
  ctl           real,                      -- intervals.icu snapshot at activity
  atl           real,
  volume_kg     int,                       -- hevy: sum(weight*reps); null for intervals rows
  avg_rpe       real,                      -- hevy set-RPE mean or intervals icu_rpe/perceived_exertion
  planned_rpe   real,                      -- null until plan integration
  rating        int,                       -- intervals 'feel' 1–5 if present
  notes         text,
  raw           jsonb,
  updated_at    timestamptz default now()
);

-- training_wellness: one row per calendar day
create table if not exists public.training_wellness (
  date          date primary key,
  resting_hr    int,
  hrv           real,                      -- rMSSD
  sleep_secs    int,
  sleep_quality real,
  fatigue       real, soreness real, stress real, mood real,
  weight_kg     real,
  raw           jsonb,
  updated_at    timestamptz default now()
);

-- training_blocks: block metadata so the app can render block progress
create table if not exists public.training_blocks (
  block         int primary key,
  start_date    date not null,
  end_date      date,
  phase         text,                      -- e.g. 'Run build (HM)'
  primary_domain text,
  a_goal        text,
  b_goals       text,
  status        text check (status in ('planned','active','closed','failed','completed'))
);
```

Grants/RLS: mirror `property_listings` — RLS on, `authenticated` gets `select` only on all three tables; writes only via service role. Remember the repo-documented gotcha: refused writes return success-with-zero-rows, so any future write path must `.select()` and treat empty as failure.

Seed row for `training_blocks`: `(5, '2026-08-24', '2026-11-15', 'Run build → HM', 'run', '<A goal from coach at design>', '<B goals>', 'active')` — coach supplies final goal text; NAS instance inserts placeholder from BLOCK.md if design is done by install time.

---

## 3. SECTION A — NAS Claude Code instance

**Scope: stage 1 verification + stage 2 (Supabase sync). Est. 1–2 sessions.**

### A1. Verify stage 1 (prereq — may already be done by Andreas)
Follow `setup/15-training-pipeline.md`: collector at `<pool>/claude/tasks/training-sync/collector.py`, `.env` (600) with `INTERVALS_API_KEY` / `INTERVALS_ATHLETE=0` / `HEVY_API_KEY` / `TRAINING_OUT`, cron 3×/day + rclone mirror to `personal:Training` (NEW personal remote — the `[assistant]` remote is business, do not touch). Smoke: `state.json` shows `"problems": []` and 5 CSVs present; Block 4 runs visible in `intervals_activities.csv` after Strava history import. Wire collector failures into the existing health/digest path (non-zero exit already integrates with task-failure detection).

### A2. Stage 2 — supabase_sync
Clone the property-search pattern (`property-search/collector/supabase_sync.py`):
- New module `tasks/training-sync/supabase_sync.py`, called at the end of `collector.py` main() (flag `SUPABASE_SYNC=1` in `.env` so stage 1 keeps working before the tables exist).
- Map collector rows → the §2 contract. The autolog row set is already deduped on `source_id`; upsert on primary key. Wellness rows upsert on `date`. Parse `okt_type` → `domain` with the same mapping the collector uses for the autolog.
- Secrets: `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in the same `.env` (the property-search stack already holds working values for this project — reuse).
- Apply the §2 DDL via the Supabase SQL editor (Andreas runs it, or ship it as `tasks/training-sync/schema.sql` and put the command in commands.txt per house convention).
- Retention: none needed (single athlete, low volume — a decade is <20k rows). Do NOT add pg_cron deletes.
- Update `setup/15-training-pipeline.md`: mark stage 2 done, and **correct the "retire Drive CSV" backlog line** per §1 rule 2 — the Drive mirror is permanent (Claude's read path).

### A3. Out of scope for you
No MCP servers, no Tailscale Funnel exposure, no writes to Hevy/intervals, no Livet repo changes. If the contract needs a column you don't have, stop and route through the coach project.

---

## 4. SECTION B — Livet repo Claude Code instance (GitHub `Timeline`)

**Scope: `/training` sub-app, read-only v1. Est. 1–2 sessions. Blocked on §3 A2 being live (tables populated) — build against the seeded schema regardless; empty-state must be handled anyway.**

### B1. Registry + route (the whole point of the v3 shell — no layout changes)
- `src/data/appRegistry.js`: new entry `training` — route `/training`, name "Training", line-icon (new sprite `<symbol>`, e.g. a pulse/dumbbell glyph per the 24×24/1.6-stroke sprite conventions), accent suggestion: deep moss `#4F7A5B` distinct from workout slate-teal and mobility sage — pick per palette fit, small-marks-only rule applies (this can take the dashed "Finance" ghost slot's pattern; leave the Finance ghost in place).
- `src/App.jsx`: route `/training` → `src/pages/Training.jsx`. Existing `/workout` and `/mobility` apps are untouched — `/training` is the *data dashboard*; they remain the *content* apps.

### B2. Service + offline (house pattern, exactly)
- `src/services/trainingService.js` — the ONLY file touching `training_sessions` / `training_wellness` / `training_blocks`. Paged reads (PostgREST 1000-row cap — copy `propertyService`'s paging), default window: active block + previous 90 days; full-history fetch lazy.
- Cache-first localStorage fallback: `training-cache-v1` (sessions+blocks), `training-wellness-cache-v1`. Same load-network-fallback-cache flow as every other data layer. `OfflineNote` component last in the content slot — no bespoke offline UI. This satisfies the offline requirement (NAS reachable only over tailnet is irrelevant: app reads Supabase, cache covers offline).
- Read-only v1: no writes, so the RLS zero-row guard is moot until user columns arrive — note it anyway in the service header comment.

### B3. UI (AppShellV3 slots, one screen + detail later if needed)
- `src/pages/Training.jsx` in `AppShellV3`: `app="training"`, scope pills `Uke · Blokk · Trend`, hero = current block card (from `training_blocks`: phase, week N of 12, A goal, days to block end).
- Content by scope:
  - **Uke:** current week's sessions grouped by domain (run/strength/mobility/sport/support), per-session rows: day, økt type, distance/pace or volume_kg, avg_rpe, HR. Week compliance chips vs block targets (targets hardcoded from block config v1; move into `training_blocks` later if needed).
  - **Blokk:** 12-week grid — sessions per week per domain (heatmap-style like `WeekHeatmap`), long-run progression sparkline (max run distance_m per week), mobility count vs ≥1/week target.
  - **Trend:** CTL/ATL lines + TSB band from session snapshots, 7-day HRV and resting-HR sparklines, sleep hours bar — **display intervals.icu values as-is, compute nothing beyond grouping/max/mean for display**.
- `src/lib/training.js` — pure helpers (week grouping, pace formatting mm:ss/km, domain mapping), vitest in sibling `training.test.js` per house rule. Norwegian domain labels where natural (økt, blokk, uke).
- Optional Today-card moment (later, not v1): "long run crossed 15 km" style card — follow `propertySeen` pattern if added.

### B4. Schema + docs
- Copy §2 DDL into `input/training-schema.sql` (schemas live in the repo per convention, run manually in Supabase SQL editor).
- Update repo `CLAUDE.md`: add the Training section under Architecture (data contract summary, ownership: NAS owns all columns, app read-only, cache keys, the "display-not-derive" rule).
- Empty-state: tables empty or unreachable → show "Venter på data fra NAS-pipeline" with the OfflineNote pattern, never a crash.

### B5. Out of scope for you
No collector logic, no Supabase writes, no schema changes (route changes through the coach project), no touching `/workout`, `/mobility`, or Goals.

---

## 5. Sequencing & done-criteria

1. NAS A1 (stage 1 live: CSVs on Drive) → coach's Sunday review switches data source. **Done when:** `Drive:Training/state.json` fresh <24 h, `problems: []`.
2. NAS A2 (Supabase populated). **Done when:** row counts match autolog CSV (±dedupe), `training_blocks` has Block 5 active.
3. Livet B1–B4. **Done when:** `/training` renders current block from live data, lint+tests green, offline cache verified (airplane-mode reload shows last data + OfflineNote), deployed via normal push-to-main Pages flow.
4. Report completion back to Andreas; the coach project updates `SYSTEM_ARCHITECTURE.md` migration state. Target window: Block 5–6 transition at the latest — earlier is fine, stage 1 ASAP.

---

## 6. System completeness map — what is NOT in this handover (so nothing is left implicit)

This handover fully covers the NAS and Livet build scopes (§3, §4). The finished running system additionally requires:

**Andreas (account/device plumbing, ~1 h total):**
- HealthFit purchase + auto-export (workouts + wellness) → intervals.icu; Strava already connected.
- Hevy Pro + API key → NAS `.env` (never into docs/repos).
- rclone personal remote one-time OAuth (desktop) per setup/15.
- Run the §2 DDL in the Supabase SQL editor when the NAS instance ships `schema.sql`.
- Add the **hevy-mcp hosted custom connector** (mcp.hevy-mcp.dev + Hevy API key) in Claude → Settings → Connectors. **Required, not optional:** it is the ONLY path by which the coach can write block routines into Hevy — the coach's cloud sandbox has no Hevy egress, and this pipeline is read-only by design. Until added, programs are delivered as tables and entered manually once per block.
- **Recurring (each block boundary, ~4×/year, 5 min):** extend the `BLOCKS` list in `collector.py` and insert/update the `training_blocks` row — the coach instance supplies the exact values at every block design session but cannot reach the NAS itself.

**Coach instance (Personal trainer Cowork project — no code, not handover work):**
- Switch the Sunday scheduled review's data source to `Drive:Training/` when stage 1 is live; rewrite the `data-ingestion` skill (currently Sheet-oriented).
- Block 5 design + Q1 quarterly review + first routines into Hevy (via the connector above).
- Retro-evaluation of Block 4 running once the Strava→intervals history import is complete.
- Retire legacy Sheet references from remaining skills; keep the Sheet read-only as history.

Done-definition for the whole system: stage 1 + stage 2 green (§5), `/training` deployed, connector added, Sunday review running off the mirror, Block 5 active in Hevy + Runna.

---

## 7. SECTION A COMPLETION REPORT — NAS instance, 2026-08-18 (for the Livet instance: read before building §4)

**§3 is COMPLETE. §5.1 and §5.2 done-criteria are met.** The tables exist,
are populated, and refresh 3×/day (06:10/13:10/21:10 CET). Section B is
unblocked — build against live data, not just the seeded schema.

### 7.1 What was done (deviations from §3 as written)
- Stage 1 was a **fresh install** (nothing pre-existed on the NAS). Collector
  lives at `<pool>/docker/compose/claude-code/tasks/training-sync/`
  (`collector.py`, `supabase_sync.py`, `schema.sql`, `.env`), not the path
  setup/15 first named. Output: `<pool>/claude/workspace/training/`, mirrored
  to `personal:Training/` on the personal Drive (scope `drive.file`).
- Collector was refactored to a canonical session-dict model (the delivered
  stage-1 code couldn't feed the §2 contract — autolog rows lacked the
  numeric fields). Autolog output verified byte-identical.
- Hardening added beyond the handover: sync runs only on a problem-free
  collection; sync failures fail the run loudly (health-digest visible);
  `HEVY_EXPECTED=1` flag guards silent Hevy-key decay; timestamps normalized
  (see 7.3); `""`→null everywhere.
- Verified live: `sessions=53` (= autolog count), `wellness=96`,
  `training_blocks` has Block 5 active. Upsert-overwrite re-verified after a
  post-deploy fix.
- Secrets policy (owner decision 2026-08-18): keys live ONLY in the NAS
  `.env` — no Vaultwarden. Contract-relevant: nothing for Section B.

### 7.2 What remains (not Section B's job, but affects what you'll see)
- **Strava→intervals history import has NOT landed.** Most current
  intervals rows are skeletal: null distance/HR/pace/CTL/ATL/load, okt_type
  `"Sport - Other"`. Zero `domain='run'` rows exist right now.
- **No Hevy key yet** (Hevy Pro pending) → zero `strength`/`mobility` rows.
- **All current rows have `block=null`** — Block 5 starts 2026-08-24, and
  block/week/day are only stamped from that date.
- Block 5 `a_goal`/`b_goals` are placeholders ("TBD") until the coach's
  design session; `end_date` 2026-11-15 provisional.
- Morning-cron freshness check pending (first scheduled run 2026-08-19
  06:10).

### 7.3 Concerns / contract clarifications for the Livet build
1. **Build for sparse data first.** Given 7.2, every view must render with:
   all-null metrics, zero rows in a domain, null block, placeholder goal
   text. The §4 empty-state requirement ("Venter på data fra NAS-pipeline")
   is the launch state for Trend (CTL/ATL) and strength views, not an edge
   case.
2. **Timezones:** `start_time` is tz-aware UTC. `block/week/day` were
   stamped from LOCAL (Europe/Oslo) dates on the NAS. For day-grouping and
   "this week" logic, convert `start_time` to Europe/Oslo client-side —
   grouping by raw UTC dates will disagree with the `day` column across
   midnight.
3. **`day` semantics:** ISO weekday 1–7 (Mon=1), stamped from local date.
4. **Mobility detection is a naming convention**, not a source field: Hevy
   workouts whose title contains "mobility" or "exercise" (case-insensitive)
   → `domain='mobility'`, okt_type `Mobility - <title>`. Everything else
   from Hevy is `strength`. If the Blokk view's mobility count reads 0
   forever, the likely cause is titles not following the convention — flag
   it, don't "fix" it app-side.
5. **`avg_rpe` semantics differ by source** (hevy = set-RPE mean; intervals
   = icu_rpe/perceived_exertion). Fine to display; don't average across
   sources as if homogeneous.
6. **`pace_s_per_km` is precomputed** (moving_time/distance). Display as-is
   (mm:ss/km helper) — the display-not-derive rule of §1 stands.
7. **Refresh window:** the collector rebuilds a 180-day window; rows older
   than that stop being refreshed (they persist — no deletes). `updated_at`
   is bumped on every sync for rows in the window; don't use it as an
   "activity edited" signal.
8. **RLS:** `authenticated` role, select-only, all three tables; `anon`
   gets nothing. Same auth pattern as `propertyService`. The zero-row-on-
   refused-write gotcha is moot in read-only v1 but note it in the service
   header per §B2.
9. **Row volumes are tiny** (≤ a few hundred rows/year). The §B2 paging
   pattern is still correct house style, but one page will hold years —
   don't over-engineer.
10. **Schema source of truth:** copy the DDL from the NAS repo's
    `tasks/training-sync/schema.sql` (it adds two indexes over §2 and the
    exact seed row) into `input/training-schema.sql` per §B4. The §2
    contract itself is unchanged — no column was added, renamed, or
    retyped. Contract changes still route via the coach project only.

---

## 8. SECTION B COMPLETION REPORT — Livet instance, 2026-08-18

**§4 is COMPLETE. §5.3 done-criteria are met.** `/training` is deployed
(commit `f623285`, Pages build green), renders the current block from live
data, lint+tests green (241 tests), offline cache verified by the owner on
device. Owner is running a one-week live test; adjustments may follow.

### 8.1 What was done (deviations from §4 as written)
- **Service filename:** `src/services/trainingService.js` was already taken
  by a legacy service (workout-program position over `relevant_dates`, used
  by Today and mobilityService). The pipeline data layer is
  `src/services/trainingDataService.js` instead. Cache keys and behaviour
  are exactly per §B2 (`training-cache-v1`, `training-wellness-cache-v1`,
  paged reads, default window = active block + 90 days, read-only).
- **Uke view keys on the calendar week (Europe/Oslo, Mon–Sun), not the
  `week` column** — pre-Block-5 rows carry no block stamp (§7.2), so a
  block-week view would be empty until 2026-08-24. Block stamps drive only
  the Blokk grid. Oslo conversion per §7.3.2 is explicit
  (`Intl … timeZone: 'Europe/Oslo'`), unit-tested across midnight both
  in CEST and CET.
- **Week compliance chips ship dormant** (`WEEK_TARGETS = null` in
  Training.jsx, shape documented) — Block 5 targets don't exist until the
  coach's design session. Block goals display from
  `training_blocks.a_goal`/`b_goals` (currently the seeded placeholders).
- **TSB** is rendered as `ctl − atl` client-side (intervals.icu's own
  definition; the schema has no tsb column). Flagged as the one permitted
  piece of arithmetic under §1 rule 1 — if the coach project objects, a
  `tsb` column via the NAS is the contract-clean alternative.
- **`raw` jsonb is never selected** — nothing displays from it and the
  cache lives in localStorage (compact-set precedent from propertyService).
- Accent: muted mulberry `#7A4E66` (moss suggestion declined — three greens
  in the accent set already; owner approved).
- No realtime subscription (cron-only refresh, 3×/day — nothing to react to).

### 8.2 For the coach project (observed while building, not Section B scope)
- The legacy in-app planning stack (`blocks` + `user_config` tables → the
  Workout Finder schedule; `relevant_dates` 'training_start' → Mobility's
  block/week stamping) is now a **parallel, disconnected block system**: it
  knows nothing of `training_blocks`, and without a manually-entered Block 5
  plan it goes stale on 2026-08-24. Whether to retire the Workout Finder
  and re-point Mobility's stamping belongs to the architecture review, not
  this handover.
- Mobility sessions logged in the Livet Mobility app land in
  `mobility_sessions` — invisible to the pipeline, so `/training`'s Blokk
  mobility count reflects **Hevy-titled workouts only** (§7.3.4). Until
  mobility is logged in Hevy, that count reads 0 by design.

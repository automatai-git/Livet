-- =============================================================================
-- Training pipeline stage 2 — run once in the Livet project's Supabase SQL
-- editor (same project as property_listings). Contract:
-- HANDOVER-training-pipeline.md §2 (binding — changes route via the coach
-- project). Written by the NAS collector (service role, bypasses RLS);
-- the Livet app (authenticated) is READ-ONLY in v1.
-- =============================================================================

-- training_sessions: one row per executed session
create table if not exists public.training_sessions (
  source_id     text primary key,          -- 'intervals:<id>' | 'hevy:<id>'
  source        text not null check (source in ('intervals','hevy')),
  start_time    timestamptz not null,
  block         int,                       -- from BLOCKS calendar; null pre-Block-5
  week          int,                       -- 1-based within block
  day           int,                       -- ISO weekday 1–7
  domain        text not null check (domain in ('run','strength','mobility','sport','support','other')),
  okt_type      text,                      -- Jotform vocabulary, e.g. 'Run - Distance'
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

-- training_blocks: block metadata so the app can render block progress.
-- NOT written by the collector — seeded here, updated manually at each
-- block boundary (coach supplies values; handover §6).
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

create index if not exists training_sessions_start_idx
  on public.training_sessions (start_time desc);
create index if not exists training_sessions_block_idx
  on public.training_sessions (block, week);

-- RLS + grants: mirror property_listings — authenticated reads only, all
-- writes via service role. (Repo gotcha: refused writes return
-- success-with-zero-rows; any future app-side write path must .select()
-- and treat empty as failure.)
alter table public.training_sessions enable row level security;
alter table public.training_wellness enable row level security;
alter table public.training_blocks   enable row level security;

drop policy if exists "authenticated read" on public.training_sessions;
create policy "authenticated read" on public.training_sessions
  for select to authenticated using (true);
drop policy if exists "authenticated read" on public.training_wellness;
create policy "authenticated read" on public.training_wellness
  for select to authenticated using (true);
drop policy if exists "authenticated read" on public.training_blocks;
create policy "authenticated read" on public.training_blocks
  for select to authenticated using (true);

revoke insert, update, delete on public.training_sessions from authenticated;
revoke insert, update, delete on public.training_wellness from authenticated;
revoke insert, update, delete on public.training_blocks   from authenticated;
grant select on public.training_sessions to authenticated;
grant select on public.training_wellness to authenticated;
grant select on public.training_blocks   to authenticated;

-- Seed Block 5 (goal text = placeholder until the coach's design session;
-- update via: update public.training_blocks set a_goal=..., b_goals=...
-- where block=5)
insert into public.training_blocks
  (block, start_date, end_date, phase, primary_domain, a_goal, b_goals, status)
values
  (5, '2026-08-24', '2026-11-15', 'Run build → HM', 'run',
   'A goal TBD at Block 5 design (coach)', 'B goals TBD', 'active')
on conflict (block) do nothing;

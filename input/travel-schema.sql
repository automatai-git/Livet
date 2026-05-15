-- Travel planner multi-trip schema (fresh setup).
-- Run in the Supabase SQL editor BEFORE deploying the multi-trip code.
--
-- ADDITIVE ONLY: uses `create table if not exists`. Safe to re-run.
-- Creates BOTH tables (trips, travel_plans) from scratch — the previous
-- attempt assumed travel_plans already existed, but it didn't.

-- =============================================================
-- trips: one row per user trip (e.g. "Hawaii 2026", "Japan 2027").
-- Each trip points to a destination template by slug.
-- =============================================================
create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  destination_key  text not null,                   -- e.g. 'hawaii'
  name             text not null,                   -- user-editable display name
  start_date       date,
  end_date         date,
  status           text not null default 'planning'
                   check (status in ('planning', 'booked', 'ontrip', 'archived')),
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists trips_user_created_idx
  on public.trips (user_id, created_at desc);

alter table public.trips enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trips' and policyname = 'users own trips'
  ) then
    create policy "users own trips" on public.trips
      for all
      using      (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- =============================================================
-- travel_plans: one row per planned experience OR completed checklist
-- item, scoped to a specific trip.
--   experience_id format:
--     "bi-1", "oa-2" …    → references DESTINATIONS[…].experiences[].id
--     "chk-3"             → references DESTINATIONS[…].checklist[].id
--   status:
--     'planned'   — user added it to the plan
--     'completed' — user ticked it off (or it's a checklist item)
-- =============================================================
create table if not exists public.travel_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  trip_id          uuid not null references public.trips(id) on delete cascade,
  destination_id   text not null,                   -- redundant w/ trips.destination_key
                                                    -- but kept for legacy queries
  experience_id    text not null,
  status           text not null default 'planned'
                   check (status in ('planned', 'completed')),
  created_at       timestamptz not null default now(),
  unique (trip_id, experience_id)
);

create index if not exists travel_plans_trip_idx
  on public.travel_plans (trip_id);

create index if not exists travel_plans_user_idx
  on public.travel_plans (user_id);

alter table public.travel_plans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'travel_plans' and policyname = 'users own travel plans'
  ) then
    create policy "users own travel plans" on public.travel_plans
      for all
      using      (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

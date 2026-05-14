-- Mobility tracker schema (task H4)
-- Run this in the Supabase SQL editor. Idempotent — safe to re-run.

-- =============================================================
-- mobility_sessions: one row per finished routine
-- =============================================================
create table if not exists public.mobility_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null default current_date,
  block           int,
  week            int,
  day_name        text not null,           -- 'wednesday'
  day_label       text,                    -- 'Wednesday - Mobility'
  routine_key     text not null,           -- 'full-session'
  routine_name    text,                    -- 'Full Corrective Session'
  status          text not null default 'completed'
                  check (status in ('completed', 'partial', 'skipped')),
  duration_seconds int,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists mobility_sessions_user_date_idx
  on public.mobility_sessions (user_id, date desc);

-- =============================================================
-- mobility_exercise_logs: one row per set within a session
-- =============================================================
create table if not exists public.mobility_exercise_logs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.mobility_sessions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  exercise_order  int not null,
  exercise_name   text not null,
  set_number      int not null,
  reps            int,
  hold_seconds    int,
  weight_kg       numeric(5,2),
  each_side       boolean default false,
  side            text check (side in ('left', 'right')),
  failed          boolean default false,
  note            text,
  completed_at    timestamptz not null default now()
);

create index if not exists mobility_logs_user_exercise_idx
  on public.mobility_exercise_logs (user_id, exercise_name, completed_at desc);

create index if not exists mobility_logs_session_idx
  on public.mobility_exercise_logs (session_id);

-- =============================================================
-- Row-Level Security
-- =============================================================
alter table public.mobility_sessions       enable row level security;
alter table public.mobility_exercise_logs  enable row level security;

drop policy if exists "users own sessions" on public.mobility_sessions;
create policy "users own sessions" on public.mobility_sessions
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users own exercise logs" on public.mobility_exercise_logs;
create policy "users own exercise logs" on public.mobility_exercise_logs
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

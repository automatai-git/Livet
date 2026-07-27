-- Life tree weekly ticks.
-- Run this in the Supabase SQL editor. Non-destructive: uses IF NOT EXISTS,
-- safe to re-run.

create table if not exists public.life_tree_weeks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_key   text not null,                     -- ISO week, e.g. '2026-W31'
  ticks      jsonb not null default '{}'::jsonb, -- { "training": true, ... }
  updated_at timestamptz not null default now(),
  unique (user_id, week_key)
);

create index if not exists life_tree_weeks_user_week_idx
  on public.life_tree_weeks (user_id, week_key desc);

alter table public.life_tree_weeks enable row level security;

drop policy if exists "users own life tree weeks" on public.life_tree_weeks;
create policy "users own life tree weeks" on public.life_tree_weeks
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

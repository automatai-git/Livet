-- Goals app: sprint documents + tracker state.
-- Run this in the Supabase SQL editor. Non-destructive: uses IF NOT EXISTS,
-- safe to re-run.

create table if not exists public.goal_sprints (
  id         text not null,                       -- client-generated id ('current' for the live doc)
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default '',
  markdown   text not null default '',            -- the uploaded/pasted sprint md, verbatim
  items      jsonb not null default '[]'::jsonb,  -- tracker items: tick/count/closed state
  notes      jsonb not null default '[]'::jsonb,  -- dated note log, newest first
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists goal_sprints_user_idx
  on public.goal_sprints (user_id);

alter table public.goal_sprints enable row level security;

drop policy if exists "users own goal sprints" on public.goal_sprints;
create policy "users own goal sprints" on public.goal_sprints
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

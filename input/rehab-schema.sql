-- Rehab module schema (shoulder rehab protocol, Block 4).
-- Run this in the Supabase SQL editor.
--
-- Both tables are APPEND-ONLY: the app inserts rows and never updates them.
-- All gate logic (phase transitions, regression flag, escalation) is
-- recomputed from rehab_log on every load — there is no cached gate state,
-- so historical rows must never be mutated. Table definitions are verbatim
-- from the 2026-06-13 engineering brief (§4).

create table rehab_log (
  id uuid primary key default gen_random_uuid(),
  logged_at timestamptz not null default now(),
  protocol_id text not null,
  signal_id text not null,          -- shoulder_resting | shoulder_crossbody | isometric_response | neck_right
  value numeric not null,           -- 0-10
  provoking_movement text,          -- neck_right mapping; null otherwise
  session_context text,             -- what preceded (fatigue-confound detection)
  settled_within_2h boolean,
  next_morning_stiff boolean
);

create table rehab_compliance (
  id uuid primary key default gen_random_uuid(),
  logged_at timestamptz not null default now(),
  protocol_id text not null,
  phase_id text not null,
  item text not null,               -- exercise name from protocol JSON
  completed boolean not null
);

-- Indexes for the app's access pattern (full per-protocol history, ascending).
create index rehab_log_protocol_idx
  on rehab_log (protocol_id, logged_at);
create index rehab_log_signal_idx
  on rehab_log (protocol_id, signal_id, logged_at);
create index rehab_compliance_protocol_idx
  on rehab_compliance (protocol_id, logged_at);

-- RLS: same single-user permissive policy as the blocks / mobility_history
-- tables this module sits next to (see sql_commands/create_blocks_seed.sql).
alter table rehab_log        enable row level security;
alter table rehab_compliance enable row level security;

do $$ begin create policy "rehab log all"        on rehab_log        for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "rehab compliance all" on rehab_compliance for all using (true) with check (true); exception when duplicate_object then null; end $$;

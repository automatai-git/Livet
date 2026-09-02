-- =============================================================================
-- life_events + life_arenas — run once in the Livet project's Supabase SQL
-- editor (project ycsivbzsfrphkxrqfoyi, same one property_listings lives in).
--
-- Written by the NAS weekly-events-digest task via tasks/events-sync/
-- push-events.sh (service role, bypasses RLS).
-- Read + user_state/user_notes updates by the Livet app (authenticated).
--
-- Ownership split mirrors property_listings: the NAS upsert never sends
-- user_state or user_notes, so merge-duplicates cannot clobber the app's
-- writes, and column-level grants stop the app writing anything else.
-- =============================================================================

-- ── Dated happenings ────────────────────────────────────────────────────────
create table if not exists public.life_events (
  id              text primary key,          -- slug derived from url or name
  track           text not null,             -- pleasure | social | business
  category        text,                      -- music|culture|art|food|sport|founder|
                                             -- investor|ai|fintech|defense|maritime|
                                             -- learning|misc
  name            text not null,
  description     text,
  why             text,                      -- why it matters for him; null for pleasure
  url             text,                      -- canonical event page (dedup key upstream)
  booking_url     text,
  image_url       text,
  venue           text,
  city            text,
  country         text,
  event_date      date,
  end_date        date,
  time_band       text,                      -- next_2w | next_2m | later
  price_nok       bigint,                    -- null when unknown; price_note carries the words
  price_note      text,                      -- 'Free' | 'Members only' | 'By application' | ...
  achiever_score  int,                       -- 0-100; null for pleasure (not scored)
  barrier         text,                      -- free | paid | application | invite | member
  format          text,                      -- dinner|roundtable|workshop|conference|club|
                                             -- festival|concert|fair|talk|social
  room_note       text,                      -- who is actually there; null for pleasure
  audience_size   int,
  business_goals  jsonb default '[]'::jsonb, -- subset of ["customers","capital","frontier"]
  calendar_url    text,
  sent_week       date,                      -- Monday of the digest that introduced it
  first_seen      timestamptz default now(),
  last_seen       timestamptz default now(),
  synced_at       timestamptz default now(),
  -- Owned by the Livet app; the NAS sync never sends these columns:
  user_state      text,                      -- interested | going | attended | hidden | null
  user_notes      text
);

-- ── Standing arenas: clubs, networks, syndicates, recurring series ──────────
create table if not exists public.life_arenas (
  id              text primary key,
  track           text not null,             -- social | business
  name            text not null,
  kind            text,                      -- club|network|association|series|syndicate|membership
  description     text,                      -- who is actually in it
  why             text,
  url             text,
  join_url        text,
  city            text,
  cadence         text,                      -- Monthly | Weekly | Quarterly | Ad hoc
  cost_note       text,
  how_to_join     text,                      -- the literal next step
  achiever_score  int,
  sent_week       date,
  first_seen      timestamptz default now(),
  last_seen       timestamptz default now(),
  synced_at       timestamptz default now(),
  -- App-owned:
  user_state      text,                      -- interested | joined | hidden | null
  user_notes      text
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- The app's default view: upcoming events in one track, best room first.
create index if not exists life_events_track_date_idx
  on public.life_events (track, event_date);
create index if not exists life_events_score_idx
  on public.life_events (event_date, achiever_score desc nulls last);
create index if not exists life_events_user_state_idx
  on public.life_events (user_state) where user_state is not null;
create index if not exists life_arenas_track_idx
  on public.life_arenas (track, achiever_score desc nulls last);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.life_events enable row level security;
alter table public.life_arenas enable row level security;

drop policy if exists "authenticated read events" on public.life_events;
create policy "authenticated read events"
  on public.life_events for select
  to authenticated using (true);

drop policy if exists "authenticated update own-state events" on public.life_events;
create policy "authenticated update own-state events"
  on public.life_events for update
  to authenticated using (true) with check (true);

drop policy if exists "authenticated read arenas" on public.life_arenas;
create policy "authenticated read arenas"
  on public.life_arenas for select
  to authenticated using (true);

drop policy if exists "authenticated update own-state arenas" on public.life_arenas;
create policy "authenticated update own-state arenas"
  on public.life_arenas for update
  to authenticated using (true) with check (true);

-- Column-level guard: the app may only write the user_* columns.
revoke insert, delete, update on public.life_events  from authenticated;
revoke insert, delete, update on public.life_arenas  from authenticated;
grant update (user_state, user_notes) on public.life_events to authenticated;
grant update (user_state, user_notes) on public.life_arenas to authenticated;
grant select on public.life_events to authenticated;
grant select on public.life_arenas to authenticated;

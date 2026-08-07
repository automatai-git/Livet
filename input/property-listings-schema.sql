-- =============================================================================
-- property_listings — run once in the Livet project's Supabase SQL editor.
-- Written by the NAS collector (service role, bypasses RLS).
-- Read + user_state/user_notes updates by the Livet app (authenticated).
-- =============================================================================

create table if not exists public.property_listings (
  finnkode        text primary key,
  profile         text not null,             -- 'bolig' | 'fritid'
  heading         text,
  url             text,
  image_url       text,
  location        text,
  lat             double precision,
  lon             double precision,
  price           bigint,                    -- prisantydning, NOK
  total_price     bigint,                    -- totalpris incl. omkostninger/fellesgjeld
  area_m2         numeric,
  bedrooms        int,
  property_type   text,
  price_per_m2    numeric,
  status          text,                      -- shortlist | queued | evaluated
  active          boolean default true,      -- false = gone from Finn (sold/withdrawn)
  first_seen      timestamptz,
  last_seen       timestamptz,
  price_history   jsonb,                     -- [{"at": iso, "price": n}, ...]
  score           int,                       -- 0-100, Claude evaluation
  recommendation  text,                      -- view | maybe | skip
  eval_summary    text,
  red_flags       jsonb,
  highlights      jsonb,
  evaluated_at    timestamptz,
  synced_at       timestamptz default now(),
  -- Owned by the Livet app; the NAS sync never sends these columns:
  user_state      text,                      -- interested | hidden | viewed | null
  user_notes      text
);

create index if not exists property_listings_score_idx
  on public.property_listings (active, profile, score desc);

alter table public.property_listings enable row level security;

create policy "authenticated read"
  on public.property_listings for select
  to authenticated using (true);

create policy "authenticated update own-state"
  on public.property_listings for update
  to authenticated using (true) with check (true);

-- Column-level guard: the app may only write the user_* columns.
revoke insert, delete, update on public.property_listings from authenticated;
grant update (user_state, user_notes) on public.property_listings to authenticated;
grant select on public.property_listings to authenticated;

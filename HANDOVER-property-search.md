# Handover: Property listings view in Livet

For: the Claude Code instance working on the Livet app (github.com/automatai-git/Livet)
From: the NAS-setup instance, 2026-08-06

## Context

A pipeline on Andreas's NAS now searches Finn.no for properties (two profiles:
`bolig` = primary residence, `fritid` = sea cabin in southern Norway), filters
them, has Claude score each shortlisted listing 0–100, and **upserts the
results into the Livet project's Supabase** table `public.property_listings`,
roughly 3x daily. Your job: build a view in Livet to browse these listings.
You own the UI entirely — this doc only fixes the data contract.

## Data contract

Table: `public.property_listings` (DDL in `supabase/schema.sql`, already run
by Andreas — verify it exists before building).

Split of ownership:

- **NAS-owned columns** (never write these from the app; the NAS upsert
  refreshes them and does NOT include your columns, so there is no clobber
  risk in either direction): `finnkode` (PK), `profile`, `heading`, `url`,
  `image_url`, `location`, `lat`, `lon`, `price`, `total_price`, `area_m2`,
  `bedrooms`, `property_type`, `price_per_m2`, `status`, `active`,
  `first_seen`, `last_seen`, `price_history` (jsonb array of
  `{"at": iso, "price": n}`), `score` (0–100), `recommendation`
  (`view`/`maybe`/`skip`), `eval_summary`, `red_flags` (jsonb string array),
  `highlights` (jsonb string array), `evaluated_at`, `synced_at`.
- **App-owned columns** (the only ones `authenticated` can update, enforced
  by column-level grants): `user_state` (suggested values: `interested`,
  `hidden`, `viewed`, or null) and `user_notes` (free text).

Semantics you need:

- `active = false` means the listing disappeared from Finn (sold/withdrawn).
  Keep it queryable but visually de-emphasized or behind a toggle.
- `status`: `shortlist`/`queued` = passed the rules filter, not yet scored;
  `evaluated` = has `score` + `eval_summary`.
- `score >= 80` is the "book a viewing" threshold used elsewhere in the
  pipeline — worth a visual highlight.
- A `price_history` array with more than one entry means the price changed;
  last entry lower than first = price cut (strong negotiation signal — show a
  badge with the delta).
- Prices are NOK. `total_price` (totalpris, incl. fellesgjeld/omkostninger)
  is the honest number when present; fall back to `price` (prisantydning).

## Suggested UI (yours to redesign)

- List/card view, default filter `active = true`, sorted `score desc nulls
  last`, tab or filter for `bolig` vs `fritid`.
- Card: image, heading, location, price (+ price-cut badge), m², bedrooms,
  score chip colored by recommendation, top red flag.
- Detail: full `eval_summary`, `highlights`, `red_flags`, price history
  sparkline, days on market (`now - first_seen`), link out to `url`
  (finn.no), map position from `lat`/`lon`.
- Actions: mark interested / hide (`user_state`), free-text `user_notes`.
  Hidden listings drop out of the default view.
- Optional: Supabase realtime subscription so new syncs appear live.

## Ops notes

- Sync cadence ~every 8h; evaluation runs daily at 13:00 CET, so fresh
  listings can sit unevaluated (status `queued`) for up to a day.
- The app uses the anon/authenticated key as usual. The NAS uses the service
  role key — never ship that key to the app.
- Questions or contract changes: coordinate through Andreas; the NAS side is
  defined in `NAS-setup and system/property-search/` (DESIGN.md + collector
  source).

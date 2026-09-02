# Handover: Weekly digest (Pleasure / Social / Business) in Livet

For: the Claude Code instance working on the Livet app (github.com/automatai-git/Livet)
From: the NAS-setup instance, 2026-09-02

## Context

Andreas's NAS has run a weekly events digest email for months. As of today it is
**split into three tracks — Pleasure, Social, Business** — and it no longer only
emails. Every Monday at 11:30 CET the scheduler task researches events, scores
them, writes the HTML email to the outbox, **and upserts every card into the
Livet project's Supabase**: `public.life_events` and `public.life_arenas`.

Your job: build the view in Livet. You own the UI entirely — this doc fixes the
data contract and explains what the fields *mean*, because several of them only
make sense once you know what the digest is for.

Same Supabase project as `property_listings` (`ycsivbzsfrphkxrqfoyi`), same
ownership pattern, same anon/authenticated key. The NAS writes with the service
role; never ship that key to the app.

## What the digest is actually for

This matters for the UI, so read it before designing.

- **Pleasure** is the small track: concerts, culture, food, spectator sport.
  Enjoyment, no agenda. 3–6 cards a week. Not scored.
- **Social** and **Business** exist for one reason: **get Andreas into rooms with
  high achievers** — to widen his network, to surround himself with people who
  raise the bar, and to move United Automation (his AI/automation business)
  forward. They overlap by design.
- The split between them is **setting, not audience**. Social = informal, the
  relationship comes first (founder dinners, sailing and padel clubs, galas,
  member-club talks). Business = professional, the work comes first
  (conferences, investor breakfasts, pitch nights, trade fairs).
- A generic free public meetup is a *failure* for this digest even on a perfect
  topic match. A curated 30-person dinner with three founders worth knowing is a
  *win* even off-topic. The UI should make that quality visible, not bury it.

## Two tables

DDL: `NAS-setup and system/tasks/events-sync/schema.sql` — Andreas runs it in
the Supabase SQL editor. Verify both tables exist before building.

### `public.life_events` — dated happenings

**NAS-owned** (never write these from the app; the upsert refreshes them and
does not include your columns, so there is no clobber risk either way):
`id` (PK, slug), `track`, `category`, `name`, `description`, `why`, `url`,
`booking_url`, `image_url`, `venue`, `city`, `country`, `event_date`,
`end_date`, `time_band`, `price_nok`, `price_note`, `achiever_score`,
`barrier`, `format`, `room_note`, `audience_size`, `business_goals`,
`calendar_url`, `sent_week`, `first_seen`, `last_seen`, `synced_at`.

**App-owned** — the only columns `authenticated` may update, enforced by
column-level grants: `user_state` and `user_notes`.

### `public.life_arenas` — standing rooms

An arena is not an event. It is a **seat you keep**: a club, network,
association, syndicate, membership, or recurring series where the same strong
people come back. 1–3 surfaced per week. This is the compounding play and it is
arguably the most valuable thing in the whole digest — **do not bury arenas
inside the event list.**

**NAS-owned:** `id` (PK), `track`, `name`, `kind`, `description`, `why`, `url`,
`join_url`, `city`, `cadence`, `cost_note`, `how_to_join`, `achiever_score`,
`sent_week`, `first_seen`, `last_seen`, `synced_at`.
**App-owned:** `user_state`, `user_notes`.

## Field semantics you need

- **`track`** — `pleasure` | `social` | `business`. The primary navigation axis.
  Three tabs or three sections; do not merge them.

- **`achiever_score`** — 0–100, how good the *room* is. Not how interesting the
  topic is. Composed of barrier to entry (35), who is actually in the room (35),
  and whether the format allows real contact (30). **Null for every pleasure
  event** — pleasure is not scored, so sorting by score must handle nulls
  (`nulls last`) and the UI should not show an empty score chip on a concert.
  Bands: **≥70 lead pick** (highlight it), 50–69 solid, 35–49 marginal. Nothing
  below 35 is published.

- **`barrier`** — `free` | `paid` | `application` | `invite` | `member`.
  Counter-intuitively, **higher friction is better here** — `invite` and
  `member` are the strongest signals, `free` the weakest. If you render this as
  a badge, do not use a green/red scale that implies free = good.

- **`room_note`** — free text naming who is actually there ("Bergen fintech
  founders + 2 DNB execs"). This is the single most decision-relevant field on a
  Social/Business card. Show it on the card, not only in the detail view. It may
  honestly say the crowd is unverified — that is by design, the digest is
  instructed never to invent attendees.

- **`format`** + **`audience_size`** — `dinner`/`roundtable`/`workshop`/`club`
  with a small size is the good case; `conference` with 500+ is deliberately
  down-ranked. Worth showing together ("Roundtable · ~40").

- **`business_goals`** — jsonb array, a subset of `["customers","capital",
  "frontier"]`, meaning: rooms with potential automation customers / investor
  access / staying at the frontier of AI, fintech, defense. Empty `[]` for
  pleasure and social. Good candidates for filter chips on the Business tab.

- **`price_nok`** + **`price_note`** — **there is no budget ceiling**; price is
  a data point for Andreas to judge, never a filter. `price_nok` is null when
  unknown or non-numeric; `price_note` always carries words ("Free", "Members
  only", "By application", "From 1 200 kr", "Price unknown"). **Render
  `price_note`**, and treat `price_nok` as the sort/filter key only.

- **`time_band`** — `next_2w` | `next_2m` | `later`. As-written-that-week, so it
  goes stale. **Derive urgency from `event_date` at render time**; use
  `time_band` only if you want to mirror the email's grouping.

- **`why`** — one sentence on why this matters for him. Null for pleasure.

- **`calendar_url`** — a ready-made Google Calendar template link. Wire it to an
  "Add to calendar" action rather than building your own.

- **`sent_week`** — the Monday of the digest that introduced the card. Useful
  for a "new this week" badge: `sent_week = most recent Monday`.

- **`first_seen` / `last_seen`** — `first_seen` is set once on insert and never
  resent, so it is a genuine "when did this first appear". `last_seen` bumps on
  every weekly re-push, so a card that stops being re-pushed has gone stale.

- **There is no `active` column.** An event is past when `event_date <
  current_date` — filter on the date. Past events are kept deliberately: they
  carry `user_state = 'attended'` and are the raw material for the feedback loop
  below.

- **`cadence` / `cost_note` / `how_to_join`** (arenas) — `how_to_join` is the
  literal next step ("membership is 2 400 kr/yr, apply here" / "attend the open
  October session, then you can be proposed"). It is the whole point of an arena
  card. Give it visual weight, and pair it with `join_url` as the primary action.

## The feedback loop — this is the important bit

`user_state` is not just UI state. **The NAS reads it back at the start of every
digest run** and changes what it searches for:

| Table | `user_state` | What the next digest does |
|---|---|---|
| `life_events` | `interested`, `going`, `attended` | Hunts for **more like this** — same organiser, same series, same crowd, adjacent scenes |
| `life_events` | `hidden` | Hard down-rank for that category, format and organiser |
| `life_arenas` | `interested` | Keeps it in view, may re-surface it as a nudge |
| `life_arenas` | `joined` | Stops suggesting it and starts suggesting **the next tier up** |
| either | `null` | No signal |

Allowed values — please stick to these strings exactly, the prompt matches on them:

- `life_events.user_state`: `interested` | `going` | `attended` | `hidden` | null
- `life_arenas.user_state`: `interested` | `joined` | `hidden` | null

Design implication: **marking things must be one tap, and it should be obvious
to Andreas that marking teaches the digest.** A quiet "this shapes next Monday"
affordance is worth more here than in a typical CRUD list. Hiding something is
as informative as liking it, so make hide cheap and reversible.

`user_notes` is free text, unread by the NAS — purely his.

## Suggested UI (yours to redesign)

- **Three tabs: Pleasure / Social / Business.** Default to Business or Social —
  those are the tracks with intent behind them.
- Default filter `event_date >= current_date`, sorted `event_date asc`, with a
  secondary sort or a "best rooms first" toggle on `achiever_score desc nulls
  last`. Hidden items drop out of the default view.
- **Arenas pinned above the event list** inside Social and Business, visually
  distinct (the email uses a gold `#f0a500` accent for them). They are not
  time-bound, so they do not belong in a date-sorted feed.
- Event card: name, date, city pill, `description`. For social/business also the
  signal row — score chip, `barrier`, `room_note`, `format` + `audience_size`,
  `price_note` — and `business_goals` chips on Business.
- Detail: `why`, full `room_note`, links out to `url` / `booking_url` /
  `calendar_url`, `user_notes` editor, state buttons.
- Arena card: name + `kind`, `description`, `cadence · cost_note`, then
  `how_to_join` given real weight, with `join_url` as the primary button.
- A "this week" view grouped by `sent_week` would mirror the email closely if
  you want the digest to feel like a digest.
- Optional: Supabase realtime subscription so Monday's push appears live.
- Optional but valuable: an "attended" prompt for events whose `event_date` has
  just passed and that were marked `going` — cheap to build, and it feeds the
  strongest signal back to the NAS.

## Ops notes

- **Cadence: once a week**, Mondays ~11:30 CET, and the run takes 20–40 minutes,
  so rows land closer to 12:00–12:15. Nothing arrives between Mondays. Build for
  a weekly heartbeat, not a live feed — a "last updated" line reading
  `max(synced_at)` is more honest than a spinner.
- The email still goes out as before; Supabase is additive, not a replacement.
- Upserts are `resolution=merge-duplicates` on `id`, so a re-published event
  updates in place. Your `user_*` columns are never in the payload.
- If a Monday's push fails, the email still sends and Livet simply misses that
  week — the previous rows stay put. Do not treat a stale `synced_at` as an app
  bug on its own.
- NAS side lives in `NAS-setup and system/`:
  `tasks/prompts/weekly-events-digest.md` (the prompt — the source of truth for
  every field's meaning), `tasks/events-sync/push-events.sh` (the upsert),
  `tasks/events-sync/schema.sql` (the DDL).
- Contract changes or new fields: coordinate through Andreas so the prompt and
  the schema move together.

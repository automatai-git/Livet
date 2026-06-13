# Travel Planner – Design Overview

Architecture and visual language of the travel planner. Mirrors the structure of [design-overview.md](design-overview.md) (the mobility doc) so a future session can pick up cold.

---

## As-built (2026-05-15)

Multi-trip refactor is **live**. Single hardcoded Hawaii destination → trip-aware shell that can host any number of destinations.

- **Routing.** `/travel` is the trip list, `/travel/new` is the create-trip form, `/travel/:tripId` is the per-trip detail view. [src/pages/TravelPlanner.jsx](../src/pages/TravelPlanner.jsx) is now a 14-line `<Routes>` shell.
- **Three pages, one shell.** [src/pages/travel/TripList.jsx](../src/pages/travel/TripList.jsx) (overview), [src/pages/travel/NewTripForm.jsx](../src/pages/travel/NewTripForm.jsx) (create), [src/pages/travel/TripDetail.jsx](../src/pages/travel/TripDetail.jsx) (the old single-page UI, now scoped to one trip + its destination template).
- **Destinations are templates, not user data.** [src/data/destinations/index.js](../src/data/destinations/index.js) exposes a `DESTINATIONS` registry keyed by slug. Each entry is an immutable module with `meta`, `islands`, `experiences`, `checklist`, `mapView`. Adding a new destination = drop a new module and append to the registry. The slug is what `trips.destination_key` stores.
- **User state lives in Supabase.** [trips](travel-schema.sql) holds per-trip metadata + `status`; `travel_plans` holds the experience/checklist selections, scoped by `trip_id`. RLS enforces `auth.uid() = user_id` on both.
- **Service layer.** [src/services/travelService.js](../src/services/travelService.js) is the single Supabase entry point — pages never touch `supabase.from('trips')` directly. Mirrors the [mobilityService](../src/services/mobilityService.js) pattern.

---

## Architecture

```
              ┌─────────────────────────────┐
              │  /travel                    │
              │  ─────────────────────────  │
              │  TripList.jsx               │  ← lists active trips
              │      ↓ click                │
              │  TripDetail.jsx             │
              │      ↑ reads tripId         │
              │      ↓ scoped to one trip   │
              └─────────────────────────────┘
                       │
                       │  uses
                       ▼
       ┌────────────────────────────┐
       │  travelService             │
       │  ────────────────────────  │
       │  listTrips / getTrip       │
       │  createTrip / updateTrip   │
       │  archiveTrip / deleteTrip  │
       │  listPlans / addPlan       │
       │  removePlan / updateStatus │
       └────────────────────────────┘
                       │
                       ▼
       ┌────────────────────────────┐  ┌──────────────────────────────┐
       │  Supabase                  │  │  src/data/destinations/      │
       │  ────────────────────────  │  │  ────────────────────────    │
       │  trips                     │  │  hawaii.js                   │
       │  travel_plans              │  │  (future: japan.js, etc.)    │
       │  (per-user, RLS)           │  │  index.js → registry         │
       └────────────────────────────┘  └──────────────────────────────┘
```

### Why split this way

- **`trips`** is user data; **`destinations`** is content. Mixing them would force a CMS or seeding step every time we want to add a new destination. Keeping content as static modules means a new destination is a single file PR.
- **`trip_id` on `travel_plans`** is the contract that makes everything else fall into place. Once each row knows its trip, multi-trip queries are trivial (`.eq('trip_id', tripId)`).
- **The destination module is the single source of geographic truth.** Each `island` now carries its own `latLng` (lifted out of `TravelMap` where it used to be hardcoded). The map reads `destination.mapView` and `destination.islands` instead of importing globals.

---

## Visual language

- **Accent:** ocean blue `--accent-travel: #2F7DA0` for the Dashboard card, the `AppShell` underline, and active trip status chips.
- **Status chip colors** on `TripList`:
  - `planning` → muted text
  - `booked` → `--accent-travel`
  - `ontrip` → `--success`
  - `archived` → `--border`
- **Phase selector inside TripDetail** is `role="tablist"`, three-up Planning / Booked / On Trip pill row, white-on-translucent like the original.
- **Page chrome** keeps the iOS-style sticky translucent header from the original (`backdrop-filter: blur(20px)`). Trip name is the title; an "Archive" button replaces the static right-side spacer.

---

## Data flow

```
user picks "Hawaii 2026" on TripList
   ↓
navigate('/travel/<tripId>')
   ↓
TripDetail mounts → Promise.all([getTrip(tripId), listPlans(tripId)])
   ↓
trip.destination_key → getDestination('hawaii') → template
   ↓
render: meta / islands / experiences / checklist from template,
        plans from Supabase, status from trip
   ↓
user ticks an experience → addPlan({ tripId, experienceId, destinationKey })
                        → optimistic state update + Supabase insert
user changes phase     → updateTrip(tripId, { status })
                        → optimistic state update + Supabase update
user archives          → archiveTrip → navigate('/travel')
```

Optimistic updates everywhere — errors `console.error` only. Good enough for v1; failure UI is a known gap (see follow-ups).

---

## Custom map pins

`TravelMap` accepts `{ destination, tripId }`. Pins are kept in `localStorage` under a per-trip key: `travel_custom_pins_v1:<tripId>`. On first load of a trip, if no per-trip key exists but the legacy global key (`travel_custom_pins_v1`) does, the legacy pins are migrated onto that trip's key so the original Hawaii pins aren't lost. After migration the legacy key is left intact (read-only fallback) — safe to clean up in a future change.

---

## Open follow-ups

| ID | Area | Note |
| --- | --- | --- |
| T1 | Trip metadata editing | After create, there's no UI to edit `name` / `start_date` / `end_date`. `travelService.updateTrip` already supports it — needs a form in `TripDetail` (or its own settings page). |
| T2 | Archived trips view | `listArchivedTrips` exists but no UI surfaces it. Add a tab/toggle on `TripList`. |
| T3 | Error UI for failed mutations | All `addPlan` / `removePlan` failures just `console.error`. A toast or inline error pill would help. |
| T4 | Per-trip pin migration cleanup | The legacy `travel_custom_pins_v1` key is left intact after first migration. Could delete it once we're confident. |
| T5 | A second destination | The architecture supports it — Japan, Iceland, anything. Just write a module and append to `DESTINATIONS`. Worth doing once, even if just a stub, to prove the catalog model. |
| T6 | `NOT NULL` on `trip_id` | Already enforced in the fresh schema (the original parked statement is moot). No action needed. |

See [travel-todo.md](travel-todo.md) for a more granular punch list.

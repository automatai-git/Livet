# Travel Planner – Progress & To-Do

Companion to [travel-overview.md](travel-overview.md). Same status legend as the mobility doc: `[ ]` not started · `[~]` in progress · `[x]` done.

---

## Status snapshot (2026-05-15)

Multi-trip refactor is **live and verified to build**. Schema applied via [travel-schema.sql](travel-schema.sql). The user has logged in and confirmed the end-to-end flow works (create trip → add experiences → toggle phases). Direction is solid — next session should build on this rather than revisit it.

### What's shipped

| Area | Files | Notes |
| --- | --- | --- |
| Schema | [input/travel-schema.sql](travel-schema.sql) | `trips` + `travel_plans` with RLS. Both tables `NOT NULL`-tight on `user_id` and (for `travel_plans`) `trip_id`. `unique (trip_id, experience_id)` prevents double-adds. |
| Destination registry | [src/data/destinations/index.js](../src/data/destinations/index.js), [src/data/destinations/hawaii.js](../src/data/destinations/hawaii.js) | Single Hawaii template moved out of the page. Islands now carry their own `latLng`. Future destinations = one module + one registry entry. |
| Service | [src/services/travelService.js](../src/services/travelService.js) | CRUD for trips + plans. `addPlan` sets `user_id` explicitly. Mirrors the `mobilityService` shape. |
| Trip list | [src/pages/travel/TripList.jsx](../src/pages/travel/TripList.jsx) | Active trips only (archived hidden). Empty-state CTA invites "Create your first trip". Uses new `<LoadingState>` / `<EmptyState>` primitives. |
| New-trip form | [src/pages/travel/NewTripForm.jsx](../src/pages/travel/NewTripForm.jsx) | Destination dropdown (defaults to first registry entry), name (prefilled), optional dates. Navigates to `/travel/<newTripId>` on success. |
| Trip detail | [src/pages/travel/TripDetail.jsx](../src/pages/travel/TripDetail.jsx) | The old single-page UI, scoped to one trip. Phase changes write to `trips.status` (no more `localStorage`). Archive action in the header. Inherits a11y improvements from the cross-cutting pass. |
| Routing shell | [src/pages/TravelPlanner.jsx](../src/pages/TravelPlanner.jsx) | 14 lines. Just `<Routes>` for index / new / `:tripId`. |
| Map per-trip pins | [src/components/TravelMap.jsx](../src/components/TravelMap.jsx) | Accepts `{ destination, tripId }`. Pins keyed `travel_custom_pins_v1:<tripId>` with one-time migration from the legacy global key. |

### Known caveats / things to watch

1. **No edit-trip UI yet** (T1). Once created, a trip's `name` / `start_date` / `end_date` can't be changed in-app. Backend supports it via `travelService.updateTrip`.
2. **Archived trips are invisible** (T2). `listArchivedTrips` exists; no UI consumes it.
3. **Failed mutations log only.** `addPlan` / `removePlan` / `updatePlanStatus` errors `console.error` — no user-visible feedback.
4. **Legacy `travel_custom_pins_v1` key stays around** (T4). Read-only after the per-trip migration runs once.
5. **One destination so far.** Architecture supports more (T5); the proof would be a second module.

### Next-session priorities (in order)

1. **T1 — edit trip metadata.** Either a small "Edit details" sheet in `TripDetail`, or a dedicated `/travel/:tripId/settings` route. `travelService.updateTrip` already supports the patch.
2. **T2 — archived trips view.** A toggle / segmented control on `TripList` to show archived trips, with "Restore" → `updateTrip(id, { status: 'planning' })`.
3. **T3 — toast on mutation failures.** Lightweight: a single dismissible toast component that any service-failing call can show. Reusable across pages — would also benefit BucketList / DecisionMatrix.
4. **T5 — add a second destination** as a forcing function. Even a 30-line `iceland.js` proves the catalog scales. Reveals any hardcoded "hawaii" assumptions lurking.

---

## To do — open items

### T1. Edit trip metadata

- [ ] Form for `name`, `start_date`, `end_date`, optional `notes`.
- [ ] Where it lives: probably `TripDetail` overflow menu → opens a sheet, similar pattern to the mobility focus-mode kebab.
- [ ] _Done when:_ creating a trip "Hawaii 2026", editing it to "Hawaii 2026 – honeymoon", and reloading the page shows the new name everywhere (trip list, header).

### T2. Archived trips view

- [ ] Segmented control on `TripList`: Active / Archived. Default Active.
- [ ] When viewing Archived, show "Restore" + "Delete forever" actions per trip.
- [ ] _Done when:_ archiving a trip moves it under "Archived"; restoring it brings it back to "Active".

### T3. Toast on mutation failures

- [ ] Add `src/components/feedback/Toast.jsx` (or `useToast()` hook) — small bottom-anchored slide-in.
- [ ] Wire `travelService` failures so callers can surface "Couldn't save — retry?" without each page reinventing it.
- [ ] _Done when:_ disconnecting from the network and ticking an experience shows a toast rather than a silent log.

### T4. Pin migration cleanup

- [ ] Delete the legacy `travel_custom_pins_v1` key after first per-trip migration runs (currently left intact as a safety net).
- [ ] _Done when:_ inspecting `localStorage` after first trip load shows only namespaced keys.

### T5. Second destination

- [ ] Write `src/data/destinations/<slug>.js` (Japan / Iceland / Costa Rica — pick one).
- [ ] Register in `src/data/destinations/index.js`.
- [ ] _Done when:_ `New trip` form shows both destinations; creating one of each works end-to-end.

### T7. Trip card on Dashboard agenda

- [ ] Mirror the mobility row pattern: if there's an `ontrip` trip, surface it on `/`'s Today's Agenda with a deep-link.
- [ ] _Done when:_ when a trip's `status='ontrip'` and `today between start_date and end_date`, the Dashboard shows it.

---

## Done

- [x] Multi-trip refactor scope agreed (Full schema + UI split).
- [x] [travel-schema.sql](travel-schema.sql) drafted and re-drafted after the first run revealed `travel_plans` didn't exist. Final version creates both tables from scratch, idempotent.
- [x] Destination template split out of `travelData.js` (deleted) into the new registry.
- [x] `travelService` covering trips + plans CRUD.
- [x] `TripList`, `NewTripForm`, `TripDetail` shipped.
- [x] `TravelPlanner.jsx` reduced to routing shell; `App.jsx` route changed to `/travel/*`.
- [x] `TravelMap` decoupled from globals; per-trip pin storage with legacy migration.
- [x] A11y improvements bundled in: `role="tablist"` + `aria-selected` on phase / tab bars, semantic buttons for the on-trip itinerary, 44 px tap targets throughout.

---

## Out of scope / parked

- Multi-user trip sharing (group trips). Schema would need a `trip_members` table; RLS would change. Not worth designing until requested.
- Trip cost rollups (sum of `experience.cost` parsed). Cost is free-text right now (`"$99–169"`), not numeric — would need either parsing or a structured cost field on experiences.
- Calendar / iCal export of an `ontrip` itinerary.

# Cross-cutting Infrastructure

Shared primitives + patterns added during the 2026-05-15 session. These are app-wide concerns — not tied to a single page. Future sessions should *adopt* these rather than reinvent them.

---

## 1. Feedback primitives

Three components in [src/components/feedback/](../src/components/feedback/).

### `<LoadingState />`

```jsx
import LoadingState from '@/components/feedback/LoadingState';

<LoadingState />                                  // block variant + skeleton bars
<LoadingState label="Loading agenda…" variant="inline" />   // single muted line
```

- Wraps content in `role="status"` `aria-live="polite"`.
- Shimmer skeleton respects `prefers-reduced-motion` (the global rule in `index.css` clamps the animation).
- **In use:** [Dashboard.jsx](../src/pages/Dashboard.jsx) agenda widget, [TripList.jsx](../src/pages/travel/TripList.jsx), [TripDetail.jsx](../src/pages/travel/TripDetail.jsx).
- **Should adopt:** Timeline, BucketList, MenuPlanner, DecisionMatrix's initial-load case (currently each rolls its own muted "Loading…" line).

### `<EmptyState />`

```jsx
import EmptyState from '@/components/feedback/EmptyState';

<EmptyState
  title="Rest day"
  hint="Nothing scheduled for Wednesday."
  icon="🌿"
  action={<button>Browse routines</button>}
/>
```

- Renders inside the existing `.empty-state` CSS card (dashed border, off-white card).
- All slots optional. Pass an action node (typically a Link or button) to nudge the user forward.
- **In use:** [TripList](../src/pages/travel/TripList.jsx) (no trips), [TripDetail](../src/pages/travel/TripDetail.jsx) (unknown destination, trip not found, nothing booked).
- **Should adopt:** Mobility's hand-rolled "Rest day" card in [Mobility.jsx](../src/pages/Mobility.jsx), Timeline's "No milestones found" fallback, BucketList's "No items in this category yet" message.

### `<ErrorBoundary />`

A class boundary that catches render-time crashes. Already wraps every route in [App.jsx](../src/App.jsx), keyed by route so navigation back to `/` resets cleanly. Renders a recovery card with **Reload page** + **Back to dashboard** actions, amber left-border accent (`--accent-decision`).

You shouldn't normally need to use it directly — it's already in place. The exception is if a sub-component renders user-supplied templates / dangerouslySetInnerHTML that could realistically throw; you can nest another `<ErrorBoundary>` inside.

---

## 2. A11y baseline

Global rules in [src/index.css](../src/index.css) (search `:focus-visible`):

```css
:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 4px;
}
@media (prefers-reduced-motion: reduce) {
    body { animation: none; }
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

These apply everywhere. Per-component focus styles can refine, but every interactive element gets at least the global ring.

### Per-page fixes applied (2026-05-15)

| Page | What changed |
| --- | --- |
| Dashboard | Install-prompt × button gets `aria-label`. |
| MenuPlanner | Proper `role="tablist"` / `tab` / `tabpanel` wiring with `aria-controls` / `aria-labelledby` cross-links, 44 px min height. |
| Timeline | Stats wrapped in `<section aria-label>`; per-stat `aria-label` so SR reads "5 past milestones" not "5 Past". Filter buttons → `aria-pressed`. |
| ColourPalette | Section nav → `role="tablist"`. Each `ColourCard` is `role="img"` with `aria-label="<name>, hex <code>"`. |
| BucketList | User toggle + category + difficulty buttons all get correct `role="tab"` / `aria-pressed`. The clickable `div` checkbox became a real `<button role="checkbox" aria-checked>`. Modal got `role="dialog"`, `aria-modal`, `aria-labelledby`, ESC-to-close, backdrop click-to-close, autofocus, `useId` form labels. |
| TravelPlanner / TripDetail | Phase + tab bars → `tablist`/`tab` with `aria-selected`, 44 px tap targets. |
| DecisionMatrix | Remove-criterion / remove-option buttons got `aria-label` + 36 px hit area. Matrix tabs got `aria-pressed`. |

### Still parked

- Full focus-trap helper for modals. BucketList modal has ESC + backdrop + autofocus, no hard trap. Worth extracting once a second page needs a modal.
- Color-contrast audit. BucketList gradient + category chip colours haven't been verified for ≥3:1 ratio on white text. The categories pull `c.color` from `bucketData.js`.
- Axe-core or Lighthouse a11y CI run — not wired up.

---

## 3. Autosave + dirty indicator pattern (`DecisionMatrix`)

[DecisionMatrix.jsx](../src/pages/DecisionMatrix.jsx) is the canonical example. The pattern works for any page where edits accumulate locally before persistence.

### Components

1. **`snapshotOf(model)`** — pure function that returns a stable string for the persisted portion of state. Used to compute `dirty`.
2. **`savedSnapshotRef`** — `useRef` holding the snapshot of state as it was last successfully saved.
3. **`saveState`** state machine: `'idle' | 'pending' | 'saving' | 'error'`.
4. **Debounced autosave effect:** every edit schedules a save 1.5 s later. The save uses a ref-snapshot of the *latest* state so closures don't go stale.
5. **`Cmd/Ctrl+S` flushes** the debounce immediately.
6. **`beforeunload` guard** fires only when `dirty` is true.
7. **`<SaveIndicator />`** pill in the page header — replaces the old manual "Save" button. Shows "Saving…" / "Unsaved changes" / "Saved · just now" / "Save failed · retry".

### When to adopt elsewhere

- **TripDetail.** Phase changes and plan toggles already write immediately, but the trip *metadata* (name, dates) once edit-UI lands (T1) would benefit.
- **BucketList add-modal.** Less critical because the modal is a single Save action.
- **MenuPlanner weekly menu.** If dropdown changes ever start to accumulate before save, this is the pattern.

### Caveats

- The `beforeunload` prompt is intentionally only triggered when `dirty` — modern browsers ignore it otherwise.
- The autosave window is 1.5 s. Tune via `AUTOSAVE_MS` const at the top of the page if a feature needs to be more or less aggressive.
- `formatRelative(ts)` is co-located at the bottom of `DecisionMatrix.jsx`. If a second page needs it, hoist to `src/lib/`.

---

## 4. Routing-level error isolation

[App.jsx](../src/App.jsx) wraps each route element in its own `<ErrorBoundary key="<route-name>">`. The `key` matters: when the user clicks "Back to dashboard" inside the error fallback, navigating to `/` mounts a fresh boundary instance and reset state. Without the key, the boundary would stay in error state forever after one crash.

---

## 5. Other small conventions worth knowing

- **Deep-linking pages.** Both Mobility (`/mobility?day=&routine=`) and the planned trip-on-Dashboard row use search params to deep-link from the Dashboard agenda. If you add a third agenda row, follow the same pattern: query params, not route state, so refresh works.
- **`useId` for form labels.** Adopted in `BucketList` modal and `NewTripForm`. Use it for any field that can render twice on the same page (or might in the future).
- **Service modules over direct Supabase.** Both `mobilityService` and `travelService` are the only files touching their tables. Pages call services. Keep this — it's the only way to evolve schemas without grepping for `from('foo')` across pages.
- **Optimistic state updates.** Pattern used everywhere: update React state first, fire the network call, log on error. Toast/UI surfacing on failure is a known gap (T3).
- **`prefers-reduced-motion`.** Honour it. The global block in `index.css` handles most; if you add a custom animation, double-check.

---

## File map at a glance

```
src/
  components/
    feedback/
      LoadingState.jsx       ← block + inline variants
      EmptyState.jsx         ← title / hint / icon / action slots
      ErrorBoundary.jsx      ← class boundary, used in App.jsx
  services/
    mobilityService.js       ← canonical service layer pattern
    travelService.js         ← mirrors mobility's shape
    trainingService.js       ← unchanged
  data/
    destinations/            ← destination template registry
      hawaii.js
      index.js
    mobilityData.js          ← mobility routine data (similar pattern)
  lib/
    mobility.js              ← parseSets, formatTarget, pickRoutineForTime
    swipe.js                 ← generic swipe gestures
  pages/
    travel/
      TripList.jsx
      NewTripForm.jsx
      TripDetail.jsx
    TravelPlanner.jsx        ← routing shell only
```

For mobility-specific architecture, see [design-overview.md](design-overview.md) and [mobility-todo.md](mobility-todo.md).
For travel-specific architecture, see [travel-overview.md](travel-overview.md) and [travel-todo.md](travel-todo.md).

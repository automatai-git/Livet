# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Life & Training Hub** (repo "Livet") — a React 19 + Vite single-page app with Supabase auth and persistence, deployed to GitHub Pages. Hash routing serves eleven sub-apps behind one login, inside the **v3 four-tab shell** (Today / Apps / Life / You — see Architecture). The original five-single-file static PWA lives in `legacy_static/` for reference only (it fails lint — pre-existing, don't fix). `Life support app redesign/` holds the v3 design handoff bundle (reference only, lint-ignored).

## Running Locally

```bash
npm run dev      # Vite dev server
npm test         # vitest run
npm run lint     # eslint
npm run build    # production build to dist/
```

On localhost, `index.html` never registers the PWA service worker (and unregisters + clears leftovers): its cache-first asset strategy pins Vite's unhashed `/src` modules to stale copies, silently hiding code edits during development.

Without env vars the Supabase client boots with a placeholder URL; real credentials live in `.env.local` (gitignored, present as of 2026-07). Every data layer falls back to its localStorage cache when fetches fail, so pages can be previewed offline by seeding localStorage in the browser console: a forged session under `sb-<project-ref>-auth-token` (`sb-placeholder-auth-token` when no `.env`) gets past the auth gate — it needs a future `expires_at`, a `user` object, and a JWT-shaped `access_token` (three base64url segments with an `exp` claim; supabase-js validates the shape). Per-feature caches (e.g. `block-cache::block-4`, `user-config-cache`, `rehab-log-cache::<protocolId>`, `life-tree-cache-v1`) supply data.

## Deployment

Push to `main` → `.github/workflows/static.yml` builds with Vite (Supabase URL/key injected from repo secrets) and deploys `dist/` to GitHub Pages. `supabase-keep-alive.yml` pings Supabase on a schedule so the free-tier project isn't paused.

## Architecture

### v3 shell (four tabs)
Routes live in `src/App.jsx`. The hub-and-spoke dashboard is gone; navigation is a fixed bottom tab bar (`src/components/shell/TabBar.jsx`, ink active pill, dark variant on `/life`):
- `/` — **Today** (`src/pages/Today.jsx`): day track (05:00–21:00, configurable), single agenda card (mobility/workout/dinner rows, "Up next" + Start pill), Life Tree summary ink card, "Most used" rows.
- `/apps` — **Apps** (`src/pages/Apps.jsx`): search + all eleven apps in one usage-sorted list (3px usage bars) + dashed Finance ghost slot. A future app = a registry row, an accent, a Today card — no layout changes.
- `/life` — **Life** (`src/pages/Life.jsx`): the app's ONLY dark screen; SVG tree (`src/components/life/TreeFigure.jsx`) with tappable leaves, pillar chips, weakest-branch card, 12-week heatmap, link to `/timeline` (legacy milestone feed, now milestones-only).
- `/you` — **You** (`src/pages/You.jsx`): profile/sign-out, sync state, install-on-home-screen (`src/lib/installPrompt.js`), day-window setting, reset usage sorting.

Shell state (localStorage, never cache data): `property-profile-v1` (last-used Property profile), `property-controls-v1` (per-profile sort + filters — sort orders rows *within* the verdict groups; the map view obeys the same filters), `property-seen-v1` (max seen listing scores → Today moment card), `app-usage-v1` (`src/lib/appUsage.js` — open timestamps per route, capped at 90; sort score = trailing-30-day opens, ties fall back to `src/data/appRegistry.js` canonical order; recorded by `UsageTracker` in App.jsx) and `day-window-v1` (`src/lib/dayWindow.js` — drives the Today day track and "up next").

Sub-pages wrap in `AppShellV3` (see Shared components) — one slotted framework for all eleven apps: header (back circle + 8px accent dot + left serif app name) · scope selector · hero card · content · sticky primary action. Tab bar visible except in focus flows via `hideTabBar`.

Every screen carries the v3.1 safe-area top offset: `.tab-page` and `.sticky-header` pad top by `calc(env(safe-area-inset-top, 0px) + 24px)` so content clears the iPhone status clock / Dynamic Island (24px minimum on desktop). Don't place anything above the serif title with negative margins.

### Layering conventions
- `src/pages/` — one page component per route (routes live in `src/App.jsx`: the four tabs above plus `/menu`, `/timeline`, `/mobility`, `/workout`, `/colour`, `/bucket`, `/travel`, `/decision`, `/books`, `/property`).
- `src/components/<feature>/` — feature-scoped components (e.g. `mobility/`, `rehab/`, `colour/`).
- `src/services/` — the **only** files that touch their Supabase tables.
- `src/lib/` — pure helpers, unit-tested with vitest in sibling `*.test.js` files.
- `src/data/` — static datasets (palette colours, workout data, vendored Wada colours).
- `input/*-schema.sql` — table schemas, run manually in the Supabase SQL editor.

### Data flow pattern
Supabase-backed features write through a service module and mirror state into a localStorage cache; on load they try the network and fall back to the cache. Purely local features (e.g. saved outfits, custom travel pins) use localStorage directly with a versioned key (`outfit-matcher-saved-v1`, `travel_custom_pins_v1`).

### Life tree (Life tab)
`/life` is the **Life** tab: a weekly life tree from Naval Ravikant's *Almanack*, drawn as a dark full-screen SVG tree. `/timeline` keeps the original milestone feed (linked from the Life screen; v3.2 §4 — ScopePills All · Past · Ahead, list grouped under Ahead/Past heads with `in {n} days` metas, categories mapped to sprite glyphs + registry tints, the emoji `icon` column ignored, stat card gone). The conceptual frame: the other sub-apps are supporting tools; weekly tree inputs compound into the milestones.
- `src/data/lifeTreeData.js` — the n-ary tree: health / wealth / happiness pillars → 10 leaf practices, each with a written pass criterion (tick against the sentence, not the feeling).
- `src/lib/lifeTree.js` — ISO-week (Monday-start) helpers + strict-AND roll-up: a node is `complete` only when every leaf below is ticked; partial nodes carry `done/total`. Unit-tested in `lifeTree.test.js`.
- `src/services/lifeTreeService.js` → `life_tree_weeks` table (`input/life-tree-schema.sql`), one row per (user, ISO week), `ticks` jsonb; `life-tree-cache-v1` localStorage fallback, cache-first on save.
- `src/components/life/` — `TreeFigure.jsx` (SVG tree; leaves distributed over fixed twig endpoints per pillar: left = health, top = wealth, right = happiness; ≥44px hit areas; tick pop animation) and `WeekHeatmap.jsx` (trailing 12 weeks; tapping a cell selects that week for backfilling). On-dark pillar tints: health `#8FBF96`, wealth `#7FB2C4`, happiness `#DBA283`.
- Ticking is never blind (v3.1): every leaf draws a persistent short text label (`short` field in `lifeTreeData.js`; keep `label` as the full name), and tapping is select-then-confirm — tap 1 puts an ivory ring on the leaf and points the bottom card at its full name + written pass criterion (Tick/Untick pill), tap 2 (or the pill) toggles. The weakest-branch leaf is simply the default selection.

### Clothing app (colour palette & Outfit Matcher)
The app is named **Clothing** (v3.1 rename from "Soft Summer Palette"; route stays `/colour`, dusty-rose accent unchanged). `src/pages/ColourPalette.jsx` renders tabbed sections driven by `SECTIONS` in `src/data/colourData.js`; the default tab is the **Outfit Matcher** (`src/components/colour/OutfitMatcher.jsx`).

The matcher crosses the personal Soft Summer palette with Sanzo Wada's *A Dictionary of Color Combinations*:
- `src/data/wadaData.js` — 159 book colours + their membership in the 348 combinations, vendored from [mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations) (MIT), trimmed to name/hex/combinations.
- `src/lib/colourMatch.js` — the pure engine. Each Wada colour snaps to its nearest wearable palette colour via CIEDE2000; a combination survives into the outfit library when every member snaps within `SNAP_CAP` (18) and ≥2 distinct palette colours remain. Members drifting past `FAITHFUL_T` (12) flag the combo `adapted`. Colours are assigned to garment slots (jacket/top/trousers/accent) by role/lightness scoring — neutrals and darks ground the outfit, core colours go near the face. Contrast bands (low ≤ 15 / medium ≤ 30 / high) split the library roughly in thirds by lightness spread.
- These constants were calibrated against the real datasets (library of 177 combos: 86 pairs, 58 trios, 33 quads). If the palette in `colourData.js` changes, re-check them — `colourMatch.test.js` asserts minimum library sizes and will catch a collapse.

### Menu Planner (/menu)
Two scope tabs — Weekly menu and Meal database — over the `meals` and `weekly_menu` Supabase tables (no `user_id`; the tables are single-user).
- `src/pages/MenuPlanner.jsx` owns the meal collection: it fetches `meals` once and passes the list plus `onSaved`/`onDeleted` down, so an edit in the database tab shows up in the weekly dropdowns and the shopping list without a re-fetch.
- `src/lib/meals.js` — the tolerant row readers. `ingredients` and `macros` have been written by more than one generation of the app, so a row may hold a real jsonb array/object, a JSON *string* of one, or a bare comma-separated string; every reader goes through `parseIngredients` / `parseMacroSummary`. `mealToForm` / `formToPayload` are the edit-form round trip (new rows are written as real jsonb).
- `MealDatabase.jsx` — browse/add/**edit** in one surface: a meal row is the tap target and opens the same card the "+ New meal" pill does, pre-filled. Delete is a two-tap arm, not a browser `confirm()`.
- **RLS gotcha:** the `meals` table grants insert/update but *not* delete to `anon`, and a refused write comes back as success-with-zero-rows, never an error. Every write therefore uses `.select()` and treats an empty result as a failure — keep that if you touch these calls. Same guard on `weekly_menu` deletes.
- `src/lib/grocery.js` — shopping-list aisle grouping. Ingredients are bucketed into `GROCERY_SECTIONS` (produce → bakery → meat/fish → dairy → frozen → pantry → spices → sauces → snacks → drinks → household → other, i.e. supermarket walk order) by longest-keyword-wins, word-boundary matching, so "tomato sauce" files under sauces and "coconut milk" under pantry. The export sheet previews the grouped list before copying.
- `src/lib/staples.js` + `StaplesList.jsx` — the household staples list under the week (toilet paper, soda, salt, oil …). Purely local, `menu-staples-v1` localStorage, same pattern as saved outfits and travel pins. Ticking a staple marks it running low; ticked staples fold into the shopping list and get grouped like any other item.
- The macro "Estimate" button calls Gemini with `VITE_GEMINI_API_KEY` from `.env.local`. That key is deliberately **not** injected in the Pages build (`static.yml`) — a public static bundle would expose it — so the estimator is a localhost-only convenience.

### Book cloud (/books)
The Audible library drawn as connected theme clouds: read books are solid dots, wishlist books sit dashed in the same clouds. Four views: Cloud, Read next (full wishlist ranked by rating-weighted pull, theme filter chips — the two selection criteria), Rate (bulk 1–5★ for finished books, unrated first), Library (import/tag/manage).
- `src/data/bookThemes.js` — theme taxonomy (10 themes + unsorted); a book's **first** theme decides its cloud, later themes create cross-cloud links. Keywords drive import-time auto-tagging (hints only).
- `src/data/bookSeeds.js` — the owner's curated Audible library + wishlist (themes hand-assigned, authors simplified to the primary name so author-links fire); offered as a one-tap load in the empty state.
- `src/lib/bookCloud.js` — pure engine, unit-tested: `parseImport` (handles both "Title by Author" lines and multi-line Audible copy blocks with `By:`/`Narrated by:` rows), relatedness (`same author` = 3, each shared theme = 1), edge rules (single shared theme only counts across clouds), deterministic sunflower-spiral + row-packed layout, and wishlist ranking: each link is scaled by `ratingFactor` (rating/3, unrated = 1), so 5★ reads pull ~1.7× and 1★ demotes; reasons are human-readable and clouds carry `avgRating`.
- `src/components/books/` — `BookCloud.jsx` (SVG: blurred cloud blobs, curved edges, tap-to-highlight), `BookImport.jsx` (paste box with live parse count, read/wishlist toggle), `BookDetailCard.jsx` (status, rating stars, theme chips, related list, delete), `StarRating.jsx`.
- `src/services/bookService.js` → `book_cloud_books` table (`input/book-cloud-schema.sql`, incl. idempotent `rating` alter), one row per (user, book), `themes` jsonb; `book-cloud-library-v1` localStorage fallback, cache-first on save. An empty table with a non-empty cache seeds the server from the cache (first-run migration).

### Property Search (/property)
Browses the Finn.no listings a pipeline on Andreas's NAS collects, filters and
Claude-scores into `public.property_listings` roughly 3x daily (data contract:
`HANDOVER-property-search.md`; DDL copy in `input/property-listings-schema.sql`;
the collector lives outside this repo in `NAS-setup and system/property-search/`).
Two profiles: `bolig` (primary residence) and `fritid` (sea cabin) — the
scope pills are `Bolig · Fritid · Map` (no "All"; last-used profile persists
in `property-profile-v1`), the browse list groups by verdict (Book a viewing
≥ 80 as rich cards · Awaiting score · The rest as compact rows via
`groupListings`), and the detail view is a focus flow at
`/property/:finnkode` (AppShellV3, `hideTabBar`, sticky Done) — no modal.
- **Ownership split:** the NAS owns every column except `user_state`
  (`interested`/`viewed`/`hidden`/null) and `user_notes` — the only two the
  `authenticated` role may update (column-level grant). The NAS upsert never
  sends the user columns, so there is no clobber risk in either direction.
  Same RLS gotcha as `meals`: a refused write is success-with-zero-rows, so
  `propertyService.updateUserFields` uses `.select()` and treats empty as
  failure.
- `src/lib/property.js` — pure helpers, unit-tested: `displayPrice`
  (`total_price` = honest totalpris, `price` fallback), NOK formatting,
  `priceCut` (price_history last < first → badge with delta), `daysOnMarket`,
  `sortListings` (score desc, unevaluated last, newest-first among them),
  `filterListings` (default: active, not hidden). jsonb columns go through
  `parseJsonArray` since cached rows may hold JSON strings.
- `src/services/propertyService.js` — read-all + user-field updates,
  `property-listings-cache-v1` localStorage fallback, cache-first on write.
- `src/pages/PropertySearch.jsx` + `src/components/property/` —
  `ListingCard` (rich card: image, score chip, days-on-Finn in the meta,
  price-cut badge, one flag line with the `icon-flag` glyph) and
  `ListingRow` (compact: thumb, meta, dashed queued chip, `ny i dag`);
  `PropertyMap.jsx` = the Map scope (Leaflet + Esri satellite, pins are
  score chips coloured by verdict band, dashed while queued; tap → mini
  card linking to the detail route; hidden/gone never pinned).
  `src/pages/PropertyListing.jsx` = the detail flow: photo · heading +
  score · meta · price card (serif price, cut badge with date, sparkline,
  Totalpris/Pris/m²/Areal/Soverom strip) · "Claude's read" card (summary +
  highlights/red flags merged into one dot-list) · links · state pills ·
  notes saved on blur. Labels stay Norwegian for domain terms.
- v3.2 QoL: `propertyService.subscribeListings` (Supabase realtime, merged
  via `applyChange`) and `src/lib/propertySeen.js` — `property-seen-v1`
  localStorage of max seen score per finnkode + the local date it first
  crossed 80; `crossedToday()` feeds the Today moment card (one accent-
  bordered card the day a listing crosses 80, gone the next day; first run
  is a baseline so nothing floods). Today and Apps read the listings cache
  for their `metaFor` / `statusFor` lines.
- Semantics: `active = false` = gone from Finn (sold/withdrawn) — dimmed
  behind the "Sold / gone" toggle; `status` `shortlist`/`queued` = not yet
  scored (evaluation runs daily at 13:00 CET, so fresh listings sit unscored
  up to a day); hidden listings drop out of the default view.

### Goals (/goals)
The layer above the other sub-apps: Andreas's long-horizon goals OS (the
Cowork project in `C:\Users\enga\OneDrive\Claude-online\Livet\`) surfaced in
the hub. Three scope views over one document:
- **Current** — load (file-pick or paste) the active sprint markdown
  (SPRINT.md / STATUS.md from the OneDrive project), rendered read-only by a
  scoped md parser in `src/lib/goals.js` (`parseBlocks`/`parseInline`:
  headings, loose lists with continuation lines, tables, quotes, hr —
  exactly the subset those files use; unit-tested against replicas of them).
- **Long term** — `src/data/northStarData.js` is NORTH_STAR.md vendored as
  data (safe: the file is locked until annual review — re-sync on rewrite).
  `NorthStarChart.jsx` draws it as an SVG constellation (2036 star → three
  pillar nodes → sub-goal star fans, select-then-detail like the life tree)
  plus the dated annual markers on a 2026→2036 timeline (piecewise scale:
  near years get ~62% of the width; near-same-date dots nudged apart).
- **Sprint state** — `extractSprintItems` pulls numbered entries and
  "Commitment" table rows from sections headed *criteria/commitments*; a
  detected target ("≥4", "— 12 reps", "(target 12)"; 4-digit numbers
  excluded so dates never match) makes a count item, else a tick. Items can
  also be closed (dropped from scope — out of the progress denominator) or
  added manually. Dated note log below. Re-importing an updated file keeps
  logged state by item id (`mergeItems`).
- `src/services/goalService.js` → `goal_sprints` table
  (`input/goals-schema.sql`), single live row per user (id `current`),
  `goal-sprint-cache-v1` cache, `.select()` zero-row guard on the upsert.

### Design system (v3)
Global tokens live in `src/index.css` `:root` and apply across every page.
- Surfaces: `--bg: #F5F3ED` (warm ground) · `--card: #FDFCF9` (ivory) · `--border: #E6E2D6` (hairline) · `--divider: #EFEBE0` (inside-card) · `--ink: #1B3B2F` (the single dark surface colour — cards, active tab, buttons).
- Text: `--text: #1B3B2F` · `--text-muted: #8B8578` · `--text-faint: #B0A99A`.
- Accents are **demoted to small marks** — accent-tint icon chips (accent at 9–13% opacity behind a darker accent glyph), 8px dots, 3px usage bars. Never full-bleed card fills. Per-app accents unchanged:
  `--accent-menu` (primary green), `--accent-timeline` (terracotta `#C57B57`),
  `--accent-mobility` (sage `#6B9E72`), `--accent-workout` (slate teal `#2D5A6C`),
  `--accent-palette` (dusty rose `#B5838D`), `--accent-bucket` (lavender `#8E7CC3`),
  `--accent-travel` (ocean `#2F7DA0`), `--accent-decision` (amber `#C8804A`), `--accent-books` (leather `#8A6B4D`),
  `--accent-property` (brick `#9C5B43`), `--accent-goals` (dusty indigo `#56628E`).
  Chip tint pairs live per app in `src/data/appRegistry.js`.
- Dark screen (Life only): `--dark-bg` radial gradient, on-dark ivory text, `--tint-health/wealth/happiness`.
- Radii: cards 20 · rows 14–16 · icon chips 10–12 · pills 999. Card shadow nearly flat (`--card-shadow`).
- Type: DM Serif Display (display) + Inter (body). Serif tab titles 2.4rem with terracotta full stop; eyebrow labels 0.68rem/600/1.6px uppercase; tabular-nums on times/counters.
- Emoji policy: meal emoji from Menu Planner data only — everything else is a line glyph from the sprite.

### Shared components
- `src/components/AppShellV3.jsx` — the one slotted sub-page framework
  (v3.1). Every sub-page wraps in this; apps fill the same slots in the
  same order, may omit a slot, never rearrange one:
  `app` (registry id — supplies accent, tint pair, serif name) ·
  optional `title` (nested screens only, e.g. a trip name) · `back`
  (defaults to `/apps`) · `scope` (exactly one selector row: day pills /
  segmented view pills / filter chips, built from the exported `ScopePill`)
  · `hero` (exactly one summary card — exported `HeroCard`: eyebrow, serif
  1.6rem title, meta, accent-tint chips) · children (content) · `action`
  (exactly one sticky ink button `{ label, onClick | to }`, floats over a
  bg fade, sits above the tab bar unless `hideTabBar`). Per-app nuance
  lives only in the content slot and the scope flavour.
- `src/components/shell/TabBar.jsx` — the fixed four-tab bar. Rendered by
  AppShell and by pages with local headers; pass `dark` on dark screens.
- `src/components/AppIcon.jsx` — line-icon sprite (24×24, 1.6 stroke,
  currentColor, round caps), incl. shell glyphs `grid`/`person`/`coin`/
  `search`/`chev`/`back`. Add a new icon by appending a `<symbol>` to
  `IconSprite` then `<AppIcon name="…" />`. The sprite is mounted once in
  `main.jsx` so all `<use href="#icon-…">` references resolve globally.
- `src/components/feedback/OfflineNote.jsx` — the one offline pattern
  app-wide (v3.2 §7): dot + "Offline — changes queue locally and sync when
  back." on an ivory row, `dark` variant for the Life screen. Always last
  in the content slot; no bespoke offline notes anywhere.
- `src/components/TravelMap.jsx` — Leaflet map with Esri World Imagery
  satellite tiles. Click in edit mode to add a labelled pin; drag to move;
  right-click / long-press to delete. Custom pins persist to
  `localStorage` under `travel_custom_pins_v1`.

### Adding a new app
Append an entry to `APP_REGISTRY` in `src/data/appRegistry.js` (route, icon,
name, accent + tint pair), add the route in `App.jsx`, a sprite icon if new,
and optionally a Today card. The Apps list, usage sorting, and tab shell pick
it up automatically — that's the whole point of the v3 shell (the dashed
"Finance" ghost slot on /apps marks the pattern for the next app).

PWA icons: one tree mark (ivory glyph on deep-green radial, `public/favicon.svg`)
generates `public/icons/*.png` (192/512/maskable/apple-touch).

## Future Work

### Outfit Matcher phase 2 — Supabase + wardrobe
- Move saved outfits from `outfit-matcher-saved-v1` localStorage into Supabase:
  `input/outfit-schema.sql` + `src/services/outfitService.js`, keeping the
  localStorage cache as the offline fallback (same pattern as the other
  features). Saved entries already carry a stable dedupe `key`, Wada id,
  slot assignments, and metal — the shape maps directly onto a table.
- Wardrobe garment records (name + colour + slot per owned item) so
  suggestions reference real garments ("your grey wool trousers") instead of
  abstract swatches, and "start from a piece" starts from the actual wardrobe.

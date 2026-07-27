# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Life & Training Hub** (repo "Livet") — a React 19 + Vite single-page app with Supabase auth and persistence, deployed to GitHub Pages. Hash routing serves nine sub-apps behind one login. The original five-single-file static PWA lives in `legacy_static/` for reference only (it fails lint — pre-existing, don't fix).

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

### Layering conventions
- `src/pages/` — one page component per route (routes live in `src/App.jsx`: `/menu`, `/timeline`, `/mobility`, `/workout`, `/colour`, `/bucket`, `/travel`, `/decision`, `/books`).
- `src/components/<feature>/` — feature-scoped components (e.g. `mobility/`, `rehab/`, `colour/`).
- `src/services/` — the **only** files that touch their Supabase tables.
- `src/lib/` — pure helpers, unit-tested with vitest in sibling `*.test.js` files.
- `src/data/` — static datasets (palette colours, workout data, vendored Wada colours).
- `input/*-schema.sql` — table schemas, run manually in the Supabase SQL editor.

### Data flow pattern
Supabase-backed features write through a service module and mirror state into a localStorage cache; on load they try the network and fall back to the cache. Purely local features (e.g. saved outfits, custom travel pins) use localStorage directly with a versioned key (`outfit-matcher-saved-v1`, `travel_custom_pins_v1`).

### Life tree (Timeline page)
`/timeline` is the **Life** page: a weekly life tree from Naval Ravikant's *Almanack* (primary view) above the original milestone feed. The conceptual frame: the other sub-apps are supporting tools; weekly tree inputs compound into the milestones below.
- `src/data/lifeTreeData.js` — the n-ary tree: health / wealth / happiness pillars → 10 leaf practices, each with a written pass criterion (tick against the sentence, not the feeling).
- `src/lib/lifeTree.js` — ISO-week (Monday-start) helpers + strict-AND roll-up: a node is `complete` only when every leaf below is ticked; partial nodes carry `done/total`. Unit-tested in `lifeTree.test.js`.
- `src/services/lifeTreeService.js` → `life_tree_weeks` table (`input/life-tree-schema.sql`), one row per (user, ISO week), `ticks` jsonb; `life-tree-cache-v1` localStorage fallback, cache-first on save.
- `src/components/life/` — `LifeTree.jsx` (CSS-elbow tree, tappable leaves) and `WeekHeatmap.jsx` (trailing 12 weeks; tapping a cell selects that week for backfilling). Pillar accents reuse existing tokens (sage/slate-teal/terracotta).

### Colour palette app & Outfit Matcher
`src/pages/ColourPalette.jsx` renders tabbed sections driven by `SECTIONS` in `src/data/colourData.js`; the default tab is the **Outfit Matcher** (`src/components/colour/OutfitMatcher.jsx`).

The matcher crosses the personal Soft Summer palette with Sanzo Wada's *A Dictionary of Color Combinations*:
- `src/data/wadaData.js` — 159 book colours + their membership in the 348 combinations, vendored from [mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations) (MIT), trimmed to name/hex/combinations.
- `src/lib/colourMatch.js` — the pure engine. Each Wada colour snaps to its nearest wearable palette colour via CIEDE2000; a combination survives into the outfit library when every member snaps within `SNAP_CAP` (18) and ≥2 distinct palette colours remain. Members drifting past `FAITHFUL_T` (12) flag the combo `adapted`. Colours are assigned to garment slots (jacket/top/trousers/accent) by role/lightness scoring — neutrals and darks ground the outfit, core colours go near the face. Contrast bands (low ≤ 15 / medium ≤ 30 / high) split the library roughly in thirds by lightness spread.
- These constants were calibrated against the real datasets (library of 177 combos: 86 pairs, 58 trios, 33 quads). If the palette in `colourData.js` changes, re-check them — `colourMatch.test.js` asserts minimum library sizes and will catch a collapse.

### Book cloud (/books)
The Audible library drawn as connected theme clouds: read books are solid dots, wishlist books sit dashed in the same clouds. Four views: Cloud, Read next (full wishlist ranked by rating-weighted pull, theme filter chips — the two selection criteria), Rate (bulk 1–5★ for finished books, unrated first), Library (import/tag/manage).
- `src/data/bookThemes.js` — theme taxonomy (10 themes + unsorted); a book's **first** theme decides its cloud, later themes create cross-cloud links. Keywords drive import-time auto-tagging (hints only).
- `src/data/bookSeeds.js` — the owner's curated Audible library + wishlist (themes hand-assigned, authors simplified to the primary name so author-links fire); offered as a one-tap load in the empty state.
- `src/lib/bookCloud.js` — pure engine, unit-tested: `parseImport` (handles both "Title by Author" lines and multi-line Audible copy blocks with `By:`/`Narrated by:` rows), relatedness (`same author` = 3, each shared theme = 1), edge rules (single shared theme only counts across clouds), deterministic sunflower-spiral + row-packed layout, and wishlist ranking: each link is scaled by `ratingFactor` (rating/3, unrated = 1), so 5★ reads pull ~1.7× and 1★ demotes; reasons are human-readable and clouds carry `avgRating`.
- `src/components/books/` — `BookCloud.jsx` (SVG: blurred cloud blobs, curved edges, tap-to-highlight), `BookImport.jsx` (paste box with live parse count, read/wishlist toggle), `BookDetailCard.jsx` (status, rating stars, theme chips, related list, delete), `StarRating.jsx`.
- `src/services/bookService.js` → `book_cloud_books` table (`input/book-cloud-schema.sql`, incl. idempotent `rating` alter), one row per (user, book), `themes` jsonb; `book-cloud-library-v1` localStorage fallback, cache-first on save. An empty table with a non-empty cache seeds the server from the cache (first-run migration).

### Design system
Global tokens live in `src/index.css` `:root` and apply across every page.
- `--primary: #1B3B2F` (dark green) · `--bg: #F2F0EB` (warm off-white)
- Per-app accents (used by dashboard cards and sub-page header underline):
  `--accent-menu` (primary green), `--accent-timeline` (terracotta `#C57B57`),
  `--accent-mobility` (sage `#6B9E72`), `--accent-workout` (slate teal `#2D5A6C`),
  `--accent-palette` (dusty rose `#B5838D`), `--accent-bucket` (lavender `#8E7CC3`),
  `--accent-travel` (ocean `#2F7DA0`), `--accent-decision` (amber `#C8804A`).
- Fonts: DM Serif Display (display) + Inter (body).

### Shared components
- `src/components/AppShell.jsx` — every sub-page wraps in this. Pass `title`,
  optional `accent` (defaults to `--primary`), optional `actions` and `back`.
  The shell paints the header underline in the app's accent.
- `src/components/AppIcon.jsx` — line-icon sprite (24×24, 1.6 stroke,
  currentColor, round caps). Add a new icon by appending a `<symbol>` to
  `IconSprite` then `<AppIcon name="…" />`. The sprite is mounted once in
  `main.jsx` so all `<use href="#icon-…">` references resolve globally.
- `src/components/TravelMap.jsx` — Leaflet map with Esri World Imagery
  satellite tiles. Click in edit mode to add a labelled pin; drag to move;
  right-click / long-press to delete. Custom pins persist to
  `localStorage` under `travel_custom_pins_v1`.

### Dashboard card anatomy
All cards are "featured" style: solid `--app-accent` background, white text,
`AppIcon` glyph in a translucent rounded square, serif title (em accent
allowed), short description, CTA row with arrow chip. Each card sets its
own accent inline: `style={{ '--app-accent': 'var(--accent-foo)' }}`.
The list of cards lives in the `APPS` array at the top of `Dashboard.jsx` —
add a new card by appending an entry and (if needed) a new `--accent-*` var
plus a sprite icon.

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

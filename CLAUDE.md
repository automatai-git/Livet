# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Life & Training Hub** (repo "Livet") — a React 19 + Vite single-page app with Supabase auth and persistence, deployed to GitHub Pages. Hash routing serves eight sub-apps behind one login. The original five-single-file static PWA lives in `legacy_static/` for reference only (it fails lint — pre-existing, don't fix).

## Running Locally

```bash
npm run dev      # Vite dev server
npm test         # vitest run
npm run lint     # eslint
npm run build    # production build to dist/
```

There is no `.env` locally, so the Supabase client boots with a placeholder URL. Every data layer falls back to its localStorage cache when fetches fail, so pages can be previewed offline by seeding localStorage in the browser console: a forged `sb-placeholder-auth-token` session (any JSON with a future `expires_at` and a `user` object) gets past the auth gate, and per-feature caches (e.g. `block-cache::block-4`, `user-config-cache`, `rehab-log-cache::<protocolId>`) supply data.

## Deployment

Push to `main` → `.github/workflows/static.yml` builds with Vite (Supabase URL/key injected from repo secrets) and deploys `dist/` to GitHub Pages. `supabase-keep-alive.yml` pings Supabase on a schedule so the free-tier project isn't paused.

## Architecture

### Layering conventions
- `src/pages/` — one page component per route (routes live in `src/App.jsx`: `/menu`, `/timeline`, `/mobility`, `/workout`, `/colour`, `/bucket`, `/travel`, `/decision`).
- `src/components/<feature>/` — feature-scoped components (e.g. `mobility/`, `rehab/`, `colour/`).
- `src/services/` — the **only** files that touch their Supabase tables.
- `src/lib/` — pure helpers, unit-tested with vitest in sibling `*.test.js` files.
- `src/data/` — static datasets (palette colours, workout data, vendored Wada colours).
- `input/*-schema.sql` — table schemas, run manually in the Supabase SQL editor.

### Data flow pattern
Supabase-backed features write through a service module and mirror state into a localStorage cache; on load they try the network and fall back to the cache. Purely local features (e.g. saved outfits, custom travel pins) use localStorage directly with a versioned key (`outfit-matcher-saved-v1`, `travel_custom_pins_v1`).

### Colour palette app & Outfit Matcher
`src/pages/ColourPalette.jsx` renders tabbed sections driven by `SECTIONS` in `src/data/colourData.js`; the default tab is the **Outfit Matcher** (`src/components/colour/OutfitMatcher.jsx`).

The matcher crosses the personal Soft Summer palette with Sanzo Wada's *A Dictionary of Color Combinations*:
- `src/data/wadaData.js` — 159 book colours + their membership in the 348 combinations, vendored from [mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations) (MIT), trimmed to name/hex/combinations.
- `src/lib/colourMatch.js` — the pure engine. Each Wada colour snaps to its nearest wearable palette colour via CIEDE2000; a combination survives into the outfit library when every member snaps within `SNAP_CAP` (18) and ≥2 distinct palette colours remain. Members drifting past `FAITHFUL_T` (12) flag the combo `adapted`. Colours are assigned to garment slots (jacket/top/trousers/accent) by role/lightness scoring — neutrals and darks ground the outfit, core colours go near the face. Contrast bands (low ≤ 15 / medium ≤ 30 / high) split the library roughly in thirds by lightness spread.
- These constants were calibrated against the real datasets (library of 177 combos: 86 pairs, 58 trios, 33 quads). If the palette in `colourData.js` changes, re-check them — `colourMatch.test.js` asserts minimum library sizes and will catch a collapse.

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

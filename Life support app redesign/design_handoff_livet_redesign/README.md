# Handoff: Livet v3 — unified app shell & design system

## Overview
A complete redesign of **Livet** (repo `automatai-git/Livet`, branch `main`) — the personal "life support" PWA with nine sub-apps behind one login. The redesign replaces the hub-and-spoke dashboard with a **four-tab shell** (Today / Apps / Life / You), demotes per-app accent colours from full-bleed card fills to small marks on calm ivory surfaces, and gives Life (the weekly life tree) a grand, dedicated dark screen. The system is designed to absorb future apps (Finance is next) with zero layout changes: a new app gets a row, an accent, and a Today card.

Decisions locked with the owner:
- **Today tab** = option 3d (day track 05:00–21:00, agenda card, Life Tree summary, most-used list)
- **Apps tab** = option 3c (single auto-sorted list, NO most-used block — that lives on Today only)
- **Life tab** = option 3a (dark "The Tree" screen)
- **You tab** = option 4a
- **Sub-page shell** = option 1e (Mobility shown as the reference)
- **Figures** = option 4b (one line-glyph geometry; emoji for meals only; new PWA icon replaces the raster set)

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. The task is to **recreate these designs inside the existing Livet codebase** (React 19 + Vite, hash routing, Supabase + localStorage-cache data layer, global CSS in `src/index.css`) using its established patterns: `src/pages/` for routes, `src/components/<feature>/`, services in `src/services/`, tokens in `:root` of `index.css`, icon sprite in `src/components/AppIcon.jsx` mounted once in `main.jsx`.

`Livet Redesign.dc.html` is the design exploration canvas (view in a browser; the locked screens are sections 3d, 3c, 3a, 4a, 4b, 1e). `ios-frame.jsx` is only the phone bezel used for presentation — ignore it. `livet-icons.svg` is the production-ready sprite (see Assets).

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and copy in the locked screens are final intent. Recreate pixel-perfectly with the codebase's existing patterns. Screens NOT mocked (Menu, Workout, Trips, Bucket, Books, Palette, Decision internals) follow the migration rules below — apply the system, keep each page's existing functionality untouched.

## Design Tokens
Update `:root` in `src/index.css`. Keep every existing `--accent-*` unchanged.

New / changed:
- `--bg: #F5F3ED` (was `#F2F0EB` — slightly lighter warm ground)
- `--card: #FDFCF9` (ivory, replaces pure white)
- `--border: #E6E2D6` (hairline)
- `--divider: #EFEBE0` (inside-card hairlines)
- `--text: #1B3B2F` (unchanged) · `--text-muted: #8B8578` (warmer than old `#6B7B75`) · `--text-faint: #B0A99A`
- `--ink: #1B3B2F` — the single dark surface colour (cards, active tab, buttons)
- Dark-screen (Life) palette: bg `radial-gradient(120% 70% at 50% 0%, #25493A 0%, #1B3B2F 45%, #12281E 100%)`; on-dark text `#F5F3ED`; on-dark muted `rgba(245,243,237,.55–.65)`
- On-dark pillar tints: health `#8FBF96`, wealth `#7FB2C4`, happiness `#DBA283`
- Accent tint chips: accent colour at 9–13% opacity as background, darker accent as foreground (e.g. mobility chip: bg `rgba(107,158,114,.13)`, glyph `#4F8557`; timeline/tree chip: bg `rgba(197,123,87,.13)`, glyph `#B06A47`)
- Radii: cards 20px · rows/tiles 14–16px · icon chips 10–12px · pills 999px
- Shadow: `0 1px 2px rgba(27,59,47,.04)` on cards (nearly flat); floating/dark elements `0 10px 30px rgba(27,59,47,.35)`
- Type: DM Serif Display (display) + Inter (body) — unchanged. Serif page titles 2.4rem, letter-spacing −0.5px, with a terracotta full stop (`<span style="color:#C57B57">.</span>`) on tab titles. Eyebrow labels: 0.68rem / 600 / letter-spacing 1.6px / uppercase / `--text-muted`. Body row title 0.9–0.93rem / 600. Row meta 0.74–0.76rem / `--text-muted`. Tabular-nums on all times/counters.

**Deleted patterns** (remove from CSS when migration completes): solid `--app-accent` card fills (`.app-card`), `.cta-row` (+ "Open X" copy), the box-in-box agenda widget, `⚡`/`💪`/`🍽️` decorative emoji.

## Screens / Views

### 1. Today tab (route `/`, replaces Dashboard)
Layout: single scroll column, 20px side padding, content top-aligned under the status bar.
1. **Header row** (flex, space-between, align-end): left — eyebrow `MONDAY 27 JULY · WEEK 31` over serif `Today.` (2.4rem); right — streak pill (ivory card, hairline border, radius 999, 6px sage dot + `4-day streak` 0.74rem/600 `#4F8557`). Streak = existing `mobilityService.getWeeklyCount()`.
2. **Day track** — the day runs **05:00–21:00** (16h window; user-configurable in You tab):
   - 2px full-width line `#E0DCCF`, radius 1
   - elapsed portion `#1B3B2F` at 45% opacity, width = `(now − 05:00) / 16h`
   - "now" marker: 16px ink dot with 3px `--bg` ring
   - one 10px hollow dot per agenda item, positioned at its time, 2.5px stroke in the item's accent (mobility `#4F8557`, workout `#2D5A6C`, dinner `#C57B57`)
   - hour labels under the line: `05 09 13 17 21`, 0.62rem `--text-faint`, tabular-nums
   - items before 05:00/after 21:00 clamp to the ends
3. **Agenda card** — ONE ivory card (radius 20, hairline border), rows separated by inset dividers (`--divider`, 18px inset). Row anatomy: 42px icon chip (radius 12, accent tint bg) · flex column (eyebrow `UP NEXT · 15:30` — accent-coloured for the next item, muted otherwise; title 0.93rem/600, ellipsis-truncated single line) · right slot = `Start` ink pill (next item only) or chevron. Dinner row uses the meal's emoji in the chip (only emoji in the app). Rows link to `/mobility`, `/workout`, `/menu` as today.
4. **Life Tree summary card** — ink card (radius 20): serif `Life Tree` 1.2rem + `Wealth branch needs a tick` 0.76rem muted; three 9px pillar dots (filled = branch complete, 35–70% opacity = partial); serif fraction `6/10`. Links to Life tab. (The 2a variant with three progress bars is an approved alternative if vertical space allows.)
5. **Most used** — section eyebrow + right-aligned `sorted by your use` hint (0.66rem `--text-faint`). 2–3 rows (ivory card each, radius 16): 38px icon chip, name 0.93rem/600, live meta line (Menu: `5 of 7 dinners planned`; Tree: weakest-branch hint; Mobility: `4 of last 7 days`), chevron. **Ordering is computed from localStorage** (see State Management).

### 2. Apps tab (route `/apps`, new)
1. Serif title `Apps`.
2. Search field (ivory card row, radius 14, search glyph, placeholder `Search apps & actions…`). Filters the list by name; wire to fuzzy match on app names first, deep actions later.
3. Right-aligned hint `sorted by your use · last 30 days`.
4. **One list, all nine apps**, auto-sorted by the same usage counts as Today (no most-used block here). Row: 36px icon chip · name 0.9rem/600 over a 3px usage bar (track `--divider`; fill = app accent at ~55–70% opacity; width proportional to opens, max app = ~92%) · optional status text (`Japan · Oct`, `2 to rate`, `38 / 425`) · chevron.
5. **Finance ghost slot**: dashed 1.5px `#D5D0C2` border, radius 14, coin glyph + `Finance` + "Next app — a row, an accent, a Today card. Nothing else changes." — keep this pattern for every future app before it ships.

### 3. Life tab (route `/life`, replaces `/timeline` as primary; the milestone feed moves behind a link on this screen)
The app's ONLY dark screen. Background: the radial gradient token above. Status bar style: light-on-dark.
1. Centered eyebrow `WEEK 31 · THE TREE` (letter-spacing 2.2px, on-dark muted), then giant serif fraction: `6` at 4.6rem, ` / 10` at 1.6rem on-dark muted. Subline `Every tick this week grows the tree.` 0.82rem.
2. **The tree** (SVG, viewBox 0 0 362 400, full width):
   - ground ellipse `rgba(245,243,237,.06)`
   - trunk + 3 main branches: strokes `rgba(245,243,237,.28–.35)`, width 5 (trunk) / 3.5 (branches) / 2.5 (twigs), round caps — exact paths in the design file
   - one leaf node per life-tree leaf (data from `src/data/lifeTreeData.js`, currently 10): ticked = 11px filled circle in pillar tint + 16px halo at 18% opacity + dark check mark; unticked = 11px hollow circle, 2px `rgba(245,243,237,.45)` stroke
   - leaves are tap targets (≥44px hit area): tapping toggles the tick via the existing `lifeTreeService` write path and animates the fill (scale 0.8→1 + halo fade-in, 250ms ease-out; respect `prefers-reduced-motion`)
   - branch-to-pillar assignment: left = health, top = wealth, right = happiness; distribute leaves across the twig endpoints per pillar
3. **Pillar chips row** (centered): `rgba(245,243,237,.08)` pills, 8px pillar dot + `Health 3/4` 0.72rem/600.
4. **Weakest branch card**: `rgba(245,243,237,.07)` bg, `rgba(245,243,237,.12)` border, radius 18. Hollow tick circle in pillar tint · eyebrow `WEAKEST BRANCH · WEALTH` in pillar tint · leaf label 0.92rem/600 · its written pass criterion 0.76rem muted · ivory `Tick` pill (bg `#F5F3ED`, text ink). Weakest = pillar with lowest completion ratio (existing roll-up logic in `src/lib/lifeTree.js`).
5. Below the fold: keep the 12-week heatmap (restyle: 6px-radius squares, terracotta fill at completion-ratio opacity, current week outlined in ink/ivory) and a link to the legacy milestone timeline.
6. Tab bar on this screen: dark variant — bar bg `rgba(18,40,30,.8)` + blur, inactive `rgba(245,243,237,.5)`, active pill INVERTED: bg `#F5F3ED`, glyph/label ink.

### 4. You tab (route `/you`, new — absorbs logout, install prompt, and settings)
Serif title `You.` then three ivory cards:
1. **Profile**: 52px ink circle with serif initial · name + `email · Supabase` meta · `Sign out` ghost pill (`supabase.auth.signOut()`).
2. **Sync**: two divider rows — `Synced` (8px sage dot) + `just now`; `Offline cache` (8px `#D5D0C2` dot) + `ready · all 9 apps`. Reflect real cache/network state.
3. **Settings** rows: `Install on home screen` (triggers the existing A2HS flow — move it here from Dashboard), `Day window` (default `05:00 – 21:00`, drives the Today day track), `Week starts` (`Monday`), `Reset usage sorting` (clears the usage-count localStorage key).
Footer: `Livet v3 · one system, nine apps` 0.72rem `--text-faint`, centered.

### 5. Sub-page shell (every sub-app; Mobility is the reference — design section 1e)
Replaces `AppShell`'s centered title + accent underline:
- Header row: 36px circular back button (ivory, hairline) + 8px app-accent dot + serif app name 1.35rem, left-aligned. No underline.
- The tab bar stays visible on sub-app **top-level** screens; hide it inside focus flows (e.g. mobility session focus mode) in favour of that flow's sticky action bar.
- Content patterns: day pills → 7 equal flex cells (letter + date, selected = ink fill white text, today = inset 1.5px accent ring); hero card (ivory, radius 20: eyebrow, serif title 1.6rem, meta, tag chips in accent tint); numbered exercise rows (28px accent-tint number circle, name, sets meta, region tag chip); sticky bottom primary action (`Start session`, ink, radius 16, full width, 15px vertical padding) floating over a `linear-gradient(to top, var(--bg) 70%, transparent)` fade.

### 6. Migration rules for un-mocked screens
Keep each page's existing functionality and information architecture; restyle surfaces:
- white cards → `--card` ivory + `--border` hairline + radius per token scale
- any solid accent fill → accent tint chip / dot / 3px bar
- `tight-card`, `day-cell`, `kind-chip`, `status-chip` etc. keep their roles, re-tokened
- headers → sub-page shell above
- `Menu Planner`: meal emoji stays (functional); drag rows and slots re-tokened
- `Workout Finder`: rehab ladder/status chips keep semantic colours (`--danger` etc.) on ivory
- `Books`, `Bucket`, `Trips`, `Palette`, `Decision`: restyle chrome only; SVG/cloud/map content untouched

## Interactions & Behavior
- Tab bar: 4 equal flex cells, glyph 21px + 0.6rem label; active = ink pill (radius 14) white content; bar = `rgba(245,243,237,.92)` + `backdrop-filter: blur(12px)` + top hairline; bottom padding `calc(10px + env(safe-area-inset-bottom))`. Tabs switch with no route animation (instant), preserve each tab's scroll position.
- Agenda `Start` pill → deep-links into the mobility session (same query params as today: `/mobility?day=…&routine=…`).
- "Up next" = the first agenda item whose time ≥ now within the 05:00–21:00 window; past items fall to normal styling with a muted check when their source app logged completion.
- Card taps: whole rows are links (no separate CTA). Hover (desktop): border-color → `--text-muted`; active: scale(0.99).
- Life leaf tick animation as specified; heatmap cell tap selects that week for backfilling (existing behavior).
- All transitions ≤250ms ease-out; honour the existing `prefers-reduced-motion` block.
- Focus-visible: keep the global 2px ring, colour `var(--app-accent, var(--ink))`.
- Min tap target 44px throughout (day pills, leaves, tab cells, rows).

## State Management
- **Usage sorting** (new): localStorage key `app-usage-v1` = `{ [route]: { opens: number[], /* epoch ms, capped at last 90 */ } }`. Increment on each sub-app route mount. Sort score = opens in trailing 30 days. Ties → fixed canonical order. `Reset usage sorting` in You clears the key. Do NOT touch any other localStorage keys (they hold cache data).
- **Day window** (new): localStorage `day-window-v1` = `{ start: "05:00", end: "21:00" }`; consumed by the Today day track and "up next" logic.
- Agenda data: reuse Dashboard's existing `fetchAgenda` (weekly_menu, workouts by program position, mobility pick-by-hour, `getWeeklyCount`).
- Life tree: existing `lifeTreeService` + `life-tree-cache-v1` cache-first pattern; strict-AND roll-up from `src/lib/lifeTree.js` unchanged.
- Routing: add `/apps`, `/life` (alias or replacement for `/timeline`), `/you`; `/` becomes the Today tab. Keep hash routing and the auth gate exactly as-is.

## Assets
- `livet-icons.svg` — the complete sprite: existing app glyphs (unchanged geometry: 24×24, 1.6 stroke, currentColor, round caps/joins) + new shell glyphs `grid` (Apps tab), `person` (You), `coin` (Finance), `search`, `chev`/`back`. Merge into `AppIcon.jsx`'s `IconSprite`.
- **PWA icon**: new mark = tree glyph, ivory `#F5F3ED` on deep-green radial (`#25493A → #1B3B2F`), rounded-square. Regenerate `public/favicon.svg`, the manifest icons and ALL of `public/icons/*.png` (the seven photographic PNGs don't fit the system) from this one mark, including a maskable variant.
- Emoji policy: meal emoji from Menu Planner data only. Remove all decorative emoji.
- Fonts already loaded via the existing Google Fonts import (add Inter 700 if missing).

## Files
- `Livet Redesign.dc.html` — the full exploration canvas. Locked screens: sections labeled **3d** (Today), **3c** (Apps), **3a** (Life), **4a** (You), **4b** (figures), **1e** (sub-page shell). Section **1a** is a recreation of the CURRENT app for before/after reference. Other sections are unpicked explorations — ignore unless referenced.
- `ios-frame.jsx` — presentation-only phone bezel; not part of the design.
- `livet-icons.svg` — production icon sprite.

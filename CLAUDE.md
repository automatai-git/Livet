# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Life & Training Hub** — five single-file web apps bundled as a PWA. No build step, no dependencies, no backend. All logic is vanilla HTML/CSS/JS; all data persists in `localStorage`.

## Running Locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Any static server works. There is no build, compile, or install step.

## Deployment

Push to `main` → GitHub Pages auto-deploys via `.github/workflows/static.yml`. No manual steps needed.

## Architecture

### App files (self-contained)
Each app is a standalone HTML file with all styles and logic inlined, except mobility which is split:
- `timeline.html` — milestone timeline, data key `lifeTimelinePWA`
- `mobility.html` + `mobility.js` + `mobility.css` + `mobility-data.js` — mobility tracker, data key `mobilityHistory`
- `workout-finder.html` — training plan (data hardcoded in HTML)
- `colour-palette.html` — static reference tool, no user data
- `bucketlist.html` — bucket list, data keys `bucketlist-state-v3` and `bucketlist-targets-v1`

`index.html` is the hub/landing page linking to all apps.

### PWA layer
- `manifest.json` — PWA metadata
- `service-worker.js` — cache-first offline strategy; bump `CACHE_NAME` version string when adding new cached files

### Planned: Gist sync + encryption (see `IMPLEMENTATION_PLAN.md`)
Two shared modules are planned but not yet created:
- `gist.js` — syncs dynamic `localStorage` data to a private GitHub Gist via the GitHub API
- `crypto.js` — AES-GCM encryption/decryption using the Web Crypto API (for `menu.enc`, `training.enc`)

When implementing, pages use `<script type="module" src="gist.js">` and each page's load/save functions become async.

### Data flow pattern (current)
```
user action → update in-memory state → JSON.stringify → localStorage.setItem(key, ...)
page load → localStorage.getItem(key) → JSON.parse → render
```

### Design system
CSS custom properties defined in each file's `:root`:
- `--primary: #1B3B2F` (dark green)
- `--bg: #F2F0EB` (warm off-white)
- Google Fonts: DM Serif Display + Inter (hub/timeline); Cormorant Garamond + Nunito Sans (mobility)

## Service Worker Updates

When adding or removing cached files, update the `urlsToCache` array in `service-worker.js` **and** increment `CACHE_NAME` (e.g. `life-training-hub-v2` → `v3`) so existing installs pick up the change.

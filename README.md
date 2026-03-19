# Life & Training Hub

A personal productivity ecosystem — five integrated web apps for life planning, training, and adventure tracking. Runs entirely in the browser with no backend.

## Apps

| App | File | Description |
|-----|------|-------------|
| 📍 Milestone Timeline | `timeline.html` | Snaking timeline of life events with past/future milestones |
| 🧘 Mobility Tracker | `mobility.html` | Weekly mobility workouts with progress tracking |
| 💪 Workout Finder | `workout-finder.html` | Block 3 training plan with RPE targets and protocols |
| 🎨 Colour Matching | `colour-palette.html` | Personal Soft Summer colour palette and outfit combinations |
| 🌍 Bucket List | `bucketlist.html` | 425 life experiences across 12 categories with progress tracking and focus targets |

## Tech Stack

- Vanilla HTML/CSS/JavaScript — no build step, no dependencies
- Progressive Web App (PWA) — installable, works offline
- `localStorage` for all data persistence

## File Structure

```
index.html              Landing page / app hub
timeline.html           Milestone timeline app
mobility.html           Mobility tracker
mobility.js             Mobility workout logic
mobility.css            Mobility styles
mobility-data.js        Workout exercise data
workout-finder.html     Training plan finder
colour-palette.html     Colour palette tool
bucketlist.html         Bucket list tracker
manifest.json           PWA manifest
service-worker.js       Offline caching
.github/workflows/      GitHub Pages auto-deploy
```

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the workflow in `.github/workflows/static.yml`.

To run locally: open `index.html` in a browser, or serve with any static server:

```bash
python -m http.server 8000
```

## Data

All data is stored in browser `localStorage` — nothing is sent to any server. Key storage entries:

- `milestones` — timeline events
- `workout_*_progress` — mobility progress
- `bucketlist-state-v3` — bucket list checked states
- `bucketlist-targets-v1` — current working-towards targets and step plans

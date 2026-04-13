# Gist Sync Guide: Menu Planner Cross-Device Storage

This guide covers syncing the meal planner's two data stores — the **meals list** and the **cooking log** — to a private GitHub Gist. Once done, adding a new meal on one device makes it available everywhere.

The full multi-app rollout is tracked in `IMPLEMENTATION_PLAN.md`. This guide focuses solely on `menu.html`.

---

## How it works

Right now `menu.html` stores everything in `localStorage`:

| Key | Content |
|-----|---------|
| `menu-meals-data-v1` | Your full meals list (edits, new meals) |
| `menu-meal-log-v1` | Every "made today" log entry |

The plan: after every write to `localStorage`, also push to a private GitHub Gist. On load, try the Gist first; fall back to `localStorage` if offline.

```
Device A saves meal → localStorage + Gist
Device B loads page → fetches Gist → sees new meal
```

---

## Part 1 — One-time GitHub setup (do this first)

### 1.1 Create a private Gist

1. Go to https://gist.github.com
2. Filename: `menu-meals.json`, content: `{"meals":[]}`
3. Click **Add file**, filename: `meal-log.json`, content: `[]`
4. Click **Create secret gist**
5. Copy the Gist ID from the URL:
   `gist.github.com/yourusername/`**`<THIS_PART>`**

### 1.2 Create a Personal Access Token

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
2. **Generate new token (classic)**
3. Name: `menu-planner`, Expiration: 1 year, Scope: check **`gist`** only
4. Copy the token — it starts with `ghp_`

### 1.3 Store credentials (one-time in browser console)

Open `menu.html`, open DevTools console, run:

```js
localStorage.setItem('gist-config', JSON.stringify({
  gistId: 'PASTE_YOUR_GIST_ID_HERE',
  token:  'PASTE_YOUR_TOKEN_HERE'
}));
```

Reload the page. The app will detect the config and start syncing.

> The token never leaves your browser. It goes directly from your `localStorage` to the GitHub API over HTTPS. It is not in the repo.

---

## Part 2 — Create `gist.js`

Create `/gist.js` in the repo root. This is a plain script (not an ES module) so it works with `menu.html`'s existing non-module `<script>` setup.

```js
// gist.js — GitHub Gist sync for menu planner
// Loaded via <script src="gist.js"> before menu.html's own <script>

const GIST_CONFIG_KEY = 'gist-config';

const Gist = (() => {
  function getConfig() {
    try { return JSON.parse(localStorage.getItem(GIST_CONFIG_KEY)); }
    catch { return null; }
  }

  function setStatus(state) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    const labels = { idle: '', syncing: '⟳ Syncing…', saved: '✓ Saved', offline: '⚡ Offline', error: '⚠ Sync error' };
    el.textContent = labels[state] || '';
    el.className = 'sync-badge sync-' + state;
    if (state === 'saved') setTimeout(() => setStatus('idle'), 2500);
  }

  async function load(filename) {
    const cfg = getConfig();
    if (!cfg) return null;
    try {
      setStatus('syncing');
      const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        headers: { Authorization: `Bearer ${cfg.token}`, 'X-GitHub-Api-Version': '2022-11-28' }
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const content = data.files?.[filename]?.content;
      setStatus('idle');
      return content ? JSON.parse(content) : null;
    } catch (e) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      return null;
    }
  }

  let saveTimer = null;
  async function save(filename, payload) {
    const cfg = getConfig();
    if (!cfg) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        setStatus('syncing');
        const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({ files: { [filename]: { content: JSON.stringify(payload) } } })
        });
        if (!res.ok) throw new Error(res.status);
        setStatus('saved');
      } catch (e) {
        setStatus(navigator.onLine ? 'error' : 'offline');
      }
    }, 400); // debounce: wait 400ms after last save before hitting the API
  }

  function isConfigured() { return !!getConfig(); }

  return { load, save, setStatus, isConfigured };
})();
```

---

## Part 3 — Update `menu.html`

### 3.1 Add the script tag and sync badge

In the `<head>`, before the closing `</head>` tag, add:

```html
<script src="gist.js"></script>
```

In the header HTML (inside `.header-row`), add the sync badge alongside the existing buttons:

```html
<span id="sync-status" class="sync-badge"></span>
```

Add CSS for the badge (inside the existing `<style>` block):

```css
.sync-badge {
    font-size: 0.72rem;
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.3px;
    min-width: 80px;
    text-align: right;
}
.sync-syncing { color: var(--accent); }
.sync-saved   { color: var(--success); }
.sync-error, .sync-offline { color: #e05a5a; }
```

### 3.2 Update `init()`

Replace the existing `init()` function:

```js
async function init() {
    // 1. Load meal log — try Gist first, fall back to localStorage
    const gistLog = await Gist.load('meal-log.json');
    mealLog = gistLog || JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    if (gistLog) localStorage.setItem(LOG_KEY, JSON.stringify(mealLog));

    // 2. Load meals — try Gist first, then localStorage, then menu.json
    const gistMeals = await Gist.load('menu-meals.json');
    if (gistMeals?.meals?.length) {
        meals = gistMeals.meals;
        localStorage.setItem(DATA_KEY, JSON.stringify(meals));
    } else {
        const saved = localStorage.getItem(DATA_KEY);
        if (saved) {
            try { meals = JSON.parse(saved); } catch(e) {}
        }
        if (!meals.length) {
            try {
                const r = await fetch('menu.json');
                const data = await r.json();
                meals = data.meals || [];
            } catch (e) {
                document.getElementById('meal-grid').innerHTML =
                    '<p style="padding:40px;color:#c0392b;text-align:center">Could not load menu.json</p>';
                return;
            }
        }
    }

    buildCategoryFilters();
    renderMeals();
}
```

### 3.3 Update `saveMealsData()`

Find the existing `saveMealsData()` function and add a Gist write:

```js
function saveMealsData() {
    localStorage.setItem(DATA_KEY, JSON.stringify(meals));
    Gist.save('menu-meals.json', { meals });
}
```

### 3.4 Update the meal log save

Find where `mealLog` is saved to `localStorage` — it's in the `markMadeToday()` function and wherever `mealLog` is modified. Add a Gist write after each `localStorage.setItem(LOG_KEY, ...)`:

```js
// Wherever you have:
localStorage.setItem(LOG_KEY, JSON.stringify(mealLog));
// Add directly after:
Gist.save('meal-log.json', mealLog);
```

---

## Part 4 — First sync: push existing data up

After deploying these changes, open `menu.html` on the device that has your current meals. Open DevTools console and run:

```js
// Force-push current localStorage data up to the Gist
Gist.save('menu-meals.json', { meals });
Gist.save('meal-log.json', mealLog);
```

Now all other devices will pull this data on their next load.

---

## Part 5 — Update service worker

In `service-worker.js`, add `gist.js` to the cache list and bump the version:

```js
const CACHE_NAME = 'life-training-hub-v3'; // bump version

const urlsToCache = [
  // ... existing entries ...
  '/gist.js',           // add this
];
```

> Gist data itself is **not** cached — the app always fetches live data, with `localStorage` as the offline fallback.

---

## Behaviour summary

| Scenario | Result |
|----------|--------|
| Online, Gist configured | Loads from Gist on startup; saves to both localStorage + Gist on every change |
| Offline, data in localStorage | Loads from localStorage; queued saves will fail silently (badge shows ⚡ Offline) |
| Gist not configured (no config in localStorage) | Behaves exactly as before — no Gist calls attempted |
| Token expired or invalid | Badge shows ⚠ Sync error; local data safe, Gist writes fail |

Conflict resolution is last-write-wins. For solo use across two or three devices this is fine — just avoid editing meals on two devices simultaneously without reloading.

---

## Security notes

- The PAT has **gist scope only** — it cannot read or write the repo
- The token lives in `localStorage` on your device, never in the repo or sent to any server other than `api.github.com`
- The Gist is **secret** (unlisted by URL), not truly private — anyone with the URL can read it. Don't store sensitive information in meal data
- If a token is compromised: revoke it on GitHub, generate a new one, update `localStorage` via the console command in step 1.3

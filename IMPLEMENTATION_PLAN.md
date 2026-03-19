# Implementation Plan: Encryption + Gist Sync

## Overview

Two complementary solutions:
- **Encryption** — hides static content files (recipes, training plan) from the public GitHub repo
- **GitHub Gist** — syncs all dynamic user data (milestones, logs, checked items) across devices

Together they cover everything. Static private content is encrypted at rest in the repo. Dynamic personal data lives in a private Gist and is available on every device you use.

---

## Current Data Inventory

### Static content (public in repo — needs encryption)
| File | Content |
|------|---------|
| `menu.json` | All recipes, macros, ingredients, tags |
| `workout-finder.html` | Block 3 training plan (hardcoded in HTML) |

### Dynamic user state (localStorage only — needs Gist sync)
| localStorage key | File | Content |
|-----------------|------|---------|
| `lifeTimelinePWA` | timeline.html | Milestones array |
| `mobilityHistory` | mobility.js | Workout session history |
| `bucketlist-state-v3` | bucketlist.html | Checked item states |
| `bucketlist-targets-v1` | bucketlist.html | Working-towards targets |
| `menu-meal-log-v1` | menu.html | Meal log entries |

---

## New Files to Create

```
gist.js     — shared Gist read/write module (used by all pages)
crypto.js   — shared AES encryption/decryption (used by pages with encrypted data)
menu.enc    — encrypted version of menu.json (replaces menu.json in repo)
```

The existing `menu.json` should be **deleted from the repo** once `menu.enc` is committed. Training plan data stays in `workout-finder.html` but gets extracted to a `training.enc` file.

---

## Part 1: GitHub Setup (manual — do this first)

### 1.1 Create a Private Gist

1. Go to https://gist.github.com
2. Create a new Gist with these files (paste `{}` as placeholder content for now):
   - `timeline-data.json`
   - `mobility-history.json`
   - `bucketlist-state.json`
   - `meal-log.json`
3. Click **"Create secret gist"**
4. Copy the Gist ID from the URL: `gist.github.com/yourusername/`**`THIS_PART`**

### 1.2 Create a Personal Access Token

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Name: `timeline-app`
4. Expiration: 1 year (or No expiration)
5. Scope: check only **`gist`**
6. Generate and **copy the token immediately** (starts with `ghp_`)

### 1.3 Store credentials in localStorage (one-time setup)

When the app detects no credentials, it will show a setup modal. You enter:
- The Gist ID
- Your GitHub token
- Your encryption passphrase (for encrypted static files)

These are stored in localStorage under `app-config` and the token is appended to your bookmark URL as `#token=ghp_xxx` so it survives localStorage clearing.

---

## Part 2: Create `gist.js`

Create `/gist.js` as a standalone ES module. All pages import it via `<script type="module">`.

### Responsibilities
- Read Gist ID and token from localStorage / URL hash
- `gistLoad(filename)` — fetch a single file from the Gist, return parsed JSON
- `gistSave(filename, data)` — PATCH the Gist with new JSON content
- `gistLoadAll()` — fetch all 4 dynamic files in parallel on startup
- `gistSaveAll(data)` — write all files in one PATCH call
- Debounce saves (300ms) to avoid hammering the API on rapid changes
- localStorage mirror — always write to localStorage too, so offline still works
- On load: try Gist first, fall back to localStorage if offline or no token

### API calls used
```
GET  https://api.github.com/gists/{GIST_ID}
     Authorization: Bearer {TOKEN}
     → returns object with files[filename].content

PATCH https://api.github.com/gists/{GIST_ID}
      Authorization: Bearer {TOKEN}
      Body: { files: { "filename.json": { content: "..." } } }
```

### Gist file → localStorage key mapping
```js
const GIST_FILES = {
  'timeline-data.json':    'lifeTimelinePWA',
  'mobility-history.json': 'mobilityHistory',
  'bucketlist-state.json': 'bucketlist-state-v3',
  'meal-log.json':         'menu-meal-log-v1',
};
// bucketlist-targets-v1 is merged into bucketlist-state.json
// as { checked: {...}, targets: [...] } to reduce API calls
```

### Sync status indicator
`gist.js` exports a `setSyncStatus(state)` function that updates a small fixed badge
(states: `idle` | `syncing` | `saved` | `offline` | `error`).
Each page adds a `<div id="sync-status">` in its header — gist.js controls it.

---

## Part 3: Create `crypto.js`

Create `/crypto.js` using the browser's built-in **Web Crypto API** (no external library needed).

### Responsibilities
- `deriveKey(passphrase, salt)` — PBKDF2 → AES-GCM key (100,000 iterations, SHA-256)
- `encrypt(plaintext, passphrase)` → base64 string (includes salt + IV prepended)
- `decrypt(ciphertext, passphrase)` → plaintext string

### Encrypted file format
```
[16 bytes salt][12 bytes IV][encrypted data]
→ base64 encoded → stored as .enc file
```
Salt and IV are randomly generated per encryption, prepended to the ciphertext, so the same data encrypted twice produces different output.

### Passphrase storage
The passphrase is **never stored**. It is derived to a key and held in a module-scoped variable for the session. On page refresh, the setup modal asks for it again — or it can be stored in sessionStorage (cleared when browser tab closes) as a convenience option.

---

## Part 4: Encrypt Static Files

### 4.1 Encrypt `menu.json`

Write a one-time encryption script (can be run in the browser console or as a Node script):

```js
// run once in browser console on the existing menu.html page
// or as a standalone Node script using node-webcrypto-ossl

async function encryptFile(jsonData, passphrase) {
  // uses crypto.js logic
  // outputs base64 string
}

const menuJson = await fetch('menu.json').then(r => r.text());
const encrypted = await encryptFile(menuJson, 'your-passphrase');
console.log(encrypted); // copy this → save as menu.enc
```

Steps:
1. Run the encryption script once with your chosen passphrase
2. Save the output as `menu.enc` in the repo
3. Delete `menu.json` from the repo
4. Update `service-worker.js` cache list: replace `menu.json` → `menu.enc`

### 4.2 Extract and encrypt training plan data

The training plan is currently hardcoded HTML in `workout-finder.html`. Extract it:
1. Pull the exercise blocks into a `training-data.json` file
2. Encrypt it → `training.enc`
3. `workout-finder.html` fetches and decrypts `training.enc` on load

---

## Part 5: Update Each Page

### 5.1 Shared setup — add to every page's `<head>`
```html
<script type="module" src="gist.js"></script>
```

Add sync status badge in header HTML:
```html
<div id="sync-status" class="sync-badge"></div>
```

### 5.2 `timeline.html`

**Change `loadData()` to async:**
```js
async function loadData() {
    const data = await gistLoad('timeline-data.json');
    if (data) milestones = data;
}
```

**Change `saveData()` to async with debounce:**
```js
async function saveData() {
    localStorage.setItem('lifeTimelinePWA', JSON.stringify(milestones));
    await gistSave('timeline-data.json', milestones);
}
```

**Update `DOMContentLoaded`** to await loadData before rendering.

### 5.3 `mobility.js`

**Change `loadHistory()` to async:**
```js
async loadHistory() {
    const data = await gistLoad('mobility-history.json');
    if (data) this.workoutHistory = data;
    else {
        const saved = localStorage.getItem('mobilityHistory');
        if (saved) this.workoutHistory = JSON.parse(saved);
    }
}
```

**Change `saveHistory()` to async with Gist write.**

### 5.4 `bucketlist.html`

Two storage keys (`bucketlist-state-v3` and `bucketlist-targets-v1`) are merged into one Gist file:

```js
// Load
const data = await gistLoad('bucketlist-state.json');
// data = { checked: {...}, targets: [...] }

// Save
await gistSave('bucketlist-state.json', { checked: state, targets: targets });
```

Update `loadState()`, `saveState()`, `loadTargets()`, `saveTargets()` accordingly.

### 5.5 `menu.html`

**Decrypt menu on load** (replaces `fetch('menu.json')`):
```js
async function init() {
    const passphrase = await getPassphrase(); // from session or prompt
    const enc = await fetch('menu.enc').then(r => r.text());
    const json = await decrypt(enc, passphrase);
    menuData = JSON.parse(json);

    mealLog = await gistLoad('meal-log.json')
              || JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    render();
}
```

**On log change:**
```js
async function saveMealLog() {
    localStorage.setItem(LOG_KEY, JSON.stringify(mealLog));
    await gistSave('meal-log.json', mealLog);
}
```

---

## Part 6: First-Time Setup Flow

On any page, if no config is found in localStorage, show a setup modal:

```
┌─────────────────────────────────────┐
│  One-time Setup                      │
│                                      │
│  GitHub Gist ID:  [________________] │
│  GitHub Token:    [________________] │
│  Passphrase:      [________________] │
│                                      │
│  [Save & Continue]                   │
└─────────────────────────────────────┘
```

On submit:
- Store Gist ID + token in `localStorage['app-config']`
- Derive encryption key from passphrase, store key in sessionStorage
- Append token to current URL hash (for bookmark)
- Close modal, proceed with normal load

On subsequent visits:
- Config found in localStorage → skip modal
- Passphrase re-entered once per browser session (sessionStorage)

---

## Part 7: Update Service Worker

Edit `service-worker.js` — update the cached files list:

```js
// Remove:
'menu.json',

// Add:
'menu.enc',
'training.enc',
'gist.js',
'crypto.js',
```

Note: Gist data is **not** cached by service worker — it always fetches live, with localStorage as the offline fallback.

---

## Implementation Order

Work through these in sequence — each step is independently testable:

- [ ] **Step 1** — GitHub: create private Gist + generate PAT (Part 1)
- [ ] **Step 2** — Create `crypto.js` and test encrypt/decrypt in browser console
- [ ] **Step 3** — Encrypt `menu.json` → produce `menu.enc`, verify decryption works
- [ ] **Step 4** — Create `gist.js` with load/save/sync status indicator
- [ ] **Step 5** — Update `timeline.html` (simplest: one data key, clean functions)
- [ ] **Step 6** — Update `mobility.js`
- [ ] **Step 7** — Update `bucketlist.html` (merge two keys into one Gist file)
- [ ] **Step 8** — Update `menu.html` (decrypt + Gist log sync)
- [ ] **Step 9** — Add first-time setup modal (can be shared component in `gist.js`)
- [ ] **Step 10** — Update service worker cache list
- [ ] **Step 11** — Extract training plan data from `workout-finder.html` → `training.enc`
- [ ] **Step 12** — Delete `menu.json` from repo, verify everything still works

---

## Security Notes

- The encrypted `.enc` files in the repo are **safe to be public** — unreadable without the passphrase
- The GitHub token gives read+write access to your Gist only (not the repo) — if leaked, create a new one and revoke the old one
- The passphrase is never stored on disk or sent anywhere — only held in memory for the session
- AES-GCM is authenticated encryption — it detects tampering
- PBKDF2 with 100k iterations makes brute-forcing the passphrase slow

---

## What This Does NOT Cover

- `colour-palette.html` — no personal data, no changes needed
- `workout-finder.html` training plan extraction (Step 11) can be skipped if you don't mind the plan being public — it's reference data, not personal
- Real-time conflict resolution (last-write-wins is fine for solo use)

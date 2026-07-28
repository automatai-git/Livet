// Usage-based sorting for the app shell (Today "Most used" + Apps list).
// localStorage `app-usage-v1` = { [route]: { opens: number[] } } where each
// entry is an epoch-ms timestamp, capped at the last CAP opens. Sort score =
// opens in the trailing 30 days; ties fall back to the caller's canonical
// order. This key holds derived telemetry only — never cache data.

const KEY = 'app-usage-v1';
const CAP = 90;
export const USAGE_WINDOW_MS = 30 * 86400000;

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch { return {}; }
};

export const recordOpen = (route, now = Date.now()) => {
  const usage = read();
  const opens = usage[route]?.opens ?? [];
  usage[route] = { opens: [...opens, now].slice(-CAP) };
  localStorage.setItem(KEY, JSON.stringify(usage));
};

export const opensInWindow = (usage, route, now = Date.now()) =>
  (usage[route]?.opens ?? []).filter((t) => now - t <= USAGE_WINDOW_MS).length;

// Returns `apps` (array of { route, … }) sorted by trailing-30-day opens,
// most-used first; ties keep the given (canonical) order. Also annotates
// each entry with its `opens` count so callers can draw usage bars.
export const sortByUsage = (apps, now = Date.now()) => {
  const usage = read();
  return apps
    .map((app, i) => ({ app, opens: opensInWindow(usage, app.route, now), i }))
    .sort((a, b) => b.opens - a.opens || a.i - b.i)
    .map(({ app, opens }) => ({ ...app, opens }));
};

export const resetUsage = () => localStorage.removeItem(KEY);

import { VIEWING_THRESHOLD } from './property';

// property-seen-v1 — per-listing max seen score, kept in localStorage so the
// Today moment card can tell *new* threshold crossings from listings that
// have sat at ≥ 80 for a while. Each entry also remembers the local date the
// listing first crossed VIEWING_THRESHOLD; the moment card shows crossings
// dated today and nothing else, so the card disappears on its own the next
// day. The very first run (empty cache) only records a baseline — nothing
// "crosses" when the whole table is new to this device.

const KEY = 'property-seen-v1';

export const localDateKey = (d = new Date()) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const readSeen = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch { return {}; }
};

// Fold the latest listing scores into the cache. Returns the updated map.
export const recordSeenScores = (listings, now = new Date()) => {
  if (!Array.isArray(listings) || listings.length === 0) return readSeen();
  const seen = readSeen();
  const baseline = Object.keys(seen).length === 0;
  const day = localDateKey(now);
  for (const l of listings) {
    if (l?.finnkode == null || l.score == null) continue;
    const k = String(l.finnkode);
    const prev = seen[k];
    const crossedNow = l.score >= VIEWING_THRESHOLD && (prev?.max == null || prev.max < VIEWING_THRESHOLD);
    seen[k] = {
      max: prev?.max != null ? Math.max(prev.max, l.score) : l.score,
      crossed: crossedNow ? (baseline ? null : day) : prev?.crossed ?? null,
    };
  }
  try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* full/blocked storage: skip */ }
  return seen;
};

// The listings whose crossing is dated today — the Today moment card's feed.
// Hidden and gone listings never surface.
export const crossedToday = (listings, now = new Date()) => {
  const seen = recordSeenScores(listings, now);
  const day = localDateKey(now);
  return (listings || []).filter((l) =>
    l.active !== false
    && l.user_state !== 'hidden'
    && seen[String(l.finnkode)]?.crossed === day
  );
};

// Pure helpers for the Property Search listings (property_listings table).
// The row shape is fixed by the NAS collector — see HANDOVER-property-search.md
// and input/property-listings-schema.sql. The app only ever writes
// user_state / user_notes; everything else is read-only NAS data.

// jsonb columns arrive as real arrays via supabase-js, but cached rows may
// hold JSON strings — tolerate both (same spirit as meals.js).
export const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

// totalpris (incl. fellesgjeld/omkostninger) is the honest number when
// present; prisantydning is the fallback.
export const displayPrice = (listing) =>
  listing?.total_price ?? listing?.price ?? null;

const nokFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });

export const formatNok = (n) =>
  n == null ? '—' : `${nokFormat.format(n)} kr`;

// Compact card form: 4 650 000 → "4,65 mill.", 850 000 → "850 000 kr".
export const formatNokCompact = (n) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) {
    const mill = n / 1_000_000;
    const s = new Intl.NumberFormat('nb-NO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: mill < 10 ? 2 : 1,
    }).format(mill);
    return `${s} mill.`;
  }
  return formatNok(n);
};

// Last entry lower than first = price cut (strong negotiation signal).
// Returns { from, to, delta } with delta > 0, or null.
export const priceCut = (history) => {
  const entries = parseJsonArray(history).filter((e) => e && e.price != null);
  if (entries.length < 2) return null;
  const first = entries[0].price;
  const last = entries[entries.length - 1].price;
  if (last >= first) return null;
  return { from: first, to: last, delta: first - last };
};

export const daysOnMarket = (firstSeen, now = Date.now()) => {
  if (!firstSeen) return null;
  const t = new Date(firstSeen).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
};

// score >= 80 is the pipeline's "book a viewing" threshold.
export const VIEWING_THRESHOLD = 80;

// Default browse order: score desc, unevaluated (null score) after all
// scored rows sorted newest-first, ties broken by finnkode for stability.
export const sortListings = (listings) =>
  [...listings].sort((a, b) => {
    const as = a.score, bs = b.score;
    if (as != null && bs != null && bs !== as) return bs - as;
    if (as != null && bs == null) return -1;
    if (as == null && bs != null) return 1;
    if (as == null && bs == null) {
      const at = a.first_seen ? new Date(a.first_seen).getTime() : 0;
      const bt = b.first_seen ? new Date(b.first_seen).getTime() : 0;
      if (bt !== at) return bt - at;
    }
    return String(a.finnkode).localeCompare(String(b.finnkode));
  });

// The default browse set: on Finn, not hidden by the user, optionally one
// profile. Toggles re-admit hidden and gone listings.
export const filterListings = (listings, { profile = 'all', showHidden = false, showGone = false } = {}) =>
  listings.filter((l) => {
    if (profile !== 'all' && l.profile !== profile) return false;
    if (!showHidden && l.user_state === 'hidden') return false;
    if (!showGone && l.active === false) return false;
    return true;
  });

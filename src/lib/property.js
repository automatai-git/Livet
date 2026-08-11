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

// User-selectable list orders (v3.2 follow-up). 'score' is the default
// browse order (sortListings). The others reorder within each verdict
// group; rows missing the sort key go last.
export const SORT_MODES = [
  ['score', 'Score'],
  ['newest', 'Newest'],
  ['price-asc', 'Price ↑'],
  ['price-desc', 'Price ↓'],
  ['cut', 'Cut'],
];

const finnkodeTie = (a, b) => String(a.finnkode).localeCompare(String(b.finnkode));

export const sortListingsBy = (listings, mode = 'score') => {
  if (mode === 'score') return sortListings(listings);
  const arr = [...listings];
  const byKey = (key, dir) => (a, b) => {
    const av = key(a), bv = key(b);
    if (av == null && bv == null) return finnkodeTie(a, b);
    if (av == null) return 1;
    if (bv == null) return -1;
    return dir * (av - bv) || finnkodeTie(a, b);
  };
  switch (mode) {
    case 'newest':
      return arr.sort(byKey((l) => {
        const t = l.first_seen ? new Date(l.first_seen).getTime() : NaN;
        return Number.isNaN(t) ? null : t;
      }, -1));
    case 'price-asc':
      return arr.sort(byKey(displayPrice, 1));
    case 'price-desc':
      return arr.sort(byKey(displayPrice, -1));
    case 'cut':
      return arr.sort(byKey((l) => priceCut(l.price_history)?.delta ?? null, -1));
    default:
      return sortListings(arr);
  }
};

// Numeric refinements on top of the profile scope. null/undefined fields
// are inactive; a listing missing a filtered attribute is excluded (a max
// price filter should never surface a price-less row).
export const applyListingFilters = (listings, f = {}) =>
  listings.filter((l) => {
    if (f.maxPrice != null && !(displayPrice(l) != null && displayPrice(l) <= f.maxPrice)) return false;
    if (f.minBedrooms != null && !(l.bedrooms != null && l.bedrooms >= f.minBedrooms)) return false;
    if (f.minArea != null && !(l.area_m2 != null && l.area_m2 >= f.minArea)) return false;
    if (f.cutOnly && !priceCut(l.price_history)) return false;
    return true;
  });

export const activeFilterCount = (f = {}) =>
  [f.maxPrice != null, f.minBedrooms != null, f.minArea != null, Boolean(f.cutOnly)]
    .filter(Boolean).length;

// Browse groups by verdict (v3.2): "Book a viewing" (score ≥ 80, rich
// cards) · "Awaiting score" (unscored, newest first via sortListings'
// null-handling) · "The rest" (scored below threshold). Feed it an
// already-filtered list.
export const groupListings = (listings) => {
  const sorted = sortListings(listings);
  return {
    viewing: sorted.filter((l) => l.score != null && l.score >= VIEWING_THRESHOLD),
    awaiting: sorted.filter((l) => l.score == null),
    rest: sorted.filter((l) => l.score != null && l.score < VIEWING_THRESHOLD),
  };
};

// "ny i dag" — first_seen falls on today's local calendar date.
export const isNewToday = (firstSeen, now = new Date()) => {
  if (!firstSeen) return false;
  const d = new Date(firstSeen);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
};

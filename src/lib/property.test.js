import { describe, it, expect } from 'vitest';
import {
  parseJsonArray,
  displayPrice,
  formatNok,
  formatNokCompact,
  priceCut,
  daysOnMarket,
  sortListings,
  filterListings,
  groupListings,
  isNewToday,
  sortListingsBy,
  applyListingFilters,
  activeFilterCount,
} from './property';

// Intl 'nb-NO' group separator can be NBSP or narrow NBSP depending on ICU —
// normalise all space variants before asserting.
const plain = (s) => s.replace(/[\s\u00A0\u202F]/g, ' ');

describe('parseJsonArray', () => {
  it('passes real arrays through', () => {
    expect(parseJsonArray([1, 2])).toEqual([1, 2]);
  });
  it('parses JSON strings from stale caches', () => {
    expect(parseJsonArray('["a","b"]')).toEqual(['a', 'b']);
  });
  it('returns [] for null, garbage, and non-arrays', () => {
    expect(parseJsonArray(null)).toEqual([]);
    expect(parseJsonArray('not json')).toEqual([]);
    expect(parseJsonArray('{"a":1}')).toEqual([]);
  });
});

describe('displayPrice', () => {
  it('prefers total_price', () => {
    expect(displayPrice({ price: 100, total_price: 120 })).toBe(120);
  });
  it('falls back to price, then null', () => {
    expect(displayPrice({ price: 100, total_price: null })).toBe(100);
    expect(displayPrice({})).toBeNull();
  });
});

describe('formatNok / formatNokCompact', () => {
  it('formats grouped NOK', () => {
    expect(plain(formatNok(4650000))).toBe('4 650 000 kr');
    expect(formatNok(null)).toBe('—');
  });
  it('compacts millions, keeps smaller numbers full', () => {
    expect(plain(formatNokCompact(4650000))).toBe('4,65 mill.');
    expect(plain(formatNokCompact(12500000))).toBe('12,5 mill.');
    expect(plain(formatNokCompact(850000))).toBe('850 000 kr');
  });
});

describe('priceCut', () => {
  it('detects last-below-first as a cut with the delta', () => {
    const h = [
      { at: '2026-07-01', price: 5000000 },
      { at: '2026-07-20', price: 4800000 },
    ];
    expect(priceCut(h)).toEqual({ from: 5000000, to: 4800000, delta: 200000 });
  });
  it('ignores single-entry and non-decreasing histories', () => {
    expect(priceCut([{ at: 'x', price: 5 }])).toBeNull();
    expect(priceCut([{ price: 5 }, { price: 6 }])).toBeNull();
    expect(priceCut(null)).toBeNull();
  });
  it('accepts a JSON-string history from cache', () => {
    expect(priceCut('[{"price":10},{"price":8}]')).toEqual({ from: 10, to: 8, delta: 2 });
  });
});

describe('daysOnMarket', () => {
  const now = new Date('2026-08-06T12:00:00Z').getTime();
  it('counts whole days since first_seen', () => {
    expect(daysOnMarket('2026-08-01T12:00:00Z', now)).toBe(5);
    expect(daysOnMarket('2026-08-06T09:00:00Z', now)).toBe(0);
  });
  it('handles missing/invalid dates', () => {
    expect(daysOnMarket(null, now)).toBeNull();
    expect(daysOnMarket('garbage', now)).toBeNull();
  });
});

describe('sortListings', () => {
  it('orders score desc with nulls last (unevaluated newest-first)', () => {
    const rows = [
      { finnkode: 'a', score: null, first_seen: '2026-08-01' },
      { finnkode: 'b', score: 90 },
      { finnkode: 'c', score: null, first_seen: '2026-08-05' },
      { finnkode: 'd', score: 45 },
    ];
    expect(sortListings(rows).map((r) => r.finnkode)).toEqual(['b', 'd', 'c', 'a']);
  });
  it('does not mutate the input', () => {
    const rows = [{ finnkode: 'b', score: 1 }, { finnkode: 'a', score: 2 }];
    sortListings(rows);
    expect(rows[0].finnkode).toBe('b');
  });
});

describe('filterListings', () => {
  const rows = [
    { finnkode: '1', profile: 'bolig', active: true },
    { finnkode: '2', profile: 'fritid', active: true },
    { finnkode: '3', profile: 'bolig', active: false },
    { finnkode: '4', profile: 'bolig', active: true, user_state: 'hidden' },
  ];
  it('defaults to active, non-hidden, all profiles', () => {
    expect(filterListings(rows).map((r) => r.finnkode)).toEqual(['1', '2']);
  });
  it('filters by profile', () => {
    expect(filterListings(rows, { profile: 'fritid' }).map((r) => r.finnkode)).toEqual(['2']);
  });
  it('re-admits hidden and gone listings via toggles', () => {
    expect(filterListings(rows, { showHidden: true, showGone: true })).toHaveLength(4);
  });
});

describe('groupListings', () => {
  it('splits by verdict: ≥80 / unscored / the rest, each internally sorted', () => {
    const rows = [
      { finnkode: 'a', score: 45 },
      { finnkode: 'b', score: 92 },
      { finnkode: 'c', score: null, first_seen: '2026-08-01' },
      { finnkode: 'd', score: 80 },
      { finnkode: 'e', score: null, first_seen: '2026-08-05' },
      { finnkode: 'f', score: 79 },
    ];
    const g = groupListings(rows);
    expect(g.viewing.map((r) => r.finnkode)).toEqual(['b', 'd']);
    expect(g.awaiting.map((r) => r.finnkode)).toEqual(['e', 'c']);
    expect(g.rest.map((r) => r.finnkode)).toEqual(['f', 'a']);
  });
  it('returns empty groups for an empty list', () => {
    expect(groupListings([])).toEqual({ viewing: [], awaiting: [], rest: [] });
  });
});

describe('sortListingsBy', () => {
  const rows = [
    { finnkode: 'a', score: 60, total_price: 5_000_000, first_seen: '2026-08-01', price_history: [{ price: 5_200_000 }, { price: 5_000_000 }] },
    { finnkode: 'b', score: 90, total_price: 3_000_000, first_seen: '2026-08-05', price_history: [] },
    { finnkode: 'c', score: 70, price: 7_000_000, first_seen: null, price_history: [{ price: 7_800_000 }, { price: 7_000_000 }] },
  ];
  it("defaults to the score order ('score')", () => {
    expect(sortListingsBy(rows, 'score').map((r) => r.finnkode)).toEqual(['b', 'c', 'a']);
  });
  it('sorts newest-first with missing dates last', () => {
    expect(sortListingsBy(rows, 'newest').map((r) => r.finnkode)).toEqual(['b', 'a', 'c']);
  });
  it('sorts by price both ways (displayPrice, nulls last)', () => {
    expect(sortListingsBy(rows, 'price-asc').map((r) => r.finnkode)).toEqual(['b', 'a', 'c']);
    expect(sortListingsBy(rows, 'price-desc').map((r) => r.finnkode)).toEqual(['c', 'a', 'b']);
  });
  it('sorts by largest price cut with cut-less rows last', () => {
    expect(sortListingsBy(rows, 'cut').map((r) => r.finnkode)).toEqual(['c', 'a', 'b']);
  });
  it('does not mutate the input', () => {
    sortListingsBy(rows, 'price-asc');
    expect(rows[0].finnkode).toBe('a');
  });
});

describe('applyListingFilters / activeFilterCount', () => {
  const rows = [
    { finnkode: 'a', total_price: 5_000_000, bedrooms: 2, area_m2: 70, price_history: [{ price: 5_500_000 }, { price: 5_000_000 }] },
    { finnkode: 'b', total_price: 8_000_000, bedrooms: 4, area_m2: 150, price_history: [] },
    { finnkode: 'c', bedrooms: null, area_m2: null, price_history: [] },
  ];
  it('passes everything through with no active filters', () => {
    expect(applyListingFilters(rows)).toHaveLength(3);
    expect(activeFilterCount({})).toBe(0);
  });
  it('applies max price, excluding price-less rows', () => {
    expect(applyListingFilters(rows, { maxPrice: 6_000_000 }).map((r) => r.finnkode)).toEqual(['a']);
  });
  it('applies min bedrooms and min area, excluding unknowns', () => {
    expect(applyListingFilters(rows, { minBedrooms: 3 }).map((r) => r.finnkode)).toEqual(['b']);
    expect(applyListingFilters(rows, { minArea: 100 }).map((r) => r.finnkode)).toEqual(['b']);
  });
  it('cutOnly keeps only price-cut listings', () => {
    expect(applyListingFilters(rows, { cutOnly: true }).map((r) => r.finnkode)).toEqual(['a']);
  });
  it('counts active filters', () => {
    expect(activeFilterCount({ maxPrice: 1, cutOnly: true })).toBe(2);
    expect(activeFilterCount({ maxPrice: null, cutOnly: false })).toBe(0);
  });
});

describe('isNewToday', () => {
  const now = new Date('2026-08-11T15:00:00');
  it('matches the local calendar day', () => {
    expect(isNewToday('2026-08-11T02:00:00', now)).toBe(true);
    expect(isNewToday('2026-08-10T23:59:00', now)).toBe(false);
  });
  it('handles missing/invalid dates', () => {
    expect(isNewToday(null, now)).toBe(false);
    expect(isNewToday('garbage', now)).toBe(false);
  });
});

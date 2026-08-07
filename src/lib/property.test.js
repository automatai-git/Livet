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

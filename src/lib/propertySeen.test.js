import { describe, it, expect, beforeEach } from 'vitest';
import { recordSeenScores, crossedToday, localDateKey } from './propertySeen';

// Minimal localStorage stand-in so the lib is testable in a node environment.
const store = new Map();
globalThis.localStorage ??= {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const clear = () => localStorage.removeItem('property-seen-v1');

const DAY1 = new Date('2026-08-10T09:00:00');
const DAY2 = new Date('2026-08-11T09:00:00');

beforeEach(clear);

describe('localDateKey', () => {
  it('formats the local date', () => {
    expect(localDateKey(DAY2)).toBe('2026-08-11');
  });
});

describe('recordSeenScores / crossedToday', () => {
  it('treats the first run as a baseline — nothing crosses', () => {
    expect(crossedToday([{ finnkode: 'a', score: 90 }], DAY1)).toEqual([]);
  });

  it('flags a listing the day it first reaches 80', () => {
    recordSeenScores([{ finnkode: 'a', score: 60 }], DAY1);
    const rows = [{ finnkode: 'a', score: 85 }];
    expect(crossedToday(rows, DAY2).map((l) => l.finnkode)).toEqual(['a']);
    // …and the card is gone the next day.
    expect(crossedToday(rows, new Date('2026-08-12T09:00:00'))).toEqual([]);
  });

  it('does not re-flag a listing that was already at 80', () => {
    recordSeenScores([{ finnkode: 'a', score: 60 }], DAY1);
    recordSeenScores([{ finnkode: 'a', score: 85 }], DAY1);
    expect(crossedToday([{ finnkode: 'a', score: 92 }], DAY2)).toEqual([]);
  });

  it('never surfaces hidden or gone listings', () => {
    recordSeenScores([{ finnkode: 'a', score: 60 }, { finnkode: 'b', score: 50 }], DAY1);
    const rows = [
      { finnkode: 'a', score: 85, user_state: 'hidden' },
      { finnkode: 'b', score: 88, active: false },
    ];
    expect(crossedToday(rows, DAY2)).toEqual([]);
  });

  it('ignores unscored listings without breaking the baseline', () => {
    recordSeenScores([{ finnkode: 'a', score: 60 }], DAY1);
    recordSeenScores([{ finnkode: 'b', score: null }], DAY1);
    expect(crossedToday([{ finnkode: 'b', score: 90 }], DAY2).map((l) => l.finnkode)).toEqual(['b']);
  });
});

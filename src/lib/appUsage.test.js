import { describe, it, expect, beforeEach } from 'vitest';
import { recordOpen, sortByUsage, resetUsage, USAGE_WINDOW_MS } from './appUsage';

// Minimal localStorage stand-in so the lib is testable in a node environment.
const store = new Map();
globalThis.localStorage ??= {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const APPS = [{ route: '/a' }, { route: '/b' }, { route: '/c' }];
const NOW = 1_800_000_000_000;

beforeEach(() => resetUsage());

describe('sortByUsage', () => {
  it('keeps canonical order when nothing is recorded', () => {
    expect(sortByUsage(APPS, NOW).map((a) => a.route)).toEqual(['/a', '/b', '/c']);
  });

  it('sorts by trailing-30-day opens, most used first', () => {
    recordOpen('/c', NOW - 1000);
    recordOpen('/c', NOW - 2000);
    recordOpen('/b', NOW - 3000);
    expect(sortByUsage(APPS, NOW).map((a) => a.route)).toEqual(['/c', '/b', '/a']);
  });

  it('ignores opens older than the 30-day window', () => {
    recordOpen('/c', NOW - USAGE_WINDOW_MS - 1);
    recordOpen('/b', NOW - 1000);
    const sorted = sortByUsage(APPS, NOW);
    expect(sorted.map((a) => a.route)).toEqual(['/b', '/a', '/c']);
    expect(sorted[0].opens).toBe(1);
    expect(sorted[2].opens).toBe(0);
  });

  it('caps stored opens at the last 90', () => {
    for (let i = 0; i < 120; i++) recordOpen('/a', NOW - i);
    const [a] = sortByUsage([{ route: '/a' }], NOW);
    expect(a.opens).toBe(90);
  });
});

import { describe, it, expect } from 'vitest';
import {
  isoWeekParts,
  weekKey,
  weekStart,
  lastNWeekKeys,
  weekLabel,
  collectLeaves,
  rollUp,
  leafHitRates,
} from './lifeTree';
import { LIFE_TREE } from '../data/lifeTreeData';

describe('ISO week helpers', () => {
  it('computes classic ISO edge cases', () => {
    // 2005-01-01 (Sat) belongs to 2004-W53; 2007-12-31 (Mon) to 2008-W01.
    expect(weekKey('2005-01-01T12:00:00')).toBe('2004-W53');
    expect(weekKey('2007-12-31T12:00:00')).toBe('2008-W01');
    expect(isoWeekParts('2026-01-01T12:00:00')).toEqual({ year: 2026, week: 1 });
  });

  it('weekStart returns the Monday of the week', () => {
    const monday = weekStart(new Date(2026, 6, 30)); // Thursday 30 Jul 2026
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(27);
    // A Monday is its own week start.
    expect(weekStart(new Date(2026, 6, 27)).getDate()).toBe(27);
  });

  it('same key for every day of one week, different across weeks', () => {
    const sunday = new Date(2026, 6, 26);
    const monday = new Date(2026, 6, 27);
    const nextSunday = new Date(2026, 7, 2);
    expect(weekKey(monday)).toBe(weekKey(nextSunday));
    expect(weekKey(sunday)).not.toBe(weekKey(monday));
  });

  it('lastNWeekKeys is oldest-first, unique, ends at the current week', () => {
    const keys = lastNWeekKeys(new Date(2026, 0, 15), 6);
    expect(keys).toHaveLength(6);
    expect(new Set(keys).size).toBe(6);
    expect(keys[keys.length - 1]).toBe(weekKey(new Date(2026, 0, 15)));
    // 2026-01-15 is ISO week 3; six trailing weeks cross the year boundary.
    expect(keys[0]).toBe('2025-W50');
    expect(keys).toContain('2026-W01');
  });

  it('weekLabel is human readable', () => {
    expect(weekLabel('2026-W03')).toBe('Week 3, 2026');
  });
});

describe('tree roll-up', () => {
  const leaves = collectLeaves(LIFE_TREE);
  const allTicked = Object.fromEntries(leaves.map((l) => [l.id, true]));

  it('the tree has the expected leaves', () => {
    expect(leaves.map((l) => l.id)).toEqual([
      'training', 'nutrition', 'sleep',
      'learn', 'build',
      'stillness', 'peace', 'people', 'play', 'nature',
    ]);
  });

  it('empty week: nothing complete, totals correct', () => {
    const r = rollUp(LIFE_TREE, {});
    expect(r.life).toEqual({ done: 0, total: 10, complete: false });
    expect(r.health.total).toBe(3);
    expect(r.wealth.total).toBe(2);
    expect(r.happiness.total).toBe(5);
  });

  it('perfect week: everything complete', () => {
    const r = rollUp(LIFE_TREE, allTicked);
    expect(r.life).toEqual({ done: 10, total: 10, complete: true });
    expect(r.health.complete).toBe(true);
    expect(r.happiness.complete).toBe(true);
  });

  it('strict AND: a full pillar lights up while the root stays incomplete', () => {
    const r = rollUp(LIFE_TREE, { learn: true, build: true, sleep: true });
    expect(r.wealth).toEqual({ done: 2, total: 2, complete: true });
    expect(r.health).toEqual({ done: 1, total: 3, complete: false });
    expect(r.life).toEqual({ done: 3, total: 10, complete: false });
  });

  it('missing/false ticks count as unticked', () => {
    const r = rollUp(LIFE_TREE, { sleep: false, junk: true });
    expect(r.life.done).toBe(0);
  });
});

describe('leafHitRates', () => {
  it('ranks the most neglected leaf first', () => {
    const weeks = [
      { training: true, sleep: true },
      { training: true },
      { training: true, sleep: true, build: true },
    ];
    const rates = leafHitRates(LIFE_TREE, weeks);
    expect(rates[0].count).toBe(0);
    const byId = Object.fromEntries(rates.map((r) => [r.id, r]));
    expect(byId.training).toMatchObject({ count: 3, outOf: 3 });
    expect(byId.sleep).toMatchObject({ count: 2, outOf: 3 });
    expect(byId.build.count).toBe(1);
  });

  it('ignores untracked (null) weeks', () => {
    const rates = leafHitRates(LIFE_TREE, [null, { training: true }, undefined]);
    expect(rates.every((r) => r.outOf === 1)).toBe(true);
  });
});

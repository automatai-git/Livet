import { describe, it, expect } from 'vitest';
import {
  normalizeStaples,
  addStaple,
  removeStaple,
  toggleStaple,
  renameStaple,
  clearNeeded,
  neededNames,
} from './staples';

const list = () => normalizeStaples([
  { id: 'a', name: 'Toilet paper', need: true },
  { id: 'b', name: 'Salt', need: false },
]);

describe('normalizeStaples', () => {
  it('accepts a bare string list', () => {
    expect(normalizeStaples(['Soda', 'Oil']).map((s) => s.name)).toEqual(['Soda', 'Oil']);
    expect(normalizeStaples(['Soda'])[0].need).toBe(false);
  });

  it('drops blanks and case-insensitive duplicates', () => {
    const out = normalizeStaples(['Salt', ' salt ', '', null, { name: '  ' }]);
    expect(out.map((s) => s.name)).toEqual(['Salt']);
  });

  it('gives every entry an id', () => {
    expect(normalizeStaples(['Soda', 'Oil']).every((s) => Boolean(s.id))).toBe(true);
  });

  it('returns an empty list for junk input', () => {
    expect(normalizeStaples(null)).toEqual([]);
    expect(normalizeStaples('nope')).toEqual([]);
  });
});

describe('addStaple', () => {
  it('appends a trimmed name', () => {
    const out = addStaple(list(), '  Soda  ');
    expect(out).toHaveLength(3);
    expect(out[2].name).toBe('Soda');
    expect(out[2].need).toBe(false);
  });

  it('ignores a blank name', () => {
    expect(addStaple(list(), '   ')).toHaveLength(2);
  });

  it('ignores a name already on the list, whatever the casing', () => {
    expect(addStaple(list(), 'salt')).toHaveLength(2);
  });

  it('does not mutate the input list', () => {
    const before = list();
    addStaple(before, 'Soda');
    expect(before).toHaveLength(2);
  });
});

describe('removeStaple / toggleStaple / renameStaple', () => {
  it('removes by id', () => {
    expect(removeStaple(list(), 'a').map((s) => s.name)).toEqual(['Salt']);
  });

  it('flips only the targeted running-low flag', () => {
    const out = toggleStaple(list(), 'b');
    expect(out.find((s) => s.id === 'b').need).toBe(true);
    expect(out.find((s) => s.id === 'a').need).toBe(true);
  });

  it('renames by id and keeps the flag', () => {
    const out = renameStaple(list(), 'a', ' Kitchen roll ');
    expect(out[0]).toMatchObject({ name: 'Kitchen roll', need: true });
  });

  it('refuses to rename to blank', () => {
    expect(renameStaple(list(), 'a', '  ')[0].name).toBe('Toilet paper');
  });
});

describe('clearNeeded / neededNames', () => {
  it('collects the names flagged as running low', () => {
    expect(neededNames(list())).toEqual(['Toilet paper']);
  });

  it('clears every flag', () => {
    expect(clearNeeded(list()).some((s) => s.need)).toBe(false);
  });
});

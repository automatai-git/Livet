import { describe, it, expect } from 'vitest';
import {
  osloDateParts,
  addDays,
  isoDayOf,
  weekRangeOf,
  weekLabel,
  sessionsInRange,
  groupByDomain,
  blockWeekCount,
  blockWeekOf,
  buildBlockGrid,
  formatPace,
  formatKm,
  formatDuration,
  formatVolume,
  formatSleep,
  sessionMeta,
  sparkPath,
  wellnessSeries,
  seriesLatest,
} from './training';

describe('osloDateParts', () => {
  it('converts UTC to the Oslo calendar date across midnight (CEST +2)', () => {
    // 22:30 UTC on the 17th is 00:30 on the 18th in Oslo during summer time.
    expect(osloDateParts('2026-08-17T22:30:00Z')).toEqual({ date: '2026-08-18', isoDay: 2 });
  });

  it('handles winter time (CET +1)', () => {
    expect(osloDateParts('2026-01-05T23:30:00Z')).toEqual({ date: '2026-01-06', isoDay: 2 });
    expect(osloDateParts('2026-01-05T22:30:00Z')).toEqual({ date: '2026-01-05', isoDay: 1 });
  });

  it('returns null on garbage', () => {
    expect(osloDateParts('not a date')).toBeNull();
  });
});

describe('calendar helpers', () => {
  it('isoDayOf: Monday=1, Sunday=7', () => {
    expect(isoDayOf('2026-08-24')).toBe(1); // Block 5 start is a Monday
    expect(isoDayOf('2026-08-23')).toBe(7);
  });

  it('weekRangeOf spans Monday..Sunday around any weekday', () => {
    expect(weekRangeOf('2026-08-18')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
    expect(weekRangeOf('2026-08-17')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
    expect(weekRangeOf('2026-08-23')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
  });

  it('addDays crosses month ends', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('weekLabel renders dd.mm–dd.mm', () => {
    expect(weekLabel({ start: '2026-08-17', end: '2026-08-23' })).toBe('17.08–23.08');
  });
});

describe('sessionsInRange', () => {
  const range = { start: '2026-08-17', end: '2026-08-23' };
  it('uses the Oslo date, not the raw UTC date', () => {
    const rows = [
      { source_id: 'a', start_time: '2026-08-16T22:30:00Z' }, // Oslo: Mon 17th
      { source_id: 'b', start_time: '2026-08-23T22:30:00Z' }, // Oslo: Mon 24th
    ];
    expect(sessionsInRange(rows, range).map((r) => r.source_id)).toEqual(['a']);
  });
});

describe('groupByDomain', () => {
  it('groups in canonical order, sorts by time, folds unknown into other', () => {
    const rows = [
      { domain: 'strength', start_time: '2026-08-18T10:00:00Z' },
      { domain: 'run', start_time: '2026-08-19T06:00:00Z' },
      { domain: 'run', start_time: '2026-08-17T06:00:00Z' },
      { domain: 'weird', start_time: '2026-08-18T06:00:00Z' },
    ];
    const groups = groupByDomain(rows);
    expect(groups.map((g) => g.domain)).toEqual(['run', 'strength', 'other']);
    expect(groups[0].sessions.map((s) => s.start_time)).toEqual([
      '2026-08-17T06:00:00Z',
      '2026-08-19T06:00:00Z',
    ]);
    expect(groups[0].label).toBe('Løping');
  });
});

describe('block helpers', () => {
  const block5 = { block: 5, start_date: '2026-08-24', end_date: '2026-11-15' };

  it('blockWeekCount ceils the span (Block 5 = 12 weeks)', () => {
    expect(blockWeekCount(block5)).toBe(12);
    expect(blockWeekCount(null)).toBe(12); // fallback
  });

  it('blockWeekOf: 1-based, null outside the span', () => {
    expect(blockWeekOf('2026-08-24', block5)).toBe(1);
    expect(blockWeekOf('2026-08-30', block5)).toBe(1);
    expect(blockWeekOf('2026-08-31', block5)).toBe(2);
    expect(blockWeekOf('2026-08-23', block5)).toBeNull();
    expect(blockWeekOf('2027-01-01', block5)).toBeNull();
  });

  it('buildBlockGrid counts stamped sessions only, tracks longest run + mobility', () => {
    const rows = [
      { block: 5, week: 1, domain: 'run', distance_m: 12000 },
      { block: 5, week: 1, domain: 'run', distance_m: 15000 },
      { block: 5, week: 2, domain: 'mobility' },
      { block: 5, week: 2, domain: 'strength' },
      { block: null, week: null, domain: 'run', distance_m: 99000 }, // pre-block: ignored
      { block: 4, week: 1, domain: 'run', distance_m: 88000 },       // other block: ignored
    ];
    const grid = buildBlockGrid(rows, block5);
    expect(grid).toHaveLength(12);
    expect(grid[0].counts.run).toBe(2);
    expect(grid[0].longestRunM).toBe(15000);
    expect(grid[1].mobilityCount).toBe(1);
    expect(grid[1].counts.strength).toBe(1);
    expect(grid[2].counts.run).toBe(0);
    expect(grid[2].longestRunM).toBeNull();
  });
});

describe('formatters', () => {
  it('formatPace renders mm:ss/km and rejects nonsense', () => {
    expect(formatPace(312)).toBe('5:12/km');
    expect(formatPace(null)).toBeNull();
    expect(formatPace(0)).toBeNull();
  });

  it('formatKm scales precision', () => {
    expect(formatKm(12345)).toBe('12.3 km');
    expect(formatKm(5250)).toBe('5.25 km');
    expect(formatKm(null)).toBeNull();
  });

  it('formatDuration', () => {
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(3900)).toBe('1 t 5 min');
    expect(formatDuration(null)).toBeNull();
  });

  it('formatVolume rounds to whole kg', () => {
    expect(formatVolume(4321.6)).toMatch(/^4\s322 kg$/); // nb-NO group separator is a space
  });

  it('formatSleep renders hours with one decimal', () => {
    expect(formatSleep(7 * 3600 + 30 * 60)).toBe('7.5 t');
  });

  it('sessionMeta: intervals-style row shows km/pace/HR, no duration', () => {
    const meta = sessionMeta({ distance_m: 10000, pace_s_per_km: 330, avg_hr: 152, moving_time_s: 3300 });
    expect(meta).toBe('10.0 km · 5:30/km · 152 bpm');
  });

  it('sessionMeta: hevy-style row shows volume + RPE', () => {
    expect(sessionMeta({ volume_kg: 5200, avg_rpe: 7.5 })).toMatch(/kg · RPE 7\.5$/);
  });

  it('sessionMeta: skeletal row (all null metrics) falls back to duration or empty', () => {
    expect(sessionMeta({})).toBe('');
    expect(sessionMeta({ moving_time_s: 1800 })).toBe('30 min');
  });
});

describe('sparklines', () => {
  it('sparkPath skips nulls and needs ≥2 points', () => {
    expect(sparkPath([null, 1, null, 3], 100, 30)).toMatch(/^M.+L.+$/);
    expect(sparkPath([null, 1, null], 100, 30)).toBe('');
    expect(sparkPath([], 100, 30)).toBe('');
  });

  it('sparkPath handles a flat series without dividing by zero', () => {
    expect(sparkPath([5, 5, 5], 100, 30)).not.toContain('NaN');
  });

  it('wellnessSeries aligns rows onto trailing calendar days', () => {
    const rows = [
      { date: '2026-08-17', hrv: 80 },
      { date: '2026-08-18', hrv: 85 },
    ];
    const series = wellnessSeries(rows, 'hrv', '2026-08-18', 3);
    expect(series).toEqual([null, 80, 85]);
  });

  it('seriesLatest returns the last non-null value', () => {
    expect(seriesLatest([1, 2, null])).toBe(2);
    expect(seriesLatest([null, null])).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  scoreBand, barrierRank, barrierLabel, daysUntil, isPast, urgencyLabel,
  horizonOf, formatEventDate, mondayOf, latestSentWeek, isNewThisWeek,
  sortEvents, filterEvents, groupByHorizon, filterArenas, needsAttendance,
  buildEventIcs, icsFilename, localDateKey, lastSynced,
} from './events';

const NOW = new Date(2026, 8, 2, 14, 30); // Wed 2 Sep 2026, local

const ev = (over = {}) => ({
  id: 'x', track: 'business', name: 'X', event_date: '2026-09-10',
  end_date: null, achiever_score: null, user_state: null, business_goals: [],
  ...over,
});

describe('scoreBand / barrier', () => {
  it('bands per the handover thresholds', () => {
    expect(scoreBand(null)).toBeNull();
    expect(scoreBand(70)).toBe('lead');
    expect(scoreBand(69)).toBe('solid');
    expect(scoreBand(50)).toBe('solid');
    expect(scoreBand(49)).toBe('marginal');
  });
  it('ranks friction upwards', () => {
    expect(barrierRank('free')).toBeLessThan(barrierRank('paid'));
    expect(barrierRank('invite')).toBeGreaterThan(barrierRank('application'));
    expect(barrierRank('member')).toBe(4);
    expect(barrierRank('weird')).toBe(-1);
    expect(barrierLabel('member')).toBe('Members');
    expect(barrierLabel(null)).toBeNull();
  });
});

describe('dates', () => {
  it('counts whole local days and ignores clock time', () => {
    expect(daysUntil(ev({ event_date: '2026-09-02' }), NOW)).toBe(0);
    expect(daysUntil(ev({ event_date: '2026-09-03' }), NOW)).toBe(1);
    expect(daysUntil(ev({ event_date: '2026-08-30' }), NOW)).toBe(-3);
    expect(daysUntil(ev({ event_date: null }), NOW)).toBeNull();
  });
  it('treats a multi-day event as upcoming until its end date', () => {
    const e = ev({ event_date: '2026-08-31', end_date: '2026-09-04' });
    expect(isPast(e, NOW)).toBe(false);
    expect(urgencyLabel(e, NOW)).toBe('ongoing');
    expect(isPast(ev({ event_date: '2026-09-01' }), NOW)).toBe(true);
  });
  it('derives urgency and horizon at render time', () => {
    expect(urgencyLabel(ev({ event_date: '2026-09-02' }), NOW)).toBe('today');
    expect(urgencyLabel(ev({ event_date: '2026-09-03' }), NOW)).toBe('tomorrow');
    expect(urgencyLabel(ev({ event_date: '2026-09-10' }), NOW)).toBe('in 8 days');
    expect(urgencyLabel(ev({ event_date: '2026-10-02' }), NOW)).toBe('in 4 weeks');
    expect(urgencyLabel(ev({ event_date: '2027-01-15' }), NOW)).toBe('in 5 months');
    expect(horizonOf(ev({ event_date: '2026-09-15' }), NOW)).toBe('next_2w');
    expect(horizonOf(ev({ event_date: '2026-09-16' }), NOW)).toBe('next_2m');
    expect(horizonOf(ev({ event_date: '2026-12-01' }), NOW)).toBe('later');
    expect(horizonOf(ev({ event_date: null }), NOW)).toBe('later');
  });
  it('formats single and ranged dates', () => {
    expect(formatEventDate(ev({ event_date: '2026-09-10' }))).toBe('Thu 10 Sept');
    expect(formatEventDate(ev({ event_date: '2026-09-10', end_date: '2026-09-12' }))).toBe('Thu 10 Sept – 12 Sept');
    expect(formatEventDate(ev({ event_date: null }))).toBe('Date TBA');
  });
  it('finds the ISO-week Monday', () => {
    expect(mondayOf(NOW)).toBe('2026-08-31');
    expect(mondayOf(new Date(2026, 7, 31))).toBe('2026-08-31');
    expect(mondayOf(new Date(2026, 8, 6))).toBe('2026-08-31');
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('new this week', () => {
  it('keys on the latest sent_week in the data, not the calendar', () => {
    const rows = [ev({ sent_week: '2026-08-24' }), ev({ sent_week: '2026-08-17' })];
    const latest = latestSentWeek(rows);
    expect(latest).toBe('2026-08-24');
    expect(isNewThisWeek(rows[0], latest)).toBe(true);
    expect(isNewThisWeek(rows[1], latest)).toBe(false);
    expect(latestSentWeek([])).toBeNull();
  });
  it('max synced_at across lists', () => {
    const t = lastSynced([{ synced_at: '2026-08-31T10:00:00Z' }], [{ synced_at: '2026-08-24T10:00:00Z' }]);
    expect(new Date(t).toISOString()).toBe('2026-08-31T10:00:00.000Z');
    expect(lastSynced([], [])).toBe(0);
  });
});

describe('sortEvents', () => {
  const a = ev({ id: 'a', event_date: '2026-09-20', achiever_score: 80 });
  const b = ev({ id: 'b', event_date: '2026-09-05', achiever_score: null });
  const c = ev({ id: 'c', event_date: '2026-09-12', achiever_score: 55 });
  it('date asc by default', () => {
    expect(sortEvents([a, b, c]).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('score desc, nulls last, date as tie-break', () => {
    const d = ev({ id: 'd', event_date: '2026-09-01', achiever_score: 80 });
    expect(sortEvents([a, b, c, d], 'score').map((e) => e.id)).toEqual(['d', 'a', 'c', 'b']);
  });
  it('does not mutate', () => {
    const list = [a, b];
    sortEvents(list);
    expect(list[0].id).toBe('a');
  });
});

describe('filterEvents', () => {
  const rows = [
    ev({ id: 'up', track: 'business', business_goals: ['capital'] }),
    ev({ id: 'hid', track: 'business', user_state: 'hidden' }),
    ev({ id: 'past', track: 'business', event_date: '2026-08-01', user_state: 'attended' }),
    ev({ id: 'soc', track: 'social' }),
    ev({ id: 'str', track: 'business', business_goals: '["customers","frontier"]' }),
  ];
  it('defaults to one track, upcoming, not hidden', () => {
    expect(filterEvents(rows, { track: 'business', now: NOW }).map((e) => e.id)).toEqual(['up', 'str']);
  });
  it('showHidden / showPast flip to those sets', () => {
    expect(filterEvents(rows, { track: 'business', showHidden: true, now: NOW }).map((e) => e.id)).toEqual(['hid']);
    expect(filterEvents(rows, { track: 'business', showPast: true, now: NOW }).map((e) => e.id)).toEqual(['past']);
  });
  it('goal chips OR across chosen goals and tolerate JSON-string jsonb', () => {
    expect(filterEvents(rows, { track: 'business', goals: ['frontier'], now: NOW }).map((e) => e.id)).toEqual(['str']);
    expect(filterEvents(rows, { track: 'business', goals: ['capital', 'customers'], now: NOW }).map((e) => e.id)).toEqual(['up', 'str']);
  });
  it('groups by horizon', () => {
    const g = groupByHorizon([
      ev({ id: '1', event_date: '2026-09-05' }),
      ev({ id: '2', event_date: '2026-10-05' }),
      ev({ id: '3', event_date: '2027-03-05' }),
    ], NOW);
    expect(g.next_2w.map((e) => e.id)).toEqual(['1']);
    expect(g.next_2m.map((e) => e.id)).toEqual(['2']);
    expect(g.later.map((e) => e.id)).toEqual(['3']);
  });
});

describe('arenas + attendance', () => {
  it('filters by track, drops hidden, best score first', () => {
    const arenas = [
      { id: 'a', track: 'social', achiever_score: 60 },
      { id: 'b', track: 'social', achiever_score: 75 },
      { id: 'c', track: 'social', achiever_score: null },
      { id: 'd', track: 'social', achiever_score: 90, user_state: 'hidden' },
      { id: 'e', track: 'business', achiever_score: 90 },
    ];
    expect(filterArenas(arenas, { track: 'social' }).map((a) => a.id)).toEqual(['b', 'a', 'c']);
    expect(filterArenas(arenas, { track: 'social', showHidden: true }).map((a) => a.id)).toEqual(['d']);
  });
  it('prompts for going events whose date passed', () => {
    const rows = [
      ev({ id: 'g', event_date: '2026-08-30', user_state: 'going' }),
      ev({ id: 'f', event_date: '2026-09-30', user_state: 'going' }),
      ev({ id: 'i', event_date: '2026-08-30', user_state: 'interested' }),
    ];
    expect(needsAttendance(rows, NOW).map((e) => e.id)).toEqual(['g']);
  });
});

describe('buildEventIcs', () => {
  it('writes an all-day VEVENT with exclusive DTEND', () => {
    const ics = buildEventIcs(ev({
      id: 'oslo-founder-dinner', name: 'Founder dinner, Oslo',
      event_date: '2026-09-10', venue: 'Grand Hotel', city: 'Oslo',
      description: 'Curated 30-person dinner', why: 'Three founders worth knowing',
      url: 'https://example.com/e',
    }), NOW);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260910');
    expect(ics).toContain('DTEND;VALUE=DATE:20260911');
    expect(ics).toContain('SUMMARY:Founder dinner\\, Oslo');
    expect(ics).toContain('LOCATION:Grand Hotel\\, Oslo');
    expect(ics).toContain('UID:oslo-founder-dinner@livet');
    expect(ics).toContain('URL:https://example.com/e');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('spans multi-day events to the day after end_date', () => {
    const ics = buildEventIcs(ev({ event_date: '2026-09-10', end_date: '2026-09-12' }), NOW);
    expect(ics).toContain('DTEND;VALUE=DATE:20260913');
  });
  it('folds long lines and returns null without a date', () => {
    const ics = buildEventIcs(ev({ description: 'x'.repeat(200) }), NOW);
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    expect(buildEventIcs(ev({ event_date: null }), NOW)).toBeNull();
    expect(icsFilename({ id: 'a/b c' })).toBe('a-b-c.ics');
  });
});

import { describe, it, expect } from 'vitest';
import protocol from '../data/rehabProtocol.json';
import {
  SIGNAL_IDS,
  addDays,
  dayKeyLocal,
  gate2AExit,
  isometricCleanStreak,
  regressionFlag,
  gate2BExit,
  escalationActive,
  derivePhaseStatuses,
  evaluateProtocol,
  protocolAppliesToBlock,
  findBlockedMatches,
  testsOnDate,
  complianceByDay,
} from './rehab';

// Timestamps are written without a Z suffix so they parse as local time and
// day-bucketing in tests is timezone-independent.
const log = (signal_id, value, day, time = '18:00:00', extra = {}) => ({
  signal_id,
  value,
  logged_at: `${day}T${time}`,
  ...extra,
});
const iso = (value, day, time) => log(SIGNAL_IDS.ISOMETRIC, value, day, time);
const cross = (value, day) => log(SIGNAL_IDS.CROSSBODY, value, day);

const TODAY = '2026-06-18';

describe('dayKeyLocal / addDays', () => {
  it('buckets timestamps into local calendar days', () => {
    expect(dayKeyLocal('2026-06-18T18:00:00')).toBe('2026-06-18');
  });
  it('crosses month boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
  });
});

describe('gate2AExit — isometric <= 1 for 3 consecutive days', () => {
  it('is false with no logs', () => {
    expect(gate2AExit([], TODAY)).toBe(false);
  });

  it('passes when the last 3 calendar days each have a clean entry', () => {
    const logs = [iso(1, '2026-06-16'), iso(0, '2026-06-17'), iso(1, '2026-06-18')];
    expect(gate2AExit(logs, TODAY)).toBe(true);
  });

  it('fails with only 2 consecutive clean days', () => {
    const logs = [iso(0, '2026-06-17'), iso(0, '2026-06-18')];
    expect(gate2AExit(logs, TODAY)).toBe(false);
  });

  it('fails when a day in the run is missing', () => {
    const logs = [iso(0, '2026-06-15'), iso(0, '2026-06-17'), iso(0, '2026-06-18')];
    expect(gate2AExit(logs, TODAY)).toBe(false);
  });

  it('a day with any entry > 1 is not clean, even if another entry that day is clean', () => {
    const logs = [
      iso(0, '2026-06-16'), iso(0, '2026-06-17'),
      iso(0, '2026-06-18', '09:00:00'), iso(2, '2026-06-18', '19:00:00'),
    ];
    expect(gate2AExit(logs, TODAY)).toBe(false);
  });

  it('stays passed once a 3-day run exists, even after isometrics leave the program', () => {
    const logs = [iso(1, '2026-06-14'), iso(0, '2026-06-15'), iso(1, '2026-06-16')];
    expect(gate2AExit(logs, '2026-06-25')).toBe(true);
  });

  it('ignores runs ending after the evaluation day', () => {
    const logs = [iso(0, '2026-06-16'), iso(0, '2026-06-17'), iso(0, '2026-06-18')];
    expect(gate2AExit(logs, '2026-06-17')).toBe(false);
  });
});

describe('isometricCleanStreak — n/3 counter', () => {
  it('counts a streak ending today', () => {
    const logs = [iso(0, '2026-06-17'), iso(1, '2026-06-18')];
    expect(isometricCleanStreak(logs, TODAY)).toBe(2);
  });
  it('keeps the streak alive when today has no entry yet', () => {
    const logs = [iso(0, '2026-06-16'), iso(0, '2026-06-17')];
    expect(isometricCleanStreak(logs, TODAY)).toBe(2);
  });
  it('resets to 0 on a dirty day', () => {
    const logs = [iso(0, '2026-06-16'), iso(0, '2026-06-17'), iso(2, '2026-06-18')];
    expect(isometricCleanStreak(logs, TODAY)).toBe(0);
  });
  it('is 0 when nothing was logged today or yesterday', () => {
    const logs = [iso(0, '2026-06-14'), iso(0, '2026-06-15')];
    expect(isometricCleanStreak(logs, TODAY)).toBe(0);
  });
});

describe('regressionFlag — >=2 three consecutive sessions OR any >=4', () => {
  it('fires on three consecutive sessions >= 2', () => {
    const logs = [iso(2, '2026-06-15'), iso(2, '2026-06-16'), iso(3, '2026-06-17')];
    expect(regressionFlag(logs)).toEqual({ fired: true, reason: 'three-consecutive' });
  });

  it('does not fire when a clean session breaks the run', () => {
    const logs = [iso(2, '2026-06-15'), iso(1, '2026-06-16'), iso(2, '2026-06-17'), iso(2, '2026-06-18')];
    expect(regressionFlag(logs).fired).toBe(false);
  });

  it('counts sessions, not days — two >=2 entries in one day contribute two sessions', () => {
    const logs = [iso(2, '2026-06-17', '09:00:00'), iso(2, '2026-06-17', '19:00:00'), iso(2, '2026-06-18')];
    expect(regressionFlag(logs).fired).toBe(true);
  });

  it('fires immediately on any single session >= 4', () => {
    expect(regressionFlag([iso(4, '2026-06-18')])).toEqual({ fired: true, reason: 'spike' });
  });

  it('an acknowledgment timestamp scopes the rule to later entries', () => {
    const logs = [iso(4, '2026-06-15')];
    expect(regressionFlag(logs, '2026-06-15T20:00:00').fired).toBe(false);
  });

  it('re-fires on new bad data after an acknowledgment', () => {
    const logs = [iso(4, '2026-06-14'), iso(2, '2026-06-16'), iso(2, '2026-06-17'), iso(2, '2026-06-18')];
    expect(regressionFlag(logs, '2026-06-15T08:00:00')).toEqual({ fired: true, reason: 'three-consecutive' });
  });
});

describe('gate2BExit — cross-body <= 1 at scheduled retest', () => {
  const RETEST = '2026-06-26';

  it('passes when the retest-day entry is <= 1', () => {
    expect(gate2BExit([cross(1, '2026-06-26')], RETEST)).toBe(true);
  });

  it('ignores clean entries logged before the retest day', () => {
    expect(gate2BExit([cross(0, '2026-06-20')], RETEST)).toBe(false);
  });

  it('uses the most recent on/after-retest entry', () => {
    expect(gate2BExit([cross(1, '2026-06-26'), cross(3, '2026-06-28')], RETEST)).toBe(false);
    expect(gate2BExit([cross(3, '2026-06-26'), cross(1, '2026-07-02')], RETEST)).toBe(true);
  });
});

describe('escalationActive', () => {
  it('fires on any checked trigger', () => {
    expect(escalationActive({ checkedTriggers: ['sharp sudden pain escalation'] })).toBe(true);
  });
  it('fires on the regression flag', () => {
    expect(escalationActive({ checkedTriggers: [], regressionFired: true })).toBe(true);
  });
  it('is quiet otherwise', () => {
    expect(escalationActive({ checkedTriggers: [], regressionFired: false })).toBe(false);
  });
});

describe('derivePhaseStatuses — ladder walk', () => {
  it('nominal state: 1 passed, 2A active, rest locked', () => {
    const s = derivePhaseStatuses(protocol, { gate2A: false, gate2B: false, escalation: false });
    expect(s).toEqual({ '1': 'passed', '2A': 'active', '2B': 'locked', '3': 'locked', '4': 'locked' });
  });

  it('2A gate met: 2A passed, 2B active', () => {
    const s = derivePhaseStatuses(protocol, { gate2A: true, gate2B: false, escalation: false });
    expect(s['2A']).toBe('passed');
    expect(s['2B']).toBe('active');
    expect(s['3']).toBe('locked');
  });

  it('both gates met: 3 active, 4 still locked (no computable exit for 3)', () => {
    const s = derivePhaseStatuses(protocol, { gate2A: true, gate2B: true, escalation: false });
    expect(s['2B']).toBe('passed');
    expect(s['3']).toBe('active');
    expect(s['4']).toBe('locked');
  });

  it('a clean retest while 2A is unmet does not unlock phase 3', () => {
    const s = derivePhaseStatuses(protocol, { gate2A: false, gate2B: true, escalation: false });
    expect(s['2A']).toBe('active');
    expect(s['2B']).toBe('locked');
    expect(s['3']).toBe('locked');
  });

  it('escalation holds every phase that is not already passed', () => {
    const s = derivePhaseStatuses(protocol, { gate2A: true, gate2B: false, escalation: true });
    expect(s['1']).toBe('passed');
    expect(s['2A']).toBe('held');
    expect(s['2B']).toBe('held');
    expect(s['3']).toBe('held');
    expect(s['4']).toBe('held');
  });
});

describe('evaluateProtocol — end-to-end', () => {
  it('with no logs: 2A active, streak 0', () => {
    const r = evaluateProtocol(protocol, [], { todayKey: TODAY });
    expect(r.activePhase.id).toBe('2A');
    expect(r.streak).toBe(0);
    expect(r.escalation).toBe(false);
  });

  it('3 clean days move the athlete to 2B', () => {
    const logs = [iso(0, '2026-06-16'), iso(1, '2026-06-17'), iso(0, '2026-06-18')];
    const r = evaluateProtocol(protocol, logs, { todayKey: TODAY });
    expect(r.statuses['2A']).toBe('passed');
    expect(r.activePhase.id).toBe('2B');
  });

  it('a 4/10 session fires regression and holds the ladder', () => {
    const logs = [iso(4, '2026-06-17')];
    const r = evaluateProtocol(protocol, logs, { todayKey: TODAY });
    expect(r.regression.fired).toBe(true);
    expect(r.escalation).toBe(true);
    expect(r.activePhase).toBeNull();
    expect(r.statuses['2A']).toBe('held');
  });

  it('checked escalation triggers hold the ladder without bad logs', () => {
    const r = evaluateProtocol(protocol, [], {
      todayKey: TODAY,
      checkedTriggers: ['visible swelling, bruising, asymmetry'],
    });
    expect(r.escalation).toBe(true);
    expect(r.statuses['2B']).toBe('held');
  });

  it('reads the 2B retest date from the protocol', () => {
    const r = evaluateProtocol(protocol, [], { todayKey: TODAY });
    expect(r.gates.retestKey).toBe('2026-06-26');
  });
});

describe('protocolAppliesToBlock', () => {
  it('matches block-4', () => {
    expect(protocolAppliesToBlock(protocol, { id: 'block-4' })).toBe(true);
  });
  it('rejects other blocks', () => {
    expect(protocolAppliesToBlock(protocol, { id: 'block-5' })).toBe(false);
  });
});

describe('findBlockedMatches — programmed text vs blocked list', () => {
  const names = (text) => findBlockedMatches(text, protocol).map((m) => m.blocked);

  it('flags OH press wording and carries its substitution', () => {
    const m = findBlockedMatches('No heavy OH press during shoulder flares; submaximal DB pressing.', protocol);
    expect(m.map((x) => x.blocked)).toContain('overhead press');
    expect(m.find((x) => x.blocked === 'overhead press').substitution).toBe('landmine press (Phase 4)');
  });

  it('flags any bench variation', () => {
    const m = findBlockedMatches('Flat barbell bench, paused', protocol);
    expect(m[0].blocked).toBe('bench press (all variations)');
    expect(m[0].substitution).toBe('floor press neutral-grip DB (Phase 2B+)');
  });

  it('flags floor push-ups but not wall push-ups', () => {
    expect(names('Floor push-up test')).toContain('floor push-up');
    expect(names('Push-up retest, wall height ONLY (chest-high)')).toHaveLength(0);
  });

  it('flags pull-ups and dips, with the pulldown substitution', () => {
    const m = findBlockedMatches('Bodyweight pull-ups and dips', protocol);
    expect(m.map((x) => x.blocked)).toEqual(
      expect.arrayContaining(['bodyweight pull-up', 'dip'])
    );
    expect(m.find((x) => x.blocked === 'bodyweight pull-up').substitution).toBe('underhand lat pulldown, RPE 7 cap');
  });

  it('does not flag the allowed pulldown / rows / curls', () => {
    expect(names('Underhand lat pulldown, RPE 7 cap')).toHaveLength(0);
    expect(names('Cable rows, full intent')).toHaveLength(0);
    expect(names('Curls at neutral angle')).toHaveLength(0);
  });

  it('flags flyes, shrugs, carries, incline curls and front raises', () => {
    expect(names('Deep DB flyes')).toContain('deep DB flye / end-range anterior stretch');
    expect(names('Loaded shrugs')).toContain('heavy carries / loaded shrug patterns (neck rule)');
    expect(names("Farmer's carries")).toContain('heavy carries / loaded shrug patterns (neck rule)');
    expect(names('Incline curl')).toContain('incline curl');
    expect(names('Front raise 3x12')).toContain('front raise');
  });

  it('does not let the dip pattern match inside words', () => {
    expect(names('Adipose tissue notes')).toHaveLength(0);
  });
});

describe('testsOnDate', () => {
  it('finds the June 26 retest and checkpoint', () => {
    const t = testsOnDate(protocol, '2026-06-26');
    expect(t.some((x) => x.kind === 'retest')).toBe(true);
    expect(t.some((x) => x.kind === 'checkpoint')).toBe(true);
  });
  it('finds the June 19 checkpoint only', () => {
    const t = testsOnDate(protocol, '2026-06-19');
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe('checkpoint');
  });
  it('is empty on ordinary days', () => {
    expect(testsOnDate(protocol, '2026-06-18')).toHaveLength(0);
  });
});

describe('complianceByDay', () => {
  it('latest row wins per (day, item)', () => {
    const rows = [
      { item: 'Biceps isometric', completed: true, logged_at: '2026-06-18T09:00:00' },
      { item: 'Biceps isometric', completed: false, logged_at: '2026-06-18T10:00:00' },
      { item: 'Doorway pec stretch', completed: true, logged_at: '2026-06-18T09:30:00' },
    ];
    const m = complianceByDay(rows);
    expect(m.get('2026-06-18').get('Biceps isometric')).toBe(false);
    expect(m.get('2026-06-18').get('Doorway pec stretch')).toBe(true);
  });
});

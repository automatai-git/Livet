import { describe, it, expect } from 'vitest';
import { sourceDayForDayType, planDayLabel } from './mobility';

// The plan→routine mapping keys MOBILITY_DATA's weekday-coded content off
// the block plan's day types (weekly_template + phase overrides).
describe('sourceDayForDayType', () => {
  it('maps strength days: upper focus → friday routines, else monday', () => {
    expect(sourceDayForDayType({ kind: 'strength', focus: 'Upper — push' })).toBe('friday');
    expect(sourceDayForDayType({ kind: 'strength', focus: 'Lower' })).toBe('monday');
    expect(sourceDayForDayType({ kind: 'strength' })).toBe('monday');
  });

  it('maps run days: long → sunday routines, else tuesday', () => {
    expect(sourceDayForDayType({ kind: 'run', quality: 'long' })).toBe('sunday');
    expect(sourceDayForDayType({ kind: 'run', quality: 'tempo' })).toBe('tuesday');
  });

  it('maps mobility, sport and flex days', () => {
    expect(sourceDayForDayType({ kind: 'mobility', session_id: 'x' })).toBe('wednesday');
    expect(sourceDayForDayType({ kind: 'sport', activity: 'padel' })).toBe('saturday');
    expect(sourceDayForDayType({ kind: 'flex', options: [] })).toBe('saturday');
  });

  it('rest and unknown days schedule nothing', () => {
    expect(sourceDayForDayType({ kind: 'rest' })).toBeNull();
    expect(sourceDayForDayType(null)).toBeNull();
  });
});

describe('planDayLabel', () => {
  it('labels each kind, trimming strength focus at the em-dash', () => {
    expect(planDayLabel({ kind: 'strength', focus: 'Upper — push emphasis' })).toBe('Strength · Upper');
    expect(planDayLabel({ kind: 'run', quality: 'long' })).toBe('Run · Long');
    expect(planDayLabel({ kind: 'sport', activity: 'padel' })).toBe('Sport · Padel');
    expect(planDayLabel({ kind: 'mobility' })).toBe('Mobility');
    expect(planDayLabel({ kind: 'flex', options: [] })).toBe('Flex');
    expect(planDayLabel({ kind: 'rest' })).toBe('Rest');
    expect(planDayLabel(null)).toBe('Rest');
  });
});

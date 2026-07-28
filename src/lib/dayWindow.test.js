import { describe, it, expect } from 'vitest';
import { parseHM, windowFraction, hourLabels, DEFAULT_WINDOW } from './dayWindow';

describe('parseHM', () => {
  it('parses HH:MM to minutes', () => {
    expect(parseHM('05:00')).toBe(300);
    expect(parseHM('21:00')).toBe(1260);
    expect(parseHM('09:30')).toBe(570);
  });

  it('rejects malformed input', () => {
    expect(parseHM('24:00')).toBeNull();
    expect(parseHM('5')).toBeNull();
    expect(parseHM('')).toBeNull();
    expect(parseHM(undefined)).toBeNull();
  });
});

describe('windowFraction', () => {
  it('maps the window linearly', () => {
    expect(windowFraction(300, DEFAULT_WINDOW)).toBe(0);
    expect(windowFraction(1260, DEFAULT_WINDOW)).toBe(1);
    expect(windowFraction(780, DEFAULT_WINDOW)).toBe(0.5);
  });

  it('clamps items outside the window to the ends', () => {
    expect(windowFraction(0, DEFAULT_WINDOW)).toBe(0);
    expect(windowFraction(1439, DEFAULT_WINDOW)).toBe(1);
  });
});

describe('hourLabels', () => {
  it('yields five quarter labels for the default window', () => {
    expect(hourLabels(DEFAULT_WINDOW)).toEqual(['05', '09', '13', '17', '21']);
  });

  it('adapts to a custom window', () => {
    expect(hourLabels({ start: '06:00', end: '22:00' })).toEqual(['06', '10', '14', '18', '22']);
  });
});

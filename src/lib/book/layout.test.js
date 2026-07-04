import { describe, it, expect } from 'vitest';
import { itemsToLines } from './layout';

// Helper: a pdf.js-shaped text item. y is given in top-based coords for
// readability and converted to PDF's bottom-left origin (pageHeight - y).
const PAGE_H = 800;
const item = (str, x, yTop, { size = 12, width } = {}) => ({
  str,
  width: width ?? str.length * size * 0.5,
  height: size,
  transform: [size, 0, 0, size, x, PAGE_H - yTop],
});

describe('itemsToLines', () => {
  it('clusters items at the same height into one line, left-to-right', () => {
    const lines = itemsToLines([
      item('world', 140, 100),
      item('Hello', 72, 100),
    ], PAGE_H);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Hello world');
    expect(lines[0].x).toBe(72);
  });

  it('separates items on different lines and orders top-to-bottom', () => {
    const lines = itemsToLines([
      item('second', 72, 130),
      item('first', 72, 100),
    ], PAGE_H);
    expect(lines.map((l) => l.text)).toEqual(['first', 'second']);
  });

  it('inserts a space across a horizontal gap but not across touching runs', () => {
    // "one" ends at x=72+30=102; "two" starts at 140 → gap 38 > 12*0.25 → space.
    const spaced = itemsToLines([
      item('one', 72, 100, { width: 30 }),
      item('two', 140, 100, { width: 30 }),
    ], PAGE_H);
    expect(spaced[0].text).toBe('one two');

    // Touching runs (next starts right where prev ends) → no inserted space.
    const glued = itemsToLines([
      item('sun', 72, 100, { width: 30 }),
      item('flower', 102, 100, { width: 30 }),
    ], PAGE_H);
    expect(glued[0].text).toBe('sunflower');
  });

  it('computes the median font size of a line and reports yTop', () => {
    const lines = itemsToLines([item('Big Title', 72, 60, { size: 24 })], PAGE_H);
    expect(lines[0].fontSize).toBe(24);
    expect(lines[0].yTop).toBeCloseTo(60, 5);
  });

  it('drops superscript citation markers when asked', () => {
    const lines = itemsToLines([
      item('evidence', 72, 100, { size: 12, width: 50 }),
      item('12', 122, 96, { size: 7, width: 8 }), // small, raised → marker
    ], PAGE_H, { dropSuperscripts: true });
    expect(lines[0].text).toBe('evidence');
  });

  it('keeps superscript markers when the option is off', () => {
    const lines = itemsToLines([
      item('evidence', 72, 100, { size: 12, width: 50 }),
      item('12', 122, 96, { size: 7, width: 8 }),
    ], PAGE_H, { dropSuperscripts: false });
    expect(lines[0].text).toContain('12');
  });

  it('returns nothing for empty input', () => {
    expect(itemsToLines([], PAGE_H)).toEqual([]);
  });
});

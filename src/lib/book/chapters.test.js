import { describe, it, expect } from 'vitest';
import {
  isHeadingLine,
  chaptersFromBoundaries,
  detectHeadingBoundaries,
  segmentChapters,
} from './chapters';

const line = (over = {}) => ({ yTop: 60, x: 72, fontSize: 12, text: 'x', ...over });
const page = (lines) => ({ pageNum: 1, width: 600, height: 800, lines });

describe('isHeadingLine', () => {
  it('matches chapter keywords regardless of size', () => {
    expect(isHeadingLine(line({ text: 'Chapter 3', fontSize: 12 }), 12)).toBe(true);
    expect(isHeadingLine(line({ text: 'Introduction', fontSize: 12 }), 12)).toBe(true);
  });
  it('matches big short title-case lines', () => {
    expect(isHeadingLine(line({ text: 'The Fall of Empires', fontSize: 20 }), 12)).toBe(true);
  });
  it('rejects long body sentences', () => {
    expect(isHeadingLine(line({ text: 'This is an ordinary body sentence that ends with a period.', fontSize: 12 }), 12)).toBe(false);
  });
});

describe('chaptersFromBoundaries', () => {
  it('slices pages into chapters at each boundary', () => {
    const pages = [
      page([line({ text: 'a' })]),
      page([line({ text: 'b' })]),
      page([line({ text: 'c' })]),
      page([line({ text: 'd' })]),
    ];
    const chapters = chaptersFromBoundaries(pages, [
      { title: 'One', pageIndex: 0 },
      { title: 'Two', pageIndex: 2 },
    ]);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].lines.map((l) => l.text)).toEqual(['a', 'b']);
    expect(chapters[1].lines.map((l) => l.text)).toEqual(['c', 'd']);
  });
});

describe('detectHeadingBoundaries', () => {
  it('finds one boundary per page with a heading', () => {
    const pages = [
      page([line({ text: 'Chapter 1', fontSize: 20 }), line({ text: 'body' })]),
      page([line({ text: 'plain body text only here' })]),
      page([line({ text: 'Chapter 2', fontSize: 20 }), line({ text: 'body' })]),
    ];
    const b = detectHeadingBoundaries(pages, 12);
    expect(b.map((x) => x.pageIndex)).toEqual([0, 2]);
  });
});

describe('segmentChapters', () => {
  const pages = [
    page([line({ text: 'Chapter 1', fontSize: 20 })]),
    page([line({ text: 'body' })]),
    page([line({ text: 'Chapter 2', fontSize: 20 })]),
  ];
  it('prefers the outline when it has >= 2 entries', () => {
    const res = segmentChapters(pages, 12, [
      { title: 'A', pageIndex: 0 },
      { title: 'B', pageIndex: 2 },
    ]);
    expect(res.source).toBe('outline');
    expect(res.chapters).toHaveLength(2);
  });
  it('falls back to heading detection', () => {
    const res = segmentChapters(pages, 12, []);
    expect(res.source).toBe('headings');
    expect(res.chapters).toHaveLength(2);
  });
  it('falls back to a single chapter when nothing is found', () => {
    const flat = [page([line({ text: 'just body' })])];
    const res = segmentChapters(flat, 12, []);
    expect(res.source).toBe('single');
    expect(res.chapters).toHaveLength(1);
  });
});

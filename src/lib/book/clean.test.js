import { describe, it, expect } from 'vitest';
import {
  normalizeChars,
  detectBodyFontSize,
  detectRunningHeadFoot,
  isPageNumberLine,
  stripFootnoteBlock,
  stripCitations,
  isSuperscriptMarker,
  reconstructParagraphs,
  cleanParagraph,
} from './clean';

const line = (over = {}) => ({ yTop: 100, x: 72, fontSize: 12, text: 'body', ...over });

describe('normalizeChars', () => {
  it('expands ligatures and strips soft hyphens', () => {
    expect(normalizeChars('ﬁreﬂy')).toBe('firefly');
    expect(normalizeChars('cooper­ate')).toBe('cooperate');
  });
  it('normalises quotes, dashes and collapses whitespace', () => {
    expect(normalizeChars('“hi”  ‘yo’')).toBe('"hi" \'yo\'');
    expect(normalizeChars('a–b')).toBe('a—b');
    expect(normalizeChars('a   b\tc')).toBe('a b c');
  });
});

describe('detectBodyFontSize', () => {
  it('returns the char-weighted modal size', () => {
    const pages = [{
      lines: [
        line({ fontSize: 24, text: 'A HEADING' }),
        line({ fontSize: 12, text: 'a long body paragraph of many characters here' }),
        line({ fontSize: 12, text: 'another long body paragraph with lots of text' }),
        line({ fontSize: 8, text: '3 note' }),
      ],
    }];
    expect(detectBodyFontSize(pages)).toBe(12);
  });
});

describe('detectRunningHeadFoot', () => {
  it('flags a header that recurs across pages ignoring the page number', () => {
    const pages = [];
    for (let p = 0; p < 10; p++) {
      pages.push({
        height: 800,
        lines: [
          line({ yTop: 40, text: `A History of Rome    ${p + 10}` }),
          line({ yTop: 400, text: 'real body content on the page goes here' }),
        ],
      });
    }
    const recurring = detectRunningHeadFoot(pages);
    expect(recurring.has('a history of rome #')).toBe(true);
  });
  it('does not flag unique body-like lines', () => {
    const words = ['alpha beta', 'gamma delta', 'epsilon zeta', 'eta theta', 'iota kappa', 'lambda mu'];
    const pages = words.map((w) => ({
      height: 800,
      lines: [line({ yTop: 40, text: `${w} opening line` })],
    }));
    expect(detectRunningHeadFoot(pages).size).toBe(0);
  });
});

describe('isPageNumberLine', () => {
  const page = { height: 800 };
  it('matches lone arabic/roman numbers in the margin', () => {
    expect(isPageNumberLine(line({ yTop: 780, text: '42' }), page)).toBe(true);
    expect(isPageNumberLine(line({ yTop: 20, text: 'xiv' }), page)).toBe(true);
  });
  it('rejects numbers in the body band or with prose', () => {
    expect(isPageNumberLine(line({ yTop: 400, text: '42' }), page)).toBe(false);
    expect(isPageNumberLine(line({ yTop: 780, text: 'page 42 of the book' }), page)).toBe(false);
  });
});

describe('stripFootnoteBlock', () => {
  it('drops a trailing run of small-font lines', () => {
    const lines = [
      line({ fontSize: 12, text: 'body one' }),
      line({ fontSize: 12, text: 'body two' }),
      line({ fontSize: 8, text: '1. See Smith 1999 for details.' }),
      line({ fontSize: 8, text: '2. Ibid, page 40.' }),
    ];
    const out = stripFootnoteBlock(lines, 12);
    expect(out).toHaveLength(2);
    expect(out.every((l) => l.fontSize === 12)).toBe(true);
  });
  it('keeps a single small line (likely a caption, not a note block)', () => {
    const lines = [line({ fontSize: 12, text: 'body' }), line({ fontSize: 8, text: 'Fig 1.' })];
    expect(stripFootnoteBlock(lines, 12)).toHaveLength(2);
  });
});

describe('stripCitations', () => {
  it('removes bracketed numeric references', () => {
    expect(stripCitations('as shown [12] and later [3, 4].')).toBe('as shown and later.');
    expect(stripCitations('ranges [5-7] too')).toBe('ranges too');
  });
  it('removes superscript digits glued to words', () => {
    expect(stripCitations('the evidence.12 was clear')).toBe('the evidence. was clear');
    expect(stripCitations('argument13 holds')).toBe('argument holds');
  });
  it('keeps genuine numbers when not glued to a token boundary', () => {
    expect(stripCitations('in 1984 the war')).toBe('in 1984 the war');
  });
  it('optionally removes author-year parentheticals', () => {
    expect(stripCitations('this is true (Smith, 2001) indeed', { authorYear: true }))
      .toBe('this is true indeed');
  });
  it('leaves author-year alone by default', () => {
    expect(stripCitations('this is true (Smith, 2001) indeed'))
      .toBe('this is true (Smith, 2001) indeed');
  });
});

describe('isSuperscriptMarker', () => {
  it('flags small raised digits', () => {
    expect(isSuperscriptMarker({ str: '12', fontSize: 7 }, 12)).toBe(true);
    expect(isSuperscriptMarker({ str: '*', fontSize: 7 }, 12)).toBe(true);
  });
  it('ignores same-size text and non-marker strings', () => {
    expect(isSuperscriptMarker({ str: '12', fontSize: 12 }, 12)).toBe(false);
    expect(isSuperscriptMarker({ str: 'the', fontSize: 7 }, 12)).toBe(false);
  });
});

describe('reconstructParagraphs', () => {
  it('joins wrapped lines and breaks on indent after a sentence end', () => {
    const lines = [
      line({ x: 72, yTop: 100, text: 'The first sentence runs across' }),
      line({ x: 72, yTop: 114, text: 'two physical lines here.' }),
      line({ x: 92, yTop: 128, text: 'A new indented paragraph begins.' }),
    ];
    const paras = reconstructParagraphs(lines, { bodyFont: 12 });
    expect(paras).toEqual([
      'The first sentence runs across two physical lines here.',
      'A new indented paragraph begins.',
    ]);
  });
  it('de-hyphenates words split across a line break', () => {
    const lines = [
      line({ x: 72, yTop: 100, text: 'an inter-' }),
      line({ x: 72, yTop: 114, text: 'national treaty' }),
    ];
    expect(reconstructParagraphs(lines, { bodyFont: 12 })).toEqual(['an international treaty']);
  });
  it('keeps the hyphen across a break when keepHyphens is set', () => {
    const lines = [
      line({ x: 72, yTop: 100, text: 'an inter-' }),
      line({ x: 72, yTop: 114, text: 'national treaty' }),
    ];
    expect(reconstructParagraphs(lines, { bodyFont: 12, keepHyphens: true }))
      .toEqual(['an inter-national treaty']);
  });
  it('breaks on a large vertical gap', () => {
    const lines = [
      line({ x: 72, yTop: 100, text: 'Paragraph one.' }),
      line({ x: 72, yTop: 160, text: 'Paragraph two.' }),
    ];
    expect(reconstructParagraphs(lines, { bodyFont: 12 })).toHaveLength(2);
  });
});

describe('cleanParagraph', () => {
  it('applies normalisation and citation stripping together', () => {
    const out = cleanParagraph('The ﬁnding [7] was robust.12', { removeCitations: true });
    expect(out).toBe('The finding was robust.');
  });
});

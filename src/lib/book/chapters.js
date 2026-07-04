// Chapter segmentation. Three strategies, tried in order of reliability:
//   1. The PDF's own outline / bookmarks (resolved to page indices).
//   2. Heuristic heading detection (big, short, chapter-like lines).
//   3. A single fallback chapter (never lose the text).
//
// The heuristic + boundary logic is pure and unit-tested; outline resolution
// (which needs the live pdfjs document) is done in pipeline.js and passed in
// here as an array of { title, pageIndex }.

const CHAPTER_WORD_RE = /^(chapter|chap\.?|part|book|section|prologue|epilogue|introduction|preface|foreword|conclusion|appendix)\b/i;
const NUMBERED_RE = /^(\d{1,3}|[IVXLC]{1,6})[.):]?\s+\S/;

// Is this line plausibly a chapter/section heading?
export function isHeadingLine(line, bodyFont) {
  const t = line.text.trim();
  if (!t || t.length > 90) return false;
  const big = line.fontSize >= bodyFont * 1.25;
  const wordish = CHAPTER_WORD_RE.test(t) || NUMBERED_RE.test(t) ||
    (big && /^[A-Z0-9]/.test(t) && t.split(/\s+/).length <= 10 && !/[.!?]$/.test(t));
  if (CHAPTER_WORD_RE.test(t)) return true;      // keyword wins even if not big
  return big && wordish;
}

// Build chapters from explicit boundaries: an array of { title, pageIndex }
// sorted ascending. Each chapter gets the body lines from its start page up to
// the next boundary. When a boundary carries the `headingLine` it was detected
// from, that line (and any page furniture above it on the start page) is
// dropped so the heading isn't repeated as a body paragraph.
export function chaptersFromBoundaries(pages, boundaries) {
  const bounds = [...boundaries].sort((a, b) => a.pageIndex - b.pageIndex);
  const chapters = [];
  for (let b = 0; b < bounds.length; b++) {
    const start = bounds[b].pageIndex;
    const end = b + 1 < bounds.length ? bounds[b + 1].pageIndex : pages.length;
    const headingLine = bounds[b].headingLine;
    const lines = [];
    for (let p = start; p < end && p < pages.length; p++) {
      let pageLines = pages[p].lines;
      // On the chapter's own start page, drop everything up to and including
      // the heading line (heading + any residual running head above it).
      if (p === start && headingLine) {
        const hi = pageLines.indexOf(headingLine);
        if (hi >= 0) pageLines = pageLines.slice(hi + 1);
      }
      for (const line of pageLines) lines.push(line);
    }
    const title = bounds[b].title || `Chapter ${b + 1}`;
    // Outline boundaries carry no line reference; if the first surviving line
    // simply restates the chapter title, drop it to avoid a duplicate.
    if (!headingLine && lines.length && sameTitle(lines[0].text, title)) {
      lines.shift();
    }
    chapters.push({ title, lines });
  }
  return chapters;
}

function sameTitle(a, b) {
  const norm = (s) => s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  return norm(a) === norm(b) && norm(a).length > 0;
}

// Detect chapter boundaries from headings in the body text itself.
export function detectHeadingBoundaries(pages, bodyFont) {
  const boundaries = [];
  pages.forEach((page, pageIndex) => {
    for (const line of page.lines) {
      if (isHeadingLine(line, bodyFont)) {
        boundaries.push({ title: line.text.trim(), pageIndex, yTop: line.yTop, headingLine: line });
        // one heading per page is enough to anchor a chapter start
        break;
      }
    }
  });
  return boundaries;
}

// Top-level: choose the best available segmentation.
//   outlineBoundaries: [{title, pageIndex}] from the PDF outline (may be empty)
export function segmentChapters(pages, bodyFont, outlineBoundaries = []) {
  const usable = outlineBoundaries.filter((b) => Number.isInteger(b.pageIndex) && b.pageIndex >= 0);
  if (usable.length >= 2) {
    return { chapters: chaptersFromBoundaries(pages, usable), source: 'outline' };
  }
  const headings = detectHeadingBoundaries(pages, bodyFont);
  if (headings.length >= 2) {
    return { chapters: chaptersFromBoundaries(pages, headings), source: 'headings' };
  }
  // Fallback: everything in one chapter.
  const lines = [];
  for (const page of pages) for (const line of page.lines) lines.push(line);
  return { chapters: [{ title: 'Full Text', lines }], source: 'single' };
}

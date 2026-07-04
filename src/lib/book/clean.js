// Text-cleaning heuristics for turning academic PDF text into clean,
// listenable prose. Everything here is PURE (no pdfjs, no DOM) so it can be
// unit-tested with synthetic page data. The pipeline (pipeline.js) feeds it
// the structured pages produced by extract.js.
//
// A "line" is: { yTop, x, fontSize, text, items }  (see extract.js)
// A "page" is: { pageNum, width, height, lines }

// ---------------------------------------------------------------------------
// Character-level normalisation
// ---------------------------------------------------------------------------

const LIGATURES = {
  'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl',
  'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'ft', 'ﬆ': 'st',
};

// Normalise ligatures, soft hyphens, exotic spaces and quotes so downstream
// regexes and the TTS engine see plain characters.
export function normalizeChars(text) {
  if (!text) return '';
  let out = '';
  for (const ch of text) out += LIGATURES[ch] ?? ch;
  return out
    .replace(/­/g, '')              // soft hyphen
    .replace(/[\u200B-\u200D\uFEFF]/g, '')   // zero-width chars
    .replace(/[‘’‛]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"')       // curly double quotes
    .replace(/[–—]/g, '—')  // normalise dashes to em dash
    .replace(/[\u00A0\u2007\u202F]/g, ' ')     // non-breaking spaces
    .replace(/…/g, '...')             // ellipsis
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Body font size — the modal glyph height, weighted by characters. Headings,
// footnotes and page numbers are then judged relative to this.
// ---------------------------------------------------------------------------

export function detectBodyFontSize(pages) {
  const hist = new Map();
  for (const page of pages) {
    for (const line of page.lines) {
      const size = Math.round(line.fontSize * 2) / 2; // 0.5pt buckets
      const weight = line.text.replace(/\s/g, '').length || 1;
      hist.set(size, (hist.get(size) || 0) + weight);
    }
  }
  let best = 12, bestWeight = 0;
  for (const [size, weight] of hist) {
    if (weight > bestWeight) { best = size; bestWeight = weight; }
  }
  return best || 12;
}

// ---------------------------------------------------------------------------
// Running headers / footers. Academic books repeat the chapter or author name
// (and a page number) in the top/bottom margin of nearly every page. We find
// the top-most and bottom-most line on each page, strip digits, and flag any
// normalised string that recurs across a meaningful fraction of pages.
// ---------------------------------------------------------------------------

function marginKey(text) {
  return text
    .replace(/[\dⅠ-ⅿ]+/g, '#')   // digits + roman numerals -> #
    .replace(/[^\p{L}#]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function detectRunningHeadFoot(pages, { bandFrac = 0.12 } = {}) {
  const topCounts = new Map();
  const botCounts = new Map();
  let considered = 0;

  for (const page of pages) {
    if (!page.lines.length) continue;
    considered++;
    const topBand = page.height * bandFrac;
    const botBand = page.height * (1 - bandFrac);
    const topLine = page.lines[0];
    const botLine = page.lines[page.lines.length - 1];
    if (topLine.yTop <= topBand) {
      const k = marginKey(topLine.text);
      if (k) topCounts.set(k, (topCounts.get(k) || 0) + 1);
    }
    if (botLine.yTop >= botBand) {
      const k = marginKey(botLine.text);
      if (k) botCounts.set(k, (botCounts.get(k) || 0) + 1);
    }
  }

  const threshold = Math.max(3, Math.floor(considered * 0.25));
  const recurring = new Set();
  for (const [k, n] of topCounts) if (k.length > 1 && n >= threshold) recurring.add(k);
  for (const [k, n] of botCounts) if (k.length > 1 && n >= threshold) recurring.add(k);
  return recurring;
}

// A lone page number (arabic or roman) sitting in a margin band.
const PAGE_NUM_RE = /^[\s|]*[\divxlcdmIVXLCDM]{1,5}[\s|]*$/;

export function isPageNumberLine(line, page, bandFrac = 0.12) {
  const t = line.text.trim();
  if (!PAGE_NUM_RE.test(t)) return false;
  const topBand = page.height * bandFrac;
  const botBand = page.height * (1 - bandFrac);
  return line.yTop <= topBand || line.yTop >= botBand;
}

// ---------------------------------------------------------------------------
// Footnote / endnote blocks. On a page bottom, footnotes render in a smaller
// font than the body, usually as a contiguous run of trailing lines (often
// after a separator rule). We drop the trailing small-font run.
// ---------------------------------------------------------------------------

export function stripFootnoteBlock(lines, bodyFont, { ratio = 0.86 } = {}) {
  if (!lines.length) return lines;
  const small = (l) => l.fontSize <= bodyFont * ratio;
  // Walk up from the bottom while lines stay small; require at least 2 to
  // avoid eating a single small caption line mid-flow.
  let cut = lines.length;
  while (cut > 0 && small(lines[cut - 1])) cut--;
  if (lines.length - cut >= 2) return lines.slice(0, cut);
  return lines;
}

// ---------------------------------------------------------------------------
// Inline citation / reference markers.
// ---------------------------------------------------------------------------

// Bracketed numeric refs: [12]  [3, 4]  [5-7]  [8–10, 14]
const BRACKET_CITE_RE = /\s*\[\s*\d+(?:\s*[,;&–-]\s*\d+)*\s*\]/g;
// Superscript footnote digits left glued to a word or sentence end, e.g.
// "evidence.12" or "argument13 that". Only strip 1-3 digit runs that hug
// punctuation or a word so we don't destroy real numbers ("in 1984").
const GLUED_SUP_RE = /([A-Za-z’'".,;:!?)])\d{1,3}(?=\s|$|[.,;:!?)”"])/g;
// Parenthetical author–year: (Smith 2001)  (Smith, 2001; Jones 1999)  (Smith et al., 2003, p. 44)
const AUTHOR_YEAR_RE = /\s*\((?:[^()]*?\b\d{4}[a-z]?\b[^()]*?)\)/g;

export function stripCitations(text, {
  brackets = true,
  gluedSuperscripts = true,
  authorYear = false,
} = {}) {
  let t = text;
  if (brackets) t = t.replace(BRACKET_CITE_RE, '');
  if (authorYear) {
    t = t.replace(AUTHOR_YEAR_RE, (m) =>
      // Keep parentheticals that are clearly prose (contain a lowercase word
      // run without a name-looking capitalised token) — a light guard.
      /[A-Z][a-z]+/.test(m) ? '' : m);
  }
  if (gluedSuperscripts) t = t.replace(GLUED_SUP_RE, '$1');
  // Tidy the spaces/punctuation the removals leave behind.
  return t
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\(\s*[;,]\s*\)/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Superscript reference markers at the glyph level. extract.js tags items
// whose font is much smaller than their line and which sit raised above the
// baseline. When citation stripping is on we drop the numeric ones before the
// line text is even assembled (handled in extract via this predicate).
// ---------------------------------------------------------------------------

export function isSuperscriptMarker(item, lineFont) {
  if (item.fontSize > lineFont * 0.8) return false;
  const s = item.str.trim();
  return /^[\d*†‡†‡]+$/.test(s) && s.length > 0;
}

// ---------------------------------------------------------------------------
// De-hyphenation + paragraph reconstruction. Given the surviving body lines of
// a chapter (in reading order) produce clean paragraphs.
// ---------------------------------------------------------------------------

// A hyphen at a line end that joins one word across the break. We keep the
// hyphen only for obviously-hyphenated compounds (both sides capitalised, or a
// known pattern), otherwise glue the halves together.
function joinHyphen(prev, next, force = false) {
  const m = prev.match(/(\S+)-$/);
  if (!m) return null;
  const head = m[1];
  const tailWord = next.match(/^(\S+)/);
  const tail = tailWord ? tailWord[1] : '';
  // Keep the hyphen for obvious compounds (both sides capitalised, e.g.
  // "Franco-German"), or whenever the caller has de-hyphenation turned off.
  const keepHyphen = force || (/[A-Z]$/.test(head) && /^[A-Z]/.test(tail));
  const glued = keepHyphen ? `${head}-${tail}` : `${head}${tail}`;
  return prev.replace(/\S+-$/, glued) + next.slice(tail.length);
}

const SENTENCE_END_RE = /[.!?]["'”’)]?\s*$/;

export function reconstructParagraphs(lines, { bodyFont = 12, keepHyphens = false } = {}) {
  if (!lines.length) return [];

  // Left margin = the most common line start; an indent beyond it signals a
  // new paragraph. Vertical gaps larger than ~1.6 line-heights also break.
  const xs = lines.map((l) => l.x);
  const leftMargin = mode(xs.map((x) => Math.round(x)));
  const indentThreshold = bodyFont * 0.8;
  const lineHeight = bodyFont * 1.2;

  const paras = [];
  let current = '';
  let prevLine = null;

  const flush = () => { if (current.trim()) paras.push(current.trim()); current = ''; };

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) { continue; }

    let breakBefore = false;
    if (prevLine) {
      const gap = line.yTop - prevLine.yTop;
      const bigGap = gap > lineHeight * 1.6;
      const indented = line.x > leftMargin + indentThreshold;
      const prevEnded = SENTENCE_END_RE.test(prevLine.text);
      if (bigGap || (indented && prevEnded)) breakBefore = true;
      // A page boundary is marked with pageBreak on the line.
      if (line.pageBreak && (prevEnded || gap === Infinity)) {
        // don't force a break across pages if the sentence clearly continues
        if (prevEnded && indented) breakBefore = true;
      }
    }

    if (breakBefore) flush();

    if (current) {
      const joined = joinHyphen(current, text, keepHyphens);
      if (joined != null) current = joined;
      else current = `${current} ${text}`;
    } else {
      current = text;
    }
    prevLine = line;
  }
  flush();
  return paras;
}

function mode(arr) {
  const counts = new Map();
  let best = arr[0] ?? 0, bestN = 0;
  for (const v of arr) {
    const n = (counts.get(v) || 0) + 1;
    counts.set(v, n);
    if (n > bestN) { bestN = n; best = v; }
  }
  return best;
}

// Full text-cleaning of a single assembled paragraph string, applying the
// character normalisation + citation options together.
export function cleanParagraph(text, options = {}) {
  let t = normalizeChars(text);
  if (options.removeCitations !== false) {
    t = stripCitations(t, {
      brackets: options.removeBracketCitations !== false,
      gluedSuperscripts: options.removeGluedSuperscripts !== false,
      authorYear: options.removeAuthorYear === true,
    });
  }
  return t;
}

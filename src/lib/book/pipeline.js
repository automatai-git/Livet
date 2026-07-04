// End-to-end conversion pipeline: PDF File -> clean book model -> EPUB Blob.
// Wires extract.js (pdfjs) + clean.js (heuristics) + chapters.js (segmentation)
// + epub.js (packaging). Kept thin: each concern lives in its own module.

import { extractPdf } from './extract';
import { segmentChapters } from './chapters';
import { buildEpub, bookToPlainText } from './epub';
import {
  detectBodyFontSize,
  detectRunningHeadFoot,
  isPageNumberLine,
  stripFootnoteBlock,
  reconstructParagraphs,
  cleanParagraph,
  normalizeChars,
} from './clean';

export const DEFAULT_OPTIONS = {
  removeHeadersFooters: true,
  removePageNumbers: true,
  removeFootnotes: true,
  removeCitations: true,
  removeBracketCitations: true,
  removeGluedSuperscripts: true,
  removeAuthorYear: false,   // off by default — riskier, can eat prose
  dehyphenate: true,
  title: '',
  author: '',
  language: 'en',
};

function marginKey(text) {
  return text
    .replace(/[\dⅠ-ⅿ]+/g, '#')
    .replace(/[^\p{L}#]+/gu, ' ')
    .trim()
    .toLowerCase();
}

// Remove running heads/feet, page numbers and footnote blocks from every page,
// mutating a shallow copy so the original extraction stays intact.
function scrubPages(pages, bodyFont, options, recurring) {
  return pages.map((page) => {
    let lines = page.lines;

    if (options.removeFootnotes) {
      lines = stripFootnoteBlock(lines, bodyFont);
    }

    lines = lines.filter((line, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === lines.length - 1;
      if (options.removePageNumbers && isPageNumberLine(line, page)) return false;
      if (options.removeHeadersFooters && (isFirst || isLast)) {
        const k = marginKey(line.text);
        if (k && recurring.has(k)) return false;
      }
      return true;
    });

    return { ...page, lines };
  });
}

// Turn a chapter's surviving lines into cleaned paragraphs.
function buildChapterParagraphs(lines, bodyFont, options) {
  const paras = reconstructParagraphs(lines, {
    bodyFont,
    keepHyphens: !options.dehyphenate,
  });
  const cleaned = [];
  for (const p of paras) {
    const text = cleanParagraph(p, options);
    // Drop paragraphs that are pure noise (page refs, stray numbers, empties).
    const alpha = text.replace(/[^\p{L}]/gu, '').length;
    if (alpha >= 3) cleaned.push(text);
  }
  return cleaned;
}

// Convert an ArrayBuffer/File. Returns { blob, book, stats }.
export async function convertPdfToEpub(input, userOptions = {}, onProgress = () => {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  const data = input instanceof ArrayBuffer
    ? new Uint8Array(input)
    : new Uint8Array(await input.arrayBuffer());
  const fileName = input?.name || '';

  onProgress(0.02, 'Opening PDF…');
  const { pages, outlineBoundaries, meta } = await extractPdf(data, {
    dropSuperscripts: options.removeCitations && options.removeGluedSuperscripts,
    onProgress: (frac, msg) => onProgress(0.05 + frac * 0.55, msg),
  });

  onProgress(0.62, 'Analysing layout…');
  const bodyFont = detectBodyFontSize(pages);
  const recurring = options.removeHeadersFooters
    ? detectRunningHeadFoot(pages)
    : new Set();

  const scrubbed = scrubPages(pages, bodyFont, options, recurring);

  onProgress(0.7, 'Detecting chapters…');
  const { chapters: rawChapters, source } = segmentChapters(scrubbed, bodyFont, outlineBoundaries);

  onProgress(0.8, 'Reconstructing text…');
  const chapters = rawChapters
    .map((c) => ({
      title: normalizeChars(c.title) || 'Chapter',
      paragraphs: buildChapterParagraphs(c.lines, bodyFont, options),
    }))
    .filter((c) => c.paragraphs.length > 0);

  if (!chapters.length) {
    throw new Error('No readable text found. This may be a scanned PDF that needs OCR first.');
  }

  const title =
    (options.title && options.title.trim()) ||
    (meta.title && meta.title.trim()) ||
    fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() ||
    'Untitled';
  const author = (options.author && options.author.trim()) || meta.author || 'Unknown';

  const book = { title, author, language: options.language || 'en', chapters };

  onProgress(0.9, 'Packaging EPUB…');
  const blob = await buildEpub(book);

  const plain = bookToPlainText(book);
  const wordCount = (plain.match(/\S+/g) || []).length;
  const stats = {
    pages: meta.numPages,
    chapters: chapters.length,
    chapterSource: source,
    bodyFont,
    words: wordCount,
    minutes: Math.round(wordCount / 150), // ~150 wpm narration
    droppedHeadFoot: recurring.size,
    sizeBytes: blob.size,
    fileName: `${title.replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'book'}.epub`,
  };

  onProgress(1, 'Done');
  return { blob, book, stats, plainText: plain };
}

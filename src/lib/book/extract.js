// PDF text extraction via pdf.js. Turns a PDF File/ArrayBuffer into structured
// pages of lines, ready for the cleaning heuristics in clean.js. This is the
// only module that touches pdfjs / the worker, so everything downstream stays
// pure and testable.

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { itemsToLines } from './layout';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Resolve the PDF outline into chapter boundaries: [{ title, pageIndex }].
async function resolveOutline(pdf) {
  let outline;
  try { outline = await pdf.getOutline(); } catch { return []; }
  if (!outline || !outline.length) return [];

  const flat = [];
  const walk = (nodes, depth) => {
    for (const n of nodes) {
      flat.push({ title: n.title, dest: n.dest, depth });
      if (n.items && n.items.length && depth < 1) walk(n.items, depth + 1);
    }
  };
  walk(outline, 0);

  const boundaries = [];
  for (const node of flat) {
    try {
      let dest = node.dest;
      if (typeof dest === 'string') dest = await pdf.getDestination(dest);
      if (!Array.isArray(dest) || !dest[0]) continue;
      const pageIndex = await pdf.getPageIndex(dest[0]);
      if (Number.isInteger(pageIndex)) {
        boundaries.push({ title: (node.title || '').trim(), pageIndex });
      }
    } catch { /* skip unresolvable destinations */ }
  }
  // De-dupe by page (keep first title) and sort.
  const seen = new Set();
  return boundaries
    .sort((a, b) => a.pageIndex - b.pageIndex)
    .filter((b) => (seen.has(b.pageIndex) ? false : (seen.add(b.pageIndex), true)));
}

// Main entry. Returns { pages, outlineBoundaries, meta }.
//   onProgress(fraction, message)
export async function extractPdf(data, { dropSuperscripts = true, onProgress } = {}) {
  const loadingTask = pdfjsLib.getDocument({
    data,
    // Keep memory sane on big scanned academic PDFs.
    disableFontFace: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let docMeta = {};
  try {
    const info = await pdf.getMetadata();
    docMeta = info?.info || {};
  } catch { /* metadata optional */ }

  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const lines = itemsToLines(content.items, viewport.height, { dropSuperscripts });
    pages.push({ pageNum: i, width: viewport.width, height: viewport.height, lines });
    page.cleanup();
    if (onProgress) onProgress(i / numPages, `Reading page ${i} of ${numPages}`);
  }

  const outlineBoundaries = await resolveOutline(pdf);

  const meta = {
    title: (docMeta.Title || '').trim(),
    author: (docMeta.Author || '').trim(),
    numPages,
  };

  await pdf.cleanup();
  await loadingTask.destroy?.();
  return { pages, outlineBoundaries, meta };
}

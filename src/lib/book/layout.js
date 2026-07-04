// Pure page-layout reconstruction: turn pdf.js text items into ordered lines.
// Kept free of any pdfjs import so it can be unit-tested directly. extract.js
// feeds it raw items and the page height; the worker/document handling stays
// there.

import { isSuperscriptMarker } from './clean';

// items: pdf.js text items — { str, transform:[a,b,c,d,e,f], width, height }.
// pageHeight: viewport height (to flip PDF's bottom-left origin to top-based y).
// Returns lines: [{ yTop, x, fontSize, text }] in reading order.
export function itemsToLines(items, pageHeight, { dropSuperscripts = false } = {}) {
  const glyphs = [];
  for (const it of items) {
    if (!it.str) continue;
    const tr = it.transform;
    const x = tr[4];
    const yTop = pageHeight - tr[5];
    const fontSize = Math.hypot(tr[2], tr[3]) || it.height || 12;
    glyphs.push({ str: it.str, x, yTop, fontSize, width: it.width || 0 });
  }
  if (!glyphs.length) return [];

  // Cluster into lines by vertical position, then read left→right within a line.
  glyphs.sort((a, b) => a.yTop - b.yTop || a.x - b.x);
  const buckets = [];
  let bucket = [glyphs[0]];
  for (let i = 1; i < glyphs.length; i++) {
    const g = glyphs[i];
    const ref = bucket[bucket.length - 1];
    const tol = Math.max(ref.fontSize, g.fontSize) * 0.5;
    if (Math.abs(g.yTop - ref.yTop) <= tol) bucket.push(g);
    else { buckets.push(bucket); bucket = [g]; }
  }
  buckets.push(bucket);

  return buckets.map((bkt) => {
    bkt.sort((a, b) => a.x - b.x);
    const sizes = bkt.map((g) => g.fontSize).sort((a, b) => a - b);
    const lineFont = sizes[Math.floor(sizes.length / 2)];

    let text = '';
    let prevEnd = null;
    for (const g of bkt) {
      if (dropSuperscripts && isSuperscriptMarker(g, lineFont)) continue;
      if (prevEnd != null) {
        const gap = g.x - prevEnd;
        const needsSpace = gap > lineFont * 0.25 && !/\s$/.test(text) && !/^\s/.test(g.str);
        if (needsSpace) text += ' ';
      }
      text += g.str;
      prevEnd = g.x + g.width;
    }
    text = text.replace(/\s+/g, ' ').trim();
    return {
      yTop: Math.min(...bkt.map((g) => g.yTop)),
      x: Math.min(...bkt.map((g) => g.x)),
      fontSize: lineFont,
      text,
    };
  }).filter((l) => l.text.length > 0);
}

// Pure engine for the book cloud: parse pasted Audible library text,
// suggest themes from titles, group books into theme clouds, compute
// relatedness edges between books, lay the clouds out deterministically,
// and rank wishlist books by how strongly they connect to finished reads.
//
// Book shape used throughout:
//   { id, title, author, status: 'read' | 'wishlist', themes: [themeId],
//     rating: 1..5 | null }   (rating only meaningful for read books)
// themes[0] is the primary theme — it decides which cloud the book joins.

import { BOOK_THEMES, UNSORTED_THEME, themeById } from '../data/bookThemes.js';

// ---------- normalisation ----------

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export const normaliseAuthor = (author) => squash(author).toLowerCase();

// Dedupe key: case/whitespace-insensitive title + author.
export const bookKey = (title, author) =>
  `${squash(title).toLowerCase()}::${normaliseAuthor(author)}`;

// ---------- Audible paste parser ----------

// Lines copied from the Audible library/wishlist pages carry metadata rows
// between titles. Anything matching these is discarded.
const JUNK_LINE = new RegExp(
  '^(narrated by|length|release date|language|series|program type|version|' +
  'whispersync|regular price|member price|sale price|add to|buy now|in cart|' +
  'included|download|stream|play|rate|review|view pdf|free with|audible|' +
  'podcast|see more|show more|finished|started|not started)\\b|' +
  '^\\d|^[★☆]|out of 5',
  'i'
);

const BY_LINE = /^by:?\s+(.+)$/i;

// Single-line "Title <sep> Author" separators, tried in order.
const SEPARATORS = ['\t', ' | ', ' — ', ' – ', ' - '];

const splitLine = (line) => {
  for (const sep of SEPARATORS) {
    const at = line.lastIndexOf(sep);
    if (at > 0) {
      return { title: squash(line.slice(0, at)), author: squash(line.slice(at + sep.length)) };
    }
  }
  // " by " as a last resort — split at the final occurrence so titles that
  // themselves contain "by" ("Surrounded by Idiots by Thomas Erikson") work.
  const at = line.toLowerCase().lastIndexOf(' by ');
  if (at > 0) {
    return { title: squash(line.slice(0, at)), author: squash(line.slice(at + 4)) };
  }
  return { title: squash(line), author: '' };
};

// Returns deduped [{ title, author }]. Accepts one-book-per-line formats
// ("Title by Author", "Title — Author", "Title | Author", tab-separated)
// and the multi-line blocks Audible pages produce ("Title" / "By: Author" /
// "Narrated by: …" / "Length: …").
export const parseImport = (text) => {
  const out = [];
  const seen = new Set();
  let pending = null; // title waiting for a possible "By:" line

  const flush = (title, author) => {
    if (!title) return;
    const key = bookKey(title, author);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ title, author });
  };

  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim(); // keep tabs intact — they are a valid separator
    if (!line) continue;

    const by = line.match(BY_LINE);
    if (by) {
      if (pending) flush(pending, squash(by[1]));
      pending = null;
      continue;
    }
    if (JUNK_LINE.test(line)) continue;

    if (pending) flush(pending, '');
    const { title, author } = splitLine(line);
    if (author) {
      flush(title, author);
      pending = null;
    } else {
      pending = title; // may pick up a "By:" author on the next line
    }
  }
  if (pending) flush(pending, '');
  return out;
};

// ---------- theme suggestion ----------

// Keyword pre-tagging for imports: lowercase substring match on the title,
// max two themes, taxonomy order. Hints only — the UI edits them freely.
export const suggestThemes = (title) => {
  const t = String(title || '').toLowerCase();
  return BOOK_THEMES
    .filter((theme) => theme.keywords.some((k) => t.includes(k)))
    .slice(0, 2)
    .map((theme) => theme.id);
};

// ---------- relatedness ----------

export const AUTHOR_WEIGHT = 3;

export const relation = (a, b) => {
  const sameAuthor = !!normaliseAuthor(a.author) && normaliseAuthor(a.author) === normaliseAuthor(b.author);
  const sharedThemes = (a.themes || []).filter((t) => (b.themes || []).includes(t));
  return { sameAuthor, sharedThemes, weight: (sameAuthor ? AUTHOR_WEIGHT : 0) + sharedThemes.length };
};

export const primaryTheme = (book) => book.themes?.[0] || UNSORTED_THEME.id;

// Edges worth drawing. Within a cloud every book already shares the primary
// theme, so a lone shared theme only counts as an edge across clouds;
// same-author and multi-theme links always connect.
export const buildEdges = (books, cap = 160) => {
  const edges = [];
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const a = books[i];
      const b = books[j];
      const rel = relation(a, b);
      const crossCloud = primaryTheme(a) !== primaryTheme(b);
      if (rel.sameAuthor || rel.sharedThemes.length >= 2 || (crossCloud && rel.sharedThemes.length >= 1)) {
        edges.push({ a: a.id, b: b.id, weight: rel.weight, themes: rel.sharedThemes, sameAuthor: rel.sameAuthor });
      }
    }
  }
  return edges.sort((x, y) => y.weight - x.weight).slice(0, cap);
};

// ---------- clouds ----------

// Groups books by primary theme, in taxonomy order (stable across renders),
// unsorted last. Empty themes produce no cloud.
export const buildClouds = (books) => {
  const order = [...BOOK_THEMES, UNSORTED_THEME];
  return order
    .map((theme) => {
      const members = books.filter((b) => primaryTheme(b) === theme.id);
      const rated = members.filter((b) => b.status === 'read' && b.rating);
      return {
        id: theme.id,
        label: theme.label,
        color: theme.color,
        books: members,
        readCount: members.filter((b) => b.status === 'read').length,
        wishCount: members.filter((b) => b.status === 'wishlist').length,
        avgRating: rated.length
          ? Math.round((rated.reduce((s, b) => s + b.rating, 0) / rated.length) * 10) / 10
          : null,
      };
    })
    .filter((c) => c.books.length > 0);
};

// ---------- layout ----------

export const NODE_R = 8;        // drawn node radius (viewBox units)
const NODE_SPACING = 24;        // golden-spiral step between nodes
const CLOUD_PAD = 24;           // breathing room between outermost node and rim
const CLOUD_MIN_R = 46;
const CLOUD_GAP = 20;           // gap between neighbouring clouds
const MARGIN = 14;              // outer margin of the whole drawing
const GOLDEN = 2.39996;         // golden angle in radians

// Node positions inside one cloud: sunflower spiral, centre-first.
const placeNodes = (books) =>
  books.map((book, i) => {
    const r = NODE_SPACING * Math.sqrt(i);
    const th = i * GOLDEN;
    return { book, dx: r * Math.cos(th), dy: r * Math.sin(th) };
  });

const cloudRadius = (n) => {
  if (n <= 1) return CLOUD_MIN_R;
  const spread = NODE_SPACING * Math.sqrt(n - 1);
  return Math.max(CLOUD_MIN_R, spread + NODE_R + CLOUD_PAD);
};

// Deterministic flow packing: clouds keep taxonomy order and wrap into
// centred rows. Returns { clouds: [{ …cloud, cx, cy, r, nodes }], width, height }.
export const layoutClouds = (clouds, width = 720) => {
  if (!clouds.length) return { clouds: [], width, height: 0 };

  const sized = clouds.map((c) => ({ ...c, r: cloudRadius(c.books.length) }));
  const rows = [];
  let row = [];
  let rowWidth = 0;
  for (const c of sized) {
    const w = 2 * c.r + (row.length ? CLOUD_GAP : 0);
    if (row.length && rowWidth + w > width - 2 * MARGIN) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    row.push(c);
    rowWidth += 2 * c.r + (row.length > 1 ? CLOUD_GAP : 0);
  }
  if (row.length) rows.push(row);

  const placed = [];
  let y = MARGIN;
  rows.forEach((r) => {
    const maxR = Math.max(...r.map((c) => c.r));
    const totalW = r.reduce((s, c) => s + 2 * c.r, 0) + CLOUD_GAP * (r.length - 1);
    let x = Math.max(MARGIN, (width - totalW) / 2);
    r.forEach((c, i) => {
      const cx = x + c.r;
      // small alternating vertical drift keeps rows from reading as a grid
      const cy = y + maxR + (i % 2 ? 6 : -6) * (r.length > 1 ? 1 : 0);
      placed.push({
        ...c,
        cx,
        cy,
        nodes: placeNodes(c.books).map((n) => ({ book: n.book, x: cx + n.dx, y: cy + n.dy })),
      });
      x += 2 * c.r + CLOUD_GAP;
    });
    y += 2 * maxR + CLOUD_GAP;
  });

  return { clouds: placed, width, height: y - CLOUD_GAP + MARGIN };
};

// ---------- wishlist ranking ----------

// A read book pulls harder the better it was: 3★ (or unrated) is neutral
// weight 1.0, 5★ pulls ~1.7×, 1★ pushes down to a third.
export const ratingFactor = (book) => (book.rating ? book.rating / 3 : 1);

// Scores every wishlist book by its pull toward the read shelf: shared
// authors weigh heaviest, then shared themes, each link scaled by the
// rating of the read book behind it. Returns all wishlist books,
// strongest first, each with human-readable reasons.
export const suggestNextReads = (books) => {
  const read = books.filter((b) => b.status === 'read');
  return books
    .filter((b) => b.status === 'wishlist')
    .map((wish) => {
      let score = 0;
      const authorMatches = [];
      const themeStats = {}; // themeId -> { n, ratingSum, ratedN }
      for (const r of read) {
        const rel = relation(wish, r);
        if (!rel.weight) continue;
        score += rel.weight * ratingFactor(r);
        if (rel.sameAuthor) authorMatches.push(r);
        for (const t of rel.sharedThemes) {
          const s = (themeStats[t] ||= { n: 0, ratingSum: 0, ratedN: 0 });
          s.n += 1;
          if (r.rating) { s.ratingSum += r.rating; s.ratedN += 1; }
        }
      }
      const reasons = [];
      if (authorMatches.length) {
        const best = authorMatches.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
        reasons.push(`Same author as “${best.title}”${best.rating ? ` (★${best.rating})` : ''}`);
      }
      const topTheme = Object.entries(themeStats).sort((a, b) => b[1].n - a[1].n)[0];
      if (topTheme) {
        const [id, s] = topTheme;
        const avg = s.ratedN ? Math.round((s.ratingSum / s.ratedN) * 10) / 10 : null;
        reasons.push(
          `Shares ${themeById(id).label} with ${s.n} read book${s.n === 1 ? '' : 's'}${avg ? ` (avg ★${avg})` : ''}`
        );
      }
      return { book: wish, score: Math.round(score * 10) / 10, reasons };
    })
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title));
};

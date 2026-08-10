import { describe, it, expect } from 'vitest';
import {
  parseImport,
  suggestThemes,
  relation,
  buildEdges,
  buildClouds,
  layoutClouds,
  suggestNextReads,
  ratingFactor,
  primaryTheme,
  mergeCachedRatings,
  NODE_R,
} from './bookCloud.js';

const book = (id, title, author, status, themes) => ({ id, title, author, status, themes });

describe('parseImport', () => {
  it('parses one-per-line separator formats', () => {
    const text = [
      'Atomic Habits — James Clear',
      'Deep Work | Cal Newport',
      'Sapiens\tYuval Noah Harari',
      'The Psychology of Money - Morgan Housel',
      'Meditations by Marcus Aurelius',
    ].join('\n');
    expect(parseImport(text)).toEqual([
      { title: 'Atomic Habits', author: 'James Clear' },
      { title: 'Deep Work', author: 'Cal Newport' },
      { title: 'Sapiens', author: 'Yuval Noah Harari' },
      { title: 'The Psychology of Money', author: 'Morgan Housel' },
      { title: 'Meditations', author: 'Marcus Aurelius' },
    ]);
  });

  it('splits " by " at the last occurrence', () => {
    expect(parseImport('Surrounded by Idiots by Thomas Erikson')).toEqual([
      { title: 'Surrounded by Idiots', author: 'Thomas Erikson' },
    ]);
  });

  it('parses Audible multi-line blocks and skips metadata rows', () => {
    const text = `
      Atomic Habits: An Easy & Proven Way to Build Good Habits
      By: James Clear
      Narrated by: James Clear
      Length: 5 hrs and 35 mins
      Release date: 16-10-2018
      4.8 out of 5 stars
      Finished

      The Almanack of Naval Ravikant
      By: Eric Jorgenson
      Narrated by: Vikas Adam
    `;
    expect(parseImport(text)).toEqual([
      { title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits', author: 'James Clear' },
      { title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson' },
    ]);
  });

  it('keeps a bare title when no author follows', () => {
    expect(parseImport('Some Untagged Title')).toEqual([{ title: 'Some Untagged Title', author: '' }]);
  });

  it('dedupes case-insensitively and ignores stray By: lines', () => {
    const text = 'Deep Work — Cal Newport\ndeep work — cal newport\nBy: Nobody';
    expect(parseImport(text)).toEqual([{ title: 'Deep Work', author: 'Cal Newport' }]);
  });
});

describe('suggestThemes', () => {
  it('matches title keywords in taxonomy order, capped at two', () => {
    expect(suggestThemes('The Psychology of Money')).toEqual(['psychology', 'wealth']);
  });
  it('returns empty for unknown titles', () => {
    expect(suggestThemes('Zorbathrax the Unknowable')).toEqual([]);
  });
});

describe('relation and edges', () => {
  const a = book('a', 'A', 'Same Author', 'read', ['wealth']);
  const b = book('b', 'B', 'Same Author', 'read', ['fiction']);
  const c = book('c', 'C', 'Other', 'read', ['wealth', 'psychology']);
  const d = book('d', 'D', 'Fourth', 'read', ['wealth']);
  const e = book('e', 'E', 'Fifth', 'wishlist', ['psychology', 'wealth']);

  it('weights author matches over theme overlap', () => {
    expect(relation(a, b).weight).toBe(3);
    expect(relation(c, e).weight).toBe(2);
    expect(relation(a, c).weight).toBe(1);
  });

  it('never treats two blank authors as a match', () => {
    const x = book('x', 'X', '', 'read', []);
    const y = book('y', 'Y', '', 'read', []);
    expect(relation(x, y).sameAuthor).toBe(false);
  });

  it('links same-author and multi-theme pairs, but not single-theme pairs inside one cloud', () => {
    const edges = buildEdges([a, b, c, d, e]);
    const has = (x, y) => edges.some((ed) => (ed.a === x && ed.b === y) || (ed.a === y && ed.b === x));
    expect(has('a', 'b')).toBe(true);   // same author across clouds
    expect(has('c', 'e')).toBe(true);   // two shared themes
    expect(has('a', 'd')).toBe(false);  // one shared theme, same cloud
    expect(has('a', 'e')).toBe(true);   // one shared theme, different clouds
  });
});

describe('buildClouds', () => {
  it('groups by primary theme with unsorted fallback, keeping counts', () => {
    const books = [
      book('1', 'A', 'x', 'read', ['wealth', 'psychology']),
      book('2', 'B', 'y', 'wishlist', ['wealth']),
      book('3', 'C', 'z', 'read', []),
    ];
    const clouds = buildClouds(books);
    expect(clouds.map((c) => c.id)).toEqual(['wealth', 'unsorted']);
    const wealth = clouds[0];
    expect(wealth.readCount).toBe(1);
    expect(wealth.wishCount).toBe(1);
    expect(primaryTheme(books[2])).toBe('unsorted');
  });
});

describe('layoutClouds', () => {
  const mkBooks = (n, theme) =>
    Array.from({ length: n }, (_, i) => book(`${theme}${i}`, `T${i}`, 'a', 'read', [theme]));
  const clouds = buildClouds([
    ...mkBooks(12, 'wealth'),
    ...mkBooks(7, 'psychology'),
    ...mkBooks(1, 'history'),
    ...mkBooks(3, 'fiction'),
  ]);
  const layout = layoutClouds(clouds, 720);

  it('keeps every node inside its cloud circle', () => {
    for (const c of layout.clouds) {
      for (const n of c.nodes) {
        const dist = Math.hypot(n.x - c.cx, n.y - c.cy);
        expect(dist).toBeLessThanOrEqual(c.r - NODE_R + 1e-6);
      }
    }
  });

  it('never overlaps two clouds', () => {
    const cs = layout.clouds;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const dist = Math.hypot(cs[i].cx - cs[j].cx, cs[i].cy - cs[j].cy);
        expect(dist).toBeGreaterThanOrEqual(cs[i].r + cs[j].r);
      }
    }
  });

  it('stays inside the viewBox width and reports a positive height', () => {
    for (const c of layout.clouds) {
      expect(c.cx - c.r).toBeGreaterThanOrEqual(0);
      expect(c.cx + c.r).toBeLessThanOrEqual(720);
    }
    expect(layout.height).toBeGreaterThan(0);
  });

  it('handles an empty library', () => {
    expect(layoutClouds([], 720)).toEqual({ clouds: [], width: 720, height: 0 });
  });
});

describe('suggestNextReads', () => {
  const books = [
    book('r1', 'Deep Work', 'Cal Newport', 'read', ['habits']),
    book('r2', 'Digital Minimalism', 'Cal Newport', 'read', ['habits', 'psychology']),
    book('r3', 'Sapiens', 'Yuval Noah Harari', 'read', ['history', 'science']),
    book('w1', 'So Good They Cannot Ignore You', 'Cal Newport', 'wishlist', ['habits', 'business']),
    book('w2', 'Homo Deus', 'Yuval Noah Harari', 'wishlist', ['history']),
    book('w3', 'Dune', 'Frank Herbert', 'wishlist', ['fiction']),
  ];
  const ranked = suggestNextReads(books);

  it('only ranks wishlist books, never reads', () => {
    expect(ranked.map((r) => r.book.id).sort()).toEqual(['w1', 'w2', 'w3']);
  });

  it('puts the most connected book first with readable reasons', () => {
    expect(ranked[0].book.id).toBe('w1'); // 2 author matches + shared themes
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].reasons[0]).toMatch(/Same author/);
    expect(ranked[0].reasons.join(' ')).toMatch(/Habits/);
  });

  it('gives an unconnected book zero score and no reasons', () => {
    const dune = ranked.find((r) => r.book.id === 'w3');
    expect(dune.score).toBe(0);
    expect(dune.reasons).toEqual([]);
  });
});

describe('ratings', () => {
  it('scales pull by rating with unrated as neutral', () => {
    expect(ratingFactor({ rating: 5 })).toBeCloseTo(5 / 3);
    expect(ratingFactor({ rating: 3 })).toBe(1);
    expect(ratingFactor({ rating: null })).toBe(1);
    expect(ratingFactor({})).toBe(1);
  });

  it('ranks a link through a 5★ book above the same link through an unrated one', () => {
    const books = [
      book('r1', 'Loved It', 'Ada Author', 'read', ['wealth']),
      book('r2', 'Meh Book', 'Bob Writer', 'read', ['history']),
      { ...book('w1', 'A Next', 'Ada Author', 'wishlist', []) },
      { ...book('w2', 'B Next', 'Bob Writer', 'wishlist', []) },
    ];
    books[0].rating = 5;
    // Identical author-only links; only the rating differs (5★ vs unrated).
    const ranked = suggestNextReads(books);
    expect(ranked[0].book.id).toBe('w1');
    expect(ranked[0].score).toBe(5);        // 3 × 5/3
    expect(ranked[1].score).toBe(3);        // 3 × 1
    expect(ranked[0].reasons[0]).toContain('(★5)');
  });

  it('demotes links through 1★ books below broader unrated theme links', () => {
    const oneStar = { ...book('r1', 'Regret', 'Cy Author', 'read', ['fiction']), rating: 1 };
    const books = [
      oneStar,
      book('r2', 'Fine A', 'x', 'read', ['wealth', 'psychology']),
      book('w1', 'Via One Star', 'Cy Author', 'wishlist', []),
      book('w2', 'Via Themes', 'y', 'wishlist', ['wealth', 'psychology']),
    ];
    const ranked = suggestNextReads(books);
    expect(ranked[0].book.id).toBe('w2');   // 2 shared themes × 1 = 2
    expect(ranked[1].book.id).toBe('w1');   // author 3 × 1/3 = 1
  });

  it('averages read ratings per cloud and reports them in reasons', () => {
    const books = [
      { ...book('r1', 'A', 'a', 'read', ['wealth']), rating: 4 },
      { ...book('r2', 'B', 'b', 'read', ['wealth']), rating: 5 },
      book('r3', 'C', 'c', 'read', ['wealth']),
      book('w1', 'W', 'd', 'wishlist', ['wealth']),
    ];
    const clouds = buildClouds(books);
    expect(clouds[0].avgRating).toBe(4.5);  // unrated books excluded from avg
    const ranked = suggestNextReads(books);
    expect(ranked[0].reasons[0]).toContain('avg ★4.5');
    const unrated = buildClouds([book('r9', 'Z', 'z', 'read', ['fiction'])]);
    expect(unrated[0].avgRating).toBe(null);
  });
});

describe('mergeCachedRatings', () => {
  const server = (id, title, author, rating = null) =>
    ({ id, title, author, status: 'read', themes: [], rating });

  it('fills a server-null rating from the cache by id', () => {
    const { books, rescued } = mergeCachedRatings(
      [server('a', 'Deep Work', 'Cal Newport')],
      [server('a', 'Deep Work', 'Cal Newport', 4)]
    );
    expect(books[0].rating).toBe(4);
    expect(rescued).toEqual([books[0]]);
  });

  it('falls back to title/author when ids differ (both devices seeded locally)', () => {
    const { books, rescued } = mergeCachedRatings(
      [server('server-id', 'Atomic Habits', 'James Clear')],
      [server('phone-id', 'atomic  habits', 'JAMES CLEAR', 5)]
    );
    expect(books[0].rating).toBe(5);
    expect(books[0].id).toBe('server-id');
    expect(rescued).toHaveLength(1);
  });

  it('never overwrites a rating the server already has', () => {
    const { books, rescued } = mergeCachedRatings(
      [server('a', 'Sapiens', 'Yuval Noah Harari', 3)],
      [server('a', 'Sapiens', 'Yuval Noah Harari', 5)]
    );
    expect(books[0].rating).toBe(3);
    expect(rescued).toEqual([]);
  });

  it('returns server books untouched with nothing to rescue', () => {
    const rows = [server('a', 'Meditations', 'Marcus Aurelius')];
    const { books, rescued } = mergeCachedRatings(rows, []);
    expect(books).toEqual(rows);
    expect(rescued).toEqual([]);
  });
});

import React, { useEffect, useMemo, useState } from 'react';
import AppShellV3, { ScopePill } from '../components/AppShellV3';
import EmptyState from '../components/feedback/EmptyState';
import AppIcon from '../components/AppIcon';
import BookCloud from '../components/books/BookCloud';
import BookImport from '../components/books/BookImport';
import BookDetailCard from '../components/books/BookDetailCard';
import StarRating from '../components/books/StarRating';
import { bookKey, suggestThemes, suggestNextReads } from '../lib/bookCloud.js';
import { BOOK_THEMES, themeById } from '../data/bookThemes.js';
import { BOOK_SEEDS } from '../data/bookSeeds.js';
import { bookService } from '../services/bookService.js';

// Book Cloud: the Audible library drawn as connected theme clouds.
// Read books are solid dots, wishlist books sit dashed in the same clouds.
// Four views: Cloud (the map), Read next (full wishlist ranked by
// rating-weighted pull, filterable by theme — the two selection criteria),
// Rate (bulk-rate finished books), Library (import, tag, manage).
// Persistence goes through bookService (Supabase `book_cloud_books` table,
// localStorage cache as fallback).

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const VIEWS = [
  { id: 'cloud', label: 'Cloud' },
  { id: 'next', label: 'Read next' },
  { id: 'rate', label: 'Rate' },
  { id: 'library', label: 'Library' },
];

const Books = () => {
  const [books, setBooks] = useState(bookService.getCachedBooks);
  const [view, setView] = useState('cloud');
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bookService.getBooks().then(({ books: fetched, offline: off }) => {
      if (cancelled) return;
      setBooks(fetched);
      setOffline(off);
    });
    return () => { cancelled = true; };
  }, []);

  const selected = books.find((b) => b.id === selectedId) || null;
  const readBooks = books.filter((b) => b.status === 'read');
  const wishCount = books.length - readBooks.length;
  const ratedCount = readBooks.filter((b) => b.rating).length;
  const untagged = books.filter((b) => !b.themes.length).length;

  const ranked = useMemo(() => suggestNextReads(books), [books]);
  const topPicks = useMemo(() => ranked.filter((s) => s.score > 0).slice(0, 3), [ranked]);

  // Themes present in the wishlist, taxonomy order — the filter chips.
  const wishThemes = useMemo(() => {
    const present = new Set(books.filter((b) => b.status === 'wishlist').flatMap((b) => b.themes));
    return BOOK_THEMES.filter((t) => present.has(t.id));
  }, [books]);

  const rankedShown = themeFilter
    ? ranked.filter((s) => s.book.themes.includes(themeFilter))
    : ranked;

  // Rate view: unrated first, then alphabetical.
  const rateRows = useMemo(
    () =>
      [...readBooks].sort((a, b) =>
        (a.rating ? 1 : 0) - (b.rating ? 1 : 0) || a.title.localeCompare(b.title)
      ),
    [readBooks]
  );

  const syncSave = (changed, all) =>
    bookService.saveBooks(changed, all).then(({ ok }) => setOffline(!ok));

  const handleImport = (entries, status) => {
    const byKey = new Map(books.map((b) => [bookKey(b.title, b.author), b]));
    const upgraded = new Map();
    const added = [];
    for (const { title, author } of entries) {
      const existing = byKey.get(bookKey(title, author));
      if (existing) {
        // Re-importing as read upgrades a wishlisted book; never downgrade.
        if (status === 'read' && existing.status === 'wishlist') {
          upgraded.set(existing.id, { ...existing, status: 'read' });
        }
        continue;
      }
      const book = { id: newId(), title, author, status, themes: suggestThemes(title), rating: null };
      byKey.set(bookKey(title, author), book);
      added.push(book);
    }
    const next = [...books.map((b) => upgraded.get(b.id) || b), ...added];
    setBooks(next);
    syncSave([...upgraded.values(), ...added], next);
  };

  const handleLoadSeeds = () => {
    const seeded = BOOK_SEEDS.map((s) => ({ id: newId(), rating: null, ...s }));
    setBooks(seeded);
    syncSave(seeded, seeded);
  };

  const handleUpdate = (id, patch) => {
    const next = books.map((b) => (b.id === id ? { ...b, ...patch } : b));
    setBooks(next);
    syncSave(next.filter((b) => b.id === id), next);
  };

  const handleDelete = (id) => {
    const next = books.filter((b) => b.id !== id);
    setBooks(next);
    setSelectedId(null);
    bookService.deleteBook(id, next).then(({ ok }) => setOffline(!ok));
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = q
      ? books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      : books;
    return [...rows].sort(
      (a, b) => (a.status === b.status ? a.title.localeCompare(b.title) : a.status === 'read' ? -1 : 1)
    );
  }, [books, filter]);

  const detailCard = selected && (
    <BookDetailCard
      book={selected}
      books={books}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onSelect={setSelectedId}
    />
  );

  return (
    <AppShellV3
      app="books"
      maxWidth={780}
      scope={books.length > 0 ? (
        <div className="scope-row" role="tablist" aria-label="Book views">
          {VIEWS.map((v) => (
            <ScopePill
              key={v.id}
              on={view === v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </ScopePill>
          ))}
        </div>
      ) : undefined}
      action={books.length > 0 && view !== 'library'
        ? { label: 'Import books', onClick: () => setView('library') }
        : undefined}
    >
      {books.length === 0 ? (
        <>
          <EmptyState
            icon={<AppIcon name="books" size={26} />}
            title="No books yet"
            hint="Load the Audible starter library, or paste a list below."
            action={BOOK_SEEDS.length > 0 && (
              <button type="button" className="btn-primary" onClick={handleLoadSeeds}>
                Load my Audible library ({BOOK_SEEDS.length} books)
              </button>
            )}
          />
          <div style={{ marginTop: 14 }}>
            <BookImport onImport={handleImport} />
          </div>
        </>
      ) : (
        <>
          <p className="muted-row" style={{ marginBottom: 10 }}>
            {readBooks.length} read · {wishCount} wishlist{untagged ? ` · ${untagged} untagged` : ''}
          </p>

          {offline && (
            <p className="book-offline-note">
              Offline — changes are saved on this device and sync when the connection is back.
            </p>
          )}

          {view === 'cloud' && (
            <>
              <div className="book-legend muted-row">
                <span><span className="legend-dot read" /> read</span>
                <span><span className="legend-dot wish" /> wishlist</span>
                <span><span className="legend-line" /> related</span>
              </div>
              <div className="tight-card book-cloud-frame">
                <BookCloud books={books} selectedId={selectedId} onSelect={setSelectedId} />
              </div>

              {detailCard}

              {topPicks.length > 0 && (
                <div className="tight-card book-suggestions">
                  <div className="section-title" style={{ margin: '0 0 8px' }}>
                    <h3>Read next</h3>
                    <button type="button" className="book-see-all" onClick={() => setView('next')}>
                      See all {wishCount} →
                    </button>
                  </div>
                  <ol className="book-suggestion-list">
                    {topPicks.map(({ book, reasons }) => (
                      <li key={book.id}>
                        <button type="button" onClick={() => setSelectedId(book.id)}>
                          <span
                            className="legend-dot wish"
                            style={{ '--book-accent': themeById(book.themes[0] || 'unsorted').color }}
                          />
                          <span className="book-suggestion-body">
                            <span className="book-related-title">{book.title}</span>
                            <span className="muted-row">{reasons.join(' · ')}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {view === 'next' && (
            <>
              <p className="muted-row" style={{ marginBottom: 8 }}>
                Wishlist ranked by pull toward what you've read — links through highly rated
                books pull hardest. Narrow by theme:
              </p>
              <div className="book-theme-chips" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className={`book-theme-chip${themeFilter === null ? ' on' : ''}`}
                  style={themeFilter === null ? { '--chip-color': 'var(--accent-books)' } : undefined}
                  onClick={() => setThemeFilter(null)}
                >
                  All themes
                </button>
                {wishThemes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`book-theme-chip${themeFilter === t.id ? ' on' : ''}`}
                    style={themeFilter === t.id ? { '--chip-color': t.color } : undefined}
                    onClick={() => setThemeFilter(themeFilter === t.id ? null : t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {detailCard}

              <ol className="book-suggestion-list">
                {rankedShown.map(({ book, score, reasons }) => (
                  <li key={book.id}>
                    <button type="button" onClick={() => setSelectedId(book.id === selectedId ? null : book.id)}>
                      <span
                        className="legend-dot wish"
                        style={{ '--book-accent': themeById(book.themes[0] || 'unsorted').color }}
                      />
                      <span className="book-suggestion-body">
                        <span className="book-related-title">{book.title}</span>
                        <span className="muted-row">
                          {reasons.length ? reasons.join(' · ') : 'No links yet — tag it to place it'}
                        </span>
                      </span>
                      <span className="book-score-pill">{score}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {rankedShown.length === 0 && (
                <EmptyState title="Nothing here" hint="No wishlist books carry this theme yet." />
              )}
            </>
          )}

          {view === 'rate' && (
            <>
              <p className="muted-row" style={{ marginBottom: 12 }}>
                {ratedCount} of {readBooks.length} rated — ratings sharpen the Read next
                ranking. Unrated first.
              </p>
              <ul className="book-rate-list">
                {rateRows.map((b) => (
                  <li key={b.id} className="book-rate-row">
                    <span className="book-rate-main">
                      <span className="book-related-title">{b.title}</span>
                      <span className="muted-row">{b.author || '—'}</span>
                    </span>
                    <StarRating
                      size="sm"
                      value={b.rating || null}
                      onChange={(rating) => handleUpdate(b.id, { rating })}
                      label={`Rate ${b.title}`}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          {view === 'library' && (
            <>
              <BookImport onImport={handleImport} />
              {detailCard}
              <input
                className="search-input"
                style={{ margin: '12px 0' }}
                placeholder="Filter by title or author…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <ul className="book-library-list">
                {filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={`book-library-row${b.id === selectedId ? ' selected' : ''}`}
                      onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                    >
                      <span
                        className={`legend-dot ${b.status === 'wishlist' ? 'wish' : 'read'}`}
                        style={{ '--book-accent': themeById(b.themes[0] || 'unsorted').color }}
                      />
                      <span className="book-library-main">
                        <span className="book-related-title">{b.title}</span>
                        <span className="muted-row">
                          {b.author || '—'}{b.rating ? ` · ★${b.rating}` : ''}
                        </span>
                      </span>
                      <span className="book-library-tags">
                        {b.themes.length
                          ? b.themes.map((t) => (
                              <span key={t} className="tag-chip">{themeById(t).label}</span>
                            ))
                          : <span className="tag-chip" style={{ opacity: 0.6 }}>untagged</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </AppShellV3>
  );
};

export default Books;

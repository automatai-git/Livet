import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import EmptyState from '../components/feedback/EmptyState';
import AppIcon from '../components/AppIcon';
import BookCloud from '../components/books/BookCloud';
import BookImport from '../components/books/BookImport';
import BookDetailCard from '../components/books/BookDetailCard';
import { bookKey, suggestThemes, suggestNextReads } from '../lib/bookCloud.js';
import { themeById } from '../data/bookThemes.js';
import { bookService } from '../services/bookService.js';

// Book Cloud: the Audible library drawn as connected theme clouds.
// Read books are solid dots, wishlist books sit dashed in the same clouds,
// and the "Read next" panel ranks the wishlist by how strongly each book
// links to what's already been read. Persistence goes through bookService
// (Supabase `book_cloud_books` table, localStorage cache as fallback).

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Books = () => {
  const [books, setBooks] = useState(bookService.getCachedBooks);
  const [view, setView] = useState('cloud');
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('');
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
  const readCount = books.filter((b) => b.status === 'read').length;
  const wishCount = books.length - readCount;

  const suggestions = useMemo(
    () => suggestNextReads(books).filter((s) => s.score > 0).slice(0, 3),
    [books]
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
      const book = { id: newId(), title, author, status, themes: suggestThemes(title) };
      byKey.set(bookKey(title, author), book);
      added.push(book);
    }
    const next = [...books.map((b) => upgraded.get(b.id) || b), ...added];
    setBooks(next);
    syncSave([...upgraded.values(), ...added], next);
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

  const untagged = books.filter((b) => !b.themes.length).length;

  return (
    <AppShell title="Book Cloud" accent="var(--accent-books)" maxWidth={780}>
      {books.length === 0 ? (
        <>
          <EmptyState
            icon={<AppIcon name="books" size={26} />}
            title="No books yet"
            hint="Paste your Audible library below and watch it group itself into clouds."
          />
          <div style={{ marginTop: 14 }}>
            <BookImport onImport={handleImport} />
          </div>
        </>
      ) : (
        <>
          <div className="book-toolbar">
            <div className="book-view-pills" role="tablist">
              <button
                type="button"
                className={`day-pill${view === 'cloud' ? ' selected' : ''}`}
                onClick={() => setView('cloud')}
              >
                Cloud
              </button>
              <button
                type="button"
                className={`day-pill${view === 'library' ? ' selected' : ''}`}
                onClick={() => setView('library')}
              >
                Library
              </button>
            </div>
            <p className="muted-row">
              {readCount} read · {wishCount} wishlist{untagged ? ` · ${untagged} untagged` : ''}
            </p>
          </div>

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

              {selected && (
                <BookDetailCard
                  book={selected}
                  books={books}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onSelect={setSelectedId}
                />
              )}

              {suggestions.length > 0 && (
                <div className="tight-card book-suggestions">
                  <div className="section-title" style={{ margin: '0 0 8px' }}>
                    <h3>Read next</h3>
                    <span className="muted-row">wishlist, ranked by pull</span>
                  </div>
                  <ol className="book-suggestion-list">
                    {suggestions.map(({ book, reasons }) => (
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

          {view === 'library' && (
            <>
              <BookImport onImport={handleImport} />
              {selected && (
                <BookDetailCard
                  book={selected}
                  books={books}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onSelect={setSelectedId}
                />
              )}
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
                        <span className="muted-row">{b.author || '—'}</span>
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
    </AppShell>
  );
};

export default Books;

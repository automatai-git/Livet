import React, { useMemo } from 'react';
import { BOOK_THEMES, themeById } from '../../data/bookThemes.js';
import { relation } from '../../lib/bookCloud.js';

// Detail + edit card for one book: status toggle, theme tagging (the first
// active theme is the book's cloud), related-book list, delete.
//
// Props: book, books, onUpdate(id, patch), onDelete(id), onSelect(id)

const BookDetailCard = ({ book, books, onUpdate, onDelete, onSelect }) => {
  const related = useMemo(
    () =>
      books
        .filter((b) => b.id !== book.id)
        .map((b) => ({ b, rel: relation(book, b) }))
        .filter((x) => x.rel.weight > 0)
        .sort((x, y) => y.rel.weight - x.rel.weight)
        .slice(0, 6),
    [books, book]
  );

  const toggleTheme = (id) => {
    const themes = book.themes.includes(id)
      ? book.themes.filter((t) => t !== id)
      : [...book.themes, id];
    onUpdate(book.id, { themes });
  };

  const primary = themeById(book.themes[0] || 'unsorted');

  return (
    <div className="tight-card book-detail" style={{ '--book-accent': primary.color }}>
      <div className="book-detail-top">
        <div style={{ minWidth: 0 }}>
          <p className="heading-serif book-detail-title">{book.title}</p>
          {book.author && <p className="muted-row">{book.author}</p>}
        </div>
        <div className="book-status-toggle">
          <button
            type="button"
            className={book.status === 'read' ? 'on' : ''}
            aria-pressed={book.status === 'read'}
            onClick={() => onUpdate(book.id, { status: 'read' })}
          >
            Read
          </button>
          <button
            type="button"
            className={book.status === 'wishlist' ? 'on' : ''}
            aria-pressed={book.status === 'wishlist'}
            onClick={() => onUpdate(book.id, { status: 'wishlist' })}
          >
            Wishlist
          </button>
        </div>
      </div>

      <p className="eyebrow" style={{ marginTop: 12 }}>Themes — first one is its cloud</p>
      <div className="book-theme-chips">
        {BOOK_THEMES.map((t) => {
          const active = book.themes.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`book-theme-chip${active ? ' on' : ''}`}
              style={active ? { '--chip-color': t.color } : undefined}
              aria-pressed={active}
              onClick={() => toggleTheme(t.id)}
            >
              {t.id === book.themes[0] ? '★ ' : ''}{t.label}
            </button>
          );
        })}
      </div>

      {related.length > 0 && (
        <>
          <p className="eyebrow" style={{ marginTop: 14 }}>Related</p>
          <ul className="book-related-list">
            {related.map(({ b, rel }) => (
              <li key={b.id}>
                <button type="button" onClick={() => onSelect(b.id)}>
                  <span className="book-related-title">{b.title}</span>
                  <span className="muted-row">
                    {rel.sameAuthor
                      ? 'same author'
                      : rel.sharedThemes.map((t) => themeById(t).label.toLowerCase()).join(', ')}
                    {b.status === 'wishlist' ? ' · wishlist' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="book-detail-actions">
        <button type="button" className="btn-ghost book-delete" onClick={() => onDelete(book.id)}>
          Remove book
        </button>
      </div>
    </div>
  );
};

export default BookDetailCard;

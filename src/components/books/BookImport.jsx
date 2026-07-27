import React, { useMemo, useState } from 'react';
import { parseImport } from '../../lib/bookCloud.js';

// Paste-import for the Audible library / wishlist pages. Accepts both
// one-book-per-line ("Title by Author", "Title — Author", tab-separated)
// and the multi-line blocks a select-all copy of the Audible library
// produces ("Title" / "By: Author" / "Narrated by: …"). Shows a live
// preview count; nothing is saved until Import is tapped.
//
// Props: onImport(parsedBooks, status)

const BookImport = ({ onImport }) => {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('read');
  const parsed = useMemo(() => parseImport(text), [text]);

  const handleImport = () => {
    if (!parsed.length) return;
    onImport(parsed, status);
    setText('');
  };

  return (
    <div className="tight-card book-import">
      <p className="eyebrow">Import from Audible</p>
      <p className="muted-row" style={{ marginTop: 6 }}>
        On audible.com open <strong>Library</strong> (or <strong>Wish List</strong>), select the
        list with Ctrl/Cmd-A, copy, and paste it here. Plain “Title by Author” lines work too.
      </p>
      <textarea
        className="book-import-text"
        rows={5}
        placeholder={'Atomic Habits\nBy: James Clear\n…or one per line:\nDeep Work by Cal Newport'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="book-import-row">
        <div className="book-status-toggle" role="radiogroup" aria-label="Import as">
          <button
            type="button"
            className={status === 'read' ? 'on' : ''}
            aria-pressed={status === 'read'}
            onClick={() => setStatus('read')}
          >
            Read
          </button>
          <button
            type="button"
            className={status === 'wishlist' ? 'on' : ''}
            aria-pressed={status === 'wishlist'}
            onClick={() => setStatus('wishlist')}
          >
            Wishlist
          </button>
        </div>
        <button type="button" className="btn-primary" disabled={!parsed.length} onClick={handleImport}>
          Import {parsed.length > 0 ? `${parsed.length} book${parsed.length === 1 ? '' : 's'}` : ''}
        </button>
      </div>
    </div>
  );
};

export default BookImport;

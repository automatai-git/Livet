import React, { useState, useRef, useCallback, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { convertPdfToEpub, DEFAULT_OPTIONS } from '../lib/book/pipeline';

const ACCENT = 'var(--accent-book)';
const PREFS_KEY = 'bookConverterOptions_v1';

// Grouped toggle definitions so the option panel stays declarative.
const OPTION_GROUPS = [
  {
    label: 'Page furniture',
    items: [
      ['removeHeadersFooters', 'Running headers & footers', 'Repeated chapter/author lines in the top & bottom margins.'],
      ['removePageNumbers', 'Page numbers', 'Lone numbers sitting in a margin band.'],
      ['removeFootnotes', 'Footnote & endnote blocks', 'Small-font notes clustered at the bottom of a page.'],
    ],
  },
  {
    label: 'Citations & references',
    items: [
      ['removeCitations', 'Strip citation markers', 'Master switch for the reference cleanups below.'],
      ['removeBracketCitations', 'Bracketed refs — [12], [3, 4]', 'Numeric reference markers in square brackets.'],
      ['removeGluedSuperscripts', 'Superscript note numbers', 'Raised digits glued to words, e.g. “evidence.¹²”.'],
      ['removeAuthorYear', 'Parenthetical author–year — (Smith, 2001)', 'Aggressive: can occasionally remove real parentheticals.'],
    ],
  },
  {
    label: 'Text repair',
    items: [
      ['dehyphenate', 'Re-join hyphenated line breaks', 'Glue words split across a line, e.g. “hy-\\nphen” → “hyphen”.'],
    ],
  },
];

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_OPTIONS };
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const BookConverter = () => {
  const [options, setOptions] = useState(loadPrefs);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [progress, setProgress] = useState({ frac: 0, msg: '' });
  const [result, setResult] = useState(null);    // { blob, stats, plainText }
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const urlRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(options)); } catch { /* ignore */ }
  }, [options]);

  // Revoke any object URL we created when it's replaced or on unmount.
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const toggle = (key) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
      setError('Please choose a PDF file.');
      setStatus('error');
      return;
    }
    setFile(f);
    setResult(null);
    setError('');
    setStatus('idle');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }, []);

  const convert = async () => {
    if (!file || status === 'working') return;
    setStatus('working');
    setError('');
    setResult(null);
    setProgress({ frac: 0, msg: 'Starting…' });
    try {
      const out = await convertPdfToEpub(file, options, (frac, msg) =>
        setProgress({ frac, msg }));
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(out.blob);
      setResult(out);
      setStatus('done');
    } catch (e) {
      console.error('Conversion failed:', e);
      setError(e?.message || 'Conversion failed.');
      setStatus('error');
    }
  };

  const download = () => {
    if (!result || !urlRef.current) return;
    const a = document.createElement('a');
    a.href = urlRef.current;
    a.download = result.stats.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const box = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 };
  const label = { fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10 };

  return (
    <AppShell title={<>Audiobook <em>Prep</em></>} accent={ACCENT} backLabel="← Dashboard">
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20, lineHeight: 1.5 }}>
        Turn a book PDF into a clean EPUB for <strong>ElevenReader</strong>. Built for dense academic texts:
        it strips footnotes, citation markers, running heads and page numbers so the narrator reads
        the argument, not the apparatus.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? ACCENT : 'var(--border)'}`,
          background: dragging ? 'color-mix(in srgb, var(--accent-book) 8%, var(--card))' : 'var(--card)',
          borderRadius: 16, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <input
          ref={inputRef} type="file" accept="application/pdf,.pdf" hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>📖 → 🎧</div>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
          {file ? file.name : 'Drop a PDF here, or click to choose'}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {file ? `${humanSize(file.size)} · ready to convert` : 'Everything runs in your browser — nothing is uploaded.'}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ ...box, marginTop: 16 }}>
        <div style={label}>Book details (optional)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input
            placeholder="Title" value={options.title}
            onChange={(e) => setOptions((o) => ({ ...o, title: e.target.value }))}
            style={inputStyle}
          />
          <input
            placeholder="Author" value={options.author}
            onChange={(e) => setOptions((o) => ({ ...o, author: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Left blank, these are read from the PDF metadata or the file name.
        </div>
      </div>

      {/* Options */}
      <div style={{ ...box, marginTop: 16 }}>
        <div style={label}>Cleanup options</div>
        {OPTION_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{group.label}</div>
            {group.items.map(([key, name, desc]) => {
              const parentOff = key !== 'removeCitations' &&
                ['removeBracketCitations', 'removeGluedSuperscripts', 'removeAuthorYear'].includes(key) &&
                !options.removeCitations;
              return (
                <label key={key} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0',
                  cursor: parentOff ? 'not-allowed' : 'pointer', opacity: parentOff ? 0.45 : 1,
                }}>
                  <input
                    type="checkbox" checked={!!options[key]} disabled={parentOff}
                    onChange={() => toggle(key)}
                    style={{ marginTop: 3, accentColor: 'var(--accent-book)', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' }}>{name}</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>{desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      {/* Convert */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          className="btn-primary" onClick={convert} disabled={!file || status === 'working'}
          style={{ background: 'var(--accent-book)', flex: '1 1 auto', minWidth: 160 }}
        >
          {status === 'working' ? 'Converting…' : 'Convert to EPUB'}
        </button>
        {status === 'done' && (
          <button className="btn-primary" onClick={download}
            style={{ background: 'var(--accent-book)', flex: '1 1 auto', minWidth: 160 }}>
            ⬇ Download {result.stats.fileName}
          </button>
        )}
      </div>

      {/* Progress */}
      {status === 'working' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.round(progress.frac * 100)}%`, height: '100%',
              background: 'var(--accent-book)', transition: 'width 0.2s',
            }} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>{progress.msg}</div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div style={{ marginTop: 16, background: 'var(--danger-bg)', color: 'var(--danger)', padding: 14, borderRadius: 12, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Result */}
      {status === 'done' && result && (
        <div style={{ ...box, marginTop: 16 }}>
          <div style={label}>Result</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Stat n={result.stats.chapters} l="chapters" />
            <Stat n={result.stats.words.toLocaleString()} l="words" />
            <Stat n={`~${result.stats.minutes}m`} l="listen time" />
            <Stat n={result.stats.pages} l="pdf pages" />
            <Stat n={humanSize(result.stats.sizeBytes)} l="epub size" />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Chapters detected from <strong>{result.stats.chapterSource === 'outline' ? 'the PDF’s bookmarks'
              : result.stats.chapterSource === 'headings' ? 'heading detection' : 'a single-section fallback'}</strong>
            {result.stats.droppedHeadFoot > 0 && ` · removed ${result.stats.droppedHeadFoot} recurring header/footer line(s)`}.
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-book)' }}>
              Preview cleaned text
            </summary>
            <pre style={{
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: 1.55,
              color: 'var(--text)', background: 'var(--bg)', padding: 12, borderRadius: 10, marginTop: 10,
              maxHeight: 340, overflow: 'auto',
            }}>
              {result.plainText.slice(0, 4000)}{result.plainText.length > 4000 ? '\n\n…' : ''}
            </pre>
          </details>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            <strong>Next:</strong> open ElevenReader → <em>＋ Add</em> → import this EPUB, then press play.
          </div>
        </div>
      )}
    </AppShell>
  );
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
  borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

const Stat = ({ n, l }) => (
  <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{n}</div>
    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{l}</div>
  </div>
);

export default BookConverter;

import React, { useState } from 'react';
import AppIcon from '../AppIcon';
import { isDone, detectTarget, plainText } from '../../lib/goals.js';

// Sprint state: the extracted commitments as live trackers. A tick item is
// a one-tap done toggle; a count item steps toward its target; any item can
// be closed out (dropped from scope — distinct from done). Below the items,
// a dated note log for rulings and rep lines.

const noteId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const today = () => new Date().toISOString().slice(0, 10);

const ItemRow = ({ item, onChange }) => {
  const done = isDone(item);
  const closed = item.status === 'closed';

  const toggleTick = () =>
    onChange({ ...item, status: done ? 'open' : 'done' });
  const step = (d) => {
    const count = Math.max(0, item.count + d);
    // Stepping a counter to target flips it done; stepping back reopens.
    const status = item.target && count >= item.target ? 'done' : 'open';
    onChange({ ...item, count, status });
  };

  return (
    <div className={`goal-item${done ? ' done' : ''}${closed ? ' closed' : ''}`}>
      {item.type === 'count' && !closed ? (
        <div className="goal-count-ctrl">
          <button type="button" aria-label="Minus one" onClick={() => step(-1)} disabled={item.count === 0}>−</button>
          <span className="goal-count tabular">{item.count}<span className="goal-count-target">/{item.target}</span></span>
          <button type="button" aria-label="Plus one" onClick={() => step(1)}>+</button>
        </div>
      ) : (
        <button
          type="button"
          className={`goal-tick${done ? ' on' : ''}`}
          aria-label={done ? 'Untick' : 'Tick'}
          onClick={toggleTick}
          disabled={closed}
        >
          {done && <AppIcon name="check" size={14} strokeWidth="2.4" />}
        </button>
      )}
      <div className="goal-item-body">
        <div className="goal-item-label">{item.label}</div>
        {item.detail && !closed && <div className="goal-item-detail">{item.detail}</div>}
      </div>
      <button
        type="button"
        className="goal-close-btn"
        onClick={() => onChange({ ...item, status: closed ? 'open' : 'closed' })}
      >
        {closed ? 'Reopen' : 'Close'}
      </button>
    </div>
  );
};

const SprintTracker = ({ items, notes, onItemsChange, onNotesChange }) => {
  const [draft, setDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const open = items.filter((it) => it.status !== 'closed');
  const closedItems = items.filter((it) => it.status === 'closed');

  const changeItem = (next) =>
    onItemsChange(items.map((it) => (it.id === next.id ? next : it)));

  // Manual add: a trailing "— N" (or "≥N" etc.) makes it a counter.
  const addItem = () => {
    const label = plainText(draft).trim();
    if (!label) return;
    const target = detectTarget(draft);
    onItemsChange([
      ...items,
      {
        id: `m-${noteId()}`,
        label,
        detail: '',
        type: target && target > 1 ? 'count' : 'tick',
        target: target && target > 1 ? target : null,
        count: 0,
        status: 'open',
        source: 'manual',
      },
    ]);
    setDraft('');
  };

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    onNotesChange([{ id: noteId(), date: today(), text }, ...notes]);
    setNoteDraft('');
  };

  return (
    <>
      <section className="surface-card goal-card">
        <div className="eyebrow">Commitments</div>
        {open.length === 0 && (
          <p className="muted-row">No open items — load a sprint file under Current, or add one below.</p>
        )}
        {open.map((it) => <ItemRow key={it.id} item={it} onChange={changeItem} />)}
        <div className="goal-add-row">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
            placeholder="Add an item… (“asks — 3” makes a counter)"
          />
          <button type="button" onClick={addItem} disabled={!draft.trim()}>Add</button>
        </div>
        {closedItems.length > 0 && (
          <>
            <div className="eyebrow goal-closed-head">Closed</div>
            {closedItems.map((it) => <ItemRow key={it.id} item={it} onChange={changeItem} />)}
          </>
        )}
      </section>

      <section className="surface-card goal-card">
        <div className="eyebrow">Notes · rulings and rep log</div>
        <div className="goal-add-row">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
            placeholder="One line, logged with today’s date…"
          />
          <button type="button" onClick={addNote} disabled={!noteDraft.trim()}>Log</button>
        </div>
        {notes.length === 0 && <p className="muted-row">Nothing logged yet.</p>}
        <ul className="goal-notes">
          {notes.map((n) => (
            <li key={n.id}>
              <span className="goal-note-date tabular">{n.date}</span>
              <span className="goal-note-text">{n.text}</span>
              <button
                type="button"
                className="goal-note-del"
                aria-label="Delete note"
                onClick={() => onNotesChange(notes.filter((x) => x.id !== n.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

export default SprintTracker;

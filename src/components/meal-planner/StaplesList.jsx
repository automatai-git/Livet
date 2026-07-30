import React, { useState } from 'react';
import { STAPLE_SUGGESTIONS, addStaple, removeStaple, toggleStaple } from '../../lib/staples';

// The household staples list that sits under the week's menu: the things you
// keep at home besides the meals — toilet paper, soda, salt, oil. Tick a
// staple to mark it running low; ticked staples join the exported shopping
// list, filed into their own store sections alongside the ingredients.
//
// Props: staples, onChange(nextList)
const StaplesList = ({ staples = [], onChange }) => {
  const [draft, setDraft] = useState('');

  const commit = (next) => { if (next !== staples) onChange?.(next); };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    commit(addStaple(staples, draft));
    setDraft('');
  };

  const lowCount = staples.filter((s) => s.need).length;

  return (
    <section className="surface-card staples-card">
      <div className="section-head">
        <span className="eyebrow">Always at home</span>
        {lowCount > 0 && (
          <span className="staples-count">{lowCount} to buy</span>
        )}
      </div>
      <p className="muted-row staples-hint">
        Everything you keep in stock besides the meals. Tick what’s running low —
        ticked items join the shopping list.
      </p>

      <form className="staples-add" onSubmit={handleAdd}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item…"
          aria-label="Add a household item"
        />
        <button type="submit" className="ink-pill sm" disabled={!draft.trim()}>Add</button>
      </form>

      {staples.length === 0 ? (
        <div className="staples-empty">
          <p className="muted-row">Nothing here yet. Tap one to start:</p>
          <div className="staples-suggestions">
            {STAPLE_SUGGESTIONS.map((name) => (
              <button
                key={name}
                type="button"
                className="ghost-pill sm"
                onClick={() => commit(addStaple(staples, name))}
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="staples-list">
          {staples.map((item) => (
            <li key={item.id} className={`staple-row${item.need ? ' low' : ''}`}>
              <label className="staple-main">
                <input
                  type="checkbox"
                  checked={item.need}
                  onChange={() => commit(toggleStaple(staples, item.id))}
                />
                <span className="staple-name">{item.name}</span>
              </label>
              <button
                type="button"
                className="staple-remove"
                aria-label={`Remove ${item.name}`}
                onClick={() => commit(removeStaple(staples, item.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default StaplesList;

import React, { useEffect, useMemo, useState } from 'react';
import { WADA_COLOURS } from '../../data/wadaData.js';
import { wearableColours } from '../../data/colourData.js';
import { SLOT_SETS, buildOutfitLibrary, assignSlots, suggestMetal, filterLibrary, relativeLuminance } from '../../lib/colourMatch.js';

const SAVED_KEY = 'outfit-matcher-saved-v1';

const SLOT_LABELS = { jacket: 'Jacket', top: 'Top', trousers: 'Trousers', accent: 'Accent / scarf' };
const PIECE_OPTIONS = [2, 3, 4];
const BAND_OPTIONS = [
  { value: 'low', label: 'Soft' },
  { value: 'medium', label: 'Balanced' },
  { value: 'high', label: 'Bold' },
  { value: 'any', label: 'All' },
];

const chipStyle = (active) => ({
  background: active ? 'var(--text)' : 'transparent',
  color: active ? 'white' : 'var(--text-muted)',
  padding: '6px 14px', minHeight: 36, borderRadius: '18px',
  border: active ? '1.5px solid var(--text)' : '1.5px solid var(--border)',
  whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
});

// Ink on light swatches, ivory on dark — by luminance, never per-hex.
const isLightSwatch = (hex) => relativeLuminance(hex) > 0.55;
const swatchText = (hex) => (isLightSwatch(hex) ? '#1B3B2F' : '#F5F3ED');

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
  } catch {
    return [];
  }
};

const OutfitMatcher = () => {
  const library = useMemo(() => buildOutfitLibrary(WADA_COLOURS, wearableColours), []);

  const [pieces, setPieces] = useState(3);
  const [band, setBand] = useState('any');
  const [mustInclude, setMustInclude] = useState(null);
  const [locks, setLocks] = useState({});
  const [comboId, setComboId] = useState(null);
  const [saved, setSaved] = useState(loadSaved);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }, [saved]);

  const required = [...(mustInclude ? [mustInclude] : []), ...Object.values(locks)];
  const candidates = filterLibrary(library, { pieces, band, mustInclude: [...new Set(required)] });
  const current = candidates.find((c) => c.id === comboId) ?? candidates[0] ?? null;

  const slots = current ? SLOT_SETS[current.colours.length] : [];
  const assignment = current ? assignSlots(current.colours, slots, locks) : {};
  const metal = current ? suggestMetal(current.colours) : null;

  const savedKey = current ? `${current.id}:${slots.map((s) => assignment[s].name).join('|')}` : null;
  const isSaved = saved.some((o) => o.key === savedKey);

  const shuffle = () => {
    if (candidates.length < 2) return;
    const others = candidates.filter((c) => c.id !== current?.id);
    setComboId(pickRandom(others).id);
  };

  const setPieceCount = (n) => {
    setPieces(n);
    setLocks((prev) => Object.fromEntries(Object.entries(prev).filter(([slot]) => SLOT_SETS[n].includes(slot))));
  };

  const toggleLock = (slot) => {
    setLocks((prev) => {
      if (prev[slot]) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: assignment[slot].name };
    });
  };

  const clearFilters = () => {
    setBand('any');
    setMustInclude(null);
    setLocks({});
    setComboId(null);
  };

  const saveCurrent = () => {
    if (!current || isSaved) return;
    setSaved((prev) => [
      {
        key: savedKey,
        id: current.id,
        adapted: current.adapted,
        metal,
        slots: slots.map((s) => ({ slot: s, name: assignment[s].name, hex: assignment[s].hex })),
        savedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {PIECE_OPTIONS.map((n) => (
          <button key={n} onClick={() => setPieceCount(n)} style={chipStyle(pieces === n)}>{n} pieces</button>
        ))}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
        {BAND_OPTIONS.map((b) => (
          <button key={b.value} onClick={() => setBand(b.value)} style={chipStyle(band === b.value)}>{b.label}</button>
        ))}
      </div>

      {!current && (
        <div style={{ background: 'var(--card)', padding: '28px 20px', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>No combinations match these filters</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Try a different contrast level, piece count, or clear the locked colours.
          </div>
          <button onClick={clearFilters} style={chipStyle(true)}>Clear filters</button>
        </div>
      )}

      {current && (
        <div style={{ background: 'var(--card)', padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600, flex: 1 }}>Wada no. {current.id}</div>
            {current.adapted && (
              <span
                title="One or more book colours were adapted to their nearest palette colour"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '2px 8px' }}
              >
                adapted
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {candidates.indexOf(current) + 1} of {candidates.length}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            From <em>A Dictionary of Color Combinations</em> · {BAND_OPTIONS.find((b) => b.value === current.band)?.label.toLowerCase()} contrast
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {slots.map((slot) => {
              const c = assignment[slot];
              return (
                <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '14px', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '10px 12px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: c.hex, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', fontSize: '9px', fontFamily: 'monospace', color: swatchText(c.hex) }}>
                    {c.hex.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{SLOT_LABELS[slot]}</div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }} title={c.desc}>{c.name}</div>
                  </div>
                  <button onClick={() => toggleLock(slot)} style={chipStyle(!!locks[slot])} aria-pressed={!!locks[slot]}>
                    {locks[slot] ? 'Locked' : 'Lock'}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '14px 0' }}>
            Accessories: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{metal}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={shuffle} disabled={candidates.length < 2} style={{ ...chipStyle(true), flex: 1, minHeight: 44, opacity: candidates.length < 2 ? 0.5 : 1 }}>
              Shuffle
            </button>
            <button onClick={saveCurrent} disabled={isSaved} style={{ ...chipStyle(false), flex: 1, minHeight: 44, color: isSaved ? 'var(--text-muted)' : 'var(--text)' }}>
              {isSaved ? 'Saved ✓' : 'Save outfit'}
            </button>
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Start from a piece you own</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {wearableColours.map((c) => (
            <button
              key={c.name}
              title={c.name}
              aria-label={`Require ${c.name}`}
              aria-pressed={mustInclude === c.name}
              onClick={() => { setMustInclude((prev) => (prev === c.name ? null : c.name)); setComboId(null); }}
              style={{
                width: '34px', height: '34px', borderRadius: '8px', background: c.hex, cursor: 'pointer', padding: 0,
                border: mustInclude === c.name ? '3px solid var(--text)' : isLightSwatch(c.hex) ? '1px solid var(--border)' : '1px solid transparent',
              }}
            ></button>
          ))}
        </div>
        {mustInclude && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Showing combinations with <span style={{ fontWeight: 600, color: 'var(--text)' }}>{mustInclude}</span> — tap the swatch again to clear.
          </div>
        )}
      </div>

      {saved.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Saved outfits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {saved.map((o) => (
              <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--card)', padding: '12px 14px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {o.slots.map((s) => (
                    <div key={s.slot} title={`${SLOT_LABELS[s.slot]}: ${s.name}`} style={{ width: '28px', height: '28px', borderRadius: '6px', background: s.hex, border: isLightSwatch(s.hex) ? '1px solid var(--border)' : 'none' }}></div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Wada no. {o.id}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.slots.map((s) => s.name).join(' · ')} · {o.metal}
                  </div>
                </div>
                <button
                  onClick={() => setSaved((prev) => prev.filter((x) => x.key !== o.key))}
                  aria-label={`Remove saved outfit ${o.id}`}
                  style={{ ...chipStyle(false), padding: '6px 10px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutfitMatcher;

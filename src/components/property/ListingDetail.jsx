import React, { useState, useEffect, useId } from 'react';
import {
  displayPrice, formatNok, formatNokCompact, priceCut, parseJsonArray,
  daysOnMarket,
} from '../../lib/property';
import { ScoreChip } from './ListingCard';

// Price history as a small inline sparkline. Flat histories still draw a
// line so "no change" is visible rather than blank.
const Sparkline = ({ history }) => {
  const entries = parseJsonArray(history).filter((e) => e && e.price != null);
  if (entries.length < 2) return null;
  const w = 220, h = 44, pad = 4;
  const prices = entries.map((e) => e.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / (prices.length - 1);
    const y = pad + ((max - p) * (h - pad * 2)) / span;
    return [x, y];
  });
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className="listing-sparkline" aria-hidden="true">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" />
    </svg>
  );
};

// Full-screen detail sheet for one listing. `onUserFields` persists
// user_state / user_notes (the app's only writable columns) and updates the
// parent list optimistically.
const ListingDetail = ({ listing, onClose, onUserFields }) => {
  const [notes, setNotes] = useState(listing.user_notes ?? '');
  const titleId = useId();
  const notesId = useId();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cut = priceCut(listing.price_history);
  const flags = parseJsonArray(listing.red_flags);
  const highlights = parseJsonArray(listing.highlights);
  const dom = daysOnMarket(listing.first_seen);
  const gone = listing.active === false;
  const hasCoords = listing.lat != null && listing.lon != null;

  const setState = (state) =>
    onUserFields(listing.finnkode, { user_state: listing.user_state === state ? null : state });
  const saveNotes = () => {
    if ((listing.user_notes ?? '') !== notes) {
      onUserFields(listing.finnkode, { user_notes: notes });
    }
  };

  const facts = [
    ['Totalpris', listing.total_price != null ? formatNok(listing.total_price) : null],
    ['Prisantydning', listing.price != null ? formatNok(listing.price) : null],
    ['Pris / m²', listing.price_per_m2 != null ? `${formatNok(Math.round(listing.price_per_m2))}` : null],
    ['Areal', listing.area_m2 != null ? `${listing.area_m2} m²` : null],
    ['Soverom', listing.bedrooms != null ? String(listing.bedrooms) : null],
    ['Type', listing.property_type],
    ['Days on market', dom != null ? `${dom} d` : null],
    ['Profile', listing.profile === 'fritid' ? 'Fritid (cabin)' : 'Bolig'],
  ].filter(([, v]) => v != null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="listing-detail-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="listing-detail-card">
        {listing.image_url && (
          <img className="listing-detail-img" src={listing.image_url} alt="" />
        )}
        <div className="listing-detail-body">
          <div className="listing-top">
            <h2 id={titleId} className="heading-serif listing-detail-title">
              {listing.heading ?? `Finn ${listing.finnkode}`}
            </h2>
            <ScoreChip listing={listing} size="lg" />
          </div>
          <div className="listing-meta">
            {[listing.location, gone ? 'Gone from Finn (sold/withdrawn)' : null].filter(Boolean).join(' · ')}
          </div>

          <div className="listing-detail-price">
            <span className="listing-price lg">{formatNokCompact(displayPrice(listing))}</span>
            {cut && (
              <span className="listing-cut-badge">
                −{formatNokCompact(cut.delta)} ({formatNok(cut.from)} → {formatNok(cut.to)})
              </span>
            )}
            <Sparkline history={listing.price_history} />
          </div>

          <div className="listing-facts">
            {facts.map(([k, v]) => (
              <div className="listing-fact" key={k}>
                <span className="listing-fact-k">{k}</span>
                <span className="listing-fact-v">{v}</span>
              </div>
            ))}
          </div>

          {listing.eval_summary ? (
            <div className="listing-eval">
              <div className="eyebrow">Claude's read</div>
              <p>{listing.eval_summary}</p>
            </div>
          ) : (
            <div className="listing-eval queued">
              Not evaluated yet — fresh listings are scored daily at 13:00.
            </div>
          )}

          {highlights.length > 0 && (
            <ul className="listing-points good">
              {highlights.map((hl) => <li key={hl}>{hl}</li>)}
            </ul>
          )}
          {flags.length > 0 && (
            <ul className="listing-points bad">
              {flags.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}

          <div className="listing-links">
            {listing.url && (
              <a className="ghost-pill" href={listing.url} target="_blank" rel="noreferrer">
                Open on Finn.no ↗
              </a>
            )}
            {hasCoords && (
              <a
                className="ghost-pill"
                href={`https://www.google.com/maps?q=${listing.lat},${listing.lon}`}
                target="_blank" rel="noreferrer"
              >
                Map ↗
              </a>
            )}
          </div>

          <div className="listing-actions" role="group" aria-label="Your state for this listing">
            {[['interested', 'Interested'], ['viewed', 'Viewed'], ['hidden', 'Hide']].map(([state, label]) => (
              <button
                key={state}
                type="button"
                className={`ghost-pill${listing.user_state === state ? ' on-ink' : ''}`}
                aria-pressed={listing.user_state === state}
                onClick={() => setState(state)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="eyebrow" htmlFor={notesId} style={{ display: 'block', marginTop: 16 }}>
            Notes
          </label>
          <textarea
            id={notesId}
            className="listing-notes"
            value={notes}
            placeholder="Viewing impressions, questions for the broker…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />

          <button type="button" className="sticky-action-btn listing-close" onClick={() => { saveNotes(); onClose(); }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;

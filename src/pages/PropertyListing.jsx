import React, { useState, useEffect, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShellV3 from '../components/AppShellV3.jsx';
import OfflineNote from '../components/feedback/OfflineNote.jsx';
import { ScoreChip } from '../components/property/ListingCard.jsx';
import { propertyService } from '../services/propertyService';
import {
  displayPrice, formatNok, formatNokCompact, priceCut, parseJsonArray,
  daysOnMarket,
} from '../lib/property';

// One listing as a focus flow (v3.2 — replaces the modal overlay):
// photo · heading + score · meta · price card · Claude's read · links ·
// state pills · notes. Norwegian for domain terms, English for sentences.

// Price history as a small inline sparkline. Flat histories still draw a
// line so "no change" is visible rather than blank.
const Sparkline = ({ history }) => {
  const entries = parseJsonArray(history).filter((e) => e && e.price != null);
  if (entries.length < 2) return null;
  const w = 132, h = 40, pad = 4;
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

const cutDate = (history) => {
  const entries = parseJsonArray(history).filter((e) => e && e.price != null);
  const last = entries[entries.length - 1];
  const raw = last?.at ?? last?.date ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
};

const PropertyListing = () => {
  const { finnkode } = useParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState(propertyService.getCachedListings);
  const [offline, setOffline] = useState(false);
  const notesId = useId();

  const listing = listings.find((l) => String(l.finnkode) === String(finnkode)) ?? null;
  // null = untouched → show the stored notes; a string only once the user
  // types, so refetches never clobber an edit in progress.
  const [notesDraft, setNotesDraft] = useState(null);
  const notes = notesDraft ?? listing?.user_notes ?? '';

  useEffect(() => {
    let cancelled = false;
    propertyService.getListings().then(({ listings, offline }) => {
      if (cancelled) return;
      setListings(listings);
      setOffline(offline);
    });
    return () => { cancelled = true; };
  }, []);

  const updateUserFields = (fields) => {
    setListings((rows) => rows.map((r) =>
      String(r.finnkode) === String(finnkode) ? { ...r, ...fields } : r
    ));
    propertyService.updateUserFields(listing.finnkode, fields).then(({ ok }) => setOffline(!ok));
  };

  const saveNotes = () => {
    if (listing && (listing.user_notes ?? '') !== notes) {
      updateUserFields({ user_notes: notes });
    }
  };

  if (!listing) {
    return (
      <AppShellV3 app="property" title="Listing" back="/property" hideTabBar>
        <div className="listing-empty">
          Listing {finnkode} isn’t in the collected set (it may have been removed).
        </div>
      </AppShellV3>
    );
  }

  const cut = priceCut(listing.price_history);
  const flags = parseJsonArray(listing.red_flags);
  const highlights = parseJsonArray(listing.highlights);
  const dom = daysOnMarket(listing.first_seen);
  const gone = listing.active === false;
  const hasCoords = listing.lat != null && listing.lon != null;

  const setState = (state) =>
    updateUserFields({ user_state: listing.user_state === state ? null : state });

  // Totalpris is the honest number; prisantydning only fronts when there is
  // no totalpris (v3.2 — the rest of the old facts grid moved into the meta
  // or is implied by the scope).
  const facts = [
    listing.total_price != null
      ? ['Totalpris', formatNok(listing.total_price)]
      : listing.price != null ? ['Prisantydning', formatNok(listing.price)] : null,
    listing.price_per_m2 != null ? ['Pris/m²', formatNok(Math.round(listing.price_per_m2))] : null,
    listing.area_m2 != null ? ['Areal', `${listing.area_m2} m²`] : null,
    listing.bedrooms != null ? ['Soverom', String(listing.bedrooms)] : null,
  ].filter(Boolean);

  const readLines = [
    ...highlights.map((text) => ({ text, kind: 'good' })),
    ...flags.map((text) => ({ text, kind: 'bad' })),
  ];

  return (
    <AppShellV3
      app="property"
      title="Listing"
      back="/property"
      hideTabBar
      action={{ label: 'Done', onClick: () => { saveNotes(); navigate('/property'); } }}
    >
      {listing.image_url && (
        <img className="listing-detail-img" src={listing.image_url} alt="" />
      )}

      <div className="listing-top listing-page-top">
        <h2 className="heading-serif listing-detail-title">
          {listing.heading ?? `Finn ${listing.finnkode}`}
        </h2>
        <ScoreChip listing={listing} size="lg" />
      </div>
      <div className="listing-meta">
        {[
          listing.location,
          dom != null ? `${dom} days on Finn` : null,
          gone ? 'gone from Finn (sold/withdrawn)' : null,
        ].filter(Boolean).join(' · ')}
      </div>

      <section className="surface-card listing-price-card">
        <div className="listing-price-main">
          <div>
            <div className="heading-serif listing-price-serif">
              {formatNokCompact(displayPrice(listing))}
            </div>
            {cut && (
              <div className="listing-cut-badge">
                −{formatNokCompact(cut.delta)}{cutDate(listing.price_history) ? ` · ${cutDate(listing.price_history)}` : ''}
              </div>
            )}
          </div>
          <Sparkline history={listing.price_history} />
        </div>
        <div className="listing-fact-strip">
          {facts.map(([k, v]) => (
            <div className="listing-fact-cell" key={k}>
              <span className="listing-fact-k">{k}</span>
              <span className="listing-fact-v">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card listing-read-card">
        <div className="eyebrow">Claude's read</div>
        {listing.eval_summary ? (
          <p className="listing-read-summary">{listing.eval_summary}</p>
        ) : (
          <p className="listing-read-queued">
            Not evaluated yet — fresh listings are scored daily at 13:00.
          </p>
        )}
        {readLines.length > 0 && (
          <ul className="listing-read-lines">
            {readLines.map(({ text, kind }) => (
              <li key={text} className={kind}>{text}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="listing-links">
        {listing.url && (
          <a className="ghost-pill" href={listing.url} target="_blank" rel="noreferrer">
            Finn.no ↗
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

      <label className="eyebrow listing-notes-label" htmlFor={notesId}>
        Notes
      </label>
      <textarea
        id={notesId}
        className="listing-notes"
        value={notes}
        placeholder="Viewing impressions, questions for the broker…"
        onChange={(e) => setNotesDraft(e.target.value)}
        onBlur={saveNotes}
      />

      {offline && <OfflineNote />}
    </AppShellV3>
  );
};

export default PropertyListing;

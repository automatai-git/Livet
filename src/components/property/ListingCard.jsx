import React from 'react';
import {
  displayPrice, formatNokCompact, formatNok, priceCut, parseJsonArray,
  VIEWING_THRESHOLD,
} from '../../lib/property';

// One listing in the browse list. The whole card is the tap target (opens
// the detail sheet); everything here is glanceable summary only.

export const ScoreChip = ({ listing, size = 'sm' }) => {
  const { score, recommendation, status } = listing;
  if (score == null) {
    return (
      <span className={`listing-score-chip ${size} queued`}>
        {status === 'evaluated' ? '—' : 'Not scored yet'}
      </span>
    );
  }
  const rec = recommendation === 'view' ? 'view' : recommendation === 'skip' ? 'skip' : 'maybe';
  return (
    <span className={`listing-score-chip ${size} ${rec}`}>
      {score}
      <span className="listing-score-rec">{rec}</span>
    </span>
  );
};

const ListingCard = ({ listing, onOpen }) => {
  const cut = priceCut(listing.price_history);
  const flags = parseJsonArray(listing.red_flags);
  const gone = listing.active === false;
  const hot = (listing.score ?? 0) >= VIEWING_THRESHOLD && !gone;
  const meta = [
    listing.location,
    listing.area_m2 != null ? `${listing.area_m2} m²` : null,
    listing.bedrooms != null ? `${listing.bedrooms} soverom` : null,
    listing.property_type,
  ].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      className={`listing-card surface-card${hot ? ' hot' : ''}${gone ? ' gone' : ''}`}
      onClick={() => onOpen(listing)}
      aria-label={`Open ${listing.heading ?? listing.finnkode}`}
    >
      {listing.image_url && (
        <img className="listing-img" src={listing.image_url} alt="" loading="lazy" />
      )}
      <div className="listing-body">
        <div className="listing-top">
          <div className="listing-heading">{listing.heading ?? `Finn ${listing.finnkode}`}</div>
          <ScoreChip listing={listing} />
        </div>
        {meta && <div className="listing-meta">{meta}</div>}
        <div className="listing-price-row">
          <span className="listing-price">{formatNokCompact(displayPrice(listing))}</span>
          {cut && (
            <span className="listing-cut-badge" title={`Price cut from ${formatNok(cut.from)}`}>
              −{formatNokCompact(cut.delta)}
            </span>
          )}
          {hot && <span className="listing-hot-chip">Book a viewing</span>}
          {gone && <span className="listing-gone-chip">Gone from Finn</span>}
          {listing.user_state === 'interested' && <span className="listing-interest-chip">Interested</span>}
          {listing.user_state === 'viewed' && <span className="listing-interest-chip viewed">Viewed</span>}
        </div>
        {flags.length > 0 && (
          <div className="listing-flag">⚑ {flags[0]}</div>
        )}
      </div>
    </button>
  );
};

export default ListingCard;

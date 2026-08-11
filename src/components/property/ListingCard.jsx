import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import {
  displayPrice, formatNokCompact, formatNok, priceCut, parseJsonArray,
  daysOnMarket, isNewToday,
} from '../../lib/property';

// Browse-list surfaces for one listing. Rich card for the "Book a viewing"
// group, compact row for the awaiting/rest groups. Whole surface links to
// the /property/:finnkode focus flow.

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

const domLabel = (listing) => {
  const dom = daysOnMarket(listing.first_seen);
  return dom != null ? `${dom} d on Finn` : null;
};

// Rich card — "Book a viewing" group.
const ListingCard = ({ listing }) => {
  const cut = priceCut(listing.price_history);
  const flags = parseJsonArray(listing.red_flags);
  const gone = listing.active === false;
  const meta = [
    listing.location,
    listing.area_m2 != null ? `${listing.area_m2} m²` : null,
    listing.bedrooms != null ? `${listing.bedrooms} soverom` : null,
    domLabel(listing),
  ].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/property/${listing.finnkode}`}
      className={`listing-card surface-card${gone ? ' gone' : ''}`}
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
          {gone && <span className="listing-gone-chip">Gone from Finn</span>}
          {listing.user_state === 'interested' && <span className="listing-interest-chip">Interested</span>}
          {listing.user_state === 'viewed' && <span className="listing-interest-chip viewed">Viewed</span>}
        </div>
        {flags.length > 0 && (
          <div className="listing-flag">
            <AppIcon name="flag" size={14} strokeWidth="1.8" />
            {flags[0]}
          </div>
        )}
      </div>
    </Link>
  );
};

// Compact row — awaiting-score and "the rest" groups. Standard row anatomy:
// thumb/icon chip · title · meta · status chip · chevron.
export const ListingRow = ({ listing }) => {
  const gone = listing.active === false;
  const skip = listing.recommendation === 'skip';
  const cut = priceCut(listing.price_history);
  const fresh = listing.score == null && isNewToday(listing.first_seen);
  const meta = [
    listing.location,
    formatNokCompact(displayPrice(listing)),
    cut ? `−${formatNokCompact(cut.delta)}` : null,
    gone ? 'gone from Finn' : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/property/${listing.finnkode}`}
      className={`listing-row surface-card${skip || gone ? ' dim' : ''}`}
      aria-label={`Open ${listing.heading ?? listing.finnkode}`}
    >
      {listing.image_url ? (
        <img className="listing-row-thumb" src={listing.image_url} alt="" loading="lazy" />
      ) : (
        <span className="icon-chip sm listing-row-chip">
          <AppIcon name="house" size={18} />
        </span>
      )}
      <div className="listing-row-body">
        <div className="row-title sm ellipsis">{listing.heading ?? `Finn ${listing.finnkode}`}</div>
        <div className="row-meta ellipsis">{meta}</div>
      </div>
      {fresh && <span className="listing-new-chip">ny i dag</span>}
      <ScoreChip listing={listing} />
      <AppIcon name="chev" size={14} className="row-chev" />
    </Link>
  );
};

export default ListingCard;

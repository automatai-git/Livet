import React, { useState, useEffect, useMemo } from 'react';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3.jsx';
import ListingCard from '../components/property/ListingCard.jsx';
import ListingDetail from '../components/property/ListingDetail.jsx';
import { propertyService } from '../services/propertyService';
import { sortListings, filterListings, VIEWING_THRESHOLD } from '../lib/property';

// Property Search — browse the Finn.no listings the NAS pipeline collects,
// filters and scores into property_listings (~3x daily). Read-only except
// user_state / user_notes. Contract: HANDOVER-property-search.md.

const PROFILES = [
  ['all', 'All'],
  ['bolig', 'Bolig'],
  ['fritid', 'Fritid'],
];

const PropertySearch = () => {
  const [listings, setListings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [profile, setProfile] = useState('all');
  const [showHidden, setShowHidden] = useState(false);
  const [showGone, setShowGone] = useState(false);
  const [openCode, setOpenCode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    propertyService.getListings().then(({ listings, offline }) => {
      if (cancelled) return;
      setListings(listings);
      setOffline(offline);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => sortListings(filterListings(listings, { profile, showHidden, showGone })),
    [listings, profile, showHidden, showGone]
  );
  const open = openCode != null
    ? listings.find((l) => l.finnkode === openCode) ?? null
    : null;

  // Optimistic: the service caches locally even when the network write
  // fails, so the UI always reflects the tap.
  const updateUserFields = (finnkode, fields) => {
    setListings((rows) => rows.map((r) => (r.finnkode === finnkode ? { ...r, ...fields } : r)));
    propertyService.updateUserFields(finnkode, fields);
  };

  const activeRows = listings.filter((l) => l.active !== false && l.user_state !== 'hidden');
  const hot = activeRows.filter((l) => (l.score ?? 0) >= VIEWING_THRESHOLD).length;
  const unscored = activeRows.filter((l) => l.score == null).length;
  const lastSync = listings.reduce((acc, l) => {
    const t = l.synced_at ? new Date(l.synced_at).getTime() : 0;
    return t > acc ? t : acc;
  }, 0);
  const meta = [
    hot > 0 ? `${hot} worth a viewing (≥${VIEWING_THRESHOLD})` : null,
    unscored > 0 ? `${unscored} awaiting score` : null,
    offline ? 'offline — showing cached data' : lastSync
      ? `synced ${new Date(lastSync).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <AppShellV3
      app="property"
      scope={
        <div className="scope-row" role="group" aria-label="Filter by search profile">
          {PROFILES.map(([id, label]) => (
            <ScopePill key={id} on={profile === id} onClick={() => setProfile(id)}>
              {label}
            </ScopePill>
          ))}
        </div>
      }
      hero={
        <HeroCard
          eyebrow="Finn.no watchlist"
          title={`${activeRows.length} listing${activeRows.length === 1 ? '' : 's'}`}
          meta={meta || 'The NAS collector syncs roughly every 8 hours.'}
        />
      }
    >
      <div className="listing-toggles" role="group" aria-label="Extra listing filters">
        <button
          type="button"
          className={`ghost-pill sm${showGone ? ' on-ink' : ''}`}
          aria-pressed={showGone}
          onClick={() => setShowGone((v) => !v)}
        >
          Sold / gone
        </button>
        <button
          type="button"
          className={`ghost-pill sm${showHidden ? ' on-ink' : ''}`}
          aria-pressed={showHidden}
          onClick={() => setShowHidden((v) => !v)}
        >
          Hidden
        </button>
      </div>

      {!loaded ? (
        <div className="listing-empty">Loading listings…</div>
      ) : visible.length === 0 ? (
        <div className="listing-empty">
          {listings.length === 0
            ? 'Nothing collected yet — the NAS pipeline fills this table roughly every 8 hours.'
            : 'No listings match these filters.'}
        </div>
      ) : (
        <div className="listing-list">
          {visible.map((l) => (
            <ListingCard key={l.finnkode} listing={l} onOpen={(x) => setOpenCode(x.finnkode)} />
          ))}
        </div>
      )}

      {open && (
        <ListingDetail
          listing={open}
          onClose={() => setOpenCode(null)}
          onUserFields={updateUserFields}
        />
      )}
    </AppShellV3>
  );
};

export default PropertySearch;

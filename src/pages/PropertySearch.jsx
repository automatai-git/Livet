import React, { useState, useEffect, useMemo } from 'react';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3.jsx';
import ListingCard, { ListingRow } from '../components/property/ListingCard.jsx';
import PropertyMap from '../components/property/PropertyMap.jsx';
import OfflineNote from '../components/feedback/OfflineNote.jsx';
import { propertyService } from '../services/propertyService';
import {
  filterListings, groupListings, sortListingsBy, applyListingFilters,
  activeFilterCount, SORT_MODES, VIEWING_THRESHOLD,
} from '../lib/property';

// Property Search — browse the Finn.no listings the NAS pipeline collects,
// filters and scores into property_listings (~3x daily). Read-only except
// user_state / user_notes. Contract: HANDOVER-property-search.md.
//
// v3.2: the two profiles are different missions, so there is no "All" —
// scope is Bolig · Fritid · Map, the list groups by verdict, and the detail
// view is a focus flow at /property/:finnkode.

const PROFILE_KEY = 'property-profile-v1';
// Sort + filters, kept per profile (a bolig budget says nothing about a
// cabin budget). The map view applies the same filters as the list.
const CONTROLS_KEY = 'property-controls-v1';
const DEFAULT_CONTROLS = { sort: 'score', maxPrice: null, minBedrooms: null, minArea: null, cutOnly: false };

const readProfile = () => {
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored === 'fritid' ? 'fritid' : 'bolig';
};

const readControls = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CONTROLS_KEY)) || {};
    return {
      bolig: { ...DEFAULT_CONTROLS, ...stored.bolig },
      fritid: { ...DEFAULT_CONTROLS, ...stored.fritid },
    };
  } catch {
    return { bolig: { ...DEFAULT_CONTROLS }, fritid: { ...DEFAULT_CONTROLS } };
  }
};

const SCOPES = [
  ['bolig', 'Bolig'],
  ['fritid', 'Fritid'],
  ['map', 'Map'],
];

const GroupHead = ({ label, hint }) => (
  <div className="section-head listing-group-head">
    <div className="eyebrow">{label}</div>
    {hint && <div className="section-hint">{hint}</div>}
  </div>
);

const PropertySearch = () => {
  const [listings, setListings] = useState(propertyService.getCachedListings);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState(readProfile);
  const [profile, setProfileState] = useState(readProfile);
  const [showHidden, setShowHidden] = useState(false);
  const [showGone, setShowGone] = useState(false);
  const [goneLoaded, setGoneLoaded] = useState(false);
  const [allControls, setAllControls] = useState(readControls);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setProfile = (p) => {
    setProfileState(p);
    localStorage.setItem(PROFILE_KEY, p);
  };

  const controls = allControls[profile];
  const setControls = (patch) => {
    setAllControls((all) => {
      const next = { ...all, [profile]: { ...all[profile], ...patch } };
      localStorage.setItem(CONTROLS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const filterCount = activeFilterCount(controls);

  useEffect(() => {
    let cancelled = false;
    propertyService.getListings().then(({ listings, offline }) => {
      if (cancelled) return;
      setListings(listings);
      setOffline(offline);
      setLoaded(true);
    });
    // Live sync: NAS upserts land without a reload while the page is open.
    const unsubscribe = propertyService.subscribeListings((payload) => {
      if (!cancelled) setListings((rows) => propertyService.applyChange(rows, payload));
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  // Gone listings aren't in the default fetch (or the cache) — pull the full
  // set the first time the "Sold / gone" toggle turns on.
  useEffect(() => {
    if (!showGone || goneLoaded) return;
    let cancelled = false;
    propertyService.getListings({ includeGone: true }).then(({ listings, offline }) => {
      if (cancelled) return;
      setOffline(offline);
      // Offline falls back to the compact cache, which has no gone rows —
      // keep what we have and let the next toggle retry.
      if (offline) return;
      setListings(listings);
      setGoneLoaded(true);
    });
    return () => { cancelled = true; };
  }, [showGone, goneLoaded]);

  const visible = useMemo(
    () => applyListingFilters(
      filterListings(listings, { profile, showHidden, showGone }),
      controls
    ),
    [listings, profile, showHidden, showGone, controls]
  );
  // Verdict groups stay the page structure; the chosen sort orders rows
  // within each group.
  const groups = useMemo(() => {
    const g = groupListings(visible);
    return {
      viewing: sortListingsBy(g.viewing, controls.sort),
      awaiting: sortListingsBy(g.awaiting, controls.sort),
      rest: sortListingsBy(g.rest, controls.sort),
    };
  }, [visible, controls.sort]);

  const profileRows = listings.filter((l) => l.profile === profile);
  const activeRows = profileRows.filter((l) => l.active !== false && l.user_state !== 'hidden');
  const hot = activeRows.filter((l) => (l.score ?? 0) >= VIEWING_THRESHOLD).length;
  const unscored = activeRows.filter((l) => l.score == null).length;
  const hiddenCount = profileRows.filter((l) => l.user_state === 'hidden').length;
  const goneCount = profileRows.filter((l) => l.active === false).length;
  const lastSync = listings.reduce((acc, l) => {
    const t = l.synced_at ? new Date(l.synced_at).getTime() : 0;
    return t > acc ? t : acc;
  }, 0);
  const meta = [
    `${activeRows.length} active`,
    `${unscored} awaiting score`,
    offline ? 'offline' : lastSync
      ? `synced ${new Date(lastSync).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : null,
  ].filter(Boolean).join(' · ');

  const switchScope = (id) => {
    setView(id);
    if (id !== 'map') setProfile(id);
  };

  return (
    <AppShellV3
      app="property"
      scope={
        <div className="scope-row equal" role="group" aria-label="Search profile and view">
          {SCOPES.map(([id, label]) => (
            <ScopePill key={id} on={view === id} onClick={() => switchScope(id)}>
              {label}
            </ScopePill>
          ))}
        </div>
      }
      hero={
        <HeroCard
          eyebrow={`Finn.no watchlist · ${profile === 'fritid' ? 'Fritid' : 'Bolig'}`}
          title={hot > 0 ? `${hot} worth a viewing` : `Nothing at ${VIEWING_THRESHOLD} yet`}
          meta={meta || 'The NAS collector syncs roughly every 8 hours.'}
        />
      }
    >
      <div className="listing-controls" role="group" aria-label="Sort and filter listings">
        {view !== 'map' && (
          <div className="listing-sort-row">
            {SORT_MODES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`ghost-pill sm${controls.sort === id ? ' on-ink' : ''}`}
                aria-pressed={controls.sort === id}
                onClick={() => setControls({ sort: id })}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`ghost-pill sm listing-filter-toggle${filterCount > 0 ? ' armed' : ''}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          Filters{filterCount > 0 ? ` · ${filterCount}` : ''}
        </button>
      </div>

      {filtersOpen && (
        <div className="surface-card listing-filter-card">
          <label className="listing-filter-field">
            <span className="eyebrow">Max totalpris</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="100000"
              placeholder="kr"
              value={controls.maxPrice ?? ''}
              onChange={(e) => setControls({ maxPrice: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
          <label className="listing-filter-field">
            <span className="eyebrow">Min soverom</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="–"
              value={controls.minBedrooms ?? ''}
              onChange={(e) => setControls({ minBedrooms: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
          <label className="listing-filter-field">
            <span className="eyebrow">Min m²</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="5"
              placeholder="–"
              value={controls.minArea ?? ''}
              onChange={(e) => setControls({ minArea: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </label>
          <div className="listing-filter-foot">
            <button
              type="button"
              className={`ghost-pill sm${controls.cutOnly ? ' on-ink' : ''}`}
              aria-pressed={controls.cutOnly}
              onClick={() => setControls({ cutOnly: !controls.cutOnly })}
            >
              Price cut only
            </button>
            {filterCount > 0 && (
              <button
                type="button"
                className="ghost-pill sm"
                onClick={() => setControls({ maxPrice: null, minBedrooms: null, minArea: null, cutOnly: false })}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'map' ? (
        <>
          <div className="scope-row equal pmap-profile-toggle" role="group" aria-label="Map profile">
            {[['bolig', 'Bolig'], ['fritid', 'Fritid']].map(([id, label]) => (
              <ScopePill key={id} on={profile === id} onClick={() => setProfile(id)}>
                {label}
              </ScopePill>
            ))}
          </div>
          <PropertyMap listings={applyListingFilters(filterListings(listings, { profile }), controls)} />
        </>
      ) : !loaded && listings.length === 0 ? (
        <div className="listing-empty">Loading listings…</div>
      ) : visible.length === 0 ? (
        <div className="listing-empty">
          {listings.length === 0
            ? 'Nothing collected yet — the NAS pipeline fills this table roughly every 8 hours.'
            : 'No listings match these filters.'}
        </div>
      ) : (
        <>
          {groups.viewing.length > 0 && (
            <>
              <GroupHead label="Book a viewing" hint={`score ≥ ${VIEWING_THRESHOLD}`} />
              <div className="listing-list">
                {groups.viewing.map((l) => <ListingCard key={l.finnkode} listing={l} />)}
              </div>
            </>
          )}
          {groups.awaiting.length > 0 && (
            <>
              <GroupHead label="Awaiting score" hint="evaluated daily 13:00" />
              <div className="listing-list tight">
                {groups.awaiting.map((l) => <ListingRow key={l.finnkode} listing={l} />)}
              </div>
            </>
          )}
          {groups.rest.length > 0 && (
            <>
              <GroupHead label="The rest" />
              <div className="listing-list tight">
                {groups.rest.map((l) => <ListingRow key={l.finnkode} listing={l} />)}
              </div>
            </>
          )}
        </>
      )}

      {view !== 'map' && (
        <div className="listing-toggles" role="group" aria-label="Extra listing filters">
          <button
            type="button"
            className={`ghost-pill sm${showGone ? ' on-ink' : ''}`}
            aria-pressed={showGone}
            onClick={() => setShowGone((v) => !v)}
          >
            Sold / gone · {goneCount}
          </button>
          <button
            type="button"
            className={`ghost-pill sm${showHidden ? ' on-ink' : ''}`}
            aria-pressed={showHidden}
            onClick={() => setShowHidden((v) => !v)}
          >
            Hidden · {hiddenCount}
          </button>
        </div>
      )}

      {offline && <OfflineNote />}
    </AppShellV3>
  );
};

export default PropertySearch;

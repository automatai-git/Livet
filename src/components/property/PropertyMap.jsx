import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AppIcon from '../AppIcon';
import { ScoreChip } from './ListingCard';
import {
  displayPrice, formatNokCompact, priceCut, VIEWING_THRESHOLD,
} from '../../lib/property';

// Map scope for Property Search (design #9a). Same Leaflet + Esri satellite
// setup as TravelMap; pins are score chips (filled circle with the number),
// coloured by verdict band, dashed outline while queued. Hidden and gone
// listings are filtered out by the caller. Tap a pin → mini card under the
// map that links into /property/:finnkode.

const pinBand = (l) =>
  l.score == null ? 'queued'
    : l.score >= VIEWING_THRESHOLD ? 'view'
      : l.recommendation === 'skip' ? 'skip'
        : 'maybe';

const pinIcon = (listing, selected) =>
  L.divIcon({
    className: 'pmap-pin-wrap',
    html: `<div class="pmap-pin ${pinBand(listing)}${selected ? ' selected' : ''}">${listing.score ?? '·'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const LEGEND = [
  ['view', '≥ 80 — book a viewing'],
  ['maybe', 'maybe'],
  ['skip', 'skip'],
  ['queued', 'awaiting score'],
];

const PropertyMap = ({ listings }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [selectedCode, setSelectedCode] = useState(null);

  const pinnable = listings.filter((l) => l.lat != null && l.lon != null);
  const selected = pinnable.find((l) => l.finnkode === selectedCode) ?? null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [60.5, 9],
      zoom: 6,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    mapRef.current = map;
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', maxZoom: 18 }
    ).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Redraw pins + fit bounds when the visible set (or selection) changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    pinnable.forEach((l) => {
      const marker = L.marker([l.lat, l.lon], {
        icon: pinIcon(l, l.finnkode === selectedCode),
        keyboard: false,
      });
      marker.on('click', () =>
        setSelectedCode((cur) => (cur === l.finnkode ? null : l.finnkode)));
      marker.addTo(layer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, selectedCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || pinnable.length === 0) return;
    map.fitBounds(L.latLngBounds(pinnable.map((l) => [l.lat, l.lon])), {
      padding: [28, 28], maxZoom: 12,
    });
    // Refit only when the set of pins changes, not on selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  const cut = selected ? priceCut(selected.price_history) : null;

  return (
    <div className="pmap">
      <div className="surface-card pmap-card">
        <div ref={containerRef} className="pmap-canvas" />
      </div>
      <div className="pmap-legend" aria-hidden="true">
        {LEGEND.map(([band, label]) => (
          <span key={band} className="pmap-legend-item">
            <span className={`pmap-legend-dot ${band}`} />
            {label}
          </span>
        ))}
      </div>
      {pinnable.length === 0 && (
        <div className="listing-empty">No listings with coordinates in this profile.</div>
      )}
      {selected && (
        <Link
          to={`/property/${selected.finnkode}`}
          className="listing-row surface-card pmap-mini"
          aria-label={`Open ${selected.heading ?? selected.finnkode}`}
        >
          {selected.image_url ? (
            <img className="listing-row-thumb" src={selected.image_url} alt="" loading="lazy" />
          ) : (
            <span className="icon-chip sm listing-row-chip">
              <AppIcon name="house" size={18} />
            </span>
          )}
          <div className="listing-row-body">
            <div className="row-title sm ellipsis">{selected.heading ?? `Finn ${selected.finnkode}`}</div>
            <div className="row-meta ellipsis">
              {[
                selected.location,
                formatNokCompact(displayPrice(selected)),
                cut ? `−${formatNokCompact(cut.delta)}` : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <ScoreChip listing={selected} />
          <AppIcon name="chev" size={14} className="row-chev" />
        </Link>
      )}
    </div>
  );
};

export default PropertyMap;

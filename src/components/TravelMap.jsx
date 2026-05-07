import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ISLANDS } from '../data/travelData';

const STORAGE_KEY = 'travel_custom_pins_v1';

// Fallback geographic anchors so existing islands have real lat/lng even
// though travelData.js only has SVG coordinates.
const ISLAND_LATLNG = {
  'big-island': [19.6, -155.5],
  'oahu':      [21.45, -157.95],
  'maui':      [20.8, -156.3],
  'kauai':     [22.05, -159.5],
};

const loadCustomPins = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};
const saveCustomPins = (pins) => localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));

const TravelMap = ({ onSelectIsland, activeIsland, editable = true }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const islandLayerRef = useRef(null);
  const customLayerRef = useRef(null);
  const [pins, setPins] = useState(loadCustomPins);
  const [editing, setEditing] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20.7, -157.5],
      zoom: 7,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    mapRef.current = map;

    // Esri World Imagery — free, no API key, satellite tiles.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri',
        maxZoom: 18,
      }
    ).addTo(map);

    islandLayerRef.current = L.layerGroup().addTo(map);
    customLayerRef.current = L.layerGroup().addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Draw built-in islands whenever activeIsland changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = islandLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    ISLANDS.forEach((isl) => {
      const ll = ISLAND_LATLNG[isl.id];
      if (!ll) return;
      const isActive = activeIsland === isl.id;
      const marker = L.circleMarker(ll, {
        radius: isActive ? 14 : 9,
        color: '#fff',
        weight: 2,
        fillColor: isl.color,
        fillOpacity: 0.95,
      }).bindTooltip(`${isl.icon} ${isl.name}`, { permanent: false, direction: 'top' });
      marker.on('click', () => onSelectIsland?.(isl.id));
      marker.addTo(layer);
    });
  }, [activeIsland, onSelectIsland]);

  // Draw custom pins whenever they change
  useEffect(() => {
    const layer = customLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    pins.forEach((pin, i) => {
      const m = L.marker([pin.lat, pin.lng], { draggable: editing });
      m.bindPopup(`<strong>${pin.label || 'Untitled'}</strong>${editing ? '<br/><em>Drag to move</em>' : ''}`);
      m.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setPins(prev => {
          const next = prev.map((p, idx) => idx === i ? { ...p, lat, lng } : p);
          saveCustomPins(next);
          return next;
        });
      });
      if (editing) {
        m.on('contextmenu', () => removePin(i));
      }
      m.addTo(layer);
    });
  }, [pins, editing]);

  // Click-to-add when in edit mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e) => {
      if (!editing) return;
      const label = window.prompt('Pin label (e.g. "Snorkel spot"):', '');
      if (label === null) return; // cancelled
      const pin = { lat: e.latlng.lat, lng: e.latlng.lng, label: label.trim() || 'Untitled' };
      setPins(prev => {
        const next = [...prev, pin];
        saveCustomPins(next);
        return next;
      });
    };
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [editing]);

  const removePin = (i) => {
    if (!window.confirm('Remove this pin?')) return;
    setPins(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      saveCustomPins(next);
      return next;
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} className="trip-map" />
      {editable && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500, display: 'flex', gap: 6 }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: editing ? 'var(--primary)' : '#fff',
              color: editing ? '#fff' : 'var(--text)',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            {editing ? '✓ Done' : '✎ Edit pins'}
          </button>
        </div>
      )}
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
        {editing
          ? 'Tap map to add a pin. Drag to move. Long-press / right-click a pin to delete.'
          : 'Tap an island to filter experiences.'}
      </p>
    </div>
  );
};

export default TravelMap;

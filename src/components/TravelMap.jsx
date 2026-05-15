import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import hawaii from '../data/destinations/hawaii';

const LEGACY_STORAGE_KEY = 'travel_custom_pins_v1';
const tripStorageKey = (tripId) => tripId ? `travel_custom_pins_v1:${tripId}` : LEGACY_STORAGE_KEY;

// Pins were originally stored under a single global key. When opening a
// specific trip for the first time, migrate the global pins onto that
// trip's namespaced key so they don't get lost.
const loadCustomPins = (tripId) => {
  const tripKey = tripStorageKey(tripId);
  try {
    const tripData = localStorage.getItem(tripKey);
    if (tripData) return JSON.parse(tripData);
    if (tripId) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(tripKey, legacy);
        return JSON.parse(legacy);
      }
    }
    return [];
  } catch { return []; }
};

const saveCustomPins = (tripId, pins) =>
  localStorage.setItem(tripStorageKey(tripId), JSON.stringify(pins));

const TravelMap = ({ destination = hawaii, tripId, onSelectIsland, activeIsland, editable = true }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const islandLayerRef = useRef(null);
  const customLayerRef = useRef(null);
  const [pins, setPins] = useState(() => loadCustomPins(tripId));
  const [editing, setEditing] = useState(false);

  const islands = destination?.islands ?? [];
  const mapView = useMemo(
    () => destination?.mapView ?? { center: [20.7, -157.5], zoom: 7 },
    [destination]
  );

  // Reload pins if tripId changes (e.g. navigating between trips).
  useEffect(() => {
    setPins(loadCustomPins(tripId));
  }, [tripId]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: mapView.center,
      zoom: mapView.zoom,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw built-in islands whenever activeIsland changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = islandLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    islands.forEach((isl) => {
      const ll = isl.latLng;
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
  }, [activeIsland, onSelectIsland, islands]);

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
          saveCustomPins(tripId, next);
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
        saveCustomPins(tripId, next);
        return next;
      });
    };
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [editing, tripId]);

  const removePin = (i) => {
    if (!window.confirm('Remove this pin?')) return;
    setPins(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      saveCustomPins(tripId, next);
      return next;
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} className="trip-map" />
      {editable && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500, display: 'flex', gap: 6 }}>
          <button
            type="button"
            aria-label={editing ? 'Finish editing pins' : 'Edit pins on map'}
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

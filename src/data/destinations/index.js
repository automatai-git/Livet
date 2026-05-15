// Destination registry. Each entry is a template a user's trip can be
// "instantiated from". To add a new destination:
//   1. Create src/data/destinations/<slug>.js exporting { meta, islands,
//      experiences, checklist, mapView }.
//   2. Import it here and add it to DESTINATIONS keyed by its slug.
//   3. The slug becomes the value of `trips.destination_key` in Supabase.
//
// Shape contract:
//   meta.key                — slug, must equal the registry key
//   meta.name               — display name
//   meta.description: []    — bullet list shown on the trip overview
//   meta.recommendedSplit   — optional itinerary template
//   islands: []             — sub-regions, each with { id, name, color, icon, latLng }
//   experiences: []         — { id, islandId, name, rating, cost, description }
//   checklist: []           — { id, priority, task, why, action }
//   mapView                 — Leaflet { center: [lat, lng], zoom }

import hawaii from './hawaii';

export const DESTINATIONS = {
  hawaii,
};

export const listDestinations = () => Object.values(DESTINATIONS).map((d) => d.meta);

export const getDestination = (key) => DESTINATIONS[key] ?? null;

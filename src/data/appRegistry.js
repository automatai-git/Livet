// Single source of truth for the nine sub-apps in the v3 shell.
// Order here is the canonical order — usage sorting falls back to it on ties.
// `tintBg`/`tintFg` are the accent-tint chip colours from the design system
// (accent at 9–13% opacity behind the darker accent-coloured glyph).

export const APP_REGISTRY = [
  { route: '/menu',     icon: 'menu',     name: 'Menu Planner',        accent: 'var(--accent-menu)',     barColor: '#1B3B2F', tintBg: 'rgba(27,59,47,.07)',    tintFg: '#1B3B2F' },
  { route: '/life',     icon: 'tree',     name: 'Life Tree',           accent: 'var(--accent-timeline)', barColor: '#C57B57', tintBg: 'rgba(197,123,87,.13)',  tintFg: '#B06A47' },
  { route: '/mobility', icon: 'mobility', name: 'Mobility',            accent: 'var(--accent-mobility)', barColor: '#6B9E72', tintBg: 'rgba(107,158,114,.13)', tintFg: '#4F8557' },
  { route: '/workout',  icon: 'workout',  name: 'Workout Finder',      accent: 'var(--accent-workout)',  barColor: '#2D5A6C', tintBg: 'rgba(45,90,108,.09)',   tintFg: '#2D5A6C' },
  { route: '/travel',   icon: 'travel',   name: 'Trip Planner',        accent: 'var(--accent-travel)',   barColor: '#2F7DA0', tintBg: 'rgba(47,125,160,.1)',   tintFg: '#2F7DA0' },
  { route: '/books',    icon: 'books',    name: 'Book Cloud',          accent: 'var(--accent-books)',    barColor: '#8A6B4D', tintBg: 'rgba(138,107,77,.12)',  tintFg: '#8A6B4D' },
  { route: '/bucket',   icon: 'bucket',   name: 'Bucket List',         accent: 'var(--accent-bucket)',   barColor: '#8E7CC3', tintBg: 'rgba(142,124,195,.12)', tintFg: '#8E7CC3' },
  { route: '/colour',   icon: 'palette',  name: 'Soft Summer Palette', accent: 'var(--accent-palette)',  barColor: '#B5838D', tintBg: 'rgba(181,131,141,.12)', tintFg: '#B5838D' },
  { route: '/decision', icon: 'decision', name: 'Decision Matrix',     accent: 'var(--accent-decision)', barColor: '#C8804A', tintBg: 'rgba(200,128,74,.12)',  tintFg: '#C8804A' },
];

// Route prefix → registry route, for usage tracking. The legacy /timeline
// milestone feed counts as a Life Tree open.
export const usageRouteFor = (pathname) => {
  if (pathname.startsWith('/timeline')) return '/life';
  const hit = APP_REGISTRY.find(
    (a) => pathname === a.route || pathname.startsWith(`${a.route}/`)
  );
  return hit ? hit.route : null;
};

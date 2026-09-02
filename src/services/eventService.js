import { supabase } from './supabase';

// life_events + life_arenas — written by the NAS weekly-events-digest task
// (service role) every Monday ~11:30 CET, read here. The app may only update
// user_state / user_notes on either table (column-level grant, see
// input/life-events-schema.sql). Same RLS gotcha as meals/property: a
// refused write returns success-with-zero-rows, never an error, so every
// update uses .select() and treats an empty result as failure.
//
// user_state is not just UI state — the NAS reads it back at the start of
// every digest run (interested/going/attended → more like this; hidden →
// down-rank; arena joined → suggest the next tier up). Stick to the exact
// strings in src/lib/events.js.

const EVENTS_KEY = 'life-events-cache-v1';
const ARENAS_KEY = 'life-arenas-cache-v1';

const readCache = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
};
const writeCache = (key, rows) => {
  localStorage.setItem(key, JSON.stringify(rows));
};

const PAGE = 1000;

// PostgREST caps an unpaged select at 1000 rows; the tables keep past
// events deliberately (attended = feedback), so page to be safe.
const fetchAll = async (table, orderCol) => {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderCol, { ascending: true, nullsFirst: false })
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
};

const updateUserFields = async (table, cacheKey, id, fields) => {
  // Cache first so the UI survives offline; the next successful fetch
  // reconciles with the server.
  writeCache(cacheKey, readCache(cacheKey).map((r) => (r.id === id ? { ...r, ...fields } : r)));
  try {
    const { data, error } = await supabase
      .from(table)
      .update(fields)
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('update refused (0 rows)');
    return { ok: true };
  } catch (err) {
    console.warn(`[eventService] ${table} update failed, kept locally:`, err?.message ?? err);
    return { ok: false, queued: true };
  }
};

export const eventService = {
  // Synchronous cache reads for instant first paint (Today/Apps meta lines,
  // the detail flows while the fetch is in flight).
  getCachedEvents: () => readCache(EVENTS_KEY),
  getCachedArenas: () => readCache(ARENAS_KEY),

  // Returns { events, arenas, offline }. Network first, cache fallback.
  // Both tables in one call — the page always needs both.
  async getAll() {
    try {
      const [events, arenas] = await Promise.all([
        fetchAll('life_events', 'event_date'),
        fetchAll('life_arenas', 'achiever_score'),
      ]);
      writeCache(EVENTS_KEY, events);
      writeCache(ARENAS_KEY, arenas);
      return { events, arenas, offline: false };
    } catch (err) {
      console.warn('[eventService] fetch failed, using cache:', err?.message ?? err);
      return { events: readCache(EVENTS_KEY), arenas: readCache(ARENAS_KEY), offline: true };
    }
  },

  // fields: subset of { user_state, user_notes } — the only writable columns.
  updateEvent: (id, fields) => updateUserFields('life_events', EVENTS_KEY, id, fields),
  updateArena: (id, fields) => updateUserFields('life_arenas', ARENAS_KEY, id, fields),
};

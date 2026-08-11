import { supabase } from './supabase';
import { recordSeenScores } from '../lib/propertySeen';

// property_listings — written by the NAS collector (service role), read here.
// The app may only update user_state / user_notes (column-level grant, see
// input/property-listings-schema.sql). Same RLS gotcha as meals: a refused
// write returns success-with-zero-rows, never an error, so every update uses
// .select() and treats an empty result as failure.

const CACHE_KEY = 'property-listings-cache-v1';

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); }
  catch { return []; }
};

const writeCache = (rows) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
};

export const propertyService = {
  // Synchronous cache read for instant first paint (Today's meta line, the
  // detail page while the fetch is in flight).
  getCachedListings: readCache,

  // Returns { listings, offline }. Network first, cache fallback. Every
  // successful fetch also folds scores into property-seen-v1 so Today can
  // spot new ≥ 80 crossings.
  async getListings() {
    try {
      const { data, error } = await supabase
        .from('property_listings')
        .select('*');
      if (error) throw error;
      writeCache(data || []);
      recordSeenScores(data || []);
      return { listings: data || [], offline: false };
    } catch (err) {
      console.warn('[propertyService] fetch failed, using cache:', err?.message ?? err);
      return { listings: readCache(), offline: true };
    }
  },

  // Live sync (v3.2 QoL): postgres_changes on property_listings so NAS
  // upserts appear without a reload. Returns an unsubscribe function.
  subscribeListings(onChange) {
    const channel = supabase
      .channel('property-listings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'property_listings' },
        (payload) => onChange(payload)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  // Merge one realtime payload into a listing array (pure apart from the
  // cache write) — used by the browse page's subscription handler.
  applyChange(rows, payload) {
    const next = payload?.eventType === 'DELETE'
      ? rows.filter((r) => r.finnkode !== payload.old?.finnkode)
      : payload?.new?.finnkode != null
        ? (rows.some((r) => r.finnkode === payload.new.finnkode)
          ? rows.map((r) => (r.finnkode === payload.new.finnkode ? { ...r, ...payload.new } : r))
          : [...rows, payload.new])
        : rows;
    writeCache(next);
    recordSeenScores(next);
    return next;
  },

  // fields: subset of { user_state, user_notes } — the only writable columns.
  async updateUserFields(finnkode, fields) {
    // Cache first so the UI survives offline; the next successful fetch
    // reconciles with the server.
    writeCache(readCache().map((r) =>
      r.finnkode === finnkode ? { ...r, ...fields } : r
    ));
    try {
      const { data, error } = await supabase
        .from('property_listings')
        .update(fields)
        .eq('finnkode', finnkode)
        .select('finnkode');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('update refused (0 rows)');
      return { ok: true };
    } catch (err) {
      console.warn('[propertyService] update failed, kept locally:', err?.message ?? err);
      return { ok: false, queued: true };
    }
  },
};

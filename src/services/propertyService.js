import { supabase } from './supabase';

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
  // Returns { listings, offline }. Network first, cache fallback.
  async getListings() {
    try {
      const { data, error } = await supabase
        .from('property_listings')
        .select('*');
      if (error) throw error;
      writeCache(data || []);
      return { listings: data || [], offline: false };
    } catch (err) {
      console.warn('[propertyService] fetch failed, using cache:', err?.message ?? err);
      return { listings: readCache(), offline: true };
    }
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

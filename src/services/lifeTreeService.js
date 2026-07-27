import { supabase } from './supabase';

// Weekly life-tree ticks. One row per (user, ISO week); `ticks` is a jsonb
// map of { leafId: true }. Network first, localStorage cache as fallback —
// same pattern as the other data layers.

const CACHE_KEY = 'life-tree-cache-v1';

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
};

const writeCache = (weeks) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(weeks));
};

export const lifeTreeService = {
  // weekKeys: array like ['2026-W20', …]. Returns { weeks, offline }.
  async getWeeks(weekKeys) {
    try {
      const { data, error } = await supabase
        .from('life_tree_weeks')
        .select('week_key, ticks')
        .in('week_key', weekKeys);
      if (error) throw error;
      const weeks = {};
      (data || []).forEach((row) => { weeks[row.week_key] = row.ticks || {}; });
      writeCache({ ...readCache(), ...weeks });
      return { weeks, offline: false };
    } catch (err) {
      console.warn('[lifeTreeService] fetch failed, using cache:', err?.message ?? err);
      const cache = readCache();
      const weeks = {};
      weekKeys.forEach((k) => { if (cache[k]) weeks[k] = cache[k]; });
      return { weeks, offline: true };
    }
  },

  async saveWeek(wKey, ticks) {
    // Cache first so the UI survives offline; sync when the network is back.
    writeCache({ ...readCache(), [wKey]: ticks });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const { error } = await supabase
        .from('life_tree_weeks')
        .upsert(
          { user_id: user.id, week_key: wKey, ticks, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,week_key' }
        );
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.warn('[lifeTreeService] save failed, kept locally:', err?.message ?? err);
      return { ok: false, queued: true };
    }
  },
};

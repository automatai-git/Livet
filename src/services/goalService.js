import { supabase } from './supabase';

// Goals app persistence. One row per (user, doc) in `goal_sprints`; the app
// keeps a single live document under id 'current' holding the sprint
// markdown, the tracker items and the note log. Network first, localStorage
// cache as fallback, cache-first on save — same pattern as the other layers.

const CACHE_KEY = 'goal-sprint-cache-v1';
export const CURRENT_ID = 'current';

const EMPTY = { id: CURRENT_ID, title: '', markdown: '', items: [], notes: [] };

const readCache = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY));
    return stored && typeof stored.markdown === 'string' ? { ...EMPTY, ...stored } : null;
  } catch {
    return null;
  }
};

const writeCache = (doc) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(doc));
};

// jsonb columns may come back as JSON strings from cached/legacy rows.
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toDoc = (row) => ({
  id: row.id,
  title: row.title || '',
  markdown: row.markdown || '',
  items: asArray(row.items),
  notes: asArray(row.notes),
});

export const goalService = {
  // Synchronous cache read for instant first paint (null = never used).
  getCachedDoc: readCache,

  // Returns { doc, offline }. doc is null when nothing exists anywhere yet.
  async getDoc() {
    try {
      const { data, error } = await supabase
        .from('goal_sprints')
        .select('id, title, markdown, items, notes')
        .eq('id', CURRENT_ID)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Empty server + non-empty cache: seed the server from the cache
        // (first run after the schema lands) instead of wiping local state.
        const cached = readCache();
        if (cached) {
          const { ok } = await this.saveDoc(cached);
          return { doc: cached, offline: !ok };
        }
        return { doc: null, offline: false };
      }
      const doc = toDoc(data);
      writeCache(doc);
      return { doc, offline: false };
    } catch (err) {
      console.warn('[goalService] fetch failed, using cache:', err?.message ?? err);
      return { doc: readCache(), offline: true };
    }
  },

  // Cache-first; RLS-refused writes come back as success-with-zero-rows, so
  // .select() + empty-result check is the failure guard (same as meals).
  async saveDoc(doc) {
    const full = { ...EMPTY, ...doc, id: CURRENT_ID };
    writeCache(full);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');
      const { data, error } = await supabase
        .from('goal_sprints')
        .upsert({
          user_id: user.id,
          id: full.id,
          title: full.title,
          markdown: full.markdown,
          items: full.items,
          notes: full.notes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,id' })
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('write refused (zero rows)');
      return { ok: true };
    } catch (err) {
      console.warn('[goalService] save failed, kept locally:', err?.message ?? err);
      return { ok: false, queued: true };
    }
  },
};

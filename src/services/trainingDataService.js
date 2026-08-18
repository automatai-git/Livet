import { supabase } from './supabase';
import { addDays } from '../lib/training';

// NOTE on the name: `trainingService.js` was already taken by the legacy
// workout-program position service (relevant_dates table, used by Today and
// mobilityService) — this file is the NAS-pipeline data layer instead.
//
// training_sessions / training_wellness / training_blocks — written by the
// NAS training pipeline (service role), READ-ONLY here in v1 (RLS: select
// only for `authenticated`). Data contract: HANDOVER-training-pipeline.md §2
// (binding — column changes route via the coach project, never here).
//
// Future write path note: if user columns arrive (session notes/ratings),
// follow the property pattern — dedicated user_* columns, and remember the
// repo gotcha that a refused write returns success-with-zero-rows, so every
// write must .select() and treat an empty result as failure. Moot in v1.
//
// `raw` jsonb is deliberately never selected: the app displays nothing from
// it and the cache lives in localStorage (compact-set precedent from
// propertyService).

const CACHE_KEY = 'training-cache-v1';            // { sessions, blocks }
const WELLNESS_CACHE_KEY = 'training-wellness-cache-v1'; // [rows]

const SESSION_COLS =
  'source_id,source,start_time,block,week,day,domain,okt_type,title,' +
  'distance_m,moving_time_s,avg_hr,max_hr,pace_s_per_km,training_load,' +
  'ctl,atl,volume_kg,avg_rpe,planned_rpe,rating,notes';
const WELLNESS_COLS =
  'date,resting_hr,hrv,sleep_secs,sleep_quality,fatigue,soreness,stress,mood,weight_kg';

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

// PostgREST caps unpaged selects at 1000 rows. Row volumes here are tiny
// (≤ a few hundred/year — handover §7.3.9) so one page will hold years, but
// the paging loop is the house pattern and costs nothing.
const fetchAll = async (buildQuery) => {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
};

export const trainingDataService = {
  // Synchronous cache reads for instant first paint.
  getCached: () => readJson(CACHE_KEY, { sessions: [], blocks: [] }),
  getCachedWellness: () => readJson(WELLNESS_CACHE_KEY, []),

  // Returns { sessions, blocks, wellness, offline }. Network first, cache
  // fallback. Default window: the active block plus the previous 90 days
  // (§B2); pass { fullHistory: true } to drop the window (lazy, on demand).
  // `today` is injectable for tests; defaults to the device's current date.
  async getTraining({ fullHistory = false, today = new Date() } = {}) {
    try {
      const blocks = await fetchAll(() =>
        supabase.from('training_blocks').select('*').order('block')
      );

      let sinceIso = null;
      if (!fullHistory) {
        const todayStr = today.toISOString().slice(0, 10);
        const active = blocks.find((b) => b.status === 'active');
        const ninetyBack = addDays(todayStr, -90);
        const since = active?.start_date && active.start_date < ninetyBack
          ? active.start_date
          : ninetyBack;
        sinceIso = `${since}T00:00:00Z`;
      }

      const sessions = await fetchAll(() => {
        let q = supabase
          .from('training_sessions')
          .select(SESSION_COLS)
          .order('start_time', { ascending: false });
        if (sinceIso) q = q.gte('start_time', sinceIso);
        return q;
      });

      const wellness = await fetchAll(() => {
        let q = supabase
          .from('training_wellness')
          .select(WELLNESS_COLS)
          .order('date', { ascending: false });
        if (sinceIso) q = q.gte('date', sinceIso.slice(0, 10));
        return q;
      });

      // The cache only ever stores the default window (localStorage budget);
      // a full-history fetch serves the caller without widening the cache.
      if (!fullHistory) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ sessions, blocks }));
        localStorage.setItem(WELLNESS_CACHE_KEY, JSON.stringify(wellness));
      }
      return { sessions, blocks, wellness, offline: false };
    } catch (err) {
      console.warn('[trainingDataService] fetch failed, using cache:', err?.message ?? err);
      const cached = readJson(CACHE_KEY, { sessions: [], blocks: [] });
      return { ...cached, wellness: readJson(WELLNESS_CACHE_KEY, []), offline: true };
    }
  },
};

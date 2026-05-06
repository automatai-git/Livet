// Data layer for Block + Decision-Tree workout-finder.
// Components must consume only this module — no direct supabase calls.

import { supabase } from '../services/supabase';

const LS_BLOCK_PREFIX = 'block-cache::';
const LS_MOBILITY_PREFIX = 'mobility-session-cache::';
const LS_USER_CONFIG = 'user-config-cache';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** @typedef {{kind:'strength',focus:string,intensity:'easy'|'moderate'|'hard',route_to:'macrofactor',rpe_target:string,notes?:string,phase_overrides?:object}} StrengthDay */
/** @typedef {{kind:'run',quality:'easy'|'tempo'|'threshold'|'intervals'|'long'|'recovery',route_to:'runna',rpe_target:string,notes?:string,phase_overrides?:object}} RunDay */
/** @typedef {{kind:'mobility',session_id:string,route_to:'internal'}} MobilityDay */
/** @typedef {{kind:'sport',activity:'padel'|'football',cap_check:boolean}} SportDay */
/** @typedef {{kind:'rest'}} RestDay */
/** @typedef {{kind:'flex',options:DayType[],notes?:string}} FlexDay */
/** @typedef {StrengthDay|RunDay|MobilityDay|SportDay|RestDay|FlexDay} DayType */

function parseISODate(s) {
  // Treat YYYY-MM-DD as a local date (not UTC) so week math doesn't drift across timezones.
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a, b) {
  return Math.floor((startOfDay(a) - startOfDay(b)) / 86400000);
}

/** Pure: deep-merge phase override into base DayType. */
export function resolveDayForPhase(dayType, phaseName) {
  if (!dayType || !phaseName) return dayType;
  const base = { ...dayType };
  const overrides = base.phase_overrides && base.phase_overrides[phaseName];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

/** Week number 1..N within the block (clamped). */
export function getWeekNumber(block, date = new Date()) {
  const start = parseISODate(block.start_date);
  const days = diffDays(date, start);
  const week = Math.floor(days / 7) + 1;
  const total = Math.max(...block.phases.flatMap((p) => p.weeks));
  if (week < 1) return 1;
  if (week > total) return total;
  return week;
}

/** Return the phase object containing the given week number. */
export function getPhaseForWeek(block, weekNumber) {
  return block.phases.find((p) => p.weeks.includes(weekNumber)) || block.phases[0];
}

/** Weekday key for a given date. */
export function weekdayKey(date) {
  return WEEKDAY_KEYS[date.getDay()];
}

async function readCached(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCached(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

/** Load active block id from user_config (with cache fallback for offline). */
async function getActiveBlockId() {
  try {
    const { data, error } = await supabase
      .from('user_config')
      .select('active_block_id')
      .eq('id', 'singleton')
      .maybeSingle();
    if (error) throw error;
    if (data?.active_block_id) {
      writeCached(LS_USER_CONFIG, data);
      return data.active_block_id;
    }
  } catch (err) {
    console.warn('[blocks] user_config fetch failed, using cache', err);
  }
  const cached = await readCached(LS_USER_CONFIG);
  return cached?.active_block_id || 'block-4';
}

export async function getActiveBlock() {
  const id = await getActiveBlockId();
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      writeCached(LS_BLOCK_PREFIX + id, data);
      // Pre-cache referenced mobility sessions for offline use.
      const ids = collectMobilitySessionIds(data);
      ids.forEach((sid) => { void getMobilitySession(sid); });
      return data;
    }
  } catch (err) {
    console.warn('[blocks] block fetch failed, using cache', err);
  }
  const cached = await readCached(LS_BLOCK_PREFIX + id);
  if (!cached) throw new Error(`No active block available (id=${id}) and no cached copy.`);
  return cached;
}

function collectMobilitySessionIds(block) {
  const ids = new Set();
  const walk = (d) => {
    if (!d) return;
    if (d.kind === 'mobility' && d.session_id) ids.add(d.session_id);
    if (d.kind === 'flex' && Array.isArray(d.options)) d.options.forEach(walk);
  };
  Object.values(block.weekly_template || {}).forEach(walk);
  return [...ids];
}

/** Resolve today's DayType (default = local now). */
export async function getTodayDayType(date = new Date()) {
  const block = await getActiveBlock();
  const week = getWeekNumber(block, date);
  const phase = getPhaseForWeek(block, week);
  const base = block.weekly_template[weekdayKey(date)];
  return { dayType: resolveDayForPhase(base, phase.name), block, week, phase };
}

export async function getMobilitySession(id) {
  try {
    const { data, error } = await supabase
      .from('mobility_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      writeCached(LS_MOBILITY_PREFIX + id, data);
      return data;
    }
  } catch (err) {
    console.warn('[blocks] mobility fetch failed, using cache', err);
  }
  const cached = await readCached(LS_MOBILITY_PREFIX + id);
  if (!cached) throw new Error(`Mobility session ${id} not available.`);
  return cached;
}

export async function logMobilityCompletion({ session_id, movements_completed, rpe, notes }) {
  const payload = {
    session_id,
    completed_at: new Date().toISOString(),
    movements_completed: movements_completed || [],
    rpe: rpe ?? null,
    notes: notes ?? null,
  };
  const { error } = await supabase.from('mobility_history').insert(payload);
  if (error) throw error;
}

/** ISO week key YYYY-Www. */
function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Consecutive-weeks streak ending at the current ISO week, counting any week that has at least one completion entry. */
export async function getMobilityStreak(sessionId) {
  const { data, error } = await supabase
    .from('mobility_history')
    .select('completed_at')
    .eq('session_id', sessionId)
    .order('completed_at', { ascending: false });
  if (error) { console.warn('[blocks] streak fetch failed', error); return 0; }
  const weeks = new Set((data || []).map((r) => isoWeekKey(new Date(r.completed_at))));
  let streak = 0;
  const cursor = new Date();
  while (weeks.has(isoWeekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Resolve the full week's template under the appropriate phase. */
export function resolveWeek(block, weekNumber) {
  const phase = getPhaseForWeek(block, weekNumber);
  const out = {};
  for (const key of ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']) {
    out[key] = resolveDayForPhase(block.weekly_template[key], phase.name);
  }
  return { phase, days: out };
}

/** Date for a given (week, weekday) within the block. */
export function dateForWeekday(block, weekNumber, weekday) {
  const start = parseISODate(block.start_date);
  // Block starts on a Monday by convention. weekday index Mon=0..Sun=6.
  const idx = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(weekday);
  const d = new Date(start);
  d.setDate(d.getDate() + (weekNumber - 1) * 7 + idx);
  return d;
}

/** Helper: open external app via custom scheme with web fallback. */
export function openExternal(scheme, webUrl) {
  const start = Date.now();
  const fallback = () => {
    if (Date.now() - start < 1500) window.location.href = webUrl;
  };
  const t = setTimeout(fallback, 1000);
  // Best-effort scheme attempt; mobile browsers will navigate, desktop will no-op.
  try {
    window.location.href = scheme;
  } catch {
    clearTimeout(t);
    window.location.href = webUrl;
  }
  // Belt-and-braces: if visibility changes (app opened), suppress fallback.
  const onHide = () => { if (document.hidden) clearTimeout(t); };
  document.addEventListener('visibilitychange', onHide, { once: true });
}

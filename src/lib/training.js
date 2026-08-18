// Pure helpers for the Training data dashboard (/training).
// Display-not-derive rule (HANDOVER-training-pipeline.md §1): everything here
// is grouping, formatting, and min/max/mean for display — never fitness
// modelling. CTL/ATL/load/pace arrive precomputed from intervals.icu.
//
// Timezone contract (§7.3.2): `start_time` is tz-aware UTC, but block/week/day
// were stamped from LOCAL Europe/Oslo dates on the NAS. All day- and
// week-grouping therefore converts to Europe/Oslo explicitly — never the
// device timezone (a travelling phone would disagree with the `day` column).

const OSLO_TZ = 'Europe/Oslo';

const WEEKDAY_TO_ISO = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Norwegian two-letter day heads, ISO order (Mon=1).
export const DAY_LABELS = ['', 'ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];

export const DOMAIN_ORDER = ['run', 'strength', 'mobility', 'sport', 'support', 'other'];
export const DOMAIN_LABELS = {
  run: 'Løping',
  strength: 'Styrke',
  mobility: 'Mobilitet',
  sport: 'Sport',
  support: 'Støtte',
  other: 'Annet',
};

// UTC timestamp (or Date) → { date: 'YYYY-MM-DD', isoDay: 1–7 } in Oslo time.
export const osloDateParts = (startTime) => {
  const d = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(d.getTime())) return null;
  // en-CA yields YYYY-MM-DD; en-US short weekday yields Mon..Sun.
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: OSLO_TZ }).format(d);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: OSLO_TZ, weekday: 'short' }).format(d);
  return { date, isoDay: WEEKDAY_TO_ISO[wd] };
};

// 'YYYY-MM-DD' → days since epoch (pure calendar arithmetic, no tz).
const dayNumber = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

const dateFromDayNumber = (n) => {
  const d = new Date(n * 86400000);
  return d.toISOString().slice(0, 10);
};

export const addDays = (dateStr, days) => dateFromDayNumber(dayNumber(dateStr) + days);

// ISO weekday 1–7 for a plain date string (no timezone involved).
export const isoDayOf = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  return wd === 0 ? 7 : wd;
};

// Monday..Sunday range containing a date: { start, end } inclusive.
export const weekRangeOf = (dateStr) => {
  const start = addDays(dateStr, 1 - isoDayOf(dateStr));
  return { start, end: addDays(start, 6) };
};

// 'ISO uke 35' style label plus the dd.mm–dd.mm span for the week hero meta.
export const weekLabel = ({ start, end }) => {
  const fmt = (s) => `${s.slice(8, 10)}.${s.slice(5, 7)}`;
  return `${fmt(start)}–${fmt(end)}`;
};

// Sessions whose Oslo-local date falls inside {start,end} (inclusive).
export const sessionsInRange = (sessions, { start, end }) => {
  const s = dayNumber(start);
  const e = dayNumber(end);
  return (sessions || []).filter((row) => {
    const parts = osloDateParts(row.start_time);
    if (!parts) return false;
    const n = dayNumber(parts.date);
    return n >= s && n <= e;
  });
};

// Group a session list by domain, DOMAIN_ORDER order, day-sorted inside each
// group. Returns [{ domain, label, sessions }] — empty domains omitted.
export const groupByDomain = (sessions) => {
  const byDomain = new Map();
  for (const row of sessions || []) {
    const key = DOMAIN_ORDER.includes(row.domain) ? row.domain : 'other';
    if (!byDomain.has(key)) byDomain.set(key, []);
    byDomain.get(key).push(row);
  }
  return DOMAIN_ORDER.filter((d) => byDomain.has(d)).map((d) => ({
    domain: d,
    label: DOMAIN_LABELS[d],
    sessions: byDomain.get(d).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))),
  }));
};

// Block week count from the block row (ceil of the date span; 12 fallback).
export const blockWeekCount = (block) => {
  if (!block?.start_date || !block?.end_date) return 12;
  const days = dayNumber(block.end_date) - dayNumber(block.start_date) + 1;
  return Math.max(1, Math.ceil(days / 7));
};

// 1-based block week containing a date, or null outside the block span.
export const blockWeekOf = (dateStr, block) => {
  if (!block?.start_date) return null;
  const offset = dayNumber(dateStr) - dayNumber(block.start_date);
  if (offset < 0) return null;
  const week = Math.floor(offset / 7) + 1;
  return week > blockWeekCount(block) ? null : week;
};

// The Blokk grid: for each block week, per-domain session counts, the longest
// run (max distance_m — a max for display, not a derived metric), and the
// mobility count vs the ≥1/week target. Sessions are matched on their stamped
// `block`/`week` columns (NAS-owned; §7.3.3) — unstamped rows are ignored.
export const buildBlockGrid = (sessions, block) => {
  const weeks = Array.from({ length: blockWeekCount(block) }, (_, i) => ({
    week: i + 1,
    counts: Object.fromEntries(DOMAIN_ORDER.map((d) => [d, 0])),
    longestRunM: null,
    mobilityCount: 0,
  }));
  for (const row of sessions || []) {
    if (row.block !== block?.block || row.week == null) continue;
    const w = weeks[row.week - 1];
    if (!w) continue;
    const domain = DOMAIN_ORDER.includes(row.domain) ? row.domain : 'other';
    w.counts[domain] += 1;
    if (domain === 'mobility') w.mobilityCount += 1;
    if (domain === 'run' && row.distance_m != null) {
      w.longestRunM = Math.max(w.longestRunM ?? 0, row.distance_m);
    }
  }
  return weeks;
};

// ---------- formatting ----------

export const formatPace = (sPerKm) => {
  if (sPerKm == null || !Number.isFinite(sPerKm) || sPerKm <= 0) return null;
  const m = Math.floor(sPerKm / 60);
  const s = Math.round(sPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
};

export const formatKm = (meters) => {
  if (meters == null || !Number.isFinite(meters)) return null;
  const km = meters / 1000;
  return `${km >= 10 ? km.toFixed(1) : km.toFixed(2).replace(/0$/, '')} km`;
};

export const formatDuration = (secs) => {
  if (secs == null || !Number.isFinite(secs) || secs <= 0) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h} t ${m} min` : `${m} min`;
};

export const formatVolume = (kg) => {
  if (kg == null || !Number.isFinite(kg)) return null;
  return `${new Intl.NumberFormat('nb-NO').format(Math.round(kg))} kg`;
};

export const formatSleep = (secs) => {
  if (secs == null || !Number.isFinite(secs) || secs <= 0) return null;
  const h = secs / 3600;
  return `${h.toFixed(1)} t`;
};

// One meta line per session row: the source decides which numbers exist
// (intervals: distance/pace/HR · hevy: volume/RPE). avg_rpe semantics differ
// by source (§7.3.5) — shown per-row, never averaged across sources.
export const sessionMeta = (row) => {
  const parts = [];
  const km = formatKm(row.distance_m);
  if (km) parts.push(km);
  const pace = formatPace(row.pace_s_per_km);
  if (pace) parts.push(pace);
  const vol = formatVolume(row.volume_kg);
  if (vol) parts.push(vol);
  const dur = !km && !vol ? formatDuration(row.moving_time_s) : null;
  if (dur) parts.push(dur);
  if (row.avg_hr != null) parts.push(`${row.avg_hr} bpm`);
  if (row.avg_rpe != null) parts.push(`RPE ${row.avg_rpe}`);
  return parts.join(' · ');
};

// ---------- sparklines (SVG path strings; pure) ----------

// Points [{x fraction not needed — even spacing}] from a numeric series with
// nulls skipped. Returns '' when fewer than 2 real points exist.
export const sparkPath = (values, width, height, pad = 2) => {
  const pts = (values || [])
    .map((v, i) => ({ v, i }))
    .filter((p) => p.v != null && Number.isFinite(p.v));
  if (pts.length < 2) return '';
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const n = values.length - 1 || 1;
  const x = (i) => pad + (i / n) * (width - pad * 2);
  const y = (v) => height - pad - ((v - min) / span) * (height - pad * 2);
  return pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`)
    .join(' ');
};

// Trailing daily series out of wellness rows: last `days` calendar days ending
// at `todayStr`, null-filled where no row exists — keeps sparklines aligned.
export const wellnessSeries = (rows, field, todayStr, days = 28) => {
  const byDate = new Map((rows || []).map((r) => [r.date, r[field]]));
  const startN = dayNumber(todayStr) - (days - 1);
  return Array.from({ length: days }, (_, i) => {
    const v = byDate.get(dateFromDayNumber(startN + i));
    return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  });
};

// Mean of the non-null tail values, for the sparkline's headline number.
export const seriesLatest = (values) => {
  for (let i = (values || []).length - 1; i >= 0; i -= 1) {
    if (values[i] != null) return values[i];
  }
  return null;
};

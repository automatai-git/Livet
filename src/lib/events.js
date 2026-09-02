// Pure helpers for the Networking app (life_events + life_arenas tables).
// The row shapes are fixed by the NAS weekly-events-digest task — see
// HANDOVER-livet-events.md and input/life-events-schema.sql. The app only
// ever writes user_state / user_notes; everything else is read-only NAS data.

import { parseJsonArray } from './property';

export { parseJsonArray };

export const TRACKS = [
  ['business', 'Business'],
  ['social', 'Social'],
  ['pleasure', 'Pleasure'],
];

// Tracks with intent behind them — arenas exist only here, and the score /
// signal row only renders here (pleasure is deliberately unscored).
export const isScoredTrack = (track) => track === 'social' || track === 'business';

// Allowed user_state strings. The NAS prompt matches on these exactly —
// never invent a new one app-side.
export const EVENT_STATES = [
  ['interested', 'Interested'],
  ['going', 'Going'],
  ['attended', 'Attended'],
  ['hidden', 'Hide'],
];
export const ARENA_STATES = [
  ['interested', 'Interested'],
  ['joined', 'Joined'],
  ['hidden', 'Hide'],
];

export const BUSINESS_GOALS = [
  ['customers', 'Customers'],
  ['capital', 'Capital'],
  ['frontier', 'Frontier'],
];

// Score bands from the handover: ≥70 lead pick · 50–69 solid · 35–49
// marginal (nothing below 35 is published). Null = unscored (pleasure).
export const LEAD_THRESHOLD = 70;
export const scoreBand = (score) => {
  if (score == null) return null;
  if (score >= LEAD_THRESHOLD) return 'lead';
  if (score >= 50) return 'solid';
  return 'marginal';
};

// Barrier: higher friction = stronger signal. Rank drives the badge tone
// (never a green/red "free = good" scale).
const BARRIER_RANK = { free: 0, paid: 1, application: 2, invite: 3, member: 4 };
export const barrierRank = (barrier) => BARRIER_RANK[barrier] ?? -1;
export const barrierLabel = (barrier) => {
  switch (barrier) {
    case 'free': return 'Free';
    case 'paid': return 'Paid';
    case 'application': return 'By application';
    case 'invite': return 'Invite only';
    case 'member': return 'Members';
    default: return null;
  }
};

// "Roundtable · ~40" — format and audience size read together: small
// dinners/roundtables are the good case, 500+ conferences are down-ranked.
export const formatLine = (event) => {
  const fmt = event.format ? event.format.charAt(0).toUpperCase() + event.format.slice(1) : null;
  const size = event.audience_size != null ? `~${event.audience_size}` : null;
  return [fmt, size].filter(Boolean).join(' · ') || null;
};

// ---- dates -----------------------------------------------------------------

// Local calendar date as YYYY-MM-DD (event_date is a Postgres `date`, no tz).
export const localDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parse a YYYY-MM-DD string as a *local* midnight date (new Date('2026-…')
// would be UTC and shift a day on either side of Greenwich).
export const parseDateKey = (key) => {
  if (!key || typeof key !== 'string') return null;
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Whole days from `now` (local midnight) to the event's start date. Past
// events are negative. Multi-day events count as upcoming until end_date.
export const daysUntil = (event, now = new Date()) => {
  const start = parseDateKey(event.event_date);
  if (!start) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start - today) / 86400000);
};

export const isPast = (event, now = new Date()) => {
  const last = parseDateKey(event.end_date) ?? parseDateKey(event.event_date);
  if (!last) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return last < today;
};

// Human urgency label derived from event_date at render time — time_band is
// as-written-that-week and goes stale.
export const urgencyLabel = (event, now = new Date()) => {
  const d = daysUntil(event, now);
  if (d == null) return null;
  if (d < 0) return isPast(event, now) ? 'past' : 'ongoing';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  return `in ${Math.round(d / 30)} months`;
};

// Render-time grouping that mirrors the email's next_2w / next_2m / later.
export const horizonOf = (event, now = new Date()) => {
  const d = daysUntil(event, now);
  if (d == null) return 'later';
  if (d < 14) return 'next_2w';
  if (d < 60) return 'next_2m';
  return 'later';
};
export const HORIZONS = [
  ['next_2w', 'Next two weeks'],
  ['next_2m', 'Next two months'],
  ['later', 'Later'],
];

// Position on the hero's horizon rail: 0 = today, 1 = HORIZON_DAYS out.
// Anything further piles up at the right end ("later"); ongoing multi-day
// events sit at 0. Null without a date (the rail skips those).
export const HORIZON_DAYS = 60;
export const horizonFraction = (event, now = new Date()) => {
  const d = daysUntil(event, now);
  if (d == null) return null;
  return Math.min(1, Math.max(0, d) / HORIZON_DAYS);
};

export const formatEventDate = (event) => {
  const start = parseDateKey(event.event_date);
  if (!start) return 'Date TBA';
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  const s = start.toLocaleDateString('en-GB', opts);
  const end = parseDateKey(event.end_date);
  if (end && end > start) {
    return `${s} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  }
  return s;
};

// ISO-week Monday (local) — the same key the NAS writes into sent_week.
export const mondayOf = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return localDateKey(x);
};

// "New this week" = introduced by the most recent digest present in the
// data (max sent_week), not by the calendar — a failed Monday push must not
// make last week's cards look new.
export const latestSentWeek = (rows) =>
  rows.reduce((acc, r) => {
    const w = typeof r.sent_week === 'string' ? r.sent_week.slice(0, 10) : null;
    return w && (!acc || w > acc) ? w : acc;
  }, null);

export const isNewThisWeek = (row, latest) =>
  !!latest && typeof row.sent_week === 'string' && row.sent_week.slice(0, 10) === latest;

// Max synced_at across both tables → "last updated" line (a weekly
// heartbeat, never a spinner).
export const lastSynced = (...lists) =>
  lists.flat().reduce((acc, r) => {
    const t = r?.synced_at ? new Date(r.synced_at).getTime() : 0;
    return t > acc ? t : acc;
  }, 0);

// ---- list shaping ----------------------------------------------------------

export const SORT_MODES = [
  ['date', 'Soonest'],
  ['score', 'Best rooms'],
];

// Date asc; score desc with nulls last; stable tie-breaks so the list does
// not shuffle between renders.
export const sortEvents = (events, mode = 'date') =>
  [...events].sort((a, b) => {
    if (mode === 'score') {
      const sa = a.achiever_score, sb = b.achiever_score;
      if (sa == null && sb != null) return 1;
      if (sa != null && sb == null) return -1;
      if (sa != null && sb != null && sa !== sb) return sb - sa;
    }
    const da = a.event_date ?? '9999', db = b.event_date ?? '9999';
    if (da !== db) return da < db ? -1 : 1;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''));
  });

// Default view: one track, upcoming, not hidden. `goals` narrows the
// Business tab to rooms serving at least one of the chosen goals.
export const filterEvents = (events, {
  track,
  showHidden = false,
  showPast = false,
  goals = [],
  now = new Date(),
} = {}) =>
  events.filter((e) => {
    if (track && e.track !== track) return false;
    if (!showHidden && e.user_state === 'hidden') return false;
    if (showHidden && e.user_state !== 'hidden') return false;
    if (!showPast && isPast(e, now)) return false;
    if (showPast && !isPast(e, now)) return false;
    if (goals.length > 0) {
      const own = parseJsonArray(e.business_goals);
      if (!goals.some((g) => own.includes(g))) return false;
    }
    return true;
  });

export const groupByHorizon = (events, now = new Date()) => {
  const groups = { next_2w: [], next_2m: [], later: [] };
  events.forEach((e) => groups[horizonOf(e, now)].push(e));
  return groups;
};

export const filterArenas = (arenas, { track, showHidden = false } = {}) =>
  arenas
    .filter((a) => (!track || a.track === track) && (showHidden ? a.user_state === 'hidden' : a.user_state !== 'hidden'))
    .sort((a, b) => {
      const sa = a.achiever_score, sb = b.achiever_score;
      if (sa == null && sb != null) return 1;
      if (sa != null && sb == null) return -1;
      if (sa != null && sb != null && sa !== sb) return sb - sa;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });

// The "attended?" prompt: events marked going whose date has passed. The
// strongest signal the NAS can get back, so surface it at the top.
export const needsAttendance = (events, now = new Date()) =>
  events.filter((e) => e.user_state === 'going' && isPast(e, now));

// ---- calendar export (iOS) -------------------------------------------------

// The digest only knows dates (time_band is a horizon, not a clock time), so
// the export is an all-day VEVENT: DTSTART/DTEND as VALUE=DATE, DTEND
// exclusive per RFC 5545. iOS opens a .ics as an "Add to Calendar" sheet.
const icsEscape = (s) =>
  String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

const icsDate = (key) => key.slice(0, 10).replace(/-/g, '');

const addDays = (key, n) => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
};

// RFC 5545 §3.1: lines longer than 75 octets fold with CRLF + space.
const fold = (line) => {
  const out = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join('\r\n');
};

export const buildEventIcs = (event, now = new Date()) => {
  if (!event?.event_date) return null;
  const start = icsDate(event.event_date);
  const lastDay = event.end_date && event.end_date >= event.event_date ? event.end_date : event.event_date;
  const end = icsDate(addDays(lastDay, 1));
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const location = [event.venue, event.city].filter(Boolean).join(', ');
  const description = [
    event.description,
    event.why ? `Why: ${event.why}` : null,
    event.room_note ? `Room: ${event.room_note}` : null,
    event.price_note ? `Price: ${event.price_note}` : null,
    event.booking_url ?? event.url,
  ].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Livet//Networking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(event.id)}@livet`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(event.name)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    event.url ? `URL:${icsEscape(event.url)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `${lines.map(fold).join('\r\n')}\r\n`;
};

export const icsFilename = (event) =>
  `${String(event.id ?? 'event').replace(/[^a-z0-9-]+/gi, '-').slice(0, 60)}.ics`;

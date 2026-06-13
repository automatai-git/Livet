// Pure gate logic for the shoulder-rehab protocol (rehabProtocol.json).
// Every function here is pure: it takes rehab_log rows plus an explicit
// reference day and never reads the clock or the network. Gate state is
// always recomputed from the full log — there is no cached gate state and
// no calendar-driven auto-advance. Dates in the protocol JSON are display
// projections only; these functions are the single source of phase truth.
//
// rehab_log row shape (see input/rehab-schema.sql):
//   { logged_at, signal_id, value, provoking_movement, session_context,
//     settled_within_2h, next_morning_stiff }

export const SIGNAL_IDS = {
  RESTING: 'shoulder_resting',
  CROSSBODY: 'shoulder_crossbody',
  ISOMETRIC: 'isometric_response',
  NECK: 'neck_right',
};

/** Local calendar day key (YYYY-MM-DD) for a Date or timestamp string. */
export function dayKeyLocal(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Day key arithmetic without timezone drift. */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return dayKeyLocal(date);
}

function logsForSignal(logs, signalId) {
  return (logs || [])
    .filter((l) => l.signal_id === signalId && l.value != null)
    .map((l) => ({ ...l, day: dayKeyLocal(l.logged_at), value: Number(l.value) }))
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
}

/** Map of day -> true iff that day has >=1 isometric entry and ALL entries that day are <= 1. */
function isometricCleanDayMap(logs) {
  const byDay = new Map();
  for (const l of logsForSignal(logs, SIGNAL_IDS.ISOMETRIC)) {
    const prev = byDay.get(l.day);
    byDay.set(l.day, prev === false ? false : l.value <= 1);
  }
  return byDay;
}

/**
 * Phase 2A exit gate: isometric_response <= 1 for 3 consecutive calendar days.
 *
 * Implemented as "a run of >=3 consecutive clean days exists ending on or
 * before todayKey" rather than literally "the 3 days ending today", because
 * once the gate fires the athlete moves to 2B where daily isometrics leave
 * the program — a moving 3-day window would silently re-lock 2B. Evaluated
 * on the day the third clean log lands, the two readings are identical.
 * Symptom returns are handled by regressionFlag, not by un-passing gates.
 */
export function gate2AExit(logs, todayKey) {
  const clean = isometricCleanDayMap(logs);
  for (const day of clean.keys()) {
    if (day > todayKey) continue;
    // Check the run of 3 consecutive days ending at `day`.
    let ok = true;
    for (let i = 0; i < 3; i++) {
      if (clean.get(addDays(day, -i)) !== true) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Current clean-day streak for the "n/3 clean days" counter.
 * Counts consecutive clean days ending at todayKey, or at yesterday when
 * today has no entry yet (the streak is still alive, just not extended).
 * A dirty day (any isometric entry > 1) resets to 0.
 */
export function isometricCleanStreak(logs, todayKey) {
  const clean = isometricCleanDayMap(logs);
  let anchor = todayKey;
  if (!clean.has(anchor)) anchor = addDays(todayKey, -1);
  if (clean.get(anchor) !== true) return 0;
  let count = 0;
  let day = anchor;
  while (clean.get(day) === true) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/**
 * Regression rule (painRules.regressionRule):
 * isometric >=2/10 three consecutive sessions OR any session >=4/10.
 * Sessions = individual log entries in chronological order, not days.
 *
 * `sinceTs` (optional ISO timestamp) scopes the check to entries logged
 * after a recorded "reviewed/reported" acknowledgment — the protocol's
 * onFail is "flag, hold progression, report"; after the report is done the
 * flag must be clearable without deleting data. Pass null for the raw rule.
 */
export function regressionFlag(logs, sinceTs = null) {
  let entries = logsForSignal(logs, SIGNAL_IDS.ISOMETRIC);
  if (sinceTs) entries = entries.filter((l) => new Date(l.logged_at) > new Date(sinceTs));
  let run = 0;
  for (const l of entries) {
    if (l.value >= 4) return { fired: true, reason: 'spike' };
    run = l.value >= 2 ? run + 1 : 0;
    if (run >= 3) return { fired: true, reason: 'three-consecutive' };
  }
  return { fired: false, reason: null };
}

/**
 * Phase 2B exit gate: the most recent shoulder_crossbody entry logged on or
 * after the scheduled retest day has value <= 1. Entries before the retest
 * day never pass the gate, no matter how good.
 */
export function gate2BExit(logs, retestKey) {
  const entries = logsForSignal(logs, SIGNAL_IDS.CROSSBODY).filter((l) => l.day >= retestKey);
  if (entries.length === 0) return false;
  return entries[entries.length - 1].value <= 1;
}

/** escalation_active: any escalation trigger checked OR regression flag fired. */
export function escalationActive({ checkedTriggers = [], regressionFired = false }) {
  return checkedTriggers.length > 0 || regressionFired;
}

const LADDER_GATED = { '2A': 'gate2A', '2B': 'gate2B' };

/**
 * Walk the phase ladder and derive each phase's status:
 *   escalation -> every not-yet-passed phase is 'held'.
 *   else: 'passed' if exit gate met (or recorded passed in the protocol),
 *         'active' iff entry gate met and exit gate not met,
 *         'locked' otherwise.
 * Phases without a computable exit gate (3, 4) can only pass via a future
 * protocol version — never automatically.
 */
export function derivePhaseStatuses(protocol, { gate2A = false, gate2B = false, escalation = false }) {
  const gates = { gate2A, gate2B };
  const statuses = {};
  let prevExitMet = true; // ladder entry for the first phase
  for (const phase of protocol.phases) {
    const recordedPassed = phase.status === 'passed';
    const gateKey = LADDER_GATED[phase.id];
    const exitMet = recordedPassed || (gateKey ? gates[gateKey] === true : false);
    const entryMet = prevExitMet;
    if (escalation && !recordedPassed) {
      statuses[phase.id] = 'held';
    } else if (recordedPassed || (entryMet && exitMet)) {
      statuses[phase.id] = 'passed';
    } else if (entryMet) {
      statuses[phase.id] = 'active';
    } else {
      statuses[phase.id] = 'locked';
    }
    // A gate only opens the next phase if this phase was itself reachable —
    // a clean retest logged while an earlier gate is unmet must not skip ahead.
    prevExitMet = entryMet && exitMet;
  }
  return statuses;
}

/**
 * One-call evaluation used by the UI on every load.
 * Returns gates, regression, escalation, per-phase statuses and the active
 * phase object (null while escalation holds the ladder).
 */
export function evaluateProtocol(protocol, logs, { todayKey, checkedTriggers = [], regressionAckTs = null }) {
  const phase2B = protocol.phases.find((p) => p.id === '2B');
  const retestKey = phase2B?.exitGate?.scheduledRetest || '2026-06-26';
  const gate2A = gate2AExit(logs, todayKey);
  const gate2B = gate2BExit(logs, retestKey);
  const regression = regressionFlag(logs, regressionAckTs);
  const escalation = escalationActive({ checkedTriggers, regressionFired: regression.fired });
  const statuses = derivePhaseStatuses(protocol, { gate2A, gate2B, escalation });
  const activePhaseId = Object.keys(statuses).find((id) => statuses[id] === 'active') || null;
  return {
    gates: { gate2A, gate2B, retestKey },
    regression,
    escalation,
    statuses,
    activePhase: protocol.phases.find((p) => p.id === activePhaseId) || null,
    streak: isometricCleanStreak(logs, todayKey),
  };
}

/** True when this protocol belongs to the given training block. */
export function protocolAppliesToBlock(protocol, block) {
  if (!protocol?.context?.block || !block?.id) return false;
  const suffix = Number(String(block.id).replace(/^\D+/, ''));
  return suffix === Number(protocol.context.block);
}

// ---------- blocked-movement matching ---------------------------------------

// Aliases for blocked-list entries whose programmed-text spellings differ
// from the protocol wording. Generic fallback: each "/"-separated fragment
// of the entry, minus parentheticals, matched as a whole-word phrase.
const BLOCKED_ALIASES = {
  'bench press (all variations)': ['bench'],
  'overhead press': ['overhead press', 'oh press', 'ohp', 'military press'],
  'bodyweight pull-up': ['pull-up', 'pull up', 'pullup', 'chin-up', 'chin up'],
  'deep DB flye / end-range anterior stretch': ['flye', 'fly', 'flies', 'flyes', 'pec deck'],
  'heavy carries / loaded shrug patterns (neck rule)': ['carry', 'carries', 'shrug', 'shrugs'],
};

function phraseToRegex(phrase) {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]*');
  return new RegExp(`(^|[^a-z])${escaped}(s|es)?([^a-z]|$)`, 'i');
}

function patternsForBlockedEntry(entry) {
  const aliases = BLOCKED_ALIASES[entry];
  if (aliases) return aliases.map(phraseToRegex);
  const fragments = entry
    .replace(/\([^)]*\)/g, '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  return fragments.map(phraseToRegex);
}

function substitutionForBlockedEntry(protocol, entry) {
  const subs = protocol.blockedMovements?.substitutions || {};
  const key = Object.keys(subs).find((k) => entry.toLowerCase().startsWith(k.toLowerCase()));
  return key ? subs[key] : null;
}

/**
 * Scan programmed-exercise text against blockedMovements.current.
 * Returns [{ blocked, substitution }] for every blocked entry the text
 * matches. Matching is deliberately keyword-based: "floor push-up" hits the
 * floor push-up entry while "wall push-up" (programmed in Phase 2B) does not.
 */
export function findBlockedMatches(text, protocol) {
  if (!text) return [];
  const out = [];
  for (const entry of protocol.blockedMovements?.current || []) {
    if (patternsForBlockedEntry(entry).some((re) => re.test(text))) {
      out.push({ blocked: entry, substitution: substitutionForBlockedEntry(protocol, entry) });
    }
  }
  return out;
}

// ---------- schedule helpers -------------------------------------------------

/** Scheduled tests / checkpoint reports that land on the given day. */
export function testsOnDate(protocol, key) {
  const out = [];
  for (const phase of protocol.phases) {
    if (phase.exitGate?.scheduledRetest === key) {
      out.push({ kind: 'retest', label: `Cross-body retest (Phase ${phase.id} exit gate)`, phaseId: phase.id });
    }
  }
  for (const cp of protocol.checkpoints || []) {
    if (cp.date === key) {
      out.push({ kind: 'checkpoint', label: `Checkpoint report: ${cp.report.join('; ')}` });
    }
  }
  return out;
}

/**
 * Latest-wins compliance state per day from append-only rehab_compliance rows.
 * Returns Map(dayKey -> Map(item -> completed)).
 */
export function complianceByDay(rows) {
  const sorted = [...(rows || [])].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
  const byDay = new Map();
  for (const r of sorted) {
    const day = dayKeyLocal(r.logged_at);
    if (!byDay.has(day)) byDay.set(day, new Map());
    byDay.get(day).set(r.item, !!r.completed);
  }
  return byDay;
}

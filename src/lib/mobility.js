const EACH_SIDE_RE = /(\beach\s+(side|leg|arm|direction|foot|position)|\beach\b\s*(?:$|\+)|\/(side|leg|arm))/i;
const SETS_X_VALUE_RE = /(\d+)\s*x\s*(\d+(?:-\d+)?s?)/i;
const STANDALONE_HOLD_RE = /^(\d+)\s*s\b/i;
const STANDALONE_REPS_RE = /^(\d+)\b/;

export function parseSets(setsStr) {
  const fallback = { setCount: 1, repTarget: null, holdSeconds: null, eachSide: false, extra: null };
  if (!setsStr || typeof setsStr !== 'string') return fallback;

  const raw = setsStr.trim();
  const eachSide = EACH_SIDE_RE.test(raw);

  const setsMatch = raw.match(SETS_X_VALUE_RE);
  let setCount = 1;
  let repTarget = null;
  let holdSeconds = null;

  if (setsMatch) {
    setCount = parseInt(setsMatch[1], 10);
    const value = setsMatch[2];
    if (/s$/i.test(value)) {
      holdSeconds = parseInt(value, 10);
    } else if (value.includes('-')) {
      const [lo, hi] = value.split('-').map((n) => parseInt(n, 10));
      repTarget = [lo, hi];
    } else {
      repTarget = parseInt(value, 10);
    }
  } else {
    const holdMatch = raw.match(STANDALONE_HOLD_RE);
    const repMatch = raw.match(STANDALONE_REPS_RE);
    if (holdMatch) holdSeconds = parseInt(holdMatch[1], 10);
    else if (repMatch) repTarget = parseInt(repMatch[1], 10);
  }

  const plusIdx = raw.indexOf('+');
  const extra = plusIdx > 0 ? raw.slice(plusIdx).trim() : null;

  return { setCount, repTarget, holdSeconds, eachSide, extra };
}

export function formatTarget({ repTarget, holdSeconds, eachSide }) {
  let core = '';
  if (holdSeconds != null) core = `${holdSeconds}s hold`;
  else if (Array.isArray(repTarget)) core = `${repTarget[0]}–${repTarget[1]} reps`;
  else if (repTarget != null) core = `${repTarget} reps`;
  else core = '—';
  return eachSide ? `${core} · each side` : core;
}

const REP_TIME = 3;
const REST_BETWEEN_SETS = 45;

export function estimateRoutineSeconds(routine) {
  if (!routine?.exercises) return 0;
  return routine.exercises.reduce((sum, ex) => {
    const { setCount, holdSeconds, repTarget, eachSide } = parseSets(ex.sets);
    const perSet = holdSeconds ?? (Array.isArray(repTarget) ? repTarget[1] : repTarget ?? 10) * REP_TIME;
    const sides = eachSide ? 2 : 1;
    const work = perSet * sides * setCount;
    const rest = REST_BETWEEN_SETS * Math.max(0, setCount - 1);
    return sum + work + rest;
  }, 0);
}

export function uniqueTags(routine) {
  if (!routine?.exercises) return [];
  const seen = new Set();
  for (const ex of routine.exercises) {
    for (const t of ex.tags ?? []) seen.add(t);
  }
  return [...seen];
}

export function countWeighted(routine) {
  if (!routine?.exercises) return 0;
  return routine.exercises.filter((ex) => ex.load && ex.load !== 'None' && !/bodyweight/i.test(ex.load)).length;
}

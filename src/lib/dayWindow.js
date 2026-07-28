// The Today day track's visible window (default 05:00–21:00), configurable
// from the You tab. localStorage `day-window-v1` = { start: "HH:MM", end: "HH:MM" }.

const KEY = 'day-window-v1';
export const DEFAULT_WINDOW = { start: '05:00', end: '21:00' };

const HM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const parseHM = (hm) => {
  const m = HM_RE.exec(hm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const isValid = (w) => {
  const s = parseHM(w?.start);
  const e = parseHM(w?.end);
  return s != null && e != null && e > s;
};

export const getDayWindow = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    return isValid(stored) ? stored : DEFAULT_WINDOW;
  } catch {
    return DEFAULT_WINDOW;
  }
};

export const setDayWindow = (w) => {
  if (isValid(w)) localStorage.setItem(KEY, JSON.stringify(w));
};

// 0–1 position of a time (minutes since midnight) inside the window,
// clamped to the ends per the design (early/late items pin to the edges).
export const windowFraction = (minutes, w = DEFAULT_WINDOW) => {
  const s = parseHM(w.start);
  const e = parseHM(w.end);
  return Math.min(1, Math.max(0, (minutes - s) / (e - s)));
};

export const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes();

// Five evenly spaced hour labels under the track (e.g. 05 09 13 17 21).
export const hourLabels = (w = DEFAULT_WINDOW) => {
  const s = parseHM(w.start);
  const e = parseHM(w.end);
  return [0, 0.25, 0.5, 0.75, 1].map((f) =>
    String(Math.round((s + f * (e - s)) / 60) % 24).padStart(2, '0')
  );
};

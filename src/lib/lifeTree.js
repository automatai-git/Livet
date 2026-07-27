// Pure helpers for the weekly life tree: ISO-week keys (Monday start) and
// the strict-AND roll-up. A node is `complete` only when every leaf below it
// is ticked; partially done nodes carry their done/total fraction instead.

const DAY_MS = 86400000;

// ISO-8601 week number: the week containing the year's first Thursday is W01.
export const isoWeekParts = (input) => {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  // Shift to the Thursday of this week — it decides the ISO year.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d - week1) / DAY_MS - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { year: d.getFullYear(), week };
};

export const weekKey = (input) => {
  const { year, week } = isoWeekParts(input);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

export const weekStart = (input) => {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

// Keys for the trailing `n` weeks ending at `input`'s week, oldest first.
export const lastNWeekKeys = (input, n) => {
  const start = weekStart(input);
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(weekKey(new Date(start.getTime() - i * 7 * DAY_MS)));
  }
  return keys;
};

export const weekLabel = (key) => {
  const [year, week] = key.split('-W');
  return `Week ${Number(week)}, ${year}`;
};

export const collectLeaves = (node) =>
  node.children?.length ? node.children.flatMap(collectLeaves) : [node];

// ticks: { [leafId]: true }. Returns { [nodeId]: { done, total, complete } }.
export const rollUp = (node, ticks, out = {}) => {
  if (!node.children?.length) {
    const done = ticks?.[node.id] ? 1 : 0;
    out[node.id] = { done, total: 1, complete: done === 1 };
    return out;
  }
  let done = 0;
  let total = 0;
  for (const child of node.children) {
    rollUp(child, ticks, out);
    done += out[child.id].done;
    total += out[child.id].total;
  }
  out[node.id] = { done, total, complete: total > 0 && done === total };
  return out;
};

// weeks: array of tick maps (one per tracked week). Returns leaf stats
// sorted worst-first, so [0] answers "what should I work on?".
export const leafHitRates = (tree, weeks) => {
  const counted = weeks.filter(Boolean);
  return collectLeaves(tree)
    .map((leaf) => ({
      id: leaf.id,
      label: leaf.label,
      count: counted.reduce((sum, ticks) => sum + (ticks[leaf.id] ? 1 : 0), 0),
      outOf: counted.length,
    }))
    .sort((a, b) => a.count - b.count);
};

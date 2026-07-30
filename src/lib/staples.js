// Household staples — the things you keep at home alongside the week's
// meals (toilet paper, soda, salt, oil …). Purely local, like saved outfits
// and custom travel pins: a versioned localStorage key, no Supabase table.
//
// A staple is `{ id, name, need }`. `need` is the running-low flag: ticked
// staples are the ones that join the exported shopping list, filed into
// their store section by src/lib/grocery.js like any other item.
//
// List transforms are pure and unit-tested in staples.test.js; only
// loadStaples/saveStaples touch storage.

export const STAPLES_KEY = 'menu-staples-v1';

/** Offered as one-tap chips in the empty state — never auto-added. */
export const STAPLE_SUGGESTIONS = [
  'Toilet paper', 'Soda', 'Salt', 'Oil', 'Coffee', 'Milk',
  'Eggs', 'Butter', 'Dish soap', 'Kitchen roll',
];

let idCounter = 0;
const nextId = () => `st-${Date.now().toString(36)}-${(idCounter += 1)}`;

const normalizeName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();

/** Coerce whatever is in storage into a well-formed staples array. */
export const normalizeStaples = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.reduce((list, entry) => {
    const name = normalizeName(typeof entry === 'string' ? entry : entry?.name);
    if (!name) return list;
    const key = name.toLowerCase();
    if (seen.has(key)) return list;
    seen.add(key);
    list.push({
      id: (typeof entry === 'object' && entry?.id) || nextId(),
      name,
      need: typeof entry === 'object' ? Boolean(entry.need) : false,
    });
    return list;
  }, []);
};

export const loadStaples = () => {
  try {
    return normalizeStaples(JSON.parse(localStorage.getItem(STAPLES_KEY)));
  } catch {
    return [];
  }
};

export const saveStaples = (list) => {
  try {
    localStorage.setItem(STAPLES_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked (private mode) — the in-memory list still works.
  }
};

/** Append a staple. A name already on the list is a no-op, not a duplicate. */
export const addStaple = (list, name) => {
  const clean = normalizeName(name);
  if (!clean) return list;
  if (list.some((s) => s.name.toLowerCase() === clean.toLowerCase())) return list;
  return [...list, { id: nextId(), name: clean, need: false }];
};

export const removeStaple = (list, id) => list.filter((s) => s.id !== id);

export const toggleStaple = (list, id) =>
  list.map((s) => (s.id === id ? { ...s, need: !s.need } : s));

export const renameStaple = (list, id, name) => {
  const clean = normalizeName(name);
  if (!clean) return list;
  return list.map((s) => (s.id === id ? { ...s, name: clean } : s));
};

/** Clear every running-low flag, e.g. after the shop. */
export const clearNeeded = (list) => list.map((s) => (s.need ? { ...s, need: false } : s));

/** The names to fold into the shopping list. */
export const neededNames = (list) => list.filter((s) => s.need).map((s) => s.name);

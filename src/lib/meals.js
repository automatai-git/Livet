// Shape helpers for the `meals` table.
//
// The table has been written to by more than one generation of the app, so a
// row's `ingredients` may arrive as a real jsonb array, as a JSON *string*
// holding an array, or as a bare comma-separated string; `macros` is either a
// `{summary}` object or the JSON string of one. Every reader goes through
// here so the rest of the app only ever sees an array and a plain string.
//
// Pure module — unit-tested in meals.test.js.

/**
 * Normalise a row's `ingredients` column to a clean string array.
 * @param {unknown} value
 * @returns {string[]}
 */
export const parseIngredients = (value) => {
  if (Array.isArray(value)) return cleanList(value);
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return cleanList(parsed);
    } catch {
      // fall through to the comma split below
    }
  }
  return cleanList(text.split(/[,\n]/));
};

const cleanList = (list) =>
  list
    .map((i) => String(i ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

/**
 * Normalise a row's `macros` column to the single summary line the UI shows.
 * @param {unknown} value
 * @returns {string}
 */
export const parseMacroSummary = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value.summary ?? '').trim();
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text) return '';
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      return String(parsed?.summary ?? '').trim();
    } catch {
      return text;
    }
  }
  return text;
};

/** Split the textarea's free text back into the stored ingredient array. */
export const splitIngredientInput = (text) =>
  cleanList(String(text ?? '').split(/[,\n]/));

/** A meal row → the form's editable field set. */
export const mealToForm = (meal = {}) => ({
  name: meal.name ?? '',
  category: meal.category || 'Dinner',
  time_to_cook: meal.time_to_cook ?? '',
  emoji: meal.emoji || '🍲',
  ingredients: parseIngredients(meal.ingredients).join(', '),
  macros: parseMacroSummary(meal.macros),
  portions: meal.portions ?? 2,
  cuisine: meal.cuisine ?? '',
});

/**
 * The form's field set → the row payload.
 * Ingredients and macros are written as real JSON values (jsonb columns
 * accept them directly); readers stay tolerant of the older string form.
 */
export const formToPayload = (form) => ({
  name: String(form.name ?? '').trim(),
  category: form.category || 'Dinner',
  time_to_cook: String(form.time_to_cook ?? '').trim(),
  emoji: String(form.emoji ?? '').trim() || '🍲',
  ingredients: splitIngredientInput(form.ingredients),
  macros: { summary: String(form.macros ?? '').trim() },
  portions: Number.parseInt(form.portions, 10) || 2,
  cuisine: String(form.cuisine ?? '').trim(),
});

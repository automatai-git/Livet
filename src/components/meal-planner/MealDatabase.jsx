import React, { useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import AppIcon from '../AppIcon';
import { mealToForm, formToPayload, parseIngredients, parseMacroSummary } from '../../lib/meals';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const BLANK_FORM = mealToForm({});

// The meal collection: browse, add, and edit. A row is the tap target —
// tapping opens the same form the "+ New meal" button does, pre-filled from
// the row, so editing and adding are one surface rather than two.
//
// Props: meals, loading, onSaved(meal), onDeleted(id)
const MealDatabase = ({ meals = [], loading = false, onSaved, onDeleted }) => {
  const [editingId, setEditingId] = useState(null); // meal id, 'new', or null
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { tone: 'error' | 'ok', text }
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const closeForm = () => {
    setEditingId(null);
    setConfirmDelete(false);
    setNotice(null);
  };

  const openNew = () => {
    setForm(BLANK_FORM);
    setEditingId('new');
    setConfirmDelete(false);
    setNotice(null);
  };

  const openEdit = (meal) => {
    setForm(mealToForm(meal));
    setEditingId(meal.id);
    setConfirmDelete(false);
    setNotice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = formToPayload(form);
    if (!payload.name) {
      setNotice({ tone: 'error', text: 'A meal needs a name.' });
      return;
    }
    setSaving(true);
    setNotice(null);

    const query = editingId === 'new'
      ? supabase.from('meals').insert([payload]).select()
      : supabase.from('meals').update(payload).eq('id', editingId).select();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      setNotice({ tone: 'error', text: `Could not save: ${error.message}` });
      return;
    }
    // A policy that refuses the write returns success with nothing changed —
    // an empty result is the only signal, so treat it as the failure it is.
    if (!data || data.length === 0) {
      setNotice({
        tone: 'error',
        text: 'The database accepted the request but changed nothing — check the table’s row-level security policies.',
      });
      return;
    }
    onSaved?.(data[0]);
    closeForm();
  };

  const handleDelete = async () => {
    // Two-tap confirm rather than a browser dialog: the first tap arms it.
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    // .select() so a delete blocked by row-level security is visible: the
    // request succeeds with an empty result rather than raising an error.
    const { data, error } = await supabase.from('meals').delete().eq('id', editingId).select();
    setSaving(false);
    setConfirmDelete(false);
    if (error) {
      setNotice({ tone: 'error', text: `Could not delete: ${error.message}` });
      return;
    }
    if (!data || data.length === 0) {
      setNotice({
        tone: 'error',
        text: 'Nothing was deleted — the meals table has no delete policy for your account.',
      });
      return;
    }
    onDeleted?.(editingId);
    closeForm();
  };

  // Ballpark macros from the ingredient list. Needs VITE_GEMINI_API_KEY in
  // .env.local — the key is deliberately not part of the Pages build, so
  // this is a local-only convenience (see README note in the repo).
  const calculateMacros = async () => {
    const ingredients = form.ingredients.trim();
    if (!ingredients) {
      setNotice({ tone: 'error', text: 'Enter the ingredients first.' });
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setNotice({
        tone: 'error',
        text: 'No VITE_GEMINI_API_KEY in .env.local — type the macros in by hand.',
      });
      return;
    }
    const previous = form.macros;
    setField('macros', 'Calculating…');
    setNotice(null);
    try {
      const prompt =
        `Ingredients for ${form.portions} portions: ${ingredients}. ` +
        'Reply with ONLY one line, in exactly this format, for a SINGLE portion: ' +
        '000 kcal | 00g P | 00g C | 00g F';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // The budget covers the model's reasoning tokens as well as the
          // answer; too small a cap truncates the line away entirely.
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2000 },
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p?.text ?? '')
        .join('')
        .trim();
      if (!text) throw new Error('The model returned no macro line.');
      setField('macros', text.split('\n').filter(Boolean).pop().trim());
    } catch (err) {
      setField('macros', previous);
      setNotice({ tone: 'error', text: `Macro estimate failed: ${err.message}` });
    }
  };

  const sorted = useMemo(
    () => [...meals].sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
    ),
    [meals]
  );

  const isNew = editingId === 'new';
  const editing = editingId !== null;

  return (
    <div className="meal-db">
      <div className="section-head">
        <span className="eyebrow">
          {meals.length} meal{meals.length === 1 ? '' : 's'} saved
        </span>
        {!editing && (
          <button type="button" className="ink-pill sm" onClick={openNew}>+ New meal</button>
        )}
      </div>

      {editing && (
        <form className="surface-card meal-form" onSubmit={handleSubmit}>
          <div className="meal-form-head">
            <h3 className="heading-serif">{isNew ? 'New meal' : 'Edit meal'}</h3>
            <button type="button" className="ghost-pill sm" onClick={closeForm}>Cancel</button>
          </div>

          <div className="meal-form-grid">
            <label className="meal-field emoji">
              <span>Emoji</span>
              <input
                value={form.emoji}
                onChange={(e) => setField('emoji', e.target.value)}
                maxLength={4}
              />
            </label>
            <label className="meal-field grow">
              <span>Meal name</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </label>
          </div>

          <label className="meal-field">
            <span>Ingredients (comma or line separated)</span>
            <textarea
              value={form.ingredients}
              onChange={(e) => setField('ingredients', e.target.value)}
              rows={3}
            />
          </label>

          <div className="meal-form-grid">
            <label className="meal-field">
              <span>Category</span>
              <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="meal-field">
              <span>Portions</span>
              <input
                type="number"
                min="1"
                value={form.portions}
                onChange={(e) => setField('portions', e.target.value)}
              />
            </label>
            <label className="meal-field">
              <span>Cuisine</span>
              <input
                placeholder="Italian, Mexican…"
                value={form.cuisine}
                onChange={(e) => setField('cuisine', e.target.value)}
              />
            </label>
          </div>

          <label className="meal-field">
            <span>Time to cook</span>
            <input
              placeholder="30 mins"
              value={form.time_to_cook}
              onChange={(e) => setField('time_to_cook', e.target.value)}
            />
          </label>

          <label className="meal-field">
            <span>Macros per portion</span>
            <div className="meal-field-row">
              <input
                placeholder="600 kcal | 35g P | 70g C | 18g F"
                value={form.macros}
                onChange={(e) => setField('macros', e.target.value)}
              />
              <button type="button" className="ghost-pill sm" onClick={calculateMacros}>
                Estimate
              </button>
            </div>
          </label>

          {notice && <p className={`meal-notice ${notice.tone}`}>{notice.text}</p>}

          <div className="meal-form-actions">
            {!isNew && (
              <button
                type="button"
                className={`ghost-pill danger${confirmDelete ? ' armed' : ''}`}
                onClick={handleDelete}
                disabled={saving}
              >
                {confirmDelete ? 'Tap again to delete' : 'Delete'}
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add meal' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted-row">Loading meals…</p>
      ) : sorted.length === 0 ? (
        <p className="muted-row">No meals yet — add the first one.</p>
      ) : (
        <div className="row-stack">
          {sorted.map((meal) => {
            const ingredients = parseIngredients(meal.ingredients);
            const macros = parseMacroSummary(meal.macros);
            return (
              <button
                type="button"
                key={meal.id}
                className={`meal-list-row${editingId === meal.id ? ' editing' : ''}`}
                onClick={() => openEdit(meal)}
              >
                <span className="icon-chip md" aria-hidden="true">
                  <span className="chip-emoji">{meal.emoji}</span>
                </span>
                <span className="meal-list-body">
                  <span className="row-title ellipsis">{meal.name}</span>
                  <span className="row-meta ellipsis">
                    {[
                      meal.time_to_cook,
                      meal.portions ? `${meal.portions} portions` : null,
                      macros || (ingredients.length
                        ? `${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'}`
                        : null),
                    ].filter(Boolean).join(' · ') || 'Tap to add details'}
                  </span>
                </span>
                <AppIcon name="chev" size={16} className="row-chev" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MealDatabase;

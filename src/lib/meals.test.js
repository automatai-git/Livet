import { describe, it, expect } from 'vitest';
import {
  parseIngredients,
  parseMacroSummary,
  splitIngredientInput,
  mealToForm,
  formToPayload,
} from './meals';

describe('parseIngredients', () => {
  it('passes through a real jsonb array', () => {
    expect(parseIngredients(['Pasta', 'Minced meat'])).toEqual(['Pasta', 'Minced meat']);
  });

  it('parses the legacy JSON-string form', () => {
    expect(parseIngredients('["pasta","sauce. meat"]')).toEqual(['pasta', 'sauce. meat']);
  });

  it('falls back to splitting a bare comma/newline string', () => {
    expect(parseIngredients('Rice, Broccoli\nLemon')).toEqual(['Rice', 'Broccoli', 'Lemon']);
  });

  it('trims, collapses whitespace and drops blanks', () => {
    expect(parseIngredients([' Red   onion ', '', null])).toEqual(['Red onion']);
    expect(parseIngredients('Rice,,  , Broccoli')).toEqual(['Rice', 'Broccoli']);
  });

  it('returns an empty array for empty or unusable input', () => {
    expect(parseIngredients(null)).toEqual([]);
    expect(parseIngredients('')).toEqual([]);
    expect(parseIngredients(42)).toEqual([]);
  });

  it('recovers from a malformed JSON array by splitting it', () => {
    expect(parseIngredients('[Rice, Broccoli')).toEqual(['[Rice', 'Broccoli']);
  });
});

describe('parseMacroSummary', () => {
  it('reads the object form', () => {
    expect(parseMacroSummary({ summary: '600 kcal | 35g P' })).toBe('600 kcal | 35g P');
  });

  it('reads the JSON-string form', () => {
    expect(parseMacroSummary('{"summary": "550 kcal"}')).toBe('550 kcal');
  });

  it('treats a plain string as the summary itself', () => {
    expect(parseMacroSummary('450 kcal')).toBe('450 kcal');
  });

  it('is empty for empty input', () => {
    expect(parseMacroSummary(null)).toBe('');
    expect(parseMacroSummary({ summary: '' })).toBe('');
    expect(parseMacroSummary('{"summary": ""}')).toBe('');
  });
});

describe('splitIngredientInput', () => {
  it('splits on commas and newlines', () => {
    expect(splitIngredientInput('Rice, Broccoli\n Lemon ')).toEqual(['Rice', 'Broccoli', 'Lemon']);
  });
});

describe('mealToForm / formToPayload', () => {
  const row = {
    id: 'x', name: 'Pasta bolognese', category: 'Dinner', time_to_cook: '30 mins',
    emoji: '🍝', ingredients: '["Pasta","Minced meat"]',
    macros: '{"summary": "600 kcal"}', portions: 4, cuisine: 'Italian',
  };

  it('renders a row into editable fields', () => {
    expect(mealToForm(row)).toEqual({
      name: 'Pasta bolognese', category: 'Dinner', time_to_cook: '30 mins',
      emoji: '🍝', ingredients: 'Pasta, Minced meat', macros: '600 kcal',
      portions: 4, cuisine: 'Italian',
    });
  });

  it('supplies defaults for a blank meal', () => {
    const form = mealToForm({});
    expect(form.category).toBe('Dinner');
    expect(form.emoji).toBe('🍲');
    expect(form.portions).toBe(2);
  });

  it('round-trips a row through the form without losing content', () => {
    const payload = formToPayload(mealToForm(row));
    expect(payload.ingredients).toEqual(['Pasta', 'Minced meat']);
    expect(payload.macros).toEqual({ summary: '600 kcal' });
    expect(payload.portions).toBe(4);
    expect(payload.name).toBe('Pasta bolognese');
  });

  it('coerces a non-numeric portions field to the default', () => {
    expect(formToPayload({ portions: '' }).portions).toBe(2);
    expect(formToPayload({ portions: '6' }).portions).toBe(6);
  });

  it('trims text fields and falls back to the default emoji', () => {
    const payload = formToPayload({ name: '  Taco  ', emoji: '  ', cuisine: ' Mexican ' });
    expect(payload.name).toBe('Taco');
    expect(payload.emoji).toBe('🍲');
    expect(payload.cuisine).toBe('Mexican');
  });
});

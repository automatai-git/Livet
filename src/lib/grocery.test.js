import { describe, it, expect } from 'vitest';
import {
  GROCERY_SECTIONS,
  categorizeIngredient,
  normalizeIngredient,
  groupIngredients,
  formatShoppingList,
  countItems,
} from './grocery';

describe('normalizeIngredient', () => {
  it('strips leading quantities and units', () => {
    expect(normalizeIngredient('500g minced meat')).toBe('minced meat');
    expect(normalizeIngredient('2 x 400g crushed tomatoes')).toBe('crushed tomatoes');
    expect(normalizeIngredient('1 tbsp of olive oil')).toBe('olive oil');
  });

  it('collapses whitespace and tolerates junk input', () => {
    expect(normalizeIngredient('  red   onion ')).toBe('red onion');
    expect(normalizeIngredient(null)).toBe('');
  });
});

describe('categorizeIngredient', () => {
  it('places everyday ingredients in the expected aisle', () => {
    expect(categorizeIngredient('Broccoli')).toBe('produce');
    expect(categorizeIngredient('Pita bread')).toBe('bakery');
    expect(categorizeIngredient('Salmon fillet')).toBe('meat');
    expect(categorizeIngredient('Parmesan')).toBe('dairy');
    expect(categorizeIngredient('Rice')).toBe('pantry');
    expect(categorizeIngredient('Oregano')).toBe('spices');
    expect(categorizeIngredient('Soy sauce')).toBe('sauces');
    expect(categorizeIngredient('Toilet paper')).toBe('household');
  });

  it('lets the longest keyword win over a shorter substring', () => {
    // "tomato sauce" must not be filed under produce with the tomatoes
    expect(categorizeIngredient('Tomato sauce')).toBe('sauces');
    expect(categorizeIngredient('Tomato')).toBe('produce');
    // "coconut milk" is a pantry tin, not a chilled dairy carton
    expect(categorizeIngredient('Coconut milk')).toBe('pantry');
    expect(categorizeIngredient('Milk')).toBe('dairy');
    // "sour cream" and plain cream are both dairy, but "ice cream" is frozen
    expect(categorizeIngredient('Sour cream')).toBe('dairy');
    expect(categorizeIngredient('Ice cream')).toBe('frozen');
  });

  it('matches on word boundaries, not bare substrings', () => {
    // "boiled" contains "oil" but is not a bottle of oil
    expect(categorizeIngredient('Boiled potatoes')).toBe('produce');
    expect(categorizeIngredient('Olive oil')).toBe('sauces');
  });

  it('falls back to other for anything unrecognised', () => {
    expect(categorizeIngredient('Sondrio speciality')).toBe('other');
    expect(categorizeIngredient('')).toBe('other');
  });
});

describe('groupIngredients', () => {
  const meal = [
    'Salmon fillet', 'Rice', 'Broccoli', 'Soy sauce', 'Lemon', 'Olive oil',
    'Pasta', 'Minced meat', 'Tomato sauce', 'Onion', 'Garlic', 'Parmesan',
  ];

  it('returns sections in store-walk order, produce first', () => {
    const groups = groupIngredients(meal);
    expect(groups[0].id).toBe('produce');
    const order = groups.map((g) => g.id);
    const canonical = GROCERY_SECTIONS.map((s) => s.id).filter((id) => order.includes(id));
    expect(order).toEqual(canonical);
  });

  it('omits empty sections', () => {
    const groups = groupIngredients(['Broccoli', 'Carrot']);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Fruit & vegetables');
    expect(groups[0].items).toEqual(['Broccoli', 'Carrot']);
  });

  it('dedupes case-insensitively, keeping the first spelling', () => {
    const groups = groupIngredients(['Onion', 'onion', '  ONION  ', 'Garlic']);
    expect(groups[0].items).toEqual(['Garlic', 'Onion']);
  });

  it('sorts alphabetically inside a section', () => {
    const produce = groupIngredients(meal).find((g) => g.id === 'produce');
    expect(produce.items).toEqual(['Broccoli', 'Garlic', 'Lemon', 'Onion']);
  });

  it('honours an explicit section on object entries', () => {
    const groups = groupIngredients([{ name: 'Mystery mix', section: 'household' }]);
    expect(groups[0].id).toBe('household');
  });

  it('ignores blank entries', () => {
    expect(groupIngredients(['', '   ', null, undefined])).toEqual([]);
  });
});

describe('formatShoppingList', () => {
  it('prints an uppercase section header above its checkboxes', () => {
    const text = formatShoppingList(groupIngredients(['Broccoli', 'Milk']));
    expect(text).toContain('FRUIT & VEGETABLES\n[ ] Broccoli');
    expect(text).toContain('DAIRY & EGGS\n[ ] Milk');
    expect(text.indexOf('FRUIT')).toBeLessThan(text.indexOf('DAIRY'));
  });

  it('uses the supplied title', () => {
    expect(formatShoppingList([], { title: 'Week 31' }).startsWith('Week 31')).toBe(true);
  });
});

describe('countItems', () => {
  it('totals items across sections', () => {
    expect(countItems(groupIngredients(['Broccoli', 'Milk', 'Rice']))).toBe(3);
    expect(countItems([])).toBe(0);
  });
});

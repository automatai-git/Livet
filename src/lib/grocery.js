// Grocery-aisle grouping for the Menu Planner shopping list.
//
// A shopping list sorted A–Z sends you back and forth across the shop. This
// module instead buckets every ingredient into the section of the store it is
// sold in, and orders those sections the way you actually walk a supermarket:
// fresh produce at the entrance, then bakery, the fresh counters, chilled,
// frozen, the dry-goods aisles, and finally drinks and household on the way
// to the till.
//
// Pure module — no React, no storage. Unit-tested in grocery.test.js.

/** Store sections in walk order. `id` is stable; `label` is what the list prints. */
export const GROCERY_SECTIONS = [
  { id: 'produce', label: 'Fruit & vegetables' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'meat', label: 'Meat & fish' },
  { id: 'dairy', label: 'Dairy & eggs' },
  { id: 'frozen', label: 'Frozen' },
  { id: 'pantry', label: 'Pantry & dry goods' },
  { id: 'spices', label: 'Herbs, spices & baking' },
  { id: 'sauces', label: 'Sauces, oil & condiments' },
  { id: 'snacks', label: 'Snacks & sweets' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'household', label: 'Household' },
  { id: 'other', label: 'Other' },
];

export const SECTION_LABELS = Object.fromEntries(
  GROCERY_SECTIONS.map((s) => [s.id, s.label])
);

// Keyword → section. Matching is word-boundary aware and longest-keyword-wins,
// so "tomato sauce" lands in sauces (not produce) and "coconut milk" in pantry
// (not dairy). Keep entries lowercase and singular where the plural is just +s.
const SECTION_KEYWORDS = {
  produce: [
    'apple', 'apples', 'avocado', 'banana', 'basil leaves', 'bean sprouts',
    'beetroot', 'bell pepper', 'berries', 'blueberries', 'broccoli',
    'brussels sprouts', 'cabbage', 'carrot', 'carrots', 'cauliflower',
    'celery', 'cherry tomatoes', 'chilli', 'chili', 'clementine', 'corn',
    'courgette', 'cucumber', 'fennel', 'fresh coriander', 'fresh dill',
    'fresh mint', 'fresh parsley', 'fruit', 'garlic', 'ginger', 'grapes',
    'green beans', 'iceberg', 'kale', 'leek', 'lemon', 'lettuce', 'lime',
    'mango', 'melon', 'mushroom', 'mushrooms', 'nectarine', 'onion',
    'onions', 'orange', 'parsnip', 'pear', 'peas', 'pepper strips',
    'pineapple', 'plum', 'pomegranate', 'potato', 'potatoes', 'pumpkin',
    'radish', 'red onion', 'rocket', 'romaine', 'salad', 'shallot',
    'spinach', 'spring onion', 'squash', 'strawberries', 'sugar snap',
    'sweet potato', 'tomato', 'tomatoes', 'turnip', 'vegetables', 'veggies',
    'watermelon', 'zucchini',
  ],
  bakery: [
    'bagel', 'baguette', 'bread', 'bread rolls', 'brioche', 'buns',
    'burger buns', 'ciabatta', 'crispbread', 'croissant', 'dough',
    'flatbread', 'focaccia', 'hot dog buns', 'knekkebrød', 'naan',
    'pita', 'pita bread', 'pizza dough', 'rolls', 'sourdough', 'tortilla',
    'tortillas', 'wraps',
  ],
  meat: [
    'bacon', 'beef', 'beef steak', 'chicken', 'chicken breast',
    'chicken thighs', 'chorizo', 'cod', 'duck', 'fish', 'fish cakes',
    'ham', 'kjøttdeig', 'lamb', 'meat', 'meatballs', 'mince',
    'minced meat', 'mussels', 'pancetta', 'pepperoni', 'pork',
    'pork strips', 'prawns', 'salami', 'salmon', 'salmon fillet',
    'sausage', 'sausages', 'scampi', 'shrimp', 'steak', 'trout', 'tuna',
    'turkey',
  ],
  dairy: [
    'brie', 'butter', 'cheddar', 'cheese', 'cottage cheese', 'cream',
    'cream cheese', 'creme fraiche', 'crème fraîche', 'egg', 'eggs',
    'feta', 'greek yoghurt', 'halloumi', 'kefir', 'margarine',
    'mascarpone', 'milk', 'mozzarella', 'parmesan', 'quark', 'ricotta',
    'skyr', 'sour cream', 'yoghurt', 'yogurt',
  ],
  frozen: [
    'frozen', 'frozen berries', 'frozen peas', 'frozen pizza',
    'ice cream', 'fish fingers', 'fish burger patties', 'chips (frozen)',
  ],
  pantry: [
    'baked beans', 'beans', 'black beans', 'bulgur', 'canned tomatoes',
    'cashews', 'cereal', 'chickpeas', 'coconut milk', 'couscous',
    'crackers', 'crushed tomatoes', 'dried lentils', 'flour', 'granola',
    'lasagne sheets', 'lentils', 'muesli', 'noodles', 'nuts', 'oats',
    'olives', 'pasta', 'peanut butter', 'peanuts', 'pine nuts', 'quinoa',
    'raisins', 'rice', 'rice noodles', 'seeds', 'spaghetti', 'stock cube',
    'sun-dried tomatoes', 'taco shells', 'tinned tomatoes', 'tomato puree',
    'tortilla chips', 'tuna (tinned)', 'walnuts',
  ],
  spices: [
    'baking powder', 'baking soda', 'bay leaves', 'chilli flakes',
    'cinnamon', 'cocoa', 'coriander', 'cumin', 'curry powder', 'dill',
    'gyros seasoning', 'herbs', 'honey', 'nutmeg', 'oregano', 'paprika',
    'parsley', 'pepper', 'rosemary', 'saffron', 'sage', 'salt', 'seasoning',
    'sesame seeds', 'spice', 'spice mix', 'spices', 'sugar',
    'taco spice mix', 'thyme', 'turmeric', 'vanilla', 'yeast',
  ],
  sauces: [
    'balsamic', 'bbq sauce', 'chilli sauce', 'dressing', 'fish sauce',
    'gravy', 'hoisin', 'hummus', 'ketchup', 'mayo', 'mayonnaise',
    'mustard', 'oil', 'olive oil', 'oyster sauce', 'pesto', 'pickles',
    'pizza sauce', 'rapeseed oil', 'remoulade', 'salsa', 'sauce',
    'sesame oil', 'soy sauce', 'sriracha', 'sunflower oil',
    'sweet chilli', 'tartar sauce', 'tomato sauce', 'tzatziki', 'vinegar',
    'wok sauce', 'worcestershire',
  ],
  snacks: [
    'biscuits', 'candy', 'chocolate', 'cookies', 'crisps', 'dessert',
    'popcorn', 'potato chips', 'snacks', 'sweets',
  ],
  drinks: [
    'beer', 'coffee', 'cordial', 'energy drink', 'juice', 'lemonade',
    'mineral water', 'soda', 'soft drink', 'sparkling water', 'squash drink',
    'tea', 'water', 'wine',
  ],
  household: [
    'aluminium foil', 'baking paper', 'batteries', 'bin bags', 'bin liners',
    'cling film', 'detergent', 'dish soap', 'dishwasher tablets',
    'fabric softener', 'foil', 'hand soap', 'kitchen roll', 'kitchen towel',
    'laundry detergent', 'napkins', 'paper towels', 'shampoo', 'soap',
    'sponges', 'surface cleaner', 'toilet paper', 'toothpaste',
    'washing powder', 'washing-up liquid',
  ],
};

// Flattened, longest-first so the most specific keyword wins.
const KEYWORD_INDEX = Object.entries(SECTION_KEYWORDS)
  .flatMap(([section, words]) => words.map((word) => ({ word, section })))
  .sort((a, b) => b.word.length - a.word.length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Quantities and units are noise for categorising: "2 x 400g crushed
// tomatoes" and "crushed tomatoes" are the same aisle. One pass strips one
// leading "<number><unit?>" (or a linking "x" / "of"), so multi-part
// quantities peel off by repeating it.
const QUANTITY_RE =
  /^(?:\d+(?:[.,/]\d+)?\s*(?:kg|g|gram|grams|l|dl|ml|cl|tbsp|tsp|cups?|pcs|packs?|tins?|cans?|box(?:es)?|bunch|cloves?)?\.?|x|of)\s*/i;

/** Strip leading quantities/units and normalise whitespace for matching. */
export const normalizeIngredient = (raw) => {
  let text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  // Bounded loop: every iteration consumes at least one character.
  for (let i = 0; i < 4; i += 1) {
    const next = text.replace(QUANTITY_RE, '');
    if (next === text || !next) break;
    text = next;
  }
  return text.trim();
};

/**
 * Which aisle does this ingredient live in?
 * @param {string} raw ingredient text, with or without a quantity prefix
 * @returns {string} a GROCERY_SECTIONS id, 'other' when nothing matches
 */
export const categorizeIngredient = (raw) => {
  const text = normalizeIngredient(raw).toLowerCase();
  if (!text) return 'other';
  const hit = KEYWORD_INDEX.find(({ word }) =>
    new RegExp(`(?:^|[^a-zà-ÿ])${escapeRe(word)}(?:[^a-zà-ÿ]|$)`, 'i').test(text)
  );
  return hit ? hit.section : 'other';
};

/**
 * Bucket a flat ingredient list into store sections in walk order.
 * Case-insensitive dedupe keeps the first spelling seen; items inside a
 * section are alphabetical so the aisle itself is easy to scan.
 *
 * @param {Array<string|{name:string, section?:string}>} items
 * @returns {Array<{id:string,label:string,items:string[]}>} non-empty sections only
 */
export const groupIngredients = (items = []) => {
  const buckets = new Map(GROCERY_SECTIONS.map((s) => [s.id, []]));
  const seen = new Set();

  items.forEach((entry) => {
    const name = typeof entry === 'string' ? entry : entry?.name;
    const clean = String(name ?? '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const forced = typeof entry === 'object' && entry?.section;
    const section = buckets.has(forced) ? forced : categorizeIngredient(clean);
    buckets.get(section).push(clean);
  });

  return GROCERY_SECTIONS.map(({ id, label }) => ({
    id,
    label,
    items: buckets.get(id).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    ),
  })).filter((s) => s.items.length > 0);
};

/**
 * Render grouped sections as the plain-text list that goes to the clipboard.
 * @param {ReturnType<typeof groupIngredients>} groups
 * @param {{title?: string}} [opts]
 */
export const formatShoppingList = (groups, { title = 'Shopping list' } = {}) => {
  const body = groups
    .map(({ label, items }) =>
      [`${label.toUpperCase()}`, ...items.map((i) => `[ ] ${i}`)].join('\n')
    )
    .join('\n\n');
  return `${title}\n\n${body}`;
};

/** Total item count across grouped sections. */
export const countItems = (groups) =>
  groups.reduce((n, s) => n + s.items.length, 0);

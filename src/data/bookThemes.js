// Theme taxonomy for the book cloud. A book's first theme decides which
// cloud it lives in; any further themes create cross-cloud links. Colours
// lean on the existing app accents (muted, low saturation) so the clouds
// sit quietly on the warm off-white background.
//
// `keywords` feed suggestThemes() in lib/bookCloud.js — lowercase substring
// matches against the title only, used to pre-tag imports. They are hints,
// not truth: every tag stays editable in the UI.

export const BOOK_THEMES = [
  { id: 'philosophy', label: 'Philosophy',  color: '#2D5A6C',
    keywords: ['philosoph', 'stoic', 'meditations', 'wisdom', 'socrates', 'seneca', 'ethics'] },
  { id: 'psychology', label: 'Psychology',  color: '#B5838D',
    keywords: ['psycholog', 'brain', 'mind', 'thinking', 'behav', 'cognitive', 'emotional', 'influence', 'bias'] },
  { id: 'habits',     label: 'Habits & Focus', color: '#6B9E72',
    keywords: ['habit', 'discipline', 'productiv', 'deep work', 'focus', 'routine', 'motivation'] },
  { id: 'wealth',     label: 'Wealth',      color: '#C8804A',
    keywords: ['money', 'invest', 'wealth', 'rich', 'financ', 'capital', 'economic', 'market'] },
  { id: 'business',   label: 'Business',    color: '#587583',
    keywords: ['business', 'startup', 'entrepreneur', 'leadership', 'management', 'strategy', 'company'] },
  { id: 'science',    label: 'Science & Tech', color: '#2F7DA0',
    keywords: ['science', 'physics', 'universe', 'cosmos', 'evolution', 'biology', 'gene', 'quantum', 'technology'] },
  { id: 'history',    label: 'History',     color: '#C57B57',
    keywords: ['history', 'empire', 'ancient', 'civilization', 'sapiens', 'century', 'war'] },
  { id: 'biography',  label: 'Biography',   color: '#8E7CC3',
    keywords: ['biography', 'memoir', 'autobiograph', 'life of', 'my life', 'diary'] },
  { id: 'health',     label: 'Health',      color: '#4C8577',
    keywords: ['health', 'sleep', 'nutrition', 'diet', 'exercise', 'longevity', 'breath', 'fitness'] },
  { id: 'fiction',    label: 'Fiction',     color: '#96524F',
    keywords: ['a novel', 'novel', 'saga', 'trilogy', 'tales'] },
];

// Books with no themes yet gather here until they're tagged.
export const UNSORTED_THEME = { id: 'unsorted', label: 'Unsorted', color: '#9A968C', keywords: [] };

const byId = new Map([...BOOK_THEMES, UNSORTED_THEME].map((t) => [t.id, t]));

export const themeById = (id) => byId.get(id) || UNSORTED_THEME;

// The weekly life tree, following Naval Ravikant's own splits in
// "The Almanack of Naval Ravikant": the three big ones — health, wealth,
// happiness — pursued in that order, important in reverse. Sub-splits use
// his formulas (health = exercise + diet + sleep; wealth = specific
// knowledge + leverage; happiness is a learned skill), plus Play and Nature
// under happiness. Leaves are weekly *inputs* you control, never outcomes.
// Each leaf carries the pass criterion you tick against — edit the sentence
// here if your standard changes, don't reinterpret it week to week.
// `short` is the 1–2 word label drawn beside the leaf on the tree figure
// (v3.1 fix 2 — ticking is never blind); `label` stays the full name.

export const LIFE_TREE = {
  id: 'life',
  label: 'Life',
  children: [
    {
      id: 'health',
      label: 'Health',
      tagline: 'The foundation everything compounds on.',
      accent: 'var(--accent-mobility)',
      children: [
        { id: 'training', label: 'Training', short: 'Train', criterion: 'Did the planned sessions, including mobility and rehab work.' },
        { id: 'nutrition', label: 'Nutrition', short: 'Eat well', criterion: 'Mostly whole foods, no sugar spiral.' },
        { id: 'sleep', label: 'Sleep', short: 'Sleep', criterion: '7+ hours most nights, consistent bedtime.' },
      ],
    },
    {
      id: 'wealth',
      label: 'Wealth',
      tagline: 'Assets that earn while you sleep.',
      accent: 'var(--accent-workout)',
      children: [
        { id: 'learn', label: 'Learn', short: 'Learn', criterion: 'Fed your specific knowledge — studied what feels like play to you.' },
        { id: 'build', label: 'Build', short: 'Build', criterion: 'Applied leverage: shipped or advanced work with your name on it.' },
      ],
    },
    {
      id: 'happiness',
      label: 'Happiness',
      tagline: 'A skill you train, not a place you arrive.',
      accent: 'var(--accent-timeline)',
      children: [
        { id: 'stillness', label: 'Stillness', short: 'Stillness', criterion: 'Meditated, journaled or walked alone — mind in debug mode.' },
        { id: 'peace', label: 'Peace', short: 'Peace', criterion: 'Practiced gratitude and acceptance; signed no new desire contracts.' },
        { id: 'people', label: 'People', short: 'People', criterion: 'Real time with the long-term people — family and friends.' },
        { id: 'play', label: 'Play', short: 'Play', criterion: 'Did something purely for its own sake.' },
        { id: 'nature', label: 'Nature', short: 'Outdoors', criterion: 'Got outside into sunlight and fresh air.' },
      ],
    },
  ],
};

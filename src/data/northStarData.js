// The North Star one-pager (NORTH_STAR.md, finalized at intake 2026-06-28)
// as static data for the Goals app's long-term visualisation. The source
// file is locked until annual review, so vendoring it as data is safe —
// re-sync this file when the annual review rewrites NORTH_STAR.md.

export const NORTH_STAR = {
  finalized: '2026-06-28',
  horizonYear: 2036,
  horizonLabel: '10 years (→ ~2036)',
  activePillarId: 'career', // hard-switched to P1 at the P2 close, 2026-07-27

  pillars: [
    {
      id: 'career',
      n: 1,
      name: 'Career / civilian exit',
      short: 'Career',
      color: '#2D5A6C', // slate teal
      identity:
        'I am a credible civilian technologist — a former Naval Systemoffiser whose military depth translates into trusted technical leadership in the Norwegian market.',
      note: 'No fixed Navy exit date. This pillar enables Pillar 3: a civilian position is the enabler for relocation.',
      subGoals: [
        'PQC/cyber in banking (primary path)',
        'Drones / autonomy',
        'Defense-adjacent technical leadership',
      ],
    },
    {
      id: 'connection',
      n: 2,
      name: 'Connection',
      short: 'Connection',
      color: '#C57B57', // terracotta
      identity:
        "I am someone with rooted self-confidence — I can be in focus, face rejection and embarrass myself ('drite meg ut') without it shaking me, and I invest in myself so I can fully show up for others.",
      note: 'Core is self-confidence and rejection tolerance, not socializing for its own sake.',
      subGoals: [
        'Prat med en ny hver dag',
        'Tørre å bli avvist / være i fokus',
        'Tettere relasjoner · happy med Julie på ekte',
        'Én sosial økt hver gang hjemme',
        'Enablers: teeth · skincare · swing dance',
      ],
    },
    {
      id: 'bold',
      n: 3,
      name: 'Bold Living',
      short: 'Bold Living',
      color: '#2F7DA0', // ocean
      identity:
        'I am someone who designs life around joy and memorable moments — long term that means relocating to where I come alive (sun, outdoors, movement), and acting so life stays full of defining experiences.',
      note: 'Long-term anchor: relocation to a place that gives joy — it conditions everything else.',
      subGoals: [
        'Relocation planning (the anchor)',
        'Kids og reise',
        'Bo et sted som gir glede (sol, ute)',
        'The annual misogi',
        'Planlegg eller spontant — ingen mellomting',
      ],
    },
  ],

  // Layer 2 — dated annual markers, plotted on the timeline.
  markers: [
    {
      id: 'intake',
      pillarId: null,
      date: '2026-06-28',
      label: 'North Star locked',
      detail: 'Three pillars finalized at intake. 10-year horizon.',
      achieved: true,
    },
    {
      id: 'misogi-2026',
      pillarId: 'bold',
      date: '2026-06-30',
      label: '2026 misogi — ACHIEVED',
      detail: 'Month-long US trip + World Cup, June 2026.',
      achieved: true,
    },
    {
      id: 'p2-reps',
      pillarId: 'connection',
      date: '2026-12-31',
      label: '≥150 rejection-exposure reps',
      detail: 'New-person initiations / being-in-focus moments, ≈6/week from July. 150 is the floor that proves the identity.',
      achieved: false,
    },
    {
      id: 'p3-moveplan',
      pillarId: 'bold',
      date: '2026-12-31',
      label: 'Relocation plan committed',
      detail: 'Target location chosen and a written, dated move plan (where + by when), sequenced after the Pillar 1 outcome.',
      achieved: false,
    },
    {
      id: 'p1-position',
      pillarId: 'career',
      date: '2027-06-30',
      label: 'Civilian position secured',
      detail: 'Signed agreement in one of the three target sectors. The enabler for the Pillar 3 relocation.',
      achieved: false,
    },
  ],
};

export const pillarById = (id) => NORTH_STAR.pillars.find((p) => p.id === id) ?? null;

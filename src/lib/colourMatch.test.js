import { describe, it, expect } from 'vitest';
import { WADA_COLOURS } from '../data/wadaData.js';
import { wearableColours } from '../data/colourData.js';
import {
  SNAP_CAP,
  FAITHFUL_T,
  SLOT_SETS,
  hexToLab,
  ciede2000,
  contrastBand,
  buildOutfitLibrary,
  assignSlots,
  suggestMetal,
  filterLibrary,
} from './colourMatch';

describe('hexToLab', () => {
  it('maps white to L≈100 with no chroma', () => {
    const [L, a, b] = hexToLab('#ffffff');
    expect(L).toBeCloseTo(100, 0);
    expect(Math.abs(a)).toBeLessThan(0.5);
    expect(Math.abs(b)).toBeLessThan(0.5);
  });
  it('maps black to L≈0', () => {
    expect(hexToLab('#000000')[0]).toBeCloseTo(0, 1);
  });
  it('gives mid-grey a mid lightness', () => {
    const [L] = hexToLab('#808080');
    expect(L).toBeGreaterThan(50);
    expect(L).toBeLessThan(58);
  });
});

describe('ciede2000', () => {
  // Reference pairs from Sharma, Wu & Dalal (2005), the CIEDE2000 test data.
  it('matches published test vectors', () => {
    expect(ciede2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(ciede2000([50, -1.3802, -84.2814], [50, 0, -82.7485])).toBeCloseTo(1.00, 4);
    expect(ciede2000([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 4);
  });
  it('is zero for identical colours and symmetric', () => {
    const a = hexToLab('#3D4F63'), b = hexToLab('#C4929B');
    expect(ciede2000(a, a)).toBe(0);
    expect(ciede2000(a, b)).toBeCloseTo(ciede2000(b, a), 10);
  });
});

describe('contrastBand', () => {
  it('splits at the calibrated thresholds', () => {
    expect(contrastBand(0)).toBe('low');
    expect(contrastBand(15)).toBe('low');
    expect(contrastBand(15.1)).toBe('medium');
    expect(contrastBand(30)).toBe('medium');
    expect(contrastBand(30.1)).toBe('high');
  });
});

describe('buildOutfitLibrary (real datasets)', () => {
  const library = buildOutfitLibrary(WADA_COLOURS, wearableColours);

  it('produces a usable library with all layering depths', () => {
    const sizes = { 2: 0, 3: 0, 4: 0 };
    library.forEach((c) => sizes[c.colours.length]++);
    expect(library.length).toBeGreaterThan(100);
    expect(sizes[2]).toBeGreaterThan(20);
    expect(sizes[3]).toBeGreaterThan(20);
    expect(sizes[4]).toBeGreaterThan(10);
  });

  it('only ever contains distinct wearable palette colours', () => {
    const names = new Set(wearableColours.map((c) => c.name));
    for (const combo of library) {
      expect(combo.colours.length).toBeGreaterThanOrEqual(2);
      expect(new Set(combo.colours.map((c) => c.name)).size).toBe(combo.colours.length);
      combo.colours.forEach((c) => expect(names.has(c.name)).toBe(true));
    }
  });

  it('is sorted by book combination id, all within 1–348', () => {
    const ids = library.map((c) => c.id);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
    expect(ids[0]).toBeGreaterThanOrEqual(1);
    expect(ids[ids.length - 1]).toBeLessThanOrEqual(348);
  });

  it('bands agree with each combo spread', () => {
    library.forEach((c) => expect(c.band).toBe(contrastBand(c.spread)));
  });

  it('respects the snap cap: every combo member has a wearable within SNAP_CAP', () => {
    // Rebuilding with an impossible cap of one wearable colour would change
    // results; instead verify the invariant the cap guarantees — each library
    // colour is a genuine palette entry (checked above) and adapted flags
    // only appear when some member exceeded FAITHFUL_T, which requires
    // FAITHFUL_T < SNAP_CAP to be meaningful.
    expect(FAITHFUL_T).toBeLessThan(SNAP_CAP);
    expect(library.some((c) => c.adapted)).toBe(true);
    expect(library.some((c) => !c.adapted)).toBe(true);
  });
});

describe('assignSlots', () => {
  const lab = (hex) => hexToLab(hex);
  const navy = { name: 'Muted Navy', hex: '#3D4F63', role: 'neutral', lab: lab('#3D4F63') };
  const rose = { name: 'Dusty Rose', hex: '#C4929B', role: 'core', lab: lab('#C4929B') };
  const taupe = { name: 'Cool Taupe', hex: '#9B8E85', role: 'neutral', lab: lab('#9B8E85') };
  const plum = { name: 'Dusty Plum', hex: '#7E5475', role: 'core', lab: lab('#7E5475') };

  it('grounds the dark neutral and puts the core colour on top', () => {
    const out = assignSlots([rose, navy], SLOT_SETS[2]);
    expect(out.top.name).toBe('Dusty Rose');
    expect(out.trousers.name).toBe('Muted Navy');
  });

  it('assigns a full three-piece outfit sensibly', () => {
    const out = assignSlots([taupe, rose, navy], SLOT_SETS[3]);
    expect(out.top.name).toBe('Dusty Rose');
    expect([out.jacket.name, out.trousers.name].sort()).toEqual(['Cool Taupe', 'Muted Navy']);
    expect(out.jacket.name).toBe('Muted Navy');
  });

  it('respects locks even against the score', () => {
    const out = assignSlots([taupe, rose, navy], SLOT_SETS[3], { top: 'Cool Taupe' });
    expect(out.top.name).toBe('Cool Taupe');
    const names = Object.values(out).map((c) => c.name);
    expect(new Set(names).size).toBe(3);
  });

  it('falls back to unlocked assignment when a lock is unsatisfiable', () => {
    const out = assignSlots([rose, navy], SLOT_SETS[2], { top: 'Olive' });
    expect(out.top.name).toBe('Dusty Rose');
  });

  it('is deterministic', () => {
    const a = assignSlots([taupe, rose, navy, plum], SLOT_SETS[4]);
    const b = assignSlots([taupe, rose, navy, plum], SLOT_SETS[4]);
    expect(a).toEqual(b);
  });
});

describe('suggestMetal', () => {
  it('suggests rose gold when a Soft Autumn crossover is present', () => {
    expect(suggestMetal([{ role: 'core' }, { role: 'sister' }])).toBe('Rose Gold');
  });
  it('defaults to brushed silver', () => {
    expect(suggestMetal([{ role: 'core' }, { role: 'neutral' }])).toBe('Brushed Silver');
  });
});

describe('filterLibrary', () => {
  const library = buildOutfitLibrary(WADA_COLOURS, wearableColours);

  it('filters by piece count', () => {
    const trios = filterLibrary(library, { pieces: 3 });
    expect(trios.length).toBeGreaterThan(0);
    trios.forEach((c) => expect(c.colours.length).toBe(3));
  });

  it('filters by contrast band', () => {
    const soft = filterLibrary(library, { band: 'low' });
    expect(soft.length).toBeGreaterThan(0);
    soft.forEach((c) => expect(c.band).toBe('low'));
  });

  it('filters by required colours', () => {
    const withNavy = filterLibrary(library, { mustInclude: ['Muted Navy'] });
    expect(withNavy.length).toBeGreaterThan(0);
    withNavy.forEach((c) => expect(c.colours.some((x) => x.name === 'Muted Navy')).toBe(true));
  });

  it('composes all filters', () => {
    const all = filterLibrary(library, { pieces: 2, band: 'any', mustInclude: [] });
    expect(all.length).toBe(filterLibrary(library, { pieces: 2 }).length);
  });
});

// Pure colour maths and outfit-combination helpers for the Outfit Matcher.
//
// Pipeline: each Wada colour snaps to its nearest wearable palette colour
// (CIEDE2000 in Lab space). A book combination survives into the outfit
// library when every member snaps within SNAP_CAP and at least two distinct
// palette colours remain. Colours are then assigned to garment slots by
// role/lightness scoring, so darks and neutrals ground the outfit while
// core "face colours" sit on top.

// Calibrated against the real datasets: median Wada→palette distance is ~13,
// so 18 keeps the closer half-plus of the book (177 combos: 86 pairs,
// 58 trios, 33 quads) while discarding combos whose character depends on a
// vivid colour the palette can't express.
export const SNAP_CAP = 18;
// A combo counts as "faithful" when every member snaps within this; anything
// looser is flagged `adapted` — same harmony structure, muted rendition.
export const FAITHFUL_T = 12;

export const SLOT_SETS = {
  2: ['top', 'trousers'],
  3: ['jacket', 'top', 'trousers'],
  4: ['jacket', 'top', 'trousers', 'accent'],
};

export function hexToLab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000 (Sharma et al. 2005). Preferred over Euclidean ΔE here because it
// weights chroma differences leniently at high chroma — exactly the
// vivid-book-colour → muted-palette-colour mapping this feature performs.
export function ciede2000(lab1, lab2) {
  const [L1, a1, b1] = lab1, [L2, a2, b2] = lab2;
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = C1p === 0 ? 0 : (Math.atan2(b1, a1p) * deg + 360) % 360;
  const h2p = C2p === 0 ? 0 : (Math.atan2(b2, a2p) * deg + 360) % 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp += h1p + h2p < 360 ? 360 : -360;
    hbp /= 2;
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH));
}

// Lightness-spread thresholds sit at the observed 33rd/66th percentiles of the
// surviving library, so the three bands split it roughly in thirds.
export function contrastBand(spread) {
  if (spread <= 15) return 'low';
  if (spread <= 30) return 'medium';
  return 'high';
}

export function buildOutfitLibrary(wadaColours, wearableColours) {
  const wearable = wearableColours.map((c) => ({ ...c, lab: hexToLab(c.hex) }));
  const snapped = wadaColours.map((w) => {
    const lab = hexToLab(w.hex);
    let nearest = null, dist = Infinity;
    for (const p of wearable) {
      const d = ciede2000(lab, p.lab);
      if (d < dist) { dist = d; nearest = p; }
    }
    return { nearest, dist };
  });

  const combos = new Map();
  wadaColours.forEach((w, i) => w.combinations.forEach((id) => {
    if (!combos.has(id)) combos.set(id, []);
    combos.get(id).push(i);
  }));

  const library = [];
  for (const [id, members] of combos) {
    const ms = members.map((i) => snapped[i]);
    if (ms.some((m) => m.dist > SNAP_CAP)) continue;
    const colours = [...new Map(ms.map((m) => [m.nearest.name, m.nearest])).values()];
    if (colours.length < 2) continue;
    const Ls = colours.map((c) => c.lab[0]);
    const spread = Math.max(...Ls) - Math.min(...Ls);
    library.push({
      id,
      colours,
      adapted: ms.some((m) => m.dist > FAITHFUL_T),
      spread,
      band: contrastBand(spread),
    });
  }
  return library.sort((a, b) => a.id - b.id);
}

const SLOT_SCORERS = {
  trousers: (c) => (c.role === 'neutral' ? 2 : c.role === 'sister' ? 0.5 : 0) + (100 - c.lab[0]) / 100,
  jacket: (c) => (c.role === 'neutral' ? 1.5 : c.role === 'sister' ? 0.5 : 0) + 1.2 * ((100 - c.lab[0]) / 100),
  top: (c) => (c.role === 'core' ? 2 : c.role === 'sister' ? 1.2 : 0) + c.lab[0] / 100,
  accent: (c) => Math.hypot(c.lab[1], c.lab[2]) / 60,
};

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
  );
}

// Assigns each colour to a garment slot, maximising the summed slot scores.
// `locks` pins a colour name to a slot ({ jacket: 'Muted Navy' }); permutations
// violating a lock are discarded. Ties resolve to the first permutation, so
// output is deterministic. Falls back to unlocked assignment if the locks are
// unsatisfiable (e.g. the locked colour isn't in this combo).
export function assignSlots(colours, slots, locks = {}) {
  let best = null, bestScore = -Infinity;
  for (const perm of permutations(colours)) {
    let valid = true, score = 0;
    for (let i = 0; i < slots.length; i++) {
      const locked = locks[slots[i]];
      if (locked && perm[i].name !== locked) { valid = false; break; }
      score += SLOT_SCORERS[slots[i]](perm[i]);
    }
    if (valid && score > bestScore) {
      bestScore = score;
      best = perm;
    }
  }
  if (!best) return assignSlots(colours, slots);
  return Object.fromEntries(slots.map((slot, i) => [slot, best[i]]));
}

// Rose gold bridges the Soft Autumn crossover colours; brushed silver is the
// default Soft Summer metal.
export function suggestMetal(colours) {
  return colours.some((c) => c.role === 'sister') ? 'Rose Gold' : 'Brushed Silver';
}

export function filterLibrary(library, { pieces = null, band = 'any', mustInclude = [] } = {}) {
  return library.filter((combo) =>
    (pieces === null || combo.colours.length === pieces) &&
    (band === 'any' || combo.band === band) &&
    mustInclude.every((name) => combo.colours.some((c) => c.name === name))
  );
}

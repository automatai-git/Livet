import React from 'react';

// "The Tree" — the Life tab's SVG figure. One leaf node per life-tree leaf,
// distributed across fixed twig endpoints per pillar (left = health,
// top = wealth, right = happiness). Ticked leaves fill in the pillar's
// on-dark tint with a soft halo.
//
// v3.1 fix 2 — ticking is never blind:
// - every leaf carries a persistent short text label (from the leaf's
//   `short` field), anchored away from the branch strokes;
// - tap 1 selects the leaf (ivory ring; the screen's bottom card shows the
//   full name + pass criterion), tap 2 on the same leaf confirms the tick.

const ON_DARK = {
  health: '#8FBF96',
  wealth: '#7FB2C4',
  happiness: '#DBA283',
};

// stroke opacity by role: trunk .35 / main branch .28 / twig .22
const LIMBS = [
  { d: 'M181 385 C179 350 176 330 180 300 C182 282 184 270 182 252', w: 5, o: 0.35 },
  { d: 'M181 302 C152 282 122 262 97 232', w: 3.5, o: 0.28 },
  { d: 'M158 288 C146 276 138 268 126 254', w: 2.5, o: 0.22 },
  { d: 'M135 272 C130 290 126 300 118 310', w: 2.5, o: 0.22 },
  { d: 'M182 252 C182 224 185 200 180 168', w: 3.5, o: 0.28 },
  { d: 'M181 200 C193 192 202 186 212 180', w: 2.5, o: 0.22 },
  { d: 'M181 302 C213 284 244 260 268 228', w: 3.5, o: 0.28 },
  { d: 'M242 262 C250 276 254 286 256 300', w: 2.5, o: 0.22 },
  { d: 'M267 231 C277 240 287 250 294 260', w: 2.5, o: 0.22 },
  { d: 'M212 285 C212 297 212 308 210 318', w: 2.5, o: 0.22 },
];

// Twig endpoints per pillar, consumed in leaf order. Each spot carries its
// label anchor, chosen so labels sit away from the branch strokes.
const LEAF_SPOTS = {
  health: [
    { x: 97, y: 228, lx: 0, ly: -20, anchor: 'middle' },
    { x: 124, y: 251, lx: -17, ly: 4, anchor: 'end' },
    { x: 117, y: 313, lx: 0, ly: 26, anchor: 'middle' },
  ],
  wealth: [
    { x: 180, y: 163, lx: 0, ly: -20, anchor: 'middle' },
    { x: 214, y: 178, lx: 17, ly: 4, anchor: 'start' },
  ],
  happiness: [
    { x: 268, y: 224, lx: 8, ly: -14, anchor: 'start' },
    { x: 240, y: 258, lx: -16, ly: -6, anchor: 'end' },
    { x: 257, y: 303, lx: 15, ly: 4, anchor: 'start' },
    { x: 296, y: 263, lx: 0, ly: 25, anchor: 'middle' },
    { x: 211, y: 322, lx: 0, ly: 26, anchor: 'middle' },
  ],
};

// If the tree ever grows past the mapped spots, park extras along the ground.
const fallbackSpot = (i) => ({ x: 50 + (i % 7) * 44, y: 352, lx: 0, ly: -18, anchor: 'middle' });

const TreeFigure = ({ tree, ticks, selectedId, onSelect, onToggle, popId }) => {
  let overflow = 0;
  return (
    <svg viewBox="0 0 362 400" className="tree-figure" role="group" aria-label="Weekly life tree">
      <ellipse cx="181" cy="382" rx="120" ry="10" fill="rgba(245,243,237,.06)" />
      {LIMBS.map((limb, i) => (
        <path
          key={i}
          d={limb.d}
          fill="none"
          stroke={`rgba(245,243,237,${limb.o})`}
          strokeWidth={limb.w}
          strokeLinecap="round"
        />
      ))}
      {tree.children.flatMap((pillar) => {
        const tint = ON_DARK[pillar.id] ?? '#8FBF96';
        const spots = LEAF_SPOTS[pillar.id] ?? [];
        return pillar.children.map((leaf, i) => {
          const spot = spots[i] ?? fallbackSpot(overflow++);
          const { x, y, lx, ly, anchor } = spot;
          const ticked = Boolean(ticks[leaf.id]);
          const selected = selectedId === leaf.id;
          // Tap 1 = select (read the criterion first); tap 2 = confirm.
          const tap = () => (selected ? onToggle(leaf.id) : onSelect(leaf.id));
          return (
            <g
              key={leaf.id}
              className={`tree-leaf${ticked ? ' ticked' : ''}${ticked && popId === leaf.id ? ' pop' : ''}`}
              style={{ transformOrigin: `${x}px ${y}px` }}
              role="checkbox"
              aria-checked={ticked}
              aria-label={`${leaf.label} — ${pillar.label}${selected ? ' (tap again to toggle)' : ''}`}
              tabIndex={0}
              onClick={tap}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); }
              }}
            >
              {ticked ? (
                <>
                  <circle cx={x} cy={y} r="16" fill={tint} opacity="0.18" />
                  <circle cx={x} cy={y} r="11" fill={tint} />
                  <path
                    d="M-4 0l3 3 5-6"
                    transform={`translate(${x} ${y})`}
                    stroke="#12281E"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <circle cx={x} cy={y} r="11" fill="none" stroke="rgba(245,243,237,.45)" strokeWidth="2" />
              )}
              {selected && (
                <circle
                  className="tree-leaf-ring"
                  cx={x}
                  cy={y}
                  r="15.5"
                  fill="none"
                  stroke="#F5F3ED"
                  strokeWidth="1.5"
                />
              )}
              <text className="tree-leaf-label" x={x + lx} y={y + ly} textAnchor={anchor}>
                {leaf.short ?? leaf.label}
              </text>
              {/* ≥44px hit area in a 362-wide viewBox */}
              <circle cx={x} cy={y} r="24" fill="transparent" />
            </g>
          );
        });
      })}
    </svg>
  );
};

export default TreeFigure;

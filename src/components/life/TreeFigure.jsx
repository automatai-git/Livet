import React from 'react';

// "The Tree" — the Life tab's SVG figure. One leaf node per life-tree leaf,
// distributed across fixed twig endpoints per pillar (left = health,
// top = wealth, right = happiness). Ticked leaves fill in the pillar's
// on-dark tint with a soft halo; tapping toggles through the same write
// path as before. Geometry follows the design file's paths.

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

// Twig endpoints per pillar, consumed in leaf order.
const LEAF_SPOTS = {
  health: [[97, 228], [124, 251], [117, 313]],
  wealth: [[180, 163], [214, 178]],
  happiness: [[268, 224], [240, 258], [257, 303], [296, 263], [211, 322]],
};

// If the tree ever grows past the mapped spots, park extras along the ground.
const fallbackSpot = (i) => [50 + (i % 7) * 44, 352];

const TreeFigure = ({ tree, ticks, onToggle, popId }) => {
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
          const [x, y] = spots[i] ?? fallbackSpot(overflow++);
          const ticked = Boolean(ticks[leaf.id]);
          const toggle = () => onToggle(leaf.id);
          return (
            <g
              key={leaf.id}
              className={`tree-leaf${ticked && popId === leaf.id ? ' pop' : ''}`}
              style={{ transformOrigin: `${x}px ${y}px` }}
              role="checkbox"
              aria-checked={ticked}
              aria-label={`${leaf.label} — ${pillar.label}`}
              tabIndex={0}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
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

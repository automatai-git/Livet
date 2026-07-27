import React, { useMemo } from 'react';
import { rollUp, weekLabel } from '../../lib/lifeTree';

// The weekly life tree. Leaves are tappable ticks; a pillar lights up only
// when every leaf under it is ticked (strict AND), partial nodes show their
// fraction. Connector elbows are drawn in CSS (see "Life tree" in index.css).
const LifeTree = ({ tree, ticks, activeWeek, onToggle }) => {
  const roll = useMemo(() => rollUp(tree, ticks), [tree, ticks]);
  const root = roll[tree.id];

  return (
    <div className="life-tree">
      <div className={`life-root${root.complete ? ' complete' : ''}`}>
        <div>
          <div className="life-root-label heading-serif">{tree.label}</div>
          <div className="life-root-week">{weekLabel(activeWeek)}</div>
        </div>
        <div className="life-root-frac" aria-label={`${root.done} of ${root.total} ticked`}>
          <span className="life-root-count heading-serif">{root.done}</span>
          <span className="life-root-total">of {root.total}</span>
        </div>
      </div>

      <ul className="life-branches">
        {tree.children.map((pillar) => {
          const p = roll[pillar.id];
          return (
            <li key={pillar.id} className="life-branch" style={{ '--pillar-accent': pillar.accent }}>
              <div className={`life-pillar${p.complete ? ' complete' : ''}`}>
                <div>
                  <div className="life-pillar-label heading-serif">{pillar.label}</div>
                  <div className="life-pillar-tagline">{pillar.tagline}</div>
                </div>
                <span className="life-pillar-frac">
                  {p.complete ? '✓' : `${p.done} of ${p.total}`}
                </span>
              </div>

              <ul className="life-leaves">
                {pillar.children.map((leaf) => {
                  const ticked = Boolean(ticks[leaf.id]);
                  return (
                    <li key={leaf.id} className="life-leaf">
                      <button
                        type="button"
                        className={`life-leaf-btn${ticked ? ' ticked' : ''}`}
                        aria-pressed={ticked}
                        onClick={() => onToggle(leaf.id)}
                      >
                        <span className="life-leaf-check" aria-hidden="true">{ticked ? '✓' : ''}</span>
                        <span className="life-leaf-text">
                          <span className="life-leaf-label">{leaf.label}</span>
                          <span className="life-leaf-criterion">{leaf.criterion}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LifeTree;

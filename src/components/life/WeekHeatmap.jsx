import React from 'react';
import { rollUp, weekLabel } from '../../lib/lifeTree';

// Trailing-weeks strip: one cell per ISO week, fill strength = share of
// leaves ticked, ✓ when the whole tree was complete. Tapping a cell selects
// that week for viewing/backfilling in the tree above.
const WeekHeatmap = ({ tree, weekKeys, weeks, activeWeek, currentWeek, onSelect }) => (
  <div className="life-heatmap" role="group" aria-label={`Last ${weekKeys.length} weeks`}>
    {weekKeys.map((k) => {
      const ticks = weeks[k];
      const r = ticks ? rollUp(tree, ticks)[tree.id] : null;
      return (
        <button
          key={k}
          type="button"
          className={`life-heatcell${k === activeWeek ? ' active' : ''}${k === currentWeek ? ' now' : ''}`}
          aria-label={`${weekLabel(k)}: ${r ? `${r.done} of ${r.total} ticked` : 'not tracked'}`}
          aria-pressed={k === activeWeek}
          onClick={() => onSelect(k)}
        >
          <span className="life-heatbox">
            <span
              className="life-heatfill"
              style={{ opacity: r ? 0.18 + 0.82 * (r.done / r.total) : 0 }}
            />
            {r?.complete && <span className="life-heatdone" aria-hidden="true">✓</span>}
          </span>
          <span className="life-heatlabel">{Number(k.split('-W')[1])}</span>
        </button>
      );
    })}
  </div>
);

export default WeekHeatmap;

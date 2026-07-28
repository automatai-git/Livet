import React from 'react';
import { parseSets, formatTarget, estimateRoutineSeconds, uniqueTags, countWeighted } from '../../lib/mobility';

// The sticky "Start session" action lives in AppShellV3's action slot —
// this component only renders the hero + numbered rows + skip link.
const RoutineOverview = ({ dayLabel, routine, blockWeek, onSkip, onBack }) => {
  const seconds = estimateRoutineSeconds(routine);
  const minutes = Math.max(1, Math.round(seconds / 60));
  const tags = uniqueTags(routine);
  const weighted = countWeighted(routine);

  return (
    <div className="routine-overview">
      <button type="button" onClick={onBack} className="back-home overview-back">← Pick a different day</button>

      <header className="overview-hero">
        <div className="eyebrow">{dayLabel}</div>
        <h2 className="heading-serif overview-title">{routine.name}</h2>
        {blockWeek && (
          <div className="overview-block muted-row">Block {blockWeek.block} · Week {blockWeek.week}</div>
        )}
        <div className="overview-meta">
          <span><strong>{routine.exercises.length}</strong> exercises</span>
          <span><strong>~{minutes}</strong> min</span>
          {weighted > 0 && <span><strong>{weighted}</strong> weighted</span>}
        </div>
        {tags.length > 0 && (
          <div className="overview-tags">
            {tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
          </div>
        )}
      </header>

      <ol className="overview-list">
        {routine.exercises.map((ex) => {
          const p = parseSets(ex.sets);
          const weightedRow = ex.load && ex.load !== 'None' && !/bodyweight/i.test(ex.load);
          return (
            <li key={ex.order} className="overview-row">
              <span className="overview-num">{ex.order}</span>
              <div className="overview-row-body">
                <div className="overview-row-top">
                  <span className="overview-name">{ex.name}</span>
                  {weightedRow && <span className="overview-weighted" aria-label="Weighted">kg</span>}
                </div>
                <div className="overview-detail muted-row">
                  {p.setCount > 1 ? `${p.setCount} × ` : ''}{formatTarget(p)}
                  {ex.load && ex.load !== 'None' && <> · {ex.load}</>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="overview-actions">
        <button type="button" className="btn-ghost" onClick={onSkip}>Skip today</button>
      </div>
    </div>
  );
};

export default RoutineOverview;

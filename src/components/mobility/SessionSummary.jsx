import React from 'react';

const fmtDuration = (s) => {
  if (!s || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const SessionSummary = ({ routine, state, lastWeights, saving, onSave, onDiscard }) => {
  const durationSec = state.finishedAt && state.startedAt
    ? Math.round((state.finishedAt - state.startedAt) / 1000)
    : 0;

  let totalSets = 0;
  let completedExercises = 0;
  let totalVolume = 0;
  const rows = [];

  for (const ex of routine.exercises) {
    const exState = state.exercises[ex.order] ?? { sets: [], skipped: false };
    const completed = exState.sets.filter((s) => s.completed);
    if (completed.length > 0) completedExercises += 1;
    totalSets += completed.length;

    let setsVolume = 0;
    let maxWeight = 0;
    for (const set of completed) {
      const reps = set.reps ?? 0;
      if (set.weightKg) {
        setsVolume += set.weightKg * reps;
        if (set.weightKg > maxWeight) maxWeight = set.weightKg;
      }
    }
    totalVolume += setsVolume;

    const last = lastWeights[ex.name];
    const isPR = maxWeight > 0 && (last == null || maxWeight > last);

    rows.push({
      name: ex.name,
      completed: completed.length,
      total: exState.sets.length,
      skipped: exState.skipped,
      isPR,
    });
  }

  return (
    <div className="summary">
      <div className="summary-hero">
        <div className="summary-check" aria-hidden="true">✓</div>
        <h2 className="heading-serif summary-title">Routine complete</h2>
        <p className="muted-row">{routine.name}</p>

        <div className="summary-stats">
          <div><strong>{fmtDuration(durationSec)}</strong><span>duration</span></div>
          <div><strong>{completedExercises}/{routine.exercises.length}</strong><span>exercises</span></div>
          <div><strong>{totalSets}</strong><span>sets</span></div>
          {totalVolume > 0 && (
            <div><strong>{Math.round(totalVolume)} kg</strong><span>volume</span></div>
          )}
        </div>
      </div>

      <ul className="summary-list">
        {rows.map((r) => (
          <li key={r.name} className={`summary-row ${r.skipped ? 'skipped' : ''}`}>
            <span className="summary-name">{r.name}</span>
            <span className="summary-meta">
              {r.skipped ? 'skipped' : `${r.completed}/${r.total}`}
            </span>
            {r.isPR && <span className="summary-pr">↑ new best</span>}
          </li>
        ))}
      </ul>

      <div className="summary-actions">
        <button type="button" className="btn-ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </button>
        <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & close'}
        </button>
      </div>
    </div>
  );
};

export default SessionSummary;

import React from 'react';

const isWeighted = (load) =>
  load && load !== 'None' && !/bodyweight/i.test(load);

const formatSetTarget = (parsed) => {
  if (parsed.holdSeconds != null) return `${parsed.holdSeconds}s hold`;
  if (Array.isArray(parsed.repTarget)) return `${parsed.repTarget[0]}–${parsed.repTarget[1]} reps`;
  if (parsed.repTarget != null) return `${parsed.repTarget} reps`;
  return '—';
};

const SetRow = ({
  setNumber,
  set,
  parsed,
  exercise,
  lastWeight,
  onToggle,
  onUpdate,
}) => {
  const weighted = isWeighted(exercise.load);
  const placeholderReps = Array.isArray(parsed.repTarget) ? parsed.repTarget[1] : parsed.repTarget;
  const placeholderWeight = lastWeight != null ? `${lastWeight}` : 'kg';

  const bump = (delta) => {
    const current = typeof set.weightKg === 'number' ? set.weightKg : lastWeight ?? 0;
    onUpdate({ weightKg: Math.max(0, Math.round((current + delta) * 2) / 2) });
  };

  return (
    <div className={`set-row ${set.completed ? 'done' : ''}`}>
      <button
        type="button"
        className="set-check"
        aria-pressed={set.completed}
        aria-label={set.completed ? `Set ${setNumber} done — undo` : `Mark set ${setNumber} done`}
        onClick={onToggle}
      >
        {set.completed ? '✓' : ''}
      </button>

      <div className="set-meta">
        <div className="set-label">Set {setNumber}</div>
        <div className="set-target">
          {formatSetTarget(parsed)}
          {parsed.eachSide && <span className="set-each-side"> · each side</span>}
        </div>
      </div>

      {weighted && (
        <div className="set-weight">
          <button type="button" className="set-step" aria-label="−2.5 kg" onClick={() => bump(-2.5)}>−</button>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            className="set-weight-input"
            placeholder={placeholderWeight}
            value={set.weightKg ?? ''}
            onChange={(e) => onUpdate({ weightKg: e.target.value === '' ? null : parseFloat(e.target.value) })}
            aria-label={`Weight in kg for set ${setNumber}`}
          />
          <button type="button" className="set-step" aria-label="+2.5 kg" onClick={() => bump(2.5)}>+</button>
        </div>
      )}

      {parsed.repTarget != null && (
        <input
          type="number"
          inputMode="numeric"
          min="0"
          className="set-reps-input"
          placeholder={placeholderReps?.toString() ?? ''}
          value={set.reps ?? ''}
          onChange={(e) => onUpdate({ reps: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
          aria-label={`Reps performed for set ${setNumber}`}
        />
      )}
    </div>
  );
};

export default SetRow;

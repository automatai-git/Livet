import React, { useEffect, useMemo, useRef } from 'react';
import { parseSets } from '../../lib/mobility';
import RestTimer from './RestTimer';
import SetRow from './SetRow';
import { attachSwipe } from '../../lib/swipe';

const FocusMode = ({ routine, state, dispatch, lastWeights, blockWeek, onFinish, onExit }) => {
  const cardRef = useRef(null);
  const idx = state.currentExerciseIndex;
  const exercise = routine.exercises[idx];
  const parsed = useMemo(() => parseSets(exercise.sets), [exercise.sets]);
  const exState = state.exercises[exercise.order] ?? { sets: [] };
  const restPreset = parsed.holdSeconds ?? 45;
  const completedCount = exState.sets.filter((s) => s.completed).length;
  const isLast = idx === routine.exercises.length - 1;
  const hasAnyTicked = completedCount > 0;

  useEffect(() => {
    const detach = attachSwipe(cardRef.current, {
      onLeft: () => { if (!isLast) dispatch({ type: 'NEXT_EXERCISE' }); },
      onRight: () => { if (idx > 0) dispatch({ type: 'PREV_EXERCISE' }); },
      threshold: 80,
    });
    return detach;
  }, [idx, isLast, dispatch]);

  const handleToggleSet = (setIndex) => {
    dispatch({ type: 'TOGGLE_SET', order: exercise.order, setIndex, parsed });
  };
  const handleUpdateSet = (setIndex, patch) => {
    dispatch({ type: 'UPDATE_SET', order: exercise.order, setIndex, patch });
  };
  const handleSkipExercise = () => {
    dispatch({ type: 'SKIP_EXERCISE', order: exercise.order });
    if (isLast) onFinish();
    else dispatch({ type: 'NEXT_EXERCISE' });
  };

  return (
    <div className="focus-mode">
      <div className="focus-topbar">
        <button type="button" className="back-home" onClick={onExit}>← Routine</button>
        <button type="button" className="btn-ghost focus-finish-early" onClick={onFinish}>
          Finish early
        </button>
      </div>

      <div className="focus-card" ref={cardRef}>
        <div className="focus-card-header">
          <div className="eyebrow">Exercise {idx + 1} of {routine.exercises.length}</div>
          {blockWeek && (
            <span className="focus-block-chip">B{blockWeek.block} · W{blockWeek.week}</span>
          )}
        </div>

        <h2 className="heading-serif focus-title">{exercise.name}</h2>

        <div className="focus-tags">
          {exercise.tags?.map((t) => <span key={t} className="tag-chip">{t}</span>)}
          {exercise.asymmetric && (
            <span className="tag-chip tag-asymmetric">
              ↗ extra on {exercise.weakSide ?? 'weak side'}
            </span>
          )}
          {exercise.shoulderManaged && (
            <span className="tag-chip tag-shoulder">⚠ shoulder watch</span>
          )}
        </div>

        {exercise.cue && <p className="focus-cue">{exercise.cue}</p>}
        {exercise.load && exercise.load !== 'None' && (
          <p className="focus-load muted-row">Target load · {exercise.load}</p>
        )}
        {parsed.extra && (
          <p className="focus-extra muted-row">Also: {parsed.extra}</p>
        )}

        <div className="set-list" role="list">
          {exState.sets.map((set, i) => (
            <SetRow
              key={i}
              setNumber={i + 1}
              set={set}
              parsed={parsed}
              exercise={exercise}
              lastWeight={lastWeights[exercise.name]}
              onToggle={() => handleToggleSet(i)}
              onUpdate={(patch) => handleUpdateSet(i, patch)}
            />
          ))}
        </div>

        <RestTimer
          key={`${exercise.order}-${completedCount}`}
          presetSeconds={restPreset}
          label={parsed.holdSeconds ? 'Hold' : 'Rest'}
          autoStart={false}
        />

        <button type="button" className="focus-skip muted-row" onClick={handleSkipExercise}>
          Skip this exercise
        </button>
      </div>

      <nav className="focus-nav" aria-label="Routine navigation">
        <button
          type="button"
          className="btn-ghost focus-nav-btn"
          onClick={() => dispatch({ type: 'PREV_EXERCISE' })}
          disabled={idx === 0}
        >
          ‹ Prev
        </button>
        <div className="focus-step" aria-live="polite">
          {idx + 1} <span>/</span> {routine.exercises.length}
        </div>
        {isLast ? (
          <button
            type="button"
            className="btn-primary focus-nav-btn"
            onClick={onFinish}
            disabled={!hasAnyTicked}
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary focus-nav-btn"
            onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
          >
            Next ›
          </button>
        )}
      </nav>
    </div>
  );
};

export default FocusMode;

import React, { useEffect, useState, useRef } from 'react';

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const RestTimer = ({
  presetSeconds = 45,
  autoStart = false,
  label = 'Rest',
  onComplete,
}) => {
  // NOTE: the timer resets via remount — the caller keys this component by
  // exercise/set context (see FocusMode), so no prop→state sync effect.
  const [seconds, setSeconds] = useState(presetSeconds);
  const [running, setRunning] = useState(autoStart);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          if (!completedRef.current) {
            completedRef.current = true;
            try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200); } catch { /* noop */ }
            onComplete?.();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onComplete]);

  const reset = () => {
    setRunning(false);
    setSeconds(presetSeconds);
    completedRef.current = false;
  };

  return (
    <div className={`rest-timer ${running ? 'is-running' : ''}`} role="timer" aria-label={label}>
      <div className="rest-timer-label">{label}</div>
      <div className="rest-timer-display">{fmt(seconds)}</div>
      <div className="rest-timer-controls">
        <button
          type="button"
          className="btn-primary rest-timer-btn"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'Pause' : seconds === 0 ? 'Restart' : 'Start'}
        </button>
        <button type="button" className="btn-ghost rest-timer-btn" onClick={reset}>Reset</button>
      </div>
    </div>
  );
};

export default RestTimer;

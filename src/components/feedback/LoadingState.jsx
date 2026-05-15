import React from 'react';

// Shared loading placeholder. Use when waiting on async data.
// Variants: 'inline' (a single muted line, for in-card use)
//           'block'  (centred card with a serif headline + skeleton bars)
const LoadingState = ({ label = 'Loading…', variant = 'block' }) => {
  if (variant === 'inline') {
    return <p className="loading-state-inline" role="status" aria-live="polite">{label}</p>;
  }
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <p className="muted-row">{label}</p>
      <div className="loading-skeleton-rows" aria-hidden="true">
        <span className="loading-skeleton-row" />
        <span className="loading-skeleton-row" style={{ width: '70%' }} />
        <span className="loading-skeleton-row" style={{ width: '85%' }} />
      </div>
    </div>
  );
};

export default LoadingState;

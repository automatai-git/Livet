import React from 'react';

// Five-star rating control. `value` is 1..5 or null; tapping the current
// value clears it back to unrated.
//
// Props: value, onChange(newValue | null), label (a11y), size ('sm' | 'md')

const StarRating = ({ value = null, onChange, label = 'Rate', size = 'md' }) => (
  <div className={`star-rating ${size}`} role="group" aria-label={label}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        className={`star${value >= n ? ' on' : ''}`}
        aria-label={`${n} star${n === 1 ? '' : 's'}`}
        aria-pressed={value >= n}
        onClick={() => onChange(value === n ? null : n)}
      >
        ★
      </button>
    ))}
  </div>
);

export default StarRating;

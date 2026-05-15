import React from 'react';

// Shared empty-state card. Use when a list/page has no data to show.
// Examples: a mobility rest day, no milestones yet, no bucket-list items
// matching the current filter.
//
// Props:
//   title    — serif headline (e.g. "Rest day")
//   hint     — secondary muted-row body text
//   icon     — optional ReactNode rendered above the title
//   action   — optional ReactNode (a button/link) rendered below the hint
const EmptyState = ({ title, hint, icon, action }) => (
  <div className="empty-state">
    {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
    {title && <p className="heading-serif" style={{ fontSize: '1.15rem' }}>{title}</p>}
    {hint && <p className="muted-row" style={{ marginTop: 6 }}>{hint}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);

export default EmptyState;

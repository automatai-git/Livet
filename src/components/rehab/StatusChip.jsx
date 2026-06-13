import React from 'react';

const LABELS = { active: 'Active', passed: 'Passed', locked: 'Locked', held: 'Held' };

/** Phase-status chip for the rehab ladder and day card. */
export default function StatusChip({ status }) {
  if (!status) return null;
  return <span className={`status-chip ${status}`}>{LABELS[status] || status}</span>;
}

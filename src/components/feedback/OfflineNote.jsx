import React from 'react';

// The one offline pattern app-wide (v3.2 §7): dot + a single sentence on an
// ivory surface row. Pass `dark` on the Life screen for the inverted
// variant. Always render it last in the content slot.
const OfflineNote = ({ dark = false }) => (
  <div className={`offline-note${dark ? ' dark' : ''}`} role="status">
    <span className="offline-note-dot" aria-hidden="true" />
    Offline — changes queue locally and sync when back.
  </div>
);

export default OfflineNote;

import React from 'react';
import { Link } from 'react-router-dom';

// Generic page wrapper for every sub-page.
// - Sticky translucent header with consistent back link + title
// - Optional `accent` paints the title underline + back-link hover
// - Body padding/max-width consistent across sub-pages
const AppShell = ({ title, accent, back = '/', backLabel = '← Dashboard', actions, children, maxWidth = 720 }) => (
  <div className="page-shell" style={accent ? { '--app-accent': accent } : undefined}>
    <div className="sticky-header">
      <div className="header-row">
        <Link to={back} className="back-home">{backLabel}</Link>
        <h1 className="heading-serif page-title">{title}</h1>
        <div className="header-actions">{actions}</div>
      </div>
    </div>
    <div className="page-body" style={{ maxWidth }}>
      {children}
    </div>
  </div>
);

export default AppShell;

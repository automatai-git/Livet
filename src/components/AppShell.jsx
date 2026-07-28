import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from './AppIcon';
import TabBar from './shell/TabBar';

// Generic sub-page wrapper (v3 shell):
// - Sticky translucent header: circular back button, 8px app-accent dot,
//   left-aligned serif app name. No underline.
// - Tab bar stays visible on sub-app top-level screens; pass `hideTabBar`
//   inside focus flows (e.g. mobility session) so their sticky action bar
//   owns the bottom edge.
const AppShell = ({ title, accent, back = '/apps', actions, children, maxWidth = 720, hideTabBar = false }) => (
  <div className="page-shell" style={accent ? { '--app-accent': accent } : undefined}>
    <div className="sticky-header">
      <div className="header-row">
        <Link to={back} className="back-circle" aria-label="Back">
          <AppIcon name="back" size={16} strokeWidth="2" />
        </Link>
        <span className="app-dot" aria-hidden="true" />
        <h1 className="heading-serif page-title">{title}</h1>
        <div className="header-actions">{actions}</div>
      </div>
    </div>
    <div className="page-body" style={{ maxWidth }}>
      {children}
    </div>
    {!hideTabBar && <TabBar />}
  </div>
);

export default AppShell;

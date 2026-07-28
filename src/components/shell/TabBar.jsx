import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppIcon from '../AppIcon';

// The four-tab v3 shell bar. Fixed to the bottom, translucent + blurred,
// active tab is an ink pill (inverted ivory pill on the dark Life screen).
// Sub-app routes light up Apps — that's the directory they came from —
// except the legacy /timeline milestone feed, which belongs to Life.
const TABS = [
  { to: '/', icon: 'hub', label: 'Today' },
  { to: '/apps', icon: 'grid', label: 'Apps' },
  { to: '/life', icon: 'tree', label: 'Life' },
  { to: '/you', icon: 'person', label: 'You' },
];

const activeTab = (pathname) => {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/life') || pathname.startsWith('/timeline')) return '/life';
  if (pathname.startsWith('/you')) return '/you';
  return '/apps';
};

const TabBar = ({ dark = false }) => {
  const { pathname } = useLocation();
  const active = activeTab(pathname);

  return (
    <nav className={`tab-bar${dark ? ' dark' : ''}`} aria-label="Main">
      <div className="tab-bar-inner">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={`tab-cell${active === tab.to ? ' active' : ''}`}
            aria-current={active === tab.to ? 'page' : undefined}
          >
            <AppIcon name={tab.icon} size={21} />
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default TabBar;

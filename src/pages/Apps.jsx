import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { sortByUsage } from '../lib/appUsage';
import { APP_REGISTRY } from '../data/appRegistry';
import AppIcon from '../components/AppIcon';
import TabBar from '../components/shell/TabBar';

// Live status texts are optional per app; read cheap local caches only —
// the Apps directory must render instantly.
const statusFor = (route) => {
  if (route === '/books') {
    try {
      const { books } = JSON.parse(localStorage.getItem('book-cloud-library-v1')) || {};
      const toRate = (books || []).filter((b) => b.status === 'read' && !b.rating).length;
      return toRate > 0 ? `${toRate} to rate` : null;
    } catch { return null; }
  }
  return null;
};

const Apps = () => {
  const [query, setQuery] = useState('');
  const apps = useMemo(() => sortByUsage(APP_REGISTRY), []);
  const maxOpens = Math.max(...apps.map((a) => a.opens), 0);

  const shown = apps.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="tab-page">
      <h1 className="heading-serif page-display apps-title">Apps</h1>

      <label className="apps-search">
        <AppIcon name="search" size={17} strokeWidth="1.8" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps & actions…"
          aria-label="Search apps"
        />
      </label>

      <div className="section-head end">
        <div className="section-hint">sorted by your use · last 30 days</div>
      </div>

      <div className="row-stack tight">
        {shown.map((app) => {
          const status = statusFor(app.route);
          const barWidth = app.opens > 0 && maxOpens > 0
            ? Math.max(8, (app.opens / maxOpens) * 92)
            : 0;
          return (
            <Link key={app.route} to={app.route} className="apps-row">
              <div className="icon-chip sm" style={{ background: app.tintBg, color: app.tintFg }}>
                <AppIcon name={app.icon} size={19} />
              </div>
              <div className="apps-row-body">
                <div className="row-title sm">{app.name}</div>
                <div className="usage-bar">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${barWidth}%`, background: app.barColor }}
                  />
                </div>
              </div>
              {status && <div className="apps-row-status">{status}</div>}
              <AppIcon name="chev" size={14} className="row-chev" />
            </Link>
          );
        })}
        {shown.length === 0 && (
          <div className="apps-empty">No app matches “{query}”.</div>
        )}
      </div>

      {!query && (
        <div className="ghost-slot">
          <AppIcon name="coin" size={19} />
          <div>
            <div className="ghost-slot-name">Finance</div>
            <div className="ghost-slot-note">Next app — a row, an accent, a Today card. Nothing else changes.</div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
};

export default Apps;

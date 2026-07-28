import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from './AppIcon';
import TabBar from './shell/TabBar';
import { appById } from '../data/appRegistry';

// The one slotted sub-page framework (v3.1 fix 3). Every sub-app fills the
// same slots in the same order; an app may omit a slot, never rearrange or
// duplicate one. Per-app nuance lives only inside the content slot and the
// scope selector's flavour.
//
//   <AppShellV3
//     app="mobility"            // registry id — supplies accent, tints, serif name
//     title="…"                 // only for nested screens (trip name, "New trip")
//     scope={<…/>}              // slot 2: exactly one selector row
//     hero={<HeroCard …/>}      // slot 3: exactly one summary card
//     action={{ label, onClick | to, disabled }} // slot 5: one sticky ink button
//   >{content}</AppShellV3>
//
// Behavioral contract: tab bar visible on the app's top level, hidden in
// focus flows (pass hideTabBar); whole rows are tap targets; the header is
// identical everywhere — back circle · 8px accent dot · serif name.
const AppShellV3 = ({
  app,
  title,
  back = '/apps',
  actions,
  scope,
  hero,
  action,
  children,
  maxWidth = 720,
  hideTabBar = false,
}) => {
  const entry = appById(app);
  return (
    <div
      className={`page-shell${action ? ' has-action' : ''}`}
      style={entry ? {
        '--app-accent': entry.accent,
        '--app-tint-bg': entry.tintBg,
        '--app-tint-fg': entry.tintFg,
      } : undefined}
    >
      <div className="sticky-header">
        <div className="header-row">
          <Link to={back} className="back-circle" aria-label="Back">
            <AppIcon name="back" size={16} strokeWidth="2" />
          </Link>
          <span className="app-dot" aria-hidden="true" />
          <h1 className="heading-serif page-title">{title ?? entry?.name ?? ''}</h1>
          <div className="header-actions">{actions}</div>
        </div>
      </div>
      <div className="page-body" style={{ maxWidth }}>
        {scope}
        {hero}
        {children}
      </div>
      {action && (
        <div className={`sticky-action${hideTabBar ? '' : ' above-tabbar'}`}>
          {action.to ? (
            <Link to={action.to} className="sticky-action-btn">{action.label}</Link>
          ) : (
            <button
              type="button"
              className="sticky-action-btn"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      {!hideTabBar && <TabBar />}
    </div>
  );
};

// Slot 3 primitive — the page's single summary surface: eyebrow · serif
// title 1.6rem · meta line · accent-tint tag chips.
export const HeroCard = ({ eyebrow, title, meta, chips = [], children }) => (
  <section className="surface-card hero-card">
    {eyebrow && <div className="eyebrow">{eyebrow}</div>}
    {title && <h2 className="heading-serif hero-title">{title}</h2>}
    {meta && <div className="hero-meta">{meta}</div>}
    {chips.length > 0 && (
      <div className="hero-chips">
        {chips.map((c) => <span key={c} className="hero-chip">{c}</span>)}
      </div>
    )}
    {children}
  </section>
);

// Slot 2 primitive — one shared pill anatomy for every scope selector
// flavour (segmented view pills / filter chips; pass day for day cells).
export const ScopePill = ({ on = false, today = false, day = false, onClick, children, ...rest }) => (
  <button
    type="button"
    className={`scope-pill${day ? ' day' : ''}${on ? ' on' : ''}${today && !on ? ' today' : ''}`}
    aria-pressed={on}
    onClick={onClick}
    {...rest}
  >
    {children}
  </button>
);

export default AppShellV3;

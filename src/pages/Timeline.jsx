import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import AppShellV3, { ScopePill } from '../components/AppShellV3';
import AppIcon from '../components/AppIcon';
import { appById } from '../data/appRegistry';

// The long-term milestone record, reached from the Life screen. v3.2 §4:
// filters live in the scope slot, the list groups under Ahead / Past, and
// milestone categories map to sprite glyphs + registry tints (the emoji
// `icon` column is ignored by the UI).

const FILTERS = [
  ['all', 'All'],
  ['past', 'Past'],
  ['ahead', 'Ahead'],
];

// category → glyph + the registry entry whose tint pair it borrows.
const CATEGORY_STYLE = {
  travel: { icon: 'travel', appId: 'travel' },
  training: { icon: 'mobility', appId: 'mobility' },
  career: { icon: 'goals', appId: 'goals' },
  home: { icon: 'house', appId: 'property' },
};
const DEFAULT_STYLE = { icon: 'tree', appId: 'life' };

const styleFor = (category) => {
  const s = CATEGORY_STYLE[String(category ?? '').toLowerCase()] ?? DEFAULT_STYLE;
  const entry = appById(s.appId);
  return { icon: s.icon, tintBg: entry?.tintBg, tintFg: entry?.tintFg };
};

const daysAhead = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86_400_000);
};

const MilestoneRow = ({ m, ahead }) => {
  const { icon, tintBg, tintFg } = styleFor(m.category);
  const days = ahead && m.when_date ? daysAhead(m.when_date) : null;
  return (
    <div className="surface-card milestone-row">
      <div className="icon-chip md" style={{ background: tintBg, color: tintFg }}>
        <AppIcon name={icon} size={20} />
      </div>
      <div className="milestone-row-body">
        <h3 className="heading-serif milestone-row-title">{m.what}</h3>
        <div className="row-meta">
          {m.when_date ? new Date(m.when_date).toLocaleDateString() : ''}
        </div>
        {m.why && <p className="milestone-row-why">{m.why}</p>}
      </div>
      {days != null && days >= 0 && (
        <div className="row-meta tnum milestone-row-days">
          {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}
        </div>
      )}
    </div>
  );
};

const Timeline = () => {
  const [milestones, setMilestones] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from('timeline_events').select('*').then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data) setMilestones(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const isPast = (m) => {
    if (!m.when_date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(m.when_date) < today;
  };

  // Ahead: soonest first. Past: most recent first.
  const ahead = milestones.filter((m) => !isPast(m))
    .sort((a, b) => new Date(a.when_date) - new Date(b.when_date));
  const past = milestones.filter(isPast)
    .sort((a, b) => new Date(b.when_date) - new Date(a.when_date));

  const sections = [
    filter !== 'past' ? { key: 'ahead', label: 'Ahead', rows: ahead } : null,
    filter !== 'ahead' ? { key: 'past', label: 'Past', rows: past } : null,
  ].filter((s) => s && s.rows.length > 0);

  return (
    <AppShellV3
      app="life"
      title="Milestones"
      back="/life"
      scope={
        <div className="scope-row equal" role="group" aria-label="Filter milestones by time">
          {FILTERS.map(([id, label]) => (
            <ScopePill key={id} on={filter === id} onClick={() => setFilter(id)}>
              {label}
            </ScopePill>
          ))}
        </div>
      }
    >
      {loading ? (
        <p className="listing-empty">Loading milestones…</p>
      ) : sections.length === 0 ? (
        <p className="listing-empty">No milestones for this filter.</p>
      ) : (
        sections.map((s) => (
          <React.Fragment key={s.key}>
            <div className="section-head milestone-section-head">
              <div className="eyebrow">{s.label}</div>
              <div className="section-hint">{s.rows.length}</div>
            </div>
            <div className="row-stack milestone-stack">
              {s.rows.map((m) => (
                <MilestoneRow key={m.id} m={m} ahead={s.key === 'ahead'} />
              ))}
            </div>
          </React.Fragment>
        ))
      )}
    </AppShellV3>
  );
};

export default Timeline;

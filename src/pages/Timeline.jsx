import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { lifeTreeService } from '../services/lifeTreeService';
import { LIFE_TREE } from '../data/lifeTreeData';
import { weekKey, lastNWeekKeys, weekLabel, leafHitRates } from '../lib/lifeTree';
import AppShell from '../components/AppShell';
import LifeTree from '../components/life/LifeTree';
import WeekHeatmap from '../components/life/WeekHeatmap';

const HISTORY_WEEKS = 12;

const Timeline = () => {
  // ----- Life tree (primary view) -----
  const currentWeek = weekKey(new Date());
  const weekKeys = useMemo(() => lastNWeekKeys(new Date(), HISTORY_WEEKS), []);
  const [weeks, setWeeks] = useState({});
  const [activeWeek, setActiveWeek] = useState(currentWeek);
  const [treeOffline, setTreeOffline] = useState(false);

  // ----- Milestones (long-term record, below the tree) -----
  const [milestones, setMilestones] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // IntersectionObserver for scroll animations
  const observer = useRef(null);

  useEffect(() => {
    lifeTreeService.getWeeks(weekKeys).then(({ weeks: fetched, offline }) => {
      setWeeks(fetched);
      setTreeOffline(offline);
    });
  }, [weekKeys]);

  const fetchTimeline = async () => {
    const { data, error } = await supabase.from('timeline_events').select('*');
    if (!error && data) {
      const sorted = data.sort((a, b) => new Date(b.when_date) - new Date(a.when_date));
      setMilestones(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTimeline();

    // Set up observer for scroll animations
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  const toggleLeaf = (leafId) => {
    const next = { ...(weeks[activeWeek] || {}) };
    if (next[leafId]) delete next[leafId];
    else next[leafId] = true;
    setWeeks((w) => ({ ...w, [activeWeek]: next }));
    lifeTreeService.saveWeek(activeWeek, next);
  };

  // "What to work on": the least-ticked leaf across tracked weeks. Only
  // shown once there's enough history for the answer to mean something.
  const weakest = useMemo(() => {
    const tracked = weekKeys.map((k) => weeks[k]).filter(Boolean);
    if (tracked.length < 3) return null;
    const worst = leafHitRates(LIFE_TREE, tracked)[0];
    return worst.count === worst.outOf ? null : worst;
  }, [weeks, weekKeys]);

  const observeNode = (el) => {
    if (el && observer.current) observer.current.observe(el);
  };

  const getTimeCategory = (dateStr) => {
    if (!dateStr) return 'past';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today ? 'past' : 'future';
  };

  const getFilteredMilestones = () => {
    if (filter === 'all') return milestones;
    return milestones.filter(m => getTimeCategory(m.when_date) === filter);
  };

  const stats = {
    past: milestones.filter(m => getTimeCategory(m.when_date) === 'past').length,
    future: milestones.filter(m => getTimeCategory(m.when_date) === 'future').length,
    total: milestones.length
  };

  return (
    <AppShell title="Life" accent="var(--accent-timeline)">
      {activeWeek !== currentWeek && (
        <div className="life-pastweek-note">
          Editing {weekLabel(activeWeek)}
          <button type="button" onClick={() => setActiveWeek(currentWeek)}>
            Back to this week
          </button>
        </div>
      )}

      <LifeTree
        tree={LIFE_TREE}
        ticks={weeks[activeWeek] || {}}
        activeWeek={activeWeek}
        onToggle={toggleLeaf}
      />

      <section aria-label="Weekly history" style={{ marginTop: '28px' }}>
        <h2 className="heading-serif life-section-title">Last {HISTORY_WEEKS} weeks</h2>
        <WeekHeatmap
          tree={LIFE_TREE}
          weekKeys={weekKeys}
          weeks={weeks}
          activeWeek={activeWeek}
          onSelect={setActiveWeek}
        />
        {weakest && (
          <div className="life-weakest">
            <span className="life-weakest-tag">Work on</span>
            <span>
              <strong>{weakest.label}</strong> — ticked {weakest.count} of the last {weakest.outOf} tracked weeks
            </span>
          </div>
        )}
        {treeOffline && (
          <p className="life-offline-note">Couldn't reach the database — ticks are kept locally and sync once it's reachable.</p>
        )}
      </section>

      <section aria-label="Milestones" style={{ marginTop: '40px' }}>
        <h2 className="heading-serif life-section-title">Milestones</h2>

        <section aria-label="Milestone statistics" style={{display: 'flex', justifyContent: 'space-around', padding: '24px 16px', background: 'var(--card)', borderRadius: '16px', marginBottom: '20px'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '2rem', fontWeight: 700}} aria-label={`${stats.past} past milestones`}>{stats.past}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Past</div>
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--primary)'}} aria-label={`${stats.total} total milestones`}>{stats.total}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Total</div>
          </div>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--success)'}} aria-label={`${stats.future} future milestones`}>{stats.future}</div>
            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Future</div>
          </div>
        </section>

        <div role="group" aria-label="Filter milestones by time" style={{display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px'}}>
          {['all', 'past', 'future'].map(f => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              aria-label={`Show ${f} milestones`}
              onClick={() => setFilter(f)}
              style={{
                padding: '10px 20px', minHeight: 44,
                background: filter === f ? 'var(--text)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text-muted)',
                border: `1.5px solid ${filter === f ? 'var(--text)' : 'var(--border)'}`,
                borderRadius: '20px', cursor: 'pointer', textTransform: 'capitalize', fontWeight: 500
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{padding: '10px 0'}}>
          {loading ? (
             <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>Loading timeline...</p>
          ) : getFilteredMilestones().map((m) => (
            <div
              key={m.id}
              ref={observeNode}
              className="timeline-node"
              style={{marginBottom: '20px', padding: '20px', background: 'var(--card)', borderRadius: '16px', borderLeft: '4px solid var(--primary)'}}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px'}}>
                 <div style={{fontSize: '2rem', background: 'var(--bg)', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'}}>
                   {m.icon || '📍'}
                 </div>
                 <div>
                   <h3 className="heading-serif" style={{fontSize: '1.2rem', marginBottom: '2px'}}>{m.what}</h3>
                   <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600}}>{m.when_date ? new Date(m.when_date).toLocaleDateString() : ''}</p>
                 </div>
              </div>
              {m.why && <p style={{fontSize: '0.95rem', lineHeight: '1.5', marginTop: '10px'}}>{m.why}</p>}
            </div>
          ))}
          {!loading && getFilteredMilestones().length === 0 && (
            <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)'}}>
              <div style={{fontSize: '3rem', opacity: 0.5, marginBottom: '10px'}}>⏳</div>
              <p>No milestones found for this filter.</p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
};

export default Timeline;

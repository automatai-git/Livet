import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import AppShell from '../components/AppShell';

// The long-term milestone record. The weekly life tree that used to sit
// above this feed lives on the Life tab now (/life) — this page is reached
// from the "Milestone timeline" link there.
const Timeline = () => {
  const [milestones, setMilestones] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // IntersectionObserver for scroll animations
  const observer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('timeline_events').select('*').then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data) {
        const sorted = data.sort((a, b) => new Date(b.when_date) - new Date(a.when_date));
        setMilestones(sorted);
      }
      setLoading(false);
    });

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    return () => {
      cancelled = true;
      if (observer.current) observer.current.disconnect();
    };
  }, []);

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
    <AppShell title="Milestones" accent="var(--accent-timeline)" back="/life">
      <section aria-label="Milestone statistics" className="surface-card milestone-stats">
        <div>
          <div className="milestone-stat-num" aria-label={`${stats.past} past milestones`}>{stats.past}</div>
          <div className="milestone-stat-label">Past</div>
        </div>
        <div>
          <div className="milestone-stat-num total" aria-label={`${stats.total} total milestones`}>{stats.total}</div>
          <div className="milestone-stat-label">Total</div>
        </div>
        <div>
          <div className="milestone-stat-num future" aria-label={`${stats.future} future milestones`}>{stats.future}</div>
          <div className="milestone-stat-label">Future</div>
        </div>
      </section>

      <div role="group" aria-label="Filter milestones by time" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
        {['all', 'past', 'future'].map(f => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            aria-label={`Show ${f} milestones`}
            onClick={() => setFilter(f)}
            className={`filter-pill${filter === f ? ' on' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 0' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading timeline...</p>
        ) : getFilteredMilestones().map((m) => (
          <div
            key={m.id}
            ref={observeNode}
            className="timeline-node surface-card milestone-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <div className="milestone-icon">
                {m.icon || '·'}
              </div>
              <div>
                <h3 className="heading-serif" style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{m.what}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.when_date ? new Date(m.when_date).toLocaleDateString() : ''}</p>
              </div>
            </div>
            {m.why && <p style={{ fontSize: '0.95rem', lineHeight: '1.5', marginTop: '10px' }}>{m.why}</p>}
          </div>
        ))}
        {!loading && getFilteredMilestones().length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p>No milestones found for this filter.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Timeline;

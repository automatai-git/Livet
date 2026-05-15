import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Timeline = () => {
  const [milestones, setMilestones] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // IntersectionObserver for scroll animations
  const observer = useRef(null);

  useEffect(() => {
    fetchTimeline();
    
    // Set up observer for scroll animations
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Optional: observer.current.unobserve(entry.target) to animate only once
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  const fetchTimeline = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('timeline_events').select('*');
    if (!error && data) {
      // Sort descending by date
      const sorted = data.sort((a, b) => new Date(b.when_date) - new Date(a.when_date));
      setMilestones(sorted);
    }
    setLoading(false);
  };

  // Function to attach observer to node refs
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
    <div>
      <div className="sticky-header">
        <div className="header-row">
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Timeline</h1>
          <div style={{width: '80px'}}></div>
        </div>
      </div>

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

      <div style={{padding: '20px 0'}}>
        {loading ? (
           <p style={{textAlign: 'center', color: 'var(--text-muted)'}}>Loading timeline...</p>
        ) : getFilteredMilestones().map((m, i) => (
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

    </div>
  );
};

export default Timeline;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Timeline = () => {
  const [milestones, setMilestones] = useState(() => JSON.parse(localStorage.getItem('lifeTimelinePWA') || '[]'));
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('lifeTimelinePWA', JSON.stringify(milestones));
  }, [milestones]);

  const getTimeCategory = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today ? 'past' : 'future';
  };

  const getFilteredMilestones = () => {
    if (filter === 'all') return milestones;
    return milestones.filter(m => getTimeCategory(m.when) === filter);
  };

  const stats = {
    past: milestones.filter(m => getTimeCategory(m.when) === 'past').length,
    future: milestones.filter(m => getTimeCategory(m.when) === 'future').length,
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

      <div style={{display: 'flex', justifyContent: 'space-around', padding: '24px 16px', background: 'var(--card)', borderRadius: '16px', marginBottom: '20px'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', fontWeight: 700}}>{stats.past}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Past</div>
        </div>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--primary)'}}>{stats.total}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Total</div>
        </div>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', fontWeight: 700, color: 'var(--success)'}}>{stats.future}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Future</div>
        </div>
      </div>

      <div style={{display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px'}}>
        {['all', 'past', 'future'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '10px 20px', 
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
        {getFilteredMilestones().map((m, i) => (
          <div key={m.id} style={{marginBottom: '20px', padding: '20px', background: 'var(--card)', borderRadius: '16px'}}>
            <div style={{fontSize: '1.5rem', marginBottom: '10px'}}>{m.icon}</div>
            <h3 className="heading-serif" style={{fontSize: '1.2rem', marginBottom: '8px'}}>{m.what}</h3>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px'}}>{new Date(m.when).toLocaleDateString()}</p>
            {m.why && <p style={{fontSize: '0.9rem'}}>{m.why}</p>}
          </div>
        ))}
        {getFilteredMilestones().length === 0 && (
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

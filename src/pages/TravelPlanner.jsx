import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { DESTINATION, ISLANDS, EXPERIENCES } from '../data/travelData';

const TravelPlanner = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, experiences, mytrip
  const [activeIsland, setActiveIsland] = useState('all');
  const [myTripState, setMyTripState] = useState([]);
  const [loadingTrip, setLoadingTrip] = useState(false);

  useEffect(() => {
    fetchMyTrip();
  }, []);

  const fetchMyTrip = async () => {
    setLoadingTrip(true);
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('destination_id', DESTINATION.id);
    
    if (!error && data) {
      setMyTripState(data);
    }
    setLoadingTrip(false);
  };

  const addToPlan = async (experienceId) => {
    const existing = myTripState.find(p => p.experience_id === experienceId);
    if (existing) return; // Already in plan

    const { data, error } = await supabase
      .from('travel_plans')
      .insert([{
        destination_id: DESTINATION.id,
        experience_id: experienceId,
        status: 'planned'
      }])
      .select()
      .single();

    if (!error && data) {
      setMyTripState([...myTripState, data]);
    } else {
      console.error(error);
    }
  };

  const removeFromPlan = async (id) => {
    if (!window.confirm("Remove this from your trip plan?")) return;
    const { error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', id);

    if (!error) {
      setMyTripState(myTripState.filter(p => p.id !== id));
    }
  };

  const toggleStatus = async (plan) => {
    const newStatus = plan.status === 'completed' ? 'planned' : 'completed';
    const { error } = await supabase
      .from('travel_plans')
      .update({ status: newStatus })
      .eq('id', plan.id);

    if (!error) {
      setMyTripState(myTripState.map(p => 
        p.id === plan.id ? { ...p, status: newStatus } : p
      ));
    }
  };

  // Derived state for My Trip
  const plannedExperiences = myTripState.map(plan => {
    const xp = EXPERIENCES.find(e => e.id === plan.experience_id) || {};
    return { ...plan, xp };
  });

  return (
    <div>
      <div className="sticky-header" style={{margin: 0, paddingBottom: 0}}>
        <div className="header-row" style={{paddingBottom: '20px'}}>
          <Link to="/" className="back-home">← Dashboard</Link>
          <h1 className="heading-serif">Trip Planner</h1>
          <div style={{width: '80px'}}></div>
        </div>
      </div>

      {/* Destination Hero */}
      <div style={{background: 'linear-gradient(135deg, #1d3557 0%, #457b9d 100%)', color: 'white', padding: '40px 20px', textAlign: 'center'}}>
         <h1 className="heading-serif" style={{fontSize: '2.5rem', marginBottom: '10px'}}>
           {DESTINATION.name}
         </h1>
         <p style={{opacity: 0.9, marginBottom: '20px', maxWidth: '600px', margin: '0 auto 20px'}}>
           {DESTINATION.subtitle}
         </p>
         <div style={{display: 'inline-flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px'}}>
            <button onClick={() => setActiveTab('overview')} style={tabStyle(activeTab === 'overview')}>Overview</button>
            <button onClick={() => setActiveTab('experiences')} style={tabStyle(activeTab === 'experiences')}>Experiences</button>
            <button onClick={() => setActiveTab('mytrip')} style={tabStyle(activeTab === 'mytrip')}>
              My Trip {myTripState.length > 0 && <span style={{background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', marginLeft: '5px', fontSize: '0.8rem'}}>{myTripState.length}</span>}
            </button>
         </div>
      </div>

      <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="fade-in">
            <p style={{lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '30px'}}>{DESTINATION.description}</p>
            
            <h2 className="heading-serif" style={{marginBottom: '15px'}}>{DESTINATION.recommendedSplit.title}</h2>
            <div style={{background: 'var(--card)', borderRadius: '16px', padding: '20px', borderLeft: '4px solid var(--primary)', marginBottom: '30px'}}>
              <p style={{fontWeight: 600, marginBottom: '15px'}}>{DESTINATION.recommendedSplit.summary}</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                {DESTINATION.recommendedSplit.days.map((day, i) => (
                  <div key={i} style={{display: 'flex', gap: '15px'}}>
                    <div style={{fontWeight: 700, color: 'var(--primary)', minWidth: '50px'}}>Days {day.range}</div>
                    <div>
                      <div style={{fontWeight: 600, marginBottom: '4px'}}>{day.islandName} <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>— {day.theme}</span></div>
                      <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>{day.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="heading-serif" style={{marginBottom: '15px'}}>Island Profiles</h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
              {ISLANDS.map(island => (
                <div key={island.id} style={{background: 'var(--card)', padding: '20px', borderRadius: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                    <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'}}>{island.icon}</div>
                    <div>
                      <h3 style={{margin: 0, fontSize: '1.1rem'}}>{island.name}</h3>
                      <div style={{fontSize: '0.8rem', color: island.color, fontWeight: 700, textTransform: 'uppercase'}}>{island.nickname}</div>
                    </div>
                  </div>
                  <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5}}>{island.verdict}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPERIENCES TAB */}
        {activeTab === 'experiences' && (
          <div className="fade-in">
            <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '20px', marginBottom: '10px'}}>
              <button 
                onClick={() => setActiveIsland('all')} 
                style={filterBtnStyle(activeIsland === 'all', '#666')}
              >
                All Islands
              </button>
              {ISLANDS.map(isl => (
                <button 
                  key={isl.id} 
                  onClick={() => setActiveIsland(isl.id)}
                  style={filterBtnStyle(activeIsland === isl.id, isl.color)}
                >
                  {isl.icon} {isl.name}
                </button>
              ))}
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {EXPERIENCES.filter(e => activeIsland === 'all' || e.islandId === activeIsland).map(exp => {
                const island = ISLANDS.find(i => i.id === exp.islandId);
                const isInPlan = myTripState.some(p => p.experience_id === exp.id);

                return (
                  <div key={exp.id} style={{background: 'var(--card)', padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', position: 'relative', overflow: 'hidden'}}>
                    <div style={{position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: island.color}}></div>
                    <div style={{flex: 1, paddingLeft: '5px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                        <h3 className="heading-serif" style={{margin: 0, fontSize: '1.2rem'}}>{exp.name}</h3>
                        <div style={{background: 'var(--bg)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)'}}>
                          ⭐ {exp.rating}
                        </div>
                      </div>
                      <div style={{fontSize: '0.85rem', color: island.color, fontWeight: 700, marginBottom: '8px'}}>{island.name} • {exp.cost}</div>
                      <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0}}>{exp.description}</p>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <button 
                        onClick={() => !isInPlan && addToPlan(exp.id)}
                        disabled={isInPlan}
                        style={{
                          background: isInPlan ? 'var(--bg)' : 'var(--primary)',
                          color: isInPlan ? 'var(--text-muted)' : 'white',
                          border: 'none', width: '40px', height: '40px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                          cursor: isInPlan ? 'default' : 'pointer', transition: 'all 0.2s', fontWeight: 500
                        }}
                      >
                        {isInPlan ? '✓' : '+'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MY TRIP TAB */}
        {activeTab === 'mytrip' && (
          <div className="fade-in">
            {loadingTrip ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>Loading your plan...</div>
            ) : plannedExperiences.length === 0 ? (
              <div style={{textAlign: 'center', padding: '60px 20px', background: 'var(--card)', borderRadius: '16px'}}>
                <div style={{fontSize: '3rem', marginBottom: '15px'}}>✈️</div>
                <h3 className="heading-serif" style={{marginBottom: '10px'}}>Your trip is empty</h3>
                <p style={{color: 'var(--text-muted)'}}>Explore the 'Experiences' tab and add activities to build your itinerary.</p>
                <button onClick={() => setActiveTab('experiences')} style={{marginTop: '20px', background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer'}}>
                  Browse Experiences
                </button>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                {plannedExperiences.map((plan) => {
                  const island = ISLANDS.find(i => i.id === plan.xp.islandId) || {};
                  const isCompleted = plan.status === 'completed';

                  return (
                    <div key={plan.id} style={{background: 'var(--card)', padding: '16px', borderRadius: '16px', display: 'flex', gap: '16px', opacity: isCompleted ? 0.6 : 1, transition: 'all 0.3s'}}>
                      <div 
                        onClick={() => toggleStatus(plan)}
                        style={{width: '28px', height: '28px', borderRadius: '8px', border: isCompleted ? 'none' : '2px solid var(--border)', background: isCompleted ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, cursor: 'pointer', marginTop: '2px'}}
                      >
                        {isCompleted ? '✓' : ''}
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{fontWeight: 600, fontSize: '1.1rem', textDecoration: isCompleted ? 'line-through' : 'none', marginBottom: '4px'}}>{plan.xp.name}</div>
                        <div style={{fontSize: '0.8rem', color: island.color || 'var(--text-muted)', fontWeight: 600, marginBottom: '4px'}}>{island.icon} {island.name}</div>
                        <div style={{fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: isCompleted ? 'line-through' : 'none'}}>{plan.xp.cost} • Rating: {plan.xp.rating}</div>
                      </div>
                      <button 
                        onClick={() => removeFromPlan(plan.id)}
                        style={{background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.3, alignSelf: 'flex-start'}}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.3'}
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// UI Helpers
const tabStyle = (active) => ({
  padding: '8px 24px', borderRadius: '10px', border: 'none', 
  background: active ? 'white' : 'transparent',
  color: active ? '#1d3557' : 'white',
  fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
  display: 'flex', alignItems: 'center'
});

const filterBtnStyle = (active, color) => ({
  padding: '8px 16px', background: active ? color : 'var(--card)',
  color: active ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '20px', 
  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
});

export default TravelPlanner;

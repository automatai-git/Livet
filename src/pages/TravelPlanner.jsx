import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { DESTINATION, ISLANDS, EXPERIENCES } from '../data/travelData';
import { CHECKLIST_DATA } from '../data/travelChecklistData';

const TravelPlanner = () => {
  // --- STATE ---
  const [tripPhase, setTripPhase] = useState(() => {
    return localStorage.getItem('travel_trip_phase') || 'planning'; // planning, booked, ontrip
  });
  const [activeTab, setActiveTab] = useState('overview'); 
  const [activeIsland, setActiveIsland] = useState('all');
  const [myTripState, setMyTripState] = useState([]);
  const [loadingTrip, setLoadingTrip] = useState(false);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('travel_trip_phase', tripPhase);
    // Auto-adjust active tab if it's not valid for the current phase
    const validTabs = getValidTabs(tripPhase);
    if (!validTabs.includes(activeTab)) {
      setActiveTab(validTabs[0]);
    }
  }, [tripPhase]);

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

  // --- ACTIONS ---
  const addToPlan = async (experienceId) => {
    const existing = myTripState.find(p => p.experience_id === experienceId);
    if (existing) return;

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

  const toggleChecklistStatus = async (chk) => {
    const expId = `chk-${chk.id}`;
    const existing = myTripState.find(p => p.experience_id === expId);
    if (existing) {
      const { error } = await supabase.from('travel_plans').delete().eq('id', existing.id);
      if (!error) setMyTripState(myTripState.filter(p => p.id !== existing.id));
    } else {
      const { data, error } = await supabase.from('travel_plans').insert([{
        destination_id: DESTINATION.id,
        experience_id: expId,
        status: 'completed'
      }]).select().single();
      if (!error && data) setMyTripState([...myTripState, data]);
    }
  };

  // --- DERIVED DATA ---
  const plannedExperiences = myTripState
    .filter(plan => !plan.experience_id.startsWith('chk-'))
    .map(plan => {
      const xp = EXPERIENCES.find(e => e.id === plan.experience_id) || {};
      return { ...plan, xp };
    });
    
  const plannedCount = plannedExperiences.length;

  const getValidTabs = (phase) => {
    switch(phase) {
      case 'planning': return ['overview', 'checklist', 'experiences'];
      case 'booked': return ['mytrip', 'checklist'];
      case 'ontrip': return ['itinerary', 'habits'];
      default: return ['overview'];
    }
  };

  // --- SUB-COMPONENTS ---
  const PhaseSelector = () => (
    <div style={{
      display: 'flex', 
      background: 'rgba(0,0,0,0.05)', 
      padding: '4px', 
      borderRadius: '12px',
      margin: '0 20px 20px',
      gap: '4px'
    }}>
      {['Planning', 'Booked', 'On Trip'].map(p => {
        const id = p.toLowerCase().replace(' ', '');
        const active = tripPhase === id;
        return (
          <button 
            key={id} 
            onClick={() => setTripPhase(id)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '8px',
              border: 'none',
              background: active ? 'white' : 'transparent',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {p}
          </button>
        )
      })}
    </div>
  );

  const TabBar = () => {
    const tabs = getValidTabs(tripPhase);
    return (
      <div style={{
        display: 'flex', 
        justifyContent: 'center',
        padding: '0 20px 20px',
        gap: '10px',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}>
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === tab ? 'var(--primary)' : 'var(--card)',
              color: activeTab === tab ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'mytrip' && plannedCount > 0 && (
              <span style={{marginLeft: '6px', opacity: 0.8}}>{plannedCount}</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // --- RENDER ---
  return (
    <div style={{minHeight: '100vh', paddingBottom: '40px', background: '#f8f9fa'}}>
      {/* iOS Header */}
      <div style={{
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div className="header-row" style={{padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <Link to="/" style={{textDecoration: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem'}}>← Dashboard</Link>
          <span className="heading-serif" style={{fontSize: '1.2rem'}}>Travel Planner</span>
          <div style={{width: '60px'}}></div>
        </div>
        <PhaseSelector />
        <TabBar />
      </div>

      <div style={{padding: '20px', maxWidth: '600px', margin: '0 auto'}}>
        
        {/* PLANNING PHASE CONTENT */}
        {tripPhase === 'planning' && (
          <div className="fade-in">
            {activeTab === 'overview' && (
              <>
                <div style={{marginBottom: '30px', padding: '0 10px'}}>
                  <h1 className="heading-serif" style={{fontSize: '2.4rem', marginBottom: '8px', color: 'var(--primary)'}}>{DESTINATION.name}</h1>
                  <p style={{color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6}}>{DESTINATION.description}</p>
                </div>
                
                <h2 className="heading-serif" style={{fontSize: '1.4rem', marginBottom: '15px', padding: '0 10px'}}>The Plan</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px'}}>
                  {DESTINATION.recommendedSplit.days.map((day, i) => (
                    <div key={i} style={{background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', gap: '15px', border: '1px solid rgba(0,0,0,0.05)'}}>
                      <div style={{color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', minWidth: '40px'}}>DAY {day.range}</div>
                      <div>
                        <div style={{fontWeight: 700, marginBottom: '2px'}}>{day.islandName}</div>
                        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0}}>{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'checklist' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                {['CRITICAL', 'HIGH'].map(priority => {
                  const items = CHECKLIST_DATA.filter(c => c.priority === priority);
                  return (
                    <div key={priority}>
                      <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: priority === 'CRITICAL' ? '#e74c3c' : '#e67e22', letterSpacing: '1px', marginBottom: '15px', paddingLeft: '5px'}}>{priority} TASKS</h3>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                        {items.map(chk => {
                          const isCompleted = myTripState.some(p => p.experience_id === `chk-${chk.id}`);
                          return (
                            <div 
                              key={chk.id} 
                              onClick={() => toggleChecklistStatus(chk)}
                              style={{
                                background: 'white', 
                                padding: '16px', 
                                borderRadius: '16px', 
                                display: 'flex', 
                                gap: '12px',
                                border: '1px solid rgba(0,0,0,0.05)',
                                opacity: isCompleted ? 0.5 : 1,
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                minWidth: '24px', height: '24px', borderRadius: '50%',
                                border: '2px solid',
                                borderColor: isCompleted ? 'var(--success)' : 'rgba(0,0,0,0.1)',
                                background: isCompleted ? 'var(--success)' : 'transparent',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: 900
                              }}> {isCompleted ? '✓' : ''} </div>
                              <div>
                                <div style={{fontWeight: 700, fontSize: '1rem', textDecoration: isCompleted ? 'line-through' : 'none'}}>{chk.task}</div>
                                <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4}}>{chk.why}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'experiences' && (
               <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                 <div style={{display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '15px', scrollbarWidth: 'none'}}>
                    <button onClick={() => setActiveIsland('all')} style={filterBtnStyle(activeIsland === 'all', '#1d3557')}>All</button>
                    {ISLANDS.map(isl => (
                      <button key={isl.id} onClick={() => setActiveIsland(isl.id)} style={filterBtnStyle(activeIsland === isl.id, isl.color)}>{isl.icon} {isl.name}</button>
                    ))}
                 </div>
                 {EXPERIENCES.filter(e => activeIsland === 'all' || e.islandId === activeIsland).map(exp => {
                    const isl = ISLANDS.find(i => i.id === exp.islandId);
                    const isInPlan = myTripState.some(p => p.experience_id === exp.id);
                    return (
                      <div key={exp.id} style={{background: 'white', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)'}}>
                        <div style={{flex: 1, paddingRight: '15px'}}>
                          <div style={{fontSize: '0.7rem', fontWeight: 800, color: isl.color, textTransform: 'uppercase', marginBottom: '4px'}}>{isl.name}</div>
                          <div style={{fontWeight: 700, fontSize: '1.1rem'}}>{exp.name}</div>
                          <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4}}>{exp.description}</div>
                        </div>
                        <button 
                          onClick={() => !isInPlan && addToPlan(exp.id)}
                          style={{
                            minWidth: '44px', height: '44px', borderRadius: '50%', border: 'none',
                            background: isInPlan ? '#f0f0f0' : 'var(--primary)',
                            color: isInPlan ? '#bbb' : 'white',
                            fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        > {isInPlan ? '✓' : '+'} </button>
                      </div>
                    )
                 })}
               </div>
            )}
          </div>
        )}

        {/* BOOKED PHASE CONTENT */}
        {tripPhase === 'booked' && (
          <div className="fade-in">
            {activeTab === 'mytrip' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                {plannedExperiences.length === 0 ? (
                   <div style={{textAlign: 'center', padding: '60px 20px'}}>
                      <p style={{color: 'var(--text-muted)'}}>Nothing booked yet. Use Planning mode to build your trip.</p>
                   </div>
                ) : (
                  plannedExperiences.map(plan => (
                    <div key={plan.id} style={{background: 'white', padding: '16px', borderRadius: '16px', display: 'flex', gap: '15px', border: '1px solid rgba(0,0,0,0.05)', alignItems: 'center'}}>
                      <div style={{flex: 1}}>
                         <div style={{fontWeight: 700, fontSize: '1.05rem'}}>{plan.xp.name}</div>
                         <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px'}}>{plan.xp.cost} • ⭐ {plan.xp.rating}</div>
                      </div>
                      <button onClick={() => removeFromPlan(plan.id)} style={{background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.3, padding: '10px'}}>🗑️</button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'checklist' && (
               <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                 {['MEDIUM', 'FLEXIBLE'].map(priority => {
                    const items = CHECKLIST_DATA.filter(c => c.priority === priority);
                    return (
                      <div key={priority}>
                        <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: '#f1c40f', marginBottom: '15px', paddingLeft: '5px'}}>{priority} LOGISTICS</h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                          {items.map(chk => {
                            const isCompleted = myTripState.some(p => p.experience_id === `chk-${chk.id}`);
                            return (
                              <div key={chk.id} onClick={() => toggleChecklistStatus(chk)} style={{background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', opacity: isCompleted ? 0.5 : 1, display: 'flex', gap: '12px'}}>
                                <div style={{
                                  minWidth: '22px', height: '22px', borderRadius: '5px',
                                  border: '2px solid',
                                  borderColor: isCompleted ? 'var(--success)' : 'rgba(0,0,0,0.1)',
                                  background: isCompleted ? 'var(--success)' : 'transparent',
                                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                }}> {isCompleted ? '✓' : ''} </div>
                                <div>
                                  <div style={{fontWeight: 700, fontSize: '1rem', textDecoration: isCompleted ? 'line-through' : 'none'}}>{chk.task}</div>
                                  <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4}}>{chk.action}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                 })}
               </div>
            )}
          </div>
        )}

        {/* ON TRIP PHASE CONTENT */}
        {tripPhase === 'ontrip' && (
          <div className="fade-in">
             {activeTab === 'itinerary' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                   {ISLANDS.map(isl => {
                      const islExp = plannedExperiences.filter(p => p.xp.islandId === isl.id);
                      if (islExp.length === 0) return null;
                      return (
                        <div key={isl.id}>
                           <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', padding: '0 5px'}}>
                              <div style={{width: '36px', height: '36px', borderRadius: '10px', background: isl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white'}}>{isl.icon}</div>
                              <h3 style={{fontSize: '1.3rem', margin: 0}}>{isl.name}</h3>
                           </div>
                           <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                              {islExp.map(plan => (
                                <div 
                                  key={plan.id} 
                                  onClick={() => toggleStatus(plan)}
                                  style={{
                                    background: 'white', 
                                    padding: '16px', 
                                    borderRadius: '16px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    opacity: plan.status === 'completed' ? 0.6 : 1
                                  }}
                                >
                                  <div style={{
                                    minWidth: '24px', height: '24px', borderRadius: '6px',
                                    border: '2px solid',
                                    borderColor: plan.status === 'completed' ? 'var(--success)' : 'rgba(0,0,0,0.1)',
                                    background: plan.status === 'completed' ? 'var(--success)' : 'transparent',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                                  }}> {plan.status === 'completed' ? '✓' : ''} </div>
                                  <div style={{flex: 1}}>
                                     <div style={{fontWeight: 700, fontSize: '1.05rem', textDecoration: plan.status === 'completed' ? 'line-through' : 'none'}}>{plan.xp.name}</div>
                                     <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px'}}>{plan.xp.cost} • Rating: {plan.xp.rating}</div>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )
                   })}
                </div>
             )}

             {activeTab === 'habits' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                   <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', paddingLeft: '5px'}}>TRIP HABITS & DISCIPLINE</h3>
                   {CHECKLIST_DATA.filter(c => c.priority === 'ON-TRIP').map(chk => (
                      <div key={chk.id} style={{background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'}}>
                         <div style={{fontWeight: 800, color: 'var(--primary)', marginBottom: '8px', fontSize: '1.1rem'}}>{chk.task}</div>
                         <p style={{fontSize: '0.95rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.5}}>{chk.action}</p>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
};

// UI Helpers
const filterBtnStyle = (active, color) => ({
  padding: '10px 18px', 
  background: active ? color : 'white',
  color: active ? 'white' : 'var(--text-muted)', 
  border: active ? 'none' : '1px solid rgba(0,0,0,0.05)', 
  borderRadius: '24px', 
  fontWeight: 700, 
  fontSize: '0.9rem',
  cursor: 'pointer', 
  whiteSpace: 'nowrap', 
  transition: 'all 0.2s',
  boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
  WebkitTapHighlightColor: 'transparent'
});

const tabStyle = (active) => ({
    padding: '8px 24px', borderRadius: '10px', border: 'none', 
    background: active ? 'white' : 'transparent',
    color: active ? '#1d3557' : 'white',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center'
  });

export default TravelPlanner;


import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { travelService } from '../../services/travelService';
import { getDestination } from '../../data/destinations';
import LoadingState from '../../components/feedback/LoadingState';
import EmptyState from '../../components/feedback/EmptyState';
import TravelMap from '../../components/TravelMap';

// Tabs available per trip status. Mirrors the original page's behaviour.
const VALID_TABS = {
  planning: ['overview', 'checklist', 'experiences'],
  booked:   ['mytrip', 'checklist'],
  ontrip:   ['itinerary', 'habits'],
};

const STATUS_TO_LABEL = { planning: 'Planning', booked: 'Booked', ontrip: 'On Trip' };

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [tripError, setTripError] = useState(null);

  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeIsland, setActiveIsland] = useState('all');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Load the trip row + plans on mount or when tripId changes.
  useEffect(() => {
    let cancelled = false;
    setLoadingTrip(true);
    setTripError(null);
    Promise.all([
      travelService.getTrip(tripId),
      travelService.listPlans(tripId),
    ]).then(([t, ps]) => {
      if (cancelled) return;
      if (!t) setTripError('not-found');
      setTrip(t);
      setPlans(ps);
      setLoadingTrip(false);
    }).catch((err) => {
      if (cancelled) return;
      console.error(err);
      setTripError(err.message || 'load-failed');
      setLoadingTrip(false);
    });
    return () => { cancelled = true; };
  }, [tripId]);

  const destination = useMemo(
    () => trip ? getDestination(trip.destination_key) : null,
    [trip]
  );
  const { meta, islands = [], experiences = [], checklist = [] } = destination || {};

  // When status changes, keep activeTab in sync with what's valid.
  useEffect(() => {
    if (!trip) return;
    const valid = VALID_TABS[trip.status] ?? VALID_TABS.planning;
    if (!valid.includes(activeTab)) setActiveTab(valid[0]);
  }, [trip?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Mutations ---
  const setStatus = async (newStatus) => {
    if (!trip || trip.status === newStatus) return;
    setTrip({ ...trip, status: newStatus });
    try { await travelService.updateTrip(trip.id, { status: newStatus }); }
    catch (e) { console.error('Could not update trip status:', e); }
  };

  const addToPlan = async (experienceId) => {
    if (plans.some((p) => p.experience_id === experienceId)) return;
    try {
      const row = await travelService.addPlan({ tripId: trip.id, experienceId, destinationKey: trip.destination_key });
      setPlans([...plans, row]);
    } catch (e) { console.error(e); }
  };

  const removeFromPlan = async (planId) => {
    if (!window.confirm('Remove this from your trip plan?')) return;
    try {
      await travelService.removePlan(planId);
      setPlans(plans.filter((p) => p.id !== planId));
    } catch (e) { console.error(e); }
  };

  const togglePlanStatus = async (plan) => {
    const next = plan.status === 'completed' ? 'planned' : 'completed';
    setPlans(plans.map((p) => p.id === plan.id ? { ...p, status: next } : p));
    try { await travelService.updatePlanStatus(plan.id, next); }
    catch (e) { console.error(e); }
  };

  const toggleChecklistStatus = async (chk) => {
    const expId = `chk-${chk.id}`;
    const existing = plans.find((p) => p.experience_id === expId);
    if (existing) {
      try {
        await travelService.removePlan(existing.id);
        setPlans(plans.filter((p) => p.id !== existing.id));
      } catch (e) { console.error(e); }
    } else {
      try {
        const row = await travelService.addPlan({
          tripId: trip.id,
          experienceId: expId,
          destinationKey: trip.destination_key,
          status: 'completed',
        });
        setPlans([...plans, row]);
      } catch (e) { console.error(e); }
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this trip? It will move out of the active list. You can still find it under archived trips later.')) return;
    try {
      await travelService.archiveTrip(trip.id);
      navigate('/travel', { replace: true });
    } catch (e) { console.error(e); }
  };

  // --- Derived ---
  const plannedExperiences = useMemo(() => plans
    .filter((p) => !String(p.experience_id).startsWith('chk-'))
    .map((p) => ({ ...p, xp: experiences.find((e) => e.id === p.experience_id) || {} })),
    [plans, experiences]
  );

  const handleMapSelect = (islandId) => {
    setActiveIsland(islandId);
    setActiveTab('experiences');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loadingTrip) {
    return (
      <div style={{ padding: 20 }}>
        <LoadingState label="Loading trip…" />
      </div>
    );
  }

  if (tripError === 'not-found' || !trip) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState
          title="Trip not found"
          hint="It may have been archived or deleted."
          action={<Link to="/travel" className="error-boundary-btn">Back to trips</Link>}
        />
      </div>
    );
  }

  if (!destination) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState
          title="Unknown destination"
          hint={`No template registered for "${trip.destination_key}". Add one under src/data/destinations/ and re-deploy.`}
          action={<Link to="/travel" className="error-boundary-btn">Back to trips</Link>}
        />
      </div>
    );
  }

  const validTabs = VALID_TABS[trip.status] ?? VALID_TABS.planning;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40, background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div className="header-row" style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/travel" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>← Trips</Link>
          <span className="heading-serif" style={{ fontSize: '1.2rem' }}>{trip.name}</span>
          <button
            type="button"
            onClick={handleArchive}
            aria-label="Archive trip"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', padding: 8 }}
          >
            Archive
          </button>
        </div>

        {/* Phase selector */}
        <div role="tablist" aria-label="Trip phase" style={{
          display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 4, borderRadius: 12, margin: '0 20px 20px', gap: 4
        }}>
          {['planning', 'booked', 'ontrip'].map((s) => {
            const active = trip.status === s;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(s)}
                style={{
                  flex: 1, padding: '10px 0', minHeight: 44, borderRadius: 8, border: 'none',
                  background: active ? 'white' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {STATUS_TO_LABEL[s]}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Trip sections" style={{
          display: 'flex', justifyContent: 'center', padding: '0 20px 20px', gap: 10, overflowX: 'auto', scrollbarWidth: 'none'
        }}>
          {validTabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px', minHeight: 44, borderRadius: 20, border: 'none',
                background: activeTab === tab ? 'var(--primary)' : 'var(--card)',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'mytrip' && plannedExperiences.length > 0 && (
                <span style={{ marginLeft: 6, opacity: 0.8 }}>{plannedExperiences.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        {trip.status === 'planning' && (
          <div className="fade-in">
            {activeTab === 'overview' && (
              <>
                <div style={{ marginBottom: 30, padding: '0 10px' }}>
                  <h1 className="heading-serif" style={{ fontSize: '2.4rem', marginBottom: 12, color: 'var(--primary)' }}>{meta.name}</h1>
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
                    {meta.description.map((item, i) => (
                      <li key={i} style={{ fontSize: '0.95rem', display: 'flex', gap: 8, lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: 30 }}>
                  <button
                    type="button"
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    aria-expanded={isMapExpanded}
                    style={{
                      width: '100%', padding: 16, minHeight: 44, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)',
                      background: 'white', fontWeight: 700, color: 'var(--primary)', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                      marginBottom: isMapExpanded ? 15 : 0, WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <span>{isMapExpanded ? 'Hide Map' : 'Explore Trip Map'}</span>
                    <span aria-hidden="true">{isMapExpanded ? '▲' : '🗺️'}</span>
                  </button>
                  {isMapExpanded && (
                    <div className="fade-in" style={{ padding: '0 5px' }}>
                      <TravelMap
                        destination={destination}
                        tripId={trip.id}
                        onSelectIsland={handleMapSelect}
                        activeIsland={activeIsland}
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                        Tap an island to filter experiences.
                      </p>
                    </div>
                  )}
                </div>

                {meta.recommendedSplit?.days && (
                  <>
                    <h2 className="heading-serif" style={{ fontSize: '1.4rem', marginBottom: 15, padding: '0 10px' }}>The Plan</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30 }}>
                      {meta.recommendedSplit.days.map((day, i) => (
                        <div key={i} style={{ background: 'white', borderRadius: 20, padding: 20, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                            <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>DAY {day.range}</div>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{day.islandName}</div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                             📍 {day.base}
                          </div>
                          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {day.description.map((item, idx) => (
                              <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: 10, lineHeight: 1.4 }}>
                                <span style={{ color: 'var(--primary)', opacity: 0.5 }}>—</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'checklist' && (
              <ChecklistSection priorities={['CRITICAL', 'HIGH']} checklist={checklist} plans={plans} onToggle={toggleChecklistStatus} />
            )}

            {activeTab === 'experiences' && (
              <ExperiencesSection
                islands={islands}
                experiences={experiences}
                activeIsland={activeIsland}
                setActiveIsland={setActiveIsland}
                plans={plans}
                onAdd={addToPlan}
              />
            )}
          </div>
        )}

        {trip.status === 'booked' && (
          <div className="fade-in">
            {activeTab === 'mytrip' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {plannedExperiences.length === 0 ? (
                  <EmptyState title="Nothing booked yet" hint="Switch to Planning to build your trip." />
                ) : plannedExperiences.map((plan) => (
                  <div key={plan.id} style={{ background: 'white', padding: 16, borderRadius: 16, display: 'flex', gap: 15, border: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{plan.xp.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{plan.xp.cost} • ⭐ {plan.xp.rating}</div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${plan.xp.name || 'experience'}`}
                      onClick={() => removeFromPlan(plan.id)}
                      style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.3, padding: 10, minWidth: 44, minHeight: 44 }}
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'checklist' && (
              <ChecklistSection priorities={['MEDIUM', 'FLEXIBLE']} checklist={checklist} plans={plans} onToggle={toggleChecklistStatus} />
            )}
          </div>
        )}

        {trip.status === 'ontrip' && (
          <div className="fade-in">
            {activeTab === 'itinerary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                {islands.map((isl) => {
                  const islExp = plannedExperiences.filter((p) => p.xp.islandId === isl.id);
                  if (islExp.length === 0) return null;
                  return (
                    <div key={isl.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15, padding: '0 5px' }}>
                        <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: isl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white' }}>{isl.icon}</div>
                        <h3 style={{ fontSize: '1.3rem', margin: 0 }}>{isl.name}</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {islExp.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => togglePlanStatus(plan)}
                            aria-pressed={plan.status === 'completed'}
                            style={{
                              textAlign: 'left', background: 'white', padding: 16, borderRadius: 16,
                              display: 'flex', alignItems: 'center', gap: 12,
                              border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer',
                              opacity: plan.status === 'completed' ? 0.6 : 1, width: '100%'
                            }}
                          >
                            <span aria-hidden="true" style={{
                              minWidth: 24, height: 24, borderRadius: 6,
                              border: '2px solid', borderColor: plan.status === 'completed' ? 'var(--success)' : 'rgba(0,0,0,0.1)',
                              background: plan.status === 'completed' ? 'var(--success)' : 'transparent',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
                            }}>{plan.status === 'completed' ? '✓' : ''}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '1.05rem', textDecoration: plan.status === 'completed' ? 'line-through' : 'none' }}>{plan.xp.name}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{plan.xp.cost} • Rating: {plan.xp.rating}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'habits' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: 1, paddingLeft: 5 }}>TRIP HABITS & DISCIPLINE</h3>
                {checklist.filter((c) => c.priority === 'ON-TRIP').map((chk) => (
                  <div key={chk.id} style={{ background: 'white', padding: 20, borderRadius: 20, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 8, fontSize: '1.1rem' }}>{chk.task}</div>
                    <p style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>{chk.action}</p>
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

// --- Sub-components ---

const filterBtnStyle = (active, color) => ({
  padding: '10px 18px', minHeight: 44,
  background: active ? color : 'white',
  color: active ? 'white' : 'var(--text-muted)',
  border: active ? 'none' : '1px solid rgba(0,0,0,0.05)',
  borderRadius: 24, fontWeight: 700, fontSize: '0.9rem',
  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
  boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
  WebkitTapHighlightColor: 'transparent',
});

const ChecklistSection = ({ priorities, checklist, plans, onToggle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
    {priorities.map((priority) => {
      const items = checklist.filter((c) => c.priority === priority);
      if (items.length === 0) return null;
      return (
        <div key={priority}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: priority === 'CRITICAL' ? '#e74c3c' : priority === 'HIGH' ? '#e67e22' : '#f1c40f', letterSpacing: 1, marginBottom: 15, paddingLeft: 5 }}>{priority} TASKS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((chk) => {
              const isCompleted = plans.some((p) => p.experience_id === `chk-${chk.id}`);
              return (
                <button
                  key={chk.id}
                  type="button"
                  onClick={() => onToggle(chk)}
                  aria-pressed={isCompleted}
                  style={{
                    textAlign: 'left', background: 'white', padding: 16, borderRadius: 16, display: 'flex',
                    gap: 12, border: '1px solid rgba(0,0,0,0.05)',
                    opacity: isCompleted ? 0.5 : 1, cursor: 'pointer', width: '100%'
                  }}
                >
                  <span aria-hidden="true" style={{
                    minWidth: 24, height: 24, borderRadius: 6, border: '2px solid',
                    borderColor: isCompleted ? 'var(--success)' : 'rgba(0,0,0,0.1)',
                    background: isCompleted ? 'var(--success)' : 'transparent',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900
                  }}>{isCompleted ? '✓' : ''}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', textDecoration: isCompleted ? 'line-through' : 'none' }}>{chk.task}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{chk.why || chk.action}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);

const ExperiencesSection = ({ islands, experiences, activeIsland, setActiveIsland, plans, onAdd }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
    <div role="group" aria-label="Filter experiences by island" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 15, scrollbarWidth: 'none' }}>
      <button type="button" aria-pressed={activeIsland === 'all'} onClick={() => setActiveIsland('all')} style={filterBtnStyle(activeIsland === 'all', '#1d3557')}>All</button>
      {islands.map((isl) => (
        <button
          key={isl.id}
          type="button"
          aria-pressed={activeIsland === isl.id}
          onClick={() => setActiveIsland(isl.id)}
          style={filterBtnStyle(activeIsland === isl.id, isl.color)}
        >
          <span aria-hidden="true">{isl.icon}</span> {isl.name}
        </button>
      ))}
    </div>
    {experiences.filter((e) => activeIsland === 'all' || e.islandId === activeIsland).map((exp) => {
      const isl = islands.find((i) => i.id === exp.islandId) || { name: '', color: 'var(--text-muted)' };
      const isInPlan = plans.some((p) => p.experience_id === exp.id);
      return (
        <div key={exp.id} style={{ background: 'white', padding: 16, borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ flex: 1, paddingRight: 15 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: isl.color, textTransform: 'uppercase', marginBottom: 4 }}>{isl.name}</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{exp.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{exp.description}</div>
          </div>
          <button
            type="button"
            disabled={isInPlan}
            aria-label={isInPlan ? `${exp.name} added` : `Add ${exp.name} to your plan`}
            onClick={() => !isInPlan && onAdd(exp.id)}
            style={{
              minWidth: 44, height: 44, borderRadius: '50%', border: 'none',
              background: isInPlan ? '#f0f0f0' : 'var(--primary)',
              color: isInPlan ? '#bbb' : 'white',
              fontSize: '1.4rem', cursor: isInPlan ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <span aria-hidden="true">{isInPlan ? '✓' : '+'}</span>
          </button>
        </div>
      );
    })}
  </div>
);

export default TripDetail;

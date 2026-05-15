import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/feedback/LoadingState';
import EmptyState from '../../components/feedback/EmptyState';
import { travelService } from '../../services/travelService';
import { listDestinations } from '../../data/destinations';

const STATUS_LABEL = {
  planning: 'Planning',
  booked: 'Booked',
  ontrip: 'On trip',
  archived: 'Archived',
};

const STATUS_COLOR = {
  planning: 'var(--text-muted)',
  booked: 'var(--accent-travel)',
  ontrip: 'var(--success)',
  archived: 'var(--border)',
};

const fmtDateRange = (start, end) => {
  if (!start && !end) return null;
  const f = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  if (start && end) return `${f(start)} → ${f(end)}`;
  return f(start || end);
};

const TripList = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const destinations = listDestinations();

  useEffect(() => {
    travelService.listTrips().then((rows) => {
      setTrips(rows);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <AppShell title="Trips" accent="var(--accent-travel)">
        <LoadingState label="Loading your trips…" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Trips"
      accent="var(--accent-travel)"
      actions={
        <Link
          to="/travel/new"
          className="error-boundary-btn"
          style={{ padding: '8px 14px', minHeight: 36, fontSize: '0.85rem', borderRadius: 999 }}
        >
          + New trip
        </Link>
      }
    >
      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          hint={destinations.length > 0
            ? `Pick a destination to get started — ${destinations.length} template${destinations.length === 1 ? '' : 's'} ready.`
            : 'Add a destination template under src/data/destinations/ to begin.'}
          action={
            <Link
              to="/travel/new"
              className="error-boundary-btn"
              style={{ padding: '10px 18px', fontSize: '0.9rem' }}
            >
              Create your first trip
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {trips.map((trip) => {
            const dest = destinations.find((d) => d.key === trip.destination_key);
            const dates = fmtDateRange(trip.start_date, trip.end_date);
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => navigate(`/travel/${trip.id}`)}
                style={{
                  textAlign: 'left',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <h3 className="heading-serif" style={{ fontSize: '1.25rem' }}>{trip.name}</h3>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: STATUS_COLOR[trip.status] || 'var(--text-muted)',
                    }}
                  >
                    {STATUS_LABEL[trip.status] || trip.status}
                  </span>
                </div>
                <div className="muted-row" style={{ fontSize: '0.85rem' }}>
                  {dest ? dest.name : trip.destination_key}{dates ? ` · ${dates}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
};

export default TripList;

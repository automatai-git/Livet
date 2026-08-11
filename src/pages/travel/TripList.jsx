import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShellV3, { HeroCard } from '../../components/AppShellV3';
import AppIcon from '../../components/AppIcon';
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

const fmtDateRange = (start, end) => {
  if (!start && !end) return null;
  const f = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  if (start && end) return `${f(start)} → ${f(end)}`;
  return f(start || end);
};

const TripList = () => {
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
      <AppShellV3 app="travel">
        <LoadingState label="Loading your trips…" />
      </AppShellV3>
    );
  }

  // Hero = the next (or currently running) trip, with a countdown.
  const active = trips.filter((t) => t.status !== 'archived');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = [...active]
    .filter((t) => t.start_date && new Date(t.start_date) >= today)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const nextTrip = upcoming[0] || active[0] || null;
  const daysOut = nextTrip?.start_date
    ? Math.round((new Date(nextTrip.start_date) - today) / 86400000)
    : null;
  const nextDest = nextTrip && destinations.find((d) => d.key === nextTrip.destination_key);

  return (
    <AppShellV3
      app="travel"
      hero={nextTrip && (
        <HeroCard
          eyebrow="Next trip"
          title={nextTrip.name}
          meta={[
            nextDest ? nextDest.name : nextTrip.destination_key,
            fmtDateRange(nextTrip.start_date, nextTrip.end_date),
            daysOut != null && daysOut >= 0 ? `${daysOut === 0 ? 'today' : `in ${daysOut} day${daysOut === 1 ? '' : 's'}`}` : null,
          ].filter(Boolean).join(' · ')}
        />
      )}
      action={{ label: 'New trip', to: '/travel/new' }}
    >
      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          hint={destinations.length > 0
            ? `Pick a destination to get started — ${destinations.length} template${destinations.length === 1 ? '' : 's'} ready.`
            : 'Add a destination template under src/data/destinations/ to begin.'}
          action={
            <Link to="/travel/new" className="ghost-pill">
              Create your first trip
            </Link>
          }
        />
      ) : (
        <div className="row-stack">
          {trips.map((trip) => {
            const dest = destinations.find((d) => d.key === trip.destination_key);
            const dates = fmtDateRange(trip.start_date, trip.end_date);
            return (
              <Link
                key={trip.id}
                to={`/travel/${trip.id}`}
                className={`surface-card trip-row${trip.status === 'archived' ? ' dim' : ''}`}
              >
                <div className="icon-chip md" style={{ background: 'var(--app-tint-bg)', color: 'var(--app-tint-fg)' }}>
                  <AppIcon name="travel" size={20} />
                </div>
                <div className="trip-row-body">
                  <h3 className="heading-serif trip-row-name">{trip.name}</h3>
                  <div className="row-meta ellipsis">
                    {dest ? dest.name : trip.destination_key}{dates ? ` · ${dates}` : ''}
                  </div>
                </div>
                <span className="trip-status-chip">{STATUS_LABEL[trip.status] || trip.status}</span>
                <AppIcon name="chev" size={14} className="row-chev" />
              </Link>
            );
          })}
        </div>
      )}
    </AppShellV3>
  );
};

export default TripList;

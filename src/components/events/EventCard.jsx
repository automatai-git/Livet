import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import {
  scoreBand, barrierLabel, barrierRank, formatEventDate, urgencyLabel,
  isScoredTrack, parseJsonArray, isNewThisWeek, EVENT_STATES, BUSINESS_GOALS,
  formatLine,
} from '../../lib/events';

// One digest event in the browse list. The card body links to the
// /networking/:id focus flow; the state pills underneath are the one-tap
// feedback the NAS reads back every Monday, so they live on the card, not
// only in the detail view.

// achiever_score chip: how good the *room* is (not the topic). Null on
// pleasure → render nothing at all, never an empty chip.
export const RoomScore = ({ score, size = 'sm' }) => {
  const band = scoreBand(score);
  if (!band) return null;
  return (
    <span className={`net-score ${size} ${band}`} title="Room quality 0–100">
      {score}
      <span className="net-score-band">{band === 'lead' ? 'lead pick' : band}</span>
    </span>
  );
};

// Barrier badge: higher friction is the stronger signal, so the tone
// deepens with rank instead of a free=green scale.
export const BarrierChip = ({ barrier }) => {
  const label = barrierLabel(barrier);
  if (!label) return null;
  return <span className={`net-barrier rank-${Math.max(0, barrierRank(barrier))}`}>{label}</span>;
};

export const GoalChips = ({ goals }) => {
  const own = parseJsonArray(goals);
  if (own.length === 0) return null;
  return (
    <div className="net-goal-chips">
      {BUSINESS_GOALS.filter(([id]) => own.includes(id)).map(([id, label]) => (
        <span key={id} className="net-goal-chip">{label}</span>
      ))}
    </div>
  );
};

// State pills shared by the card and the detail flow. Tapping the active
// pill clears it (null = no signal) so every mark is reversible.
export const StatePills = ({ states, value, onChange, size = 'sm' }) => (
  <div className="net-state-row" role="group" aria-label="Your state">
    {states.map(([state, label]) => (
      <button
        key={state}
        type="button"
        className={`ghost-pill ${size}${value === state ? ' on-ink' : ''}${state === 'hidden' ? ' net-hide' : ''}`}
        aria-pressed={value === state}
        onClick={(e) => { e.preventDefault(); onChange(value === state ? null : state); }}
      >
        {label}
      </button>
    ))}
  </div>
);

const EventCard = ({ event, latestWeek, onState, now }) => {
  const scored = isScoredTrack(event.track);
  const fresh = isNewThisWeek(event, latestWeek);
  const urgency = urgencyLabel(event, now);
  const lead = scoreBand(event.achiever_score) === 'lead';
  const meta = [
    formatEventDate(event),
    urgency && urgency !== 'past' ? urgency : null,
    event.city,
  ].filter(Boolean).join(' · ');
  const signal = [formatLine(event), event.price_note].filter(Boolean).join(' · ');

  return (
    <article className={`surface-card net-card${lead ? ' lead' : ''}${event.user_state ? ` state-${event.user_state}` : ''}`}>
      <Link to={`/networking/${encodeURIComponent(event.id)}`} className="net-card-link" aria-label={`Open ${event.name}`}>
        {event.image_url && (
          <img className="net-card-img" src={event.image_url} alt="" loading="lazy" />
        )}
        <div className="net-card-body">
          <div className="net-card-top">
            <div className="net-card-title">
              {fresh && <span className="net-new-chip">New</span>}
              {event.name}
            </div>
            {scored && <RoomScore score={event.achiever_score} />}
          </div>
          <div className="net-card-meta">{meta}</div>
          {event.description && <p className="net-card-desc">{event.description}</p>}
          {scored && (
            <>
              {event.room_note && (
                <div className="net-room-note">
                  <AppIcon name="networking" size={14} strokeWidth="1.8" />
                  <span>{event.room_note}</span>
                </div>
              )}
              <div className="net-signal-row">
                <BarrierChip barrier={event.barrier} />
                {signal && <span className="net-signal-text">{signal}</span>}
              </div>
              {event.track === 'business' && <GoalChips goals={event.business_goals} />}
            </>
          )}
          {!scored && event.price_note && (
            <div className="net-signal-row"><span className="net-signal-text">{event.price_note}</span></div>
          )}
        </div>
      </Link>
      <div className="net-card-actions">
        <StatePills
          states={EVENT_STATES.filter(([s]) => s !== 'attended')}
          value={event.user_state}
          onChange={(state) => onState(event.id, state)}
        />
      </div>
    </article>
  );
};

export default EventCard;

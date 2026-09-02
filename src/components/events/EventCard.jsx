import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../AppIcon';
import { useWhisper, whisperFor } from './useWhisper';
import {
  scoreBand, barrierLabel, barrierRank, formatEventDate, urgencyLabel, daysUntil,
  isScoredTrack, parseJsonArray, isNewThisWeek, EVENT_STATES, BUSINESS_GOALS,
  formatLine,
} from '../../lib/events';

// One digest event in the browse list. The card body links to the
// /networking/:id focus flow; the state pills underneath are the one-tap
// feedback the NAS reads back every Monday, so they live on the card, not
// only in the detail view. Titles are set in the display serif — these
// are invitations, not listings.

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

// State pills shared by the card and the detail flows. Tapping the active
// pill clears it (null = no signal) so every mark is reversible. The tapped
// pill pops (same beat as the life-tree leaf tick) and the parent may show
// a whisper that the mark reached the digest.
export const StatePills = ({ states, value, onChange, size = 'sm' }) => {
  const [popped, setPopped] = useState(null);
  useEffect(() => {
    if (popped == null) return undefined;
    const t = setTimeout(() => setPopped(null), 260);
    return () => clearTimeout(t);
  }, [popped]);
  return (
    <div className="net-state-row" role="group" aria-label="Your state">
      {states.map(([state, label]) => (
        <button
          key={state}
          type="button"
          className={`ghost-pill ${size}${value === state ? ' on-ink' : ''}${state === 'hidden' ? ' net-hide' : ''}${popped === state ? ' pop' : ''}`}
          aria-pressed={value === state}
          onClick={(e) => {
            e.preventDefault();
            setPopped(state);
            onChange(value === state ? null : state);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// A short-lived line under the pills: the mark did something.
export const MarkWhisper = ({ text }) => (
  <div className="net-whisper" role="status">{text}</div>
);

const EventCard = ({ event, latestWeek, onState, now, index = 0, flash = false }) => {
  const scored = isScoredTrack(event.track);
  const fresh = isNewThisWeek(event, latestWeek);
  const urgency = urgencyLabel(event, now);
  const soon = daysUntil(event, now);
  const isSoon = soon != null && soon >= 0 && soon <= 7;
  const lead = scoreBand(event.achiever_score) === 'lead';
  const [whisper, say] = useWhisper();
  const meta = [
    formatEventDate(event),
    !isSoon && urgency && urgency !== 'past' ? urgency : null,
    event.city,
  ].filter(Boolean).join(' · ');
  const signal = [formatLine(event), event.price_note].filter(Boolean).join(' · ');

  return (
    <article
      id={`ev-${event.id}`}
      className={`surface-card net-card${lead ? ' lead' : ''}${event.user_state ? ` state-${event.user_state}` : ''}${flash ? ' flash' : ''}`}
      style={{ '--i': Math.min(index, 8) }}
    >
      <Link to={`/networking/${encodeURIComponent(event.id)}`} className="net-card-link" aria-label={`Open ${event.name}`}>
        {event.image_url && (
          <img className="net-card-img" src={event.image_url} alt="" loading="lazy" />
        )}
        <div className="net-card-body">
          {(fresh || isSoon || event.user_state === 'going') && (
            <div className="net-card-flags">
              {isSoon && <span className="net-soon-chip">{urgency}</span>}
              {event.user_state === 'going' && <span className="net-going-chip">Going</span>}
              {fresh && <span className="net-new-chip">New this week</span>}
            </div>
          )}
          <div className="net-card-top">
            <h3 className="heading-serif net-card-title">{event.name}</h3>
            {scored && <RoomScore score={event.achiever_score} />}
          </div>
          <div className="net-card-meta">{meta}</div>
          {event.description && <p className="net-card-desc">{event.description}</p>}
          {scored && (
            <>
              {event.room_note && (
                <blockquote className="net-room-note">
                  <AppIcon name="networking" size={14} strokeWidth="1.8" />
                  <span>{event.room_note}</span>
                </blockquote>
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
          onChange={(state) => { onState(event.id, state); say(whisperFor(state)); }}
        />
        {whisper && <MarkWhisper text={whisper} />}
      </div>
    </article>
  );
};

export default EventCard;

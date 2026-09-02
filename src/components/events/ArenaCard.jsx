import React from 'react';
import { Link } from 'react-router-dom';
import { RoomScore, StatePills } from './EventCard';
import { ARENA_STATES, isNewThisWeek } from '../../lib/events';

// A standing room — a seat you keep (club, network, syndicate, series).
// Pinned above the dated feed on Social/Business, gold-marked so it never
// reads as just another event. how_to_join is the whole point of the card,
// so it carries the visual weight and join_url is the primary button.
const ArenaCard = ({ arena, latestWeek, onState }) => {
  const fresh = isNewThisWeek(arena, latestWeek);
  const kind = arena.kind ? arena.kind.charAt(0).toUpperCase() + arena.kind.slice(1) : 'Arena';
  const meta = [arena.cadence, arena.cost_note, arena.city].filter(Boolean).join(' · ');
  const joinHref = arena.join_url ?? arena.url;

  return (
    <article className={`surface-card net-arena${arena.user_state ? ` state-${arena.user_state}` : ''}`}>
      <Link to={`/networking/arena/${encodeURIComponent(arena.id)}`} className="net-card-link" aria-label={`Open ${arena.name}`}>
        <div className="net-card-body">
          <div className="net-arena-eyebrow eyebrow">
            {kind}{fresh ? ' · new' : ''}
          </div>
          <div className="net-card-top">
            <div className="net-card-title">{arena.name}</div>
            <RoomScore score={arena.achiever_score} />
          </div>
          {meta && <div className="net-card-meta">{meta}</div>}
          {arena.description && <p className="net-card-desc">{arena.description}</p>}
          {arena.how_to_join && (
            <div className="net-join-note">
              <span className="net-join-k">How to join</span>
              <span>{arena.how_to_join}</span>
            </div>
          )}
        </div>
      </Link>
      <div className="net-card-actions">
        {joinHref && (
          <a className="ink-pill sm net-join-btn" href={joinHref} target="_blank" rel="noreferrer">
            {arena.user_state === 'joined' ? 'Open ↗' : 'Join ↗'}
          </a>
        )}
        <StatePills
          states={ARENA_STATES}
          value={arena.user_state}
          onChange={(state) => onState(arena.id, state)}
        />
      </div>
    </article>
  );
};

export default ArenaCard;

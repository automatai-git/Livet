import React, { useState, useEffect, useMemo } from 'react';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3.jsx';
import AppIcon from '../components/AppIcon.jsx';
import EventCard from '../components/events/EventCard.jsx';
import ArenaCard from '../components/events/ArenaCard.jsx';
import OfflineNote from '../components/feedback/OfflineNote.jsx';
import { eventService } from '../services/eventService';
import {
  TRACKS, SORT_MODES, HORIZONS, BUSINESS_GOALS, isScoredTrack, scoreBand,
  filterEvents, sortEvents, groupByHorizon, filterArenas, needsAttendance,
  latestSentWeek, lastSynced, isNewThisWeek, formatEventDate, horizonFraction,
  parseDateKey,
} from '../lib/events';

// Networking — the NAS weekly events digest (Pleasure / Social / Business)
// surfaced in the hub. Read-only except user_state / user_notes, which the
// NAS reads back every Monday to steer the next digest. Contract:
// HANDOVER-livet-events.md.
//
// Social and Business exist to get Andreas into rooms with high achievers;
// arenas (seats you keep) are pinned above the dated feed there. Pleasure
// is the small unscored track.
//
// Liveliness (v3.3): the hero carries a 60-day horizon rail (same idiom as
// Today's day track — one dot per upcoming room, tap to jump), Monday's
// digest is an ink card that filters to what's new, marks pop and whisper
// back, cards rise in on load.

const TRACK_KEY = 'networking-track-v1';
const SORT_KEY = 'networking-sort-v1';

const readTrack = () => {
  const stored = localStorage.getItem(TRACK_KEY);
  return TRACKS.some(([id]) => id === stored) ? stored : 'business';
};
const readSort = () => (localStorage.getItem(SORT_KEY) === 'score' ? 'score' : 'date');

const GroupHead = ({ label, hint }) => (
  <div className="section-head listing-group-head">
    <div className="eyebrow">{label}</div>
    {hint && <div className="section-hint">{hint}</div>}
  </div>
);

// The hero's horizon rail: today at the left, two months at the right,
// one dot per upcoming room in this track. Lead picks are filled accent,
// solid rooms outlined ink, the rest faint. Tapping a dot scrolls to its
// card and flashes it.
const RAIL_TICKS = [[0, 'now'], [14 / 60, '2 wk'], [30 / 60, '1 mo'], [1, '2 mo+']];
const HorizonRail = ({ events, now, onPick }) => {
  const dots = events
    .map((e) => ({ e, x: horizonFraction(e, now) }))
    .filter((d) => d.x != null);
  if (dots.length === 0) return null;
  return (
    <div className="net-rail" aria-label="Upcoming rooms on a two-month horizon">
      <div className="net-rail-line">
        <div className="net-rail-track" />
        <span className="net-rail-now" aria-hidden="true" />
        {dots.map(({ e, x }, i) => {
          const band = scoreBand(e.achiever_score) ?? 'plain';
          return (
            <button
              key={e.id}
              type="button"
              className={`net-rail-dot ${band}${e.user_state === 'going' ? ' going' : ''}`}
              style={{ left: `${x * 100}%`, '--i': Math.min(i, 12) }}
              title={`${e.name} · ${formatEventDate(e)}`}
              aria-label={`${e.name}, ${formatEventDate(e)}`}
              onClick={() => onPick(e.id)}
            />
          );
        })}
      </div>
      <div className="net-rail-ticks" aria-hidden="true">
        {RAIL_TICKS.map(([x, label]) => (
          <span key={label} style={{ left: `${x * 100}%` }}>{label}</span>
        ))}
      </div>
    </div>
  );
};

const mondayLabel = (key) => {
  const d = parseDateKey(key);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
};

const Networking = () => {
  const [events, setEvents] = useState(eventService.getCachedEvents);
  const [arenas, setArenas] = useState(eventService.getCachedArenas);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [track, setTrackState] = useState(readTrack);
  const [sort, setSortState] = useState(readSort);
  const [goals, setGoals] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);
  const [flashId, setFlashId] = useState(null);
  const now = useMemo(() => new Date(), []);

  const setTrack = (t) => {
    setTrackState(t);
    localStorage.setItem(TRACK_KEY, t);
  };
  const setSort = (s) => {
    setSortState(s);
    localStorage.setItem(SORT_KEY, s);
  };

  useEffect(() => {
    let cancelled = false;
    eventService.getAll().then(({ events, arenas, offline }) => {
      if (cancelled) return;
      setEvents(events);
      setArenas(arenas);
      setOffline(offline);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!flashId) return undefined;
    const t = setTimeout(() => setFlashId(null), 1400);
    return () => clearTimeout(t);
  }, [flashId]);

  const setEventState = (id, user_state) => {
    setEvents((rows) => rows.map((r) => (r.id === id ? { ...r, user_state } : r)));
    eventService.updateEvent(id, { user_state }).then(({ ok }) => setOffline(!ok));
  };
  const setArenaState = (id, user_state) => {
    setArenas((rows) => rows.map((r) => (r.id === id ? { ...r, user_state } : r)));
    eventService.updateArena(id, { user_state }).then(({ ok }) => setOffline(!ok));
  };

  const scored = isScoredTrack(track);
  const latestWeek = useMemo(() => latestSentWeek([...events, ...arenas]), [events, arenas]);
  const activeGoals = useMemo(() => (track === 'business' ? goals : []), [track, goals]);

  const visible = useMemo(() => {
    const base = filterEvents(events, { track, showHidden, showPast, goals: activeGoals, now });
    const narrowed = freshOnly && !showPast && !showHidden ? base.filter((e) => isNewThisWeek(e, latestWeek)) : base;
    return sortEvents(narrowed, showPast ? 'date' : sort);
  }, [events, track, showHidden, showPast, activeGoals, sort, now, freshOnly, latestWeek]);
  const groups = useMemo(() => groupByHorizon(visible, now), [visible, now]);
  const trackArenas = useMemo(() => {
    const list = scored ? filterArenas(arenas, { track, showHidden }) : [];
    return freshOnly && !showHidden ? list.filter((a) => isNewThisWeek(a, latestWeek)) : list;
  }, [arenas, track, scored, showHidden, freshOnly, latestWeek]);
  const toConfirm = useMemo(() => needsAttendance(events, now), [events, now]);

  // Hero numbers: the default (upcoming, not hidden) set for this track.
  const upcoming = useMemo(() => sortEvents(filterEvents(events, { track, now })), [events, track, now]);
  const lead = upcoming.filter((e) => scoreBand(e.achiever_score) === 'lead').length;
  const freshEvents = upcoming.filter((e) => isNewThisWeek(e, latestWeek));
  const freshArenas = (scored ? filterArenas(arenas, { track }) : []).filter((a) => isNewThisWeek(a, latestWeek));
  const fresh = freshEvents.length + freshArenas.length;
  const freshLead = [...freshArenas, ...freshEvents].find((x) => scoreBand(x.achiever_score) === 'lead')
    ?? freshArenas[0] ?? freshEvents[0] ?? null;
  const pastCount = filterEvents(events, { track, showPast: true, now }).length;
  const hiddenCount = events.filter((e) => e.track === track && e.user_state === 'hidden').length
    + arenas.filter((a) => a.track === track && a.user_state === 'hidden').length;
  const synced = lastSynced(events, arenas);
  const trackLabel = TRACKS.find(([id]) => id === track)?.[1] ?? track;
  const next = upcoming[0] ?? null;

  const title = !scored
    ? (upcoming.length > 0 ? `${upcoming.length} things to enjoy` : 'Nothing on yet')
    : lead > 0
      ? `${lead} lead ${lead === 1 ? 'room' : 'rooms'} ahead`
      : upcoming.length > 0 ? `${upcoming.length} rooms ahead` : 'No rooms yet';
  const meta = [
    `${upcoming.length} upcoming`,
    scored && trackArenas.length > 0 ? `${trackArenas.length} standing ${trackArenas.length === 1 ? 'room' : 'rooms'}` : null,
    offline ? 'offline' : synced
      ? `synced ${new Date(synced).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
      : null,
  ].filter(Boolean).join(' · ');

  const toggleGoal = (g) => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  const jumpTo = (id) => {
    const el = document.getElementById(`ev-${id}`);
    if (!el) { setFreshOnly(false); setShowPast(false); setShowHidden(false); }
    setFlashId(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  let cardIndex = 0;
  const renderEvent = (e) => (
    <EventCard
      key={e.id}
      event={e}
      latestWeek={latestWeek}
      onState={setEventState}
      now={now}
      index={cardIndex++}
      flash={flashId === e.id}
    />
  );

  return (
    <AppShellV3
      app="networking"
      scope={
        <div className="scope-row equal" role="group" aria-label="Digest track">
          {TRACKS.map(([id, label]) => (
            <ScopePill key={id} on={track === id} onClick={() => setTrack(id)}>
              {label}
            </ScopePill>
          ))}
        </div>
      }
      hero={
        <HeroCard
          eyebrow={`Weekly digest · ${trackLabel}`}
          title={title}
          meta={meta || 'The NAS digest lands every Monday around noon.'}
        >
          <HorizonRail events={upcoming} now={now} onPick={jumpTo} />
          {next && (
            <div className="net-next-line">
              <span className="net-next-k">Next up</span>
              <button type="button" className="net-next-link" onClick={() => jumpTo(next.id)}>
                {next.name}
              </button>
              <span className="net-next-when">{formatEventDate(next)}</span>
            </div>
          )}
        </HeroCard>
      }
    >
      {latestWeek && fresh > 0 && !showPast && !showHidden && (
        <button
          type="button"
          className={`net-digest-card${freshOnly ? ' on' : ''}`}
          aria-pressed={freshOnly}
          onClick={() => setFreshOnly((v) => !v)}
        >
          <div className="net-digest-main">
            <div className="net-digest-eyebrow">Monday’s digest · {mondayLabel(latestWeek)}</div>
            <div className="heading-serif net-digest-title">
              {fresh} new {fresh === 1 ? 'room' : 'rooms'} this week
            </div>
            <div className="net-digest-hint">
              {freshOnly
                ? 'Showing only what arrived Monday — tap to see everything'
                : freshLead ? `Lead: ${freshLead.name}` : 'Tap to see only what arrived Monday'}
            </div>
          </div>
          <div className="net-digest-dots" aria-hidden="true">
            {[...freshArenas, ...freshEvents].slice(0, 8).map((x) => (
              <span
                key={x.id}
                className={scoreBand(x.achiever_score) === 'lead' ? 'lead' : ''}
                style={x.kind ? { background: 'var(--net-arena)' } : undefined}
              />
            ))}
          </div>
        </button>
      )}

      {scored && !freshOnly && (
        <div className="net-teach-note">
          Every mark teaches the digest — Interested, Going and Attended pull in more like it; Hide steers away. Monday reflects it.
        </div>
      )}

      {toConfirm.length > 0 && (
        <section className="surface-card net-confirm-card">
          <div className="eyebrow">Did you go?</div>
          {toConfirm.map((e) => (
            <div key={e.id} className="net-confirm-row">
              <div className="net-confirm-body">
                <div className="row-title sm ellipsis">{e.name}</div>
                <div className="row-meta ellipsis">{[formatEventDate(e), e.city].filter(Boolean).join(' · ')}</div>
              </div>
              <button type="button" className="ink-pill sm" onClick={() => setEventState(e.id, 'attended')}>
                Attended
              </button>
              <button type="button" className="ghost-pill sm" onClick={() => setEventState(e.id, 'interested')}>
                Missed it
              </button>
            </div>
          ))}
        </section>
      )}

      {scored && !showPast && (
        <div className="listing-controls" role="group" aria-label="Sort and filter rooms">
          <div className="listing-sort-row">
            {SORT_MODES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`ghost-pill sm${sort === id ? ' on-ink' : ''}`}
                aria-pressed={sort === id}
                onClick={() => setSort(id)}
              >
                {label}
              </button>
            ))}
            {track === 'business' && (
              <>
                <span className="net-controls-gap" aria-hidden="true" />
                {BUSINESS_GOALS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`ghost-pill sm${goals.includes(id) ? ' armed' : ''}`}
                    aria-pressed={goals.includes(id)}
                    onClick={() => toggleGoal(id)}
                  >
                    {label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {!loaded && events.length === 0 && arenas.length === 0 ? (
        <div className="listing-empty">Loading the digest…</div>
      ) : (
        <>
          {scored && trackArenas.length > 0 && !showPast && (
            <>
              <GroupHead label="Standing rooms" hint="seats you keep" />
              <div className="listing-list">
                {trackArenas.map((a, i) => (
                  <ArenaCard key={a.id} arena={a} latestWeek={latestWeek} onState={setArenaState} index={i} />
                ))}
              </div>
            </>
          )}

          {visible.length === 0 ? (
            <div className="net-empty">
              <AppIcon name="networking" size={44} strokeWidth="1.2" />
              <div className="heading-serif net-empty-title">
                {events.length === 0 ? 'Quiet for now.'
                  : showPast ? 'Nothing behind you yet.'
                    : showHidden ? 'Nothing hidden.'
                      : freshOnly ? 'Nothing new here this week.'
                        : activeGoals.length > 0 ? 'No rooms for those goals.'
                          : 'A quiet stretch.'}
              </div>
              <div className="net-empty-hint">
                {events.length === 0
                  ? 'The digest fills this every Monday around noon.'
                  : showPast ? 'Mark a room Going and it lands here once the date passes.'
                    : showHidden ? 'Hide is cheap and reversible — hidden rooms wait here.'
                      : freshOnly ? 'Tap the digest card to see every room again.'
                        : activeGoals.length > 0 ? 'Loosen the goal chips, or wait for Monday.'
                          : 'Monday brings the next digest.'}
              </div>
            </div>
          ) : showPast || showHidden ? (
            <>
              <GroupHead label={showPast ? 'Past' : 'Hidden'} hint={showPast ? 'attended = strongest signal' : 'tap Hide again to restore'} />
              <div className="listing-list">{visible.map(renderEvent)}</div>
            </>
          ) : (
            HORIZONS.map(([id, label]) => groups[id].length > 0 && (
              <React.Fragment key={id}>
                <GroupHead label={label} />
                <div className="listing-list">{groups[id].map(renderEvent)}</div>
              </React.Fragment>
            ))
          )}
        </>
      )}

      <div className="listing-toggles" role="group" aria-label="Past and hidden">
        <button
          type="button"
          className={`ghost-pill sm${showPast ? ' on-ink' : ''}`}
          aria-pressed={showPast}
          onClick={() => { setShowPast((v) => !v); setShowHidden(false); }}
        >
          Past · {pastCount}
        </button>
        <button
          type="button"
          className={`ghost-pill sm${showHidden ? ' on-ink' : ''}`}
          aria-pressed={showHidden}
          onClick={() => { setShowHidden((v) => !v); setShowPast(false); }}
        >
          Hidden · {hiddenCount}
        </button>
      </div>

      {offline && <OfflineNote />}
    </AppShellV3>
  );
};

export default Networking;

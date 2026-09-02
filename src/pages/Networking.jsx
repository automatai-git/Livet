import React, { useState, useEffect, useMemo } from 'react';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3.jsx';
import EventCard from '../components/events/EventCard.jsx';
import ArenaCard from '../components/events/ArenaCard.jsx';
import OfflineNote from '../components/feedback/OfflineNote.jsx';
import { eventService } from '../services/eventService';
import {
  TRACKS, SORT_MODES, HORIZONS, BUSINESS_GOALS, isScoredTrack, scoreBand,
  filterEvents, sortEvents, groupByHorizon, filterArenas, needsAttendance,
  latestSentWeek, lastSynced, isNewThisWeek, formatEventDate,
} from '../lib/events';

// Networking — the NAS weekly events digest (Pleasure / Social / Business)
// surfaced in the hub. Read-only except user_state / user_notes, which the
// NAS reads back every Monday to steer the next digest. Contract:
// HANDOVER-livet-events.md.
//
// Social and Business exist to get Andreas into rooms with high achievers;
// arenas (seats you keep) are pinned above the dated feed there. Pleasure
// is the small unscored track.

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

  const visible = useMemo(
    () => sortEvents(filterEvents(events, { track, showHidden, showPast, goals: activeGoals, now }), showPast ? 'date' : sort),
    [events, track, showHidden, showPast, activeGoals, sort, now]
  );
  const groups = useMemo(() => groupByHorizon(visible, now), [visible, now]);
  const trackArenas = useMemo(
    () => (scored ? filterArenas(arenas, { track, showHidden }) : []),
    [arenas, track, scored, showHidden]
  );
  const toConfirm = useMemo(() => needsAttendance(events, now), [events, now]);

  // Hero numbers: the default (upcoming, not hidden) set for this track.
  const upcoming = filterEvents(events, { track, now });
  const lead = upcoming.filter((e) => scoreBand(e.achiever_score) === 'lead').length;
  const fresh = upcoming.filter((e) => isNewThisWeek(e, latestWeek)).length
    + trackArenas.filter((a) => isNewThisWeek(a, latestWeek)).length;
  const pastCount = filterEvents(events, { track, showPast: true, now }).length;
  const hiddenCount = events.filter((e) => e.track === track && e.user_state === 'hidden').length
    + arenas.filter((a) => a.track === track && a.user_state === 'hidden').length;
  const synced = lastSynced(events, arenas);
  const trackLabel = TRACKS.find(([id]) => id === track)?.[1] ?? track;

  const title = !scored
    ? (upcoming.length > 0 ? `${upcoming.length} things to enjoy` : 'Nothing on yet')
    : lead > 0
      ? `${lead} lead ${lead === 1 ? 'room' : 'rooms'} ahead`
      : upcoming.length > 0 ? `${upcoming.length} rooms ahead` : 'No rooms yet';
  const meta = [
    `${upcoming.length} upcoming`,
    scored && trackArenas.length > 0 ? `${trackArenas.length} standing ${trackArenas.length === 1 ? 'room' : 'rooms'}` : null,
    fresh > 0 ? `${fresh} new this week` : null,
    offline ? 'offline' : synced
      ? `synced ${new Date(synced).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
      : null,
  ].filter(Boolean).join(' · ');

  const toggleGoal = (g) => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

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
        />
      }
    >
      {scored && (
        <div className="net-teach-note">
          Marking a room teaches the digest — Interested, Going and Attended pull in more like it; Hide pushes that kind away. Next Monday reflects it.
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
                {trackArenas.map((a) => (
                  <ArenaCard key={a.id} arena={a} latestWeek={latestWeek} onState={setArenaState} />
                ))}
              </div>
            </>
          )}

          {visible.length === 0 ? (
            <div className="listing-empty">
              {events.length === 0
                ? 'Nothing collected yet — the NAS digest fills this every Monday around noon.'
                : showPast ? 'No past events in this track.'
                  : showHidden ? 'Nothing hidden in this track.'
                    : activeGoals.length > 0 ? 'No upcoming rooms serve those goals.'
                      : 'No upcoming events in this track.'}
            </div>
          ) : showPast || showHidden ? (
            <>
              <GroupHead label={showPast ? 'Past' : 'Hidden'} hint={showPast ? 'attended = strongest signal' : 'tap Hide again to restore'} />
              <div className="listing-list">
                {visible.map((e) => (
                  <EventCard key={e.id} event={e} latestWeek={latestWeek} onState={setEventState} now={now} />
                ))}
              </div>
            </>
          ) : (
            HORIZONS.map(([id, label]) => groups[id].length > 0 && (
              <React.Fragment key={id}>
                <GroupHead label={label} />
                <div className="listing-list">
                  {groups[id].map((e) => (
                    <EventCard key={e.id} event={e} latestWeek={latestWeek} onState={setEventState} now={now} />
                  ))}
                </div>
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

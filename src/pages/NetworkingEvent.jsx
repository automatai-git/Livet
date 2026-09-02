import React, { useState, useEffect, useId } from 'react';
import { useParams } from 'react-router-dom';
import AppShellV3 from '../components/AppShellV3.jsx';
import OfflineNote from '../components/feedback/OfflineNote.jsx';
import { RoomScore, BarrierChip, GoalChips, StatePills } from '../components/events/EventCard.jsx';
import { eventService } from '../services/eventService';
import {
  EVENT_STATES, isScoredTrack, formatEventDate, urgencyLabel, buildEventIcs,
  icsFilename, isPast, formatLine,
} from '../lib/events';

// One digest event as a focus flow: photo · name + room score · meta ·
// the room (room_note, barrier, format, price, goals) · why it matters ·
// description · links · state pills · notes. The sticky action exports the
// event to the phone's calendar as an .ics — on iOS that opens the native
// "Add to Calendar" sheet; the Google template link the NAS ships is the
// secondary link.

const downloadIcs = (event) => {
  const ics = buildEventIcs(event);
  if (!ics) return;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = icsFilename(event);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const NetworkingEvent = () => {
  const { id } = useParams();
  const [events, setEvents] = useState(eventService.getCachedEvents);
  const [offline, setOffline] = useState(false);
  const notesId = useId();

  const event = events.find((e) => e.id === id) ?? null;
  // null = untouched → show stored notes; a string only once the user
  // types, so a refetch never clobbers an edit in progress.
  const [notesDraft, setNotesDraft] = useState(null);
  const notes = notesDraft ?? event?.user_notes ?? '';

  useEffect(() => {
    let cancelled = false;
    eventService.getAll().then(({ events, offline }) => {
      if (cancelled) return;
      setEvents(events);
      setOffline(offline);
    });
    return () => { cancelled = true; };
  }, []);

  const update = (fields) => {
    setEvents((rows) => rows.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    eventService.updateEvent(id, fields).then(({ ok }) => setOffline(!ok));
  };
  const saveNotes = () => {
    if (event && (event.user_notes ?? '') !== notes) update({ user_notes: notes });
  };

  if (!event) {
    return (
      <AppShellV3 app="networking" title="Event" back="/networking" hideTabBar>
        <div className="listing-empty">This event isn’t in the digest any more.</div>
      </AppShellV3>
    );
  }

  const scored = isScoredTrack(event.track);
  const past = isPast(event);
  const urgency = urgencyLabel(event);
  const meta = [
    formatEventDate(event),
    urgency && urgency !== 'past' ? urgency : null,
    [event.venue, event.city].filter(Boolean).join(', ') || null,
    event.country && event.country.toLowerCase() !== 'norway' && event.country.toLowerCase() !== 'norge' ? event.country : null,
  ].filter(Boolean).join(' · ');
  const trackLabel = event.track ? event.track.charAt(0).toUpperCase() + event.track.slice(1) : 'Event';
  const room = formatLine(event);
  // Past events offer Attended; upcoming ones don't (the "did you go?"
  // prompt on the list handles the transition).
  const states = EVENT_STATES.filter(([s]) => past || s !== 'attended');

  return (
    <AppShellV3
      app="networking"
      title={trackLabel}
      back="/networking"
      hideTabBar
      action={{
        label: 'Add to calendar',
        onClick: () => { saveNotes(); downloadIcs(event); },
        disabled: !event.event_date,
      }}
    >
      {event.image_url && <img className="listing-detail-img" src={event.image_url} alt="" />}

      <div className="listing-top listing-page-top">
        <h2 className="heading-serif listing-detail-title">{event.name}</h2>
        {scored && <RoomScore score={event.achiever_score} size="lg" />}
      </div>
      <div className="listing-meta">{meta}</div>

      {scored && (
        <section className="surface-card listing-read-card net-room-card">
          <div className="eyebrow">The room</div>
          {event.room_note && <p className="listing-read-summary">{event.room_note}</p>}
          <div className="net-signal-row lg">
            <BarrierChip barrier={event.barrier} />
            {room && <span className="net-signal-text">{room}</span>}
            {event.price_note && <span className="net-signal-text">{event.price_note}</span>}
          </div>
          {event.track === 'business' && <GoalChips goals={event.business_goals} />}
        </section>
      )}

      {event.why && (
        <section className="surface-card listing-read-card">
          <div className="eyebrow">Why it matters</div>
          <p className="listing-read-summary">{event.why}</p>
        </section>
      )}

      {event.description && (
        <section className="surface-card listing-read-card">
          <div className="eyebrow">About</div>
          <p className="listing-read-summary">{event.description}</p>
          {!scored && event.price_note && <div className="net-signal-row lg"><span className="net-signal-text">{event.price_note}</span></div>}
        </section>
      )}

      <div className="listing-links">
        {event.url && (
          <a className="ghost-pill" href={event.url} target="_blank" rel="noreferrer">Event page ↗</a>
        )}
        {event.booking_url && event.booking_url !== event.url && (
          <a className="ghost-pill" href={event.booking_url} target="_blank" rel="noreferrer">Book ↗</a>
        )}
        {event.calendar_url && (
          <a className="ghost-pill" href={event.calendar_url} target="_blank" rel="noreferrer">Google Calendar ↗</a>
        )}
      </div>

      <div className="listing-actions net-detail-states">
        <StatePills states={states} value={event.user_state} onChange={(s) => update({ user_state: s })} size="" />
      </div>
      {scored && <div className="net-teach-note">This mark shapes next Monday’s digest.</div>}

      <label className="eyebrow listing-notes-label" htmlFor={notesId}>Notes</label>
      <textarea
        id={notesId}
        className="listing-notes"
        value={notes}
        placeholder="Who to look for, what to ask, how it went…"
        onChange={(e) => setNotesDraft(e.target.value)}
        onBlur={saveNotes}
      />

      {offline && <OfflineNote />}
    </AppShellV3>
  );
};

export default NetworkingEvent;

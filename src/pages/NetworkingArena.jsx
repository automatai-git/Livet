import React, { useState, useEffect, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShellV3 from '../components/AppShellV3.jsx';
import OfflineNote from '../components/feedback/OfflineNote.jsx';
import { RoomScore, StatePills } from '../components/events/EventCard.jsx';
import { eventService } from '../services/eventService';
import { ARENA_STATES } from '../lib/events';

// One standing room as a focus flow: name + score · kind/cadence/cost ·
// who's in it · why · how to join (the whole point) · links · state ·
// notes. Sticky action = Join (join_url, falling back to url).

const NetworkingArena = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [arenas, setArenas] = useState(eventService.getCachedArenas);
  const [offline, setOffline] = useState(false);
  const notesId = useId();

  const arena = arenas.find((a) => a.id === id) ?? null;
  const [notesDraft, setNotesDraft] = useState(null);
  const notes = notesDraft ?? arena?.user_notes ?? '';

  useEffect(() => {
    let cancelled = false;
    eventService.getAll().then(({ arenas, offline }) => {
      if (cancelled) return;
      setArenas(arenas);
      setOffline(offline);
    });
    return () => { cancelled = true; };
  }, []);

  const update = (fields) => {
    setArenas((rows) => rows.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    eventService.updateArena(id, fields).then(({ ok }) => setOffline(!ok));
  };
  const saveNotes = () => {
    if (arena && (arena.user_notes ?? '') !== notes) update({ user_notes: notes });
  };

  if (!arena) {
    return (
      <AppShellV3 app="networking" title="Arena" back="/networking" hideTabBar>
        <div className="listing-empty">This arena isn’t in the digest any more.</div>
      </AppShellV3>
    );
  }

  const kind = arena.kind ? arena.kind.charAt(0).toUpperCase() + arena.kind.slice(1) : 'Arena';
  const meta = [kind, arena.cadence, arena.cost_note, arena.city].filter(Boolean).join(' · ');
  const joinHref = arena.join_url ?? arena.url;
  const action = joinHref
    ? { label: arena.user_state === 'joined' ? 'Open' : 'Join', onClick: () => { saveNotes(); window.open(joinHref, '_blank', 'noopener'); } }
    : { label: 'Done', onClick: () => { saveNotes(); navigate('/networking'); } };

  return (
    <AppShellV3 app="networking" title="Standing room" back="/networking" hideTabBar action={action}>
      <div className="listing-top listing-page-top">
        <h2 className="heading-serif listing-detail-title">{arena.name}</h2>
        <RoomScore score={arena.achiever_score} size="lg" />
      </div>
      <div className="listing-meta">{meta}</div>

      {arena.how_to_join && (
        <section className="surface-card listing-read-card net-arena-join-card">
          <div className="eyebrow">How to join</div>
          <p className="listing-read-summary">{arena.how_to_join}</p>
        </section>
      )}

      {arena.description && (
        <section className="surface-card listing-read-card">
          <div className="eyebrow">Who’s in it</div>
          <p className="listing-read-summary">{arena.description}</p>
        </section>
      )}

      {arena.why && (
        <section className="surface-card listing-read-card">
          <div className="eyebrow">Why it matters</div>
          <p className="listing-read-summary">{arena.why}</p>
        </section>
      )}

      <div className="listing-links">
        {arena.url && (
          <a className="ghost-pill" href={arena.url} target="_blank" rel="noreferrer">Website ↗</a>
        )}
        {arena.join_url && arena.join_url !== arena.url && (
          <a className="ghost-pill" href={arena.join_url} target="_blank" rel="noreferrer">Join page ↗</a>
        )}
      </div>

      <div className="listing-actions net-detail-states">
        <StatePills states={ARENA_STATES} value={arena.user_state} onChange={(s) => update({ user_state: s })} size="" />
      </div>
      <div className="net-teach-note">Joined tells the digest to stop suggesting this and look one tier up.</div>

      <label className="eyebrow listing-notes-label" htmlFor={notesId}>Notes</label>
      <textarea
        id={notesId}
        className="listing-notes"
        value={notes}
        placeholder="Who proposed you, when the next session is…"
        onChange={(e) => setNotesDraft(e.target.value)}
        onBlur={saveNotes}
      />

      {offline && <OfflineNote />}
    </AppShellV3>
  );
};

export default NetworkingArena;

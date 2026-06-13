import React, { useState, useEffect, useMemo } from 'react';
import { Link, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getActiveBlock,
  getTodayDayType,
  getMobilitySession,
  logMobilityCompletion,
  getMobilityStreak,
  resolveDayForPhase,
  resolveWeek,
  getPhaseForWeek,
  getWeekNumber,
  weekdayKey,
  dateForWeekday,
  openExternal,
} from '../lib/blocks';
import RehabDayCard from '../components/rehab/RehabDayCard';
import RehabWeekRow from '../components/rehab/RehabWeekRow';
import RehabBlockLadder from '../components/rehab/RehabBlockLadder';

// ---------- helpers ---------------------------------------------------------

const fmtDate = (d) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const fmtShort = (d) =>
  d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function kindLabel(day) {
  if (!day) return '—';
  switch (day.kind) {
    case 'strength': return day.focus ? `Strength · ${day.focus.split('—')[0].trim()}` : 'Strength';
    case 'run':      return `Run · ${day.quality?.[0].toUpperCase() + day.quality?.slice(1)}`;
    case 'mobility': return 'Mobility';
    case 'sport':    return `Sport · ${day.activity}`;
    case 'rest':     return 'Rest';
    case 'flex':     return 'Flex — pick one';
    default:         return day.kind;
  }
}

// Lightweight in-page header that mirrors AppShell's look. Local because
// WorkoutFinder uses nested routes and doesn't wrap each route with AppShell.
function StickyHeader({ title, back = '/' }) {
  return (
    <div className="sticky-header" style={{ '--app-accent': 'var(--accent-workout)' }}>
      <div className="header-row">
        <Link to={back} className="back-home">{back === '/' ? '← Dashboard' : '← Back'}</Link>
        <h1 className="heading-serif page-title" style={{ fontSize: '1.25rem' }}>{title}</h1>
        <div style={{ width: 80 }} />
      </div>
      <div style={{ height: 2, margin: '0 16px', background: 'var(--accent-workout)', opacity: 0.85, borderRadius: 2 }} />
    </div>
  );
}

// ---------- Mobility Renderer ----------------------------------------------

const TIME_DUR_RE = /^(\d+)(s|min)(?:\/side)?$/i;

function parseDurationSeconds(reps_or_time) {
  const m = TIME_DUR_RE.exec(reps_or_time?.trim() || '');
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'min' ? n * 60 : n;
}

function MovementTimer({ seconds }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((t) => {
        if (t <= 1) { setRunning(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);
  const m = Math.floor(left / 60), s = left % 60;
  return (
    <div className="timer-row">
      <span className="timer-display">{m}:{s < 10 ? '0' + s : s}</span>
      <button onClick={() => setRunning(!running)} className="timer-btn primary">
        {running ? 'Pause' : 'Start'}
      </button>
      <button onClick={() => { setRunning(false); setLeft(seconds); }} className="timer-btn ghost">Reset</button>
    </div>
  );
}

function MobilityRenderer({ sessionId }) {
  const [session, setSession] = useState(null);
  const [done, setDone] = useState(new Set());
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [streak, setStreak] = useState(0);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getMobilitySession(sessionId);
        if (!cancelled) setSession(s);
      } catch (e) { console.error(e); }
      try {
        const k = await getMobilityStreak(sessionId);
        if (!cancelled) setStreak(k);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!session) return <div className="muted-row" style={{ padding: 14 }}>Loading mobility session…</div>;

  const toggle = (id) => {
    const next = new Set(done);
    next.has(id) ? next.delete(id) : next.add(id);
    setDone(next);
  };

  const markComplete = async () => {
    try {
      await logMobilityCompletion({
        session_id: sessionId,
        movements_completed: [...done],
        rpe: rpe ? Number(rpe) : undefined,
        notes: notes || undefined,
      });
      setSavedMsg('Logged.');
      const k = await getMobilityStreak(sessionId);
      setStreak(k);
    } catch (e) {
      setSavedMsg('Save failed — check connection.');
      console.error(e);
    }
  };

  const totalMovements = (session.blocks || []).reduce((n, b) => n + b.movements.length, 0);

  return (
    <div style={{ marginTop: 18 }}>
      <div className="section-title">
        <h3>{session.name}</h3>
        <span className="muted-row">~{session.duration_min} min · streak {streak}w · {done.size}/{totalMovements}</span>
      </div>
      {(session.prerequisites || []).length > 0 && (
        <div className="muted-row" style={{ marginBottom: 10 }}>
          {session.prerequisites.join(' ')}
        </div>
      )}

      {(session.blocks || []).map((blk) => (
        <section key={blk.name} style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{blk.name}</div>
            <span className="muted-row">{blk.duration_min} min</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {blk.movements.map((mv) => {
              const sec = parseDurationSeconds(mv.reps_or_time);
              const isDone = done.has(mv.id);
              return (
                <div key={mv.id} className={`movement-card ${isDone ? 'done' : ''}`}>
                  <label className="movement-row" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={isDone} onChange={() => toggle(mv.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{mv.name}</div>
                      <div className="muted-row" style={{ marginTop: 2 }}>
                        {mv.sets} × {mv.reps_or_time}{mv.load ? ` · ${mv.load}` : ''}
                      </div>
                      <div style={{ fontSize: '0.85rem', marginTop: 4, lineHeight: 1.45 }}>{mv.cue}</div>
                      {(mv.target || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {mv.target.map((t) => <span key={t} className="tag-chip">{t}</span>)}
                        </div>
                      )}
                      {sec !== null && <MovementTimer seconds={sec} />}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="tight-card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            RPE
            <input type="number" min="1" max="10" value={rpe} onChange={(e) => setRpe(e.target.value)}
              style={{ width: 56, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }} />
          </label>
        </div>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 10, border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem' }}
        />
        <button onClick={markComplete} className="btn-primary" style={{ marginTop: 12, width: '100%' }}>
          Mark session complete
        </button>
        {savedMsg && <div className="muted-row" style={{ marginTop: 8, textAlign: 'center' }}>{savedMsg}</div>}
      </div>
    </div>
  );
}

// ---------- Day session card -----------------------------------------------

function ActiveModifiers({ block, weekNumber }) {
  const items = (block.modifiers || []).filter(
    (m) => !m.active_weeks || m.active_weeks.length === 0 || m.active_weeks.includes(weekNumber)
  );
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="tight-card" style={{ marginTop: 14 }}>
      <button onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{open ? '▾' : '▸'}</span>
        Modifiers ({items.length})
      </button>
      {open && (
        <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: '0.85rem', lineHeight: 1.55 }}>
          {items.map((m, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              <strong style={{ textTransform: 'capitalize' }}>{m.type.replace('_', ' ')}.</strong> {m.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DaySessionCard({ day, onPickFlex }) {
  if (!day) return null;
  if (day.kind === 'flex') {
    return (
      <div className="tight-card hero">
        <div className="eyebrow">Today</div>
        <div className="heading-serif" style={{ fontSize: '1.6rem', marginTop: 2 }}>{kindLabel(day)}</div>
        {day.notes && <div className="muted-row" style={{ marginTop: 6 }}>{day.notes}</div>}
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          {(day.options || []).map((opt, i) => (
            <button key={i} onClick={() => onPickFlex(opt)} className="tight-card"
              style={{ textAlign: 'left', cursor: 'pointer', padding: 12, border: '1px solid var(--border)' }}>
              <span className={`kind-chip ${opt.kind}`}>{opt.kind}</span>
              <div style={{ marginTop: 6, fontSize: '0.92rem' }}>{kindLabel(opt)}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tight-card hero">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="eyebrow">Today</div>
        <span className={`kind-chip ${day.kind}`}>{day.kind}</span>
      </div>
      <div className="heading-serif" style={{ fontSize: '1.6rem', marginTop: 4, lineHeight: 1.2 }}>{kindLabel(day)}</div>
      {day.kind === 'strength' && day.focus && day.focus.includes('—') && (
        <div className="muted-row" style={{ marginTop: 4 }}>{day.focus.split('—').slice(1).join('—').trim()}</div>
      )}
      {day.rpe_target && (
        <div style={{ marginTop: 10, fontWeight: 600, fontSize: '0.92rem' }}>{day.rpe_target}</div>
      )}
      {day.notes && (
        <div className="muted-row" style={{ marginTop: 6, lineHeight: 1.55 }}>{day.notes}</div>
      )}

      {day.kind === 'strength' && (day.route_to === 'macrofactor' || day.route_to === 'workouts') && (
        <button
          onClick={() => openExternal('x-apple-fitness://', 'https://apps.apple.com/app/fitness/id1208224953')}
          className="btn-primary" style={{ marginTop: 14, width: '100%' }}>
          Open in Workouts
        </button>
      )}
      {day.kind === 'run' && day.route_to === 'runna' && (
        <button
          onClick={() => openExternal('runna://open', 'https://runna.app.link/open')}
          className="btn-primary" style={{ marginTop: 14, width: '100%' }}>
          Open in Runna
        </button>
      )}
      {day.kind === 'sport' && day.cap_check && (
        <div className="muted-row" style={{ marginTop: 10, padding: 10, background: 'var(--bg)', borderRadius: 10, fontSize: '0.82rem' }}>
          ⚠ Check sport ceiling for the week.
        </div>
      )}
      {day.kind === 'rest' && (
        <div className="muted-row" style={{ marginTop: 10 }}>Rest day. Sleep, eat, walk.</div>
      )}
    </div>
  );
}

// ---------- Day View -------------------------------------------------------

function DayView() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const date = useMemo(() => {
    if (!dateParam) return new Date();
    const [y, m, d] = dateParam.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [dateParam]);

  const [state, setState] = useState({ loading: true, dayType: null, block: null, week: 1, phase: null });
  const [flexPick, setFlexPick] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getTodayDayType(date);
        if (!cancelled) setState({ loading: false, ...r });
      } catch (e) {
        console.error(e);
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [dateParam, date]);

  if (state.loading) {
    return (<><StickyHeader title="Workout" /><div style={{ padding: 16 }} className="muted-row">Loading…</div></>);
  }
  if (!state.block) {
    return (<><StickyHeader title="Workout" /><div style={{ padding: 16 }}>No active block. Run the seed migration.</div></>);
  }

  const day = flexPick || state.dayType;
  const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowWeek = getWeekNumber(state.block, tomorrow);
  const tomorrowPhase = getPhaseForWeek(state.block, tomorrowWeek);
  const tomorrowDay = resolveDayForPhase(state.block.weekly_template[weekdayKey(tomorrow)], tomorrowPhase.name);

  return (
    <>
      <StickyHeader title="Workout" />
      <div style={{ padding: '4px 16px 24px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.4rem', lineHeight: 1.15 }}>{fmtDate(date)}</div>
          <div className="muted-row" style={{ marginTop: 2 }}>
            {state.block.name.split('—')[0].trim()} · Week {state.week}/12 · <span style={{ textTransform: 'capitalize' }}>{state.phase.name}</span>
          </div>
        </div>

        <RehabDayCard date={date} day={day} block={state.block} />

        <DaySessionCard day={day} onPickFlex={setFlexPick} />

        {day?.kind === 'mobility' && day.route_to === 'internal' && (
          <MobilityRenderer sessionId={day.session_id} />
        )}

        <ActiveModifiers block={state.block} weekNumber={state.week} />

        {tomorrowDay && (
          <div className="muted-row" style={{ marginTop: 14, fontSize: '0.82rem' }}>
            Tomorrow · {kindLabel(tomorrowDay)}{tomorrowDay.rpe_target ? ` · ${tomorrowDay.rpe_target}` : ''}
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          <Link to="/workout/week" className="btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>Week</Link>
          <Link to="/workout/block" className="btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>Block</Link>
        </div>
      </div>
    </>
  );
}

// ---------- Week View -------------------------------------------------------

function WeekView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [block, setBlock] = useState(null);
  useEffect(() => { getActiveBlock().then(setBlock).catch(console.error); }, []);

  if (!block) {
    return (<><StickyHeader title="Week" back="/workout" /><div style={{ padding: 16 }} className="muted-row">Loading…</div></>);
  }

  const currentWeek = getWeekNumber(block, new Date());
  const week = Number(params.get('week')) || currentWeek;
  const { phase, days } = resolveWeek(block, week);
  const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const todayKey = weekdayKey(new Date());
  const isCurrentWeek = week === currentWeek;

  const setWeek = (n) => {
    const p = new URLSearchParams(params); p.set('week', String(n)); setParams(p);
  };

  const goToDay = (weekday) => {
    const d = dateForWeekday(block, week, weekday);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    navigate(`/workout?date=${iso}`);
  };

  return (
    <>
      <StickyHeader title="Week" back="/workout" />
      <div style={{ padding: '4px 16px 24px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <div className="heading-serif" style={{ fontSize: '1.3rem' }}>Week {week} <span style={{ color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.9rem' }}>of 12</span></div>
            <div className="muted-row" style={{ textTransform: 'capitalize' }}>{phase.name} phase</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setWeek(Math.max(1, week - 1))} className="btn-ghost" disabled={week <= 1}>‹</button>
            <button onClick={() => setWeek(Math.min(12, week + 1))} className="btn-ghost" disabled={week >= 12}>›</button>
          </div>
        </div>

        <RehabWeekRow block={block} week={week} />

        <div className="day-grid" style={{ marginTop: 14 }}>
          {order.map((wd) => {
            const day = days[wd];
            const d = dateForWeekday(block, week, wd);
            const isToday = isCurrentWeek && wd === todayKey;
            return (
              <div key={wd} className={`day-cell ${isToday ? 'today' : ''}`} onClick={() => goToDay(wd)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="day-letter">{wd[0].toUpperCase()}{wd.slice(1, 3)}</span>
                  <span className="day-date">{fmtShort(d)}</span>
                </div>
                <span className={`kind-chip ${day?.kind || 'rest'}`}>{day?.kind || 'rest'}</span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35, marginTop: 'auto' }}>
                  {day?.kind === 'strength' && day.focus ? day.focus.split('—').slice(1).join('—').trim() || day.focus : ''}
                  {day?.kind === 'run' && day.quality}
                  {day?.kind === 'mobility' && 'Wed corrective'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------- Block View ------------------------------------------------------

function BlockView() {
  const [block, setBlock] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  useEffect(() => { getActiveBlock().then(setBlock).catch(console.error); }, []);
  if (!block) return (<><StickyHeader title="Block" back="/workout" /><div style={{ padding: 16 }} className="muted-row">Loading…</div></>);

  const currentWeek = getWeekNumber(block, new Date());
  const totalWeeks = Math.max(...block.phases.flatMap((p) => p.weeks));
  const weekArr = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const testByWeek = {};
  for (const t of (block.test_dates || [])) {
    const w = getWeekNumber(block, new Date(t.date));
    if (!testByWeek[w]) testByWeek[w] = [];
    testByWeek[w].push(t);
  }

  const { goals, modifiers = [], deload_weeks = [] } = block;

  return (
    <>
      <StickyHeader title="Block" back="/workout" />
      <div style={{ padding: '4px 16px 24px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 14 }}>
          <div className="heading-serif" style={{ fontSize: '1.5rem', lineHeight: 1.15 }}>{block.name}</div>
          <div className="muted-row" style={{ marginTop: 4 }}>
            {block.start_date} → {block.end_date} · primary <strong style={{ color: 'var(--text)' }}>{block.primary_domain}</strong> · Week {currentWeek}/{totalWeeks}
          </div>
        </div>

        <div className="tight-card hero" style={{ marginBottom: 10 }}>
          <div className="eyebrow">A · Outcome</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{goals.a.statement}</div>
          <div className="muted-row" style={{ marginTop: 6, lineHeight: 1.5 }}>{goals.a.metric}</div>
          <div className="muted-row" style={{ marginTop: 4, fontSize: '0.75rem' }}>by {goals.a.deadline}</div>
        </div>
        <div className="tight-card" style={{ marginBottom: 10 }}>
          <div className="eyebrow">B · Process</div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: '0.88rem', lineHeight: 1.55 }}>
            {goals.b.map((g, i) => (
              <li key={i}><strong>{g.statement}</strong><br /><span className="muted-row">{g.metric}</span></li>
            ))}
          </ul>
        </div>
        <div className="tight-card">
          <div className="eyebrow">C · Stretch</div>
          <div style={{ marginTop: 6, fontSize: '0.88rem', lineHeight: 1.55 }}>{goals.c.statement}</div>
        </div>

        <div className="section-title"><h3>Phase timeline</h3></div>
        <div className="phase-bar">
          {weekArr.map((w) => {
            const ph = getPhaseForWeek(block, w);
            const isCurrent = w === currentWeek;
            const isDeload = deload_weeks.includes(w);
            const tests = testByWeek[w];
            return (
              <button key={w}
                onClick={() => setExpandedWeek(expandedWeek === w ? null : w)}
                title={`${ph.name}${tests ? ' · ' + tests.map(t=>t.what).join('; ') : ''}`}
                className={`phase-cell ${ph.name} ${isDeload ? 'deload' : ''} ${isCurrent ? 'current' : ''}`}>
                {w}
                {tests && <span className="star">★</span>}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>★ test</span>
          <span>diagonal = deload</span>
          {block.phases.map((p) => (
            <span key={p.name} style={{ textTransform: 'capitalize' }}>{p.name}</span>
          ))}
        </div>

        {expandedWeek && (() => {
          const { phase: ph, days } = resolveWeek(block, expandedWeek);
          return (
            <div className="tight-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Week {expandedWeek} · <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{ph.name}</span></div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 14, fontSize: '0.85rem', lineHeight: 1.55 }}>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d) => (
                  <li key={d} style={{ textTransform: 'capitalize' }}>
                    <strong>{d}.</strong> <span style={{ textTransform: 'none' }}>{kindLabel(days[d])}{days[d]?.rpe_target ? ` — ${days[d].rpe_target}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        <RehabBlockLadder block={block} />

        {(block.test_dates || []).length > 0 && (
          <>
            <div className="section-title"><h3>Test dates</h3></div>
            <ul style={{ paddingLeft: 16, fontSize: '0.88rem', lineHeight: 1.6 }}>
              {block.test_dates.map((t, i) => <li key={i}><strong>{t.date}.</strong> {t.what}</li>)}
            </ul>
          </>
        )}

        {modifiers.length > 0 && (
          <details style={{ marginTop: 14 }} className="tight-card">
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Modifiers ({modifiers.length})</summary>
            <ul style={{ paddingLeft: 16, marginTop: 8, fontSize: '0.85rem', lineHeight: 1.55 }}>
              {modifiers.map((m, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{m.type.replace('_',' ')}.</strong> {m.description}
                </li>
              ))}
            </ul>
          </details>
        )}

        {block.mid_block_checkin && (
          <div className="muted-row" style={{ marginTop: 14, fontSize: '0.8rem' }}>
            Mid-block check-in: <strong>{block.mid_block_checkin}</strong>
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Router export ---------------------------------------------------

export default function WorkoutFinder() {
  return (
    <Routes>
      <Route index element={<DayView />} />
      <Route path="week" element={<WeekView />} />
      <Route path="block" element={<BlockView />} />
    </Routes>
  );
}

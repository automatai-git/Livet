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

// ---------- shared bits -----------------------------------------------------

const KIND_COLOURS = {
  strength: '#c4763a',
  run:      '#3a6fb0',
  mobility: '#3a8a5a',
  sport:    '#7a4ea8',
  rest:     '#8a8a8a',
  flex:     '#5d5d5d',
};

const fmtDate = (d) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function kindLabel(day) {
  if (!day) return '—';
  switch (day.kind) {
    case 'strength': return `Strength — ${day.focus}`;
    case 'run':      return `Run — ${day.quality?.[0].toUpperCase() + day.quality?.slice(1)}`;
    case 'mobility': return 'Mobility';
    case 'sport':    return `Sport — ${day.activity}`;
    case 'rest':     return 'Rest';
    case 'flex':     return 'Flex — pick one';
    default:         return day.kind;
  }
}

function Chip({ text, bg, fg = '#fff' }) {
  return (
    <span style={{
      padding: '3px 10px', background: bg, color: fg, borderRadius: 999,
      fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function StickyHeader({ title, back = '/' }) {
  return (
    <div className="sticky-header">
      <div className="header-row">
        <Link to={back} className="back-home">← Back</Link>
        <h1 className="heading-serif">{title}</h1>
        <div style={{ width: 80 }} />
      </div>
    </div>
  );
}

function ExternalButton({ scheme, webUrl, label }) {
  return (
    <button
      onClick={() => openExternal(scheme, webUrl)}
      style={{
        background: 'var(--primary)', color: '#fff', border: 'none',
        padding: '12px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer',
        marginTop: 12,
      }}
    >
      {label}
    </button>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {m}:{s < 10 ? '0' + s : s}
      </div>
      <button onClick={() => setRunning(!running)} style={timerBtn}>
        {running ? 'Pause' : 'Start'}
      </button>
      <button onClick={() => { setRunning(false); setLeft(seconds); }} style={timerBtnGhost}>Reset</button>
    </div>
  );
}
const timerBtn = { background: 'var(--primary)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const timerBtnGhost = { background: 'transparent', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' };

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

  if (!session) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading mobility session…</div>;

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
      setSavedMsg('Logged. Nice work.');
      const k = await getMobilityStreak(sessionId);
      setStreak(k);
    } catch (e) {
      setSavedMsg('Save failed — check connection.');
      console.error(e);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="heading-serif" style={{ margin: 0 }}>{session.name}</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          ~{session.duration_min} min · streak: {streak} wk{streak === 1 ? '' : 's'}
        </div>
      </div>
      {(session.prerequisites || []).length > 0 && (
        <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {session.prerequisites.join(' ')}
        </div>
      )}

      {(session.blocks || []).map((blk) => (
        <section key={blk.name} style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0 }}>{blk.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{blk.duration_min} min</span>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {blk.movements.map((mv) => {
              const sec = parseDurationSeconds(mv.reps_or_time);
              const isDone = done.has(mv.id);
              return (
                <div key={mv.id} className="app-card" style={{
                  padding: 14, borderLeft: `4px solid ${isDone ? 'var(--success, #3a8a5a)' : 'var(--primary)'}`,
                }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={isDone} onChange={() => toggle(mv.id)}
                      style={{ marginTop: 4, width: 20, height: 20 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{mv.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {mv.sets} × {mv.reps_or_time}{mv.load ? ` · ${mv.load}` : ''}
                      </div>
                      <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{mv.cue}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {(mv.target || []).map((t) => (
                          <Chip key={t} text={t} bg="var(--bg)" fg="var(--text)" />
                        ))}
                      </div>
                      {sec !== null && <MovementTimer seconds={sec} />}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="app-card" style={{ padding: 14, marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>RPE (1-10)
            <input type="number" min="1" max="10" value={rpe} onChange={(e) => setRpe(e.target.value)}
                   style={{ marginLeft: 6, width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)' }} />
          </label>
        </div>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          style={{ width: '100%', marginTop: 10, padding: 8, borderRadius: 8, border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit' }}
        />
        <button
          onClick={markComplete}
          style={{ marginTop: 12, background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Mark session complete
        </button>
        {savedMsg && <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>{savedMsg}</div>}
      </div>
    </div>
  );
}

// ---------- Day session card ------------------------------------------------

function ActiveModifiers({ block, weekNumber }) {
  const items = (block.modifiers || []).filter(
    (m) => !m.active_weeks || m.active_weeks.length === 0 || m.active_weeks.includes(weekNumber)
  );
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="app-card" style={{ padding: 14, marginTop: 16 }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
        {open ? '▾' : '▸'} Active modifiers ({items.length})
      </button>
      {open && (
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {items.map((m, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <strong style={{ textTransform: 'capitalize' }}>{m.type.replace('_', ' ')}:</strong> {m.description}
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
      <div className="app-card" style={{ padding: 18 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{kindLabel(day)}</div>
        {day.notes && <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>{day.notes}</div>}
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {(day.options || []).map((opt, i) => (
            <button key={i} onClick={() => onPickFlex(opt)} className="app-card"
              style={{ textAlign: 'left', padding: 12, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <Chip text={opt.kind} bg={KIND_COLOURS[opt.kind] || '#555'} />
              <div style={{ marginTop: 6 }}>{kindLabel(opt)}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-card" style={{ padding: 18 }}>
      <Chip text={day.kind} bg={KIND_COLOURS[day.kind] || '#555'} />
      <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 8 }}>{kindLabel(day)}</div>
      {day.rpe_target && (
        <div style={{ marginTop: 6, fontWeight: 600 }}>{day.rpe_target}</div>
      )}
      {day.notes && (
        <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>{day.notes}</div>
      )}

      {day.kind === 'strength' && day.route_to === 'macrofactor' && (
        <ExternalButton scheme="macrofactor://" webUrl="https://app.macrofactorapp.com/" label="Open in MacroFactor" />
      )}
      {day.kind === 'run' && day.route_to === 'runna' && (
        <ExternalButton scheme="runna://" webUrl="https://app.runna.com/" label="Open in Runna" />
      )}
      {day.kind === 'sport' && day.cap_check && (
        <div style={{ marginTop: 12, padding: 10, background: 'var(--bg)', borderRadius: 8 }}>
          ⚠️ Check your sport ceiling for the week.
        </div>
      )}
      {day.kind === 'rest' && (
        <div style={{ marginTop: 10, color: 'var(--text-muted)' }}>Rest day. Sleep, eat, walk.</div>
      )}
    </div>
  );
}

// ---------- Day View --------------------------------------------------------

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
    return (
      <>
        <StickyHeader title="Workout" />
        <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>
      </>
    );
  }
  if (!state.block) {
    return (
      <>
        <StickyHeader title="Workout" />
        <div style={{ padding: 20 }}>No active block. Run the Block 4 seed migration.</div>
      </>
    );
  }

  const day = flexPick || state.dayType;
  const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowWeek = getWeekNumber(state.block, tomorrow);
  const tomorrowPhase = getPhaseForWeek(state.block, tomorrowWeek);
  const tomorrowBase = state.block.weekly_template[weekdayKey(tomorrow)];
  const tomorrowDay = resolveDayForPhase(tomorrowBase, tomorrowPhase.name);

  return (
    <>
      <StickyHeader title="Workout" />
      <div style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>Today, {fmtDate(date)}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {state.block.name} · Week {state.week} of 12 · {state.phase.name} phase
        </div>

        <div style={{ marginTop: 16 }}>
          <DaySessionCard day={day} onPickFlex={setFlexPick} />
        </div>

        {day?.kind === 'mobility' && day.route_to === 'internal' && (
          <MobilityRenderer sessionId={day.session_id} />
        )}

        <ActiveModifiers block={state.block} weekNumber={state.week} />

        {tomorrowDay && (
          <div style={{ marginTop: 18, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Tomorrow: {kindLabel(tomorrowDay)}{tomorrowDay.rpe_target ? ` (${tomorrowDay.rpe_target})` : ''}
          </div>
        )}

        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <Link to="/workout/week" style={subNavBtn}>Week view →</Link>
          <Link to="/workout/block" style={subNavBtn}>Block view →</Link>
        </div>
      </div>
    </>
  );
}

const subNavBtn = {
  background: 'var(--card)', border: '1px solid var(--border)',
  padding: '10px 14px', borderRadius: 10, color: 'var(--text)', textDecoration: 'none', fontWeight: 600,
};

// ---------- Week View -------------------------------------------------------

function WeekView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [block, setBlock] = useState(null);
  useEffect(() => { getActiveBlock().then(setBlock).catch(console.error); }, []);

  if (!block) {
    return (<><StickyHeader title="Week" back="/workout" /><div style={{ padding: 20 }}>Loading…</div></>);
  }

  const currentWeek = getWeekNumber(block, new Date());
  const week = Number(params.get('week')) || currentWeek;
  const { phase, days } = resolveWeek(block, week);
  const order = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const letters = { monday:'M', tuesday:'T', wednesday:'W', thursday:'T', friday:'F', saturday:'S', sunday:'S' };

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
      <div style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Week {week} of 12</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{phase.name} phase</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setWeek(Math.max(1, week - 1))} style={timerBtnGhost}>‹ Prev</button>
            <button onClick={() => setWeek(Math.min(12, week + 1))} style={timerBtnGhost}>Next ›</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 16 }}>
          {order.map((wd) => {
            const day = days[wd];
            const bg = KIND_COLOURS[day?.kind] || '#555';
            const stripe = day?.kind === 'flex' ? 'repeating-linear-gradient(45deg, #5d5d5d, #5d5d5d 6px, #888 6px, #888 12px)' : bg;
            return (
              <button key={wd} onClick={() => goToDay(wd)} className="app-card"
                style={{ cursor: 'pointer', padding: 12, textAlign: 'left', border: '1px solid var(--border)', background: 'var(--card)' }}>
                <div style={{ fontWeight: 700 }}>{letters[wd]} <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{wd}</span></div>
                <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: stripe, color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                  {kindLabel(day)}
                </div>
                {day?.rpe_target && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{day.rpe_target}</div>}
              </button>
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
  if (!block) return (<><StickyHeader title="Block" back="/workout" /><div style={{ padding: 20 }}>Loading…</div></>);

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
      <div style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
        <h2 className="heading-serif" style={{ margin: 0 }}>{block.name}</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          {block.start_date} → {block.end_date} · primary: <strong>{block.primary_domain}</strong> · Week {currentWeek} of {totalWeeks}
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <div className="app-card" style={{ padding: 16, borderLeft: '6px solid var(--primary)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>GOAL A — OUTCOME</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 4 }}>{goals.a.statement}</div>
            <div style={{ marginTop: 6, fontSize: '0.9rem' }}>{goals.a.metric}</div>
            <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {goals.a.deadline}</div>
          </div>
          <div className="app-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>GOAL B — PROCESS</div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {goals.b.map((g, i) => (
                <li key={i}><strong>{g.statement}</strong> — <span style={{ color: 'var(--text-muted)' }}>{g.metric}</span></li>
              ))}
            </ul>
          </div>
          <div className="app-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>GOAL C — STRETCH</div>
            <div style={{ marginTop: 4 }}>{goals.c.statement}</div>
          </div>
        </div>

        <h3 style={{ marginTop: 22 }}>Phase timeline</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {weekArr.map((w) => {
            const ph = getPhaseForWeek(block, w);
            const isCurrent = w === currentWeek;
            const isDeload = deload_weeks.includes(w);
            const tests = testByWeek[w];
            const colour = {
              accumulation: '#3a8a5a', intensification: '#c4763a',
              realization: '#7a4ea8', deload: '#8a8a8a',
            }[ph.name] || '#555';
            return (
              <button key={w} onClick={() => setExpandedWeek(expandedWeek === w ? null : w)}
                title={`${ph.name}${tests ? ' · ' + tests.map(t=>t.what).join('; ') : ''}`}
                style={{
                  width: 38, height: 44, borderRadius: 6, border: isCurrent ? '2px solid var(--text)' : '1px solid var(--border)',
                  background: colour, color: '#fff', cursor: 'pointer', fontWeight: 700, position: 'relative',
                  outline: isDeload ? '2px dashed #fff' : 'none', outlineOffset: -4,
                }}>
                {w}
                {tests && <span style={{ position: 'absolute', top: 1, right: 3, fontSize: '0.6rem' }}>★</span>}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>★ test date</span>
          <span>dashed = deload</span>
          {block.phases.map((p) => (
            <span key={p.name}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: { accumulation:'#3a8a5a', intensification:'#c4763a', realization:'#7a4ea8', deload:'#8a8a8a' }[p.name], marginRight: 4 }} />{p.name}</span>
          ))}
        </div>

        {expandedWeek && (() => {
          const { phase, days } = resolveWeek(block, expandedWeek);
          return (
            <div className="app-card" style={{ padding: 14, marginTop: 14 }}>
              <div style={{ fontWeight: 700 }}>Week {expandedWeek} · {phase.name}</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d) => (
                  <li key={d} style={{ textTransform: 'capitalize' }}>
                    <strong>{d}:</strong> {kindLabel(days[d])}{days[d]?.rpe_target ? ` — ${days[d].rpe_target}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {(block.test_dates || []).length > 0 && (
          <>
            <h3 style={{ marginTop: 22 }}>Test dates</h3>
            <ul style={{ paddingLeft: 18 }}>
              {block.test_dates.map((t, i) => <li key={i}><strong>{t.date}:</strong> {t.what}</li>)}
            </ul>
          </>
        )}

        {modifiers.length > 0 && (
          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Modifiers ({modifiers.length})</summary>
            <ul style={{ paddingLeft: 18, marginTop: 8 }}>
              {modifiers.map((m, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{m.type.replace('_',' ')}:</strong> {m.description}
                </li>
              ))}
            </ul>
          </details>
        )}

        {block.mid_block_checkin && (
          <div style={{ marginTop: 18, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
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

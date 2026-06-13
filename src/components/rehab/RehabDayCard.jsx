// Day-view rehab card, pinned above the session card (brief §2).
// Shows the active phase's daily work with compliance checkboxes, today's
// pain rule, any test scheduled today, the gate-relevant signal inputs and
// the consecutive-clean-day counter. All gate state is recomputed from
// rehab_log on load — never advanced by calendar.

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SIGNAL_IDS,
  protocolAppliesToBlock,
  findBlockedMatches,
  testsOnDate,
  complianceByDay,
  dayKeyLocal,
} from '../../lib/rehab';
import useRehabState from './useRehabState';
import StatusChip from './StatusChip';

const PROVOKING_OPTIONS = ['rows', 'carries', 'pulldowns', 'run arm-swing', 'overhead-adjacent', 'other…'];

function EscalationBanner({ regression }) {
  return (
    <div className="rehab-banner" role="alert">
      <strong>Escalation active — progression stopped.</strong>
      <div style={{ marginTop: 4 }}>
        {regression.fired && (
          <div>
            Isometric regression rule fired ({regression.reason === 'spike'
              ? 'a session reached ≥4/10'
              : '≥2/10 three consecutive sessions'}).
          </div>
        )}
        Contact GP/physio. Review the checklist in the <Link to="/workout/block">Block view</Link>.
      </div>
    </div>
  );
}

function WorkChecklist({ title, items, doneMap, disabled, onToggle }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {items.map((w) => {
          const done = doneMap.get(w.exercise) === true;
          return (
            <label key={w.exercise} className={`movement-card ${done ? 'done' : ''}`} style={{ cursor: disabled ? 'not-allowed' : 'pointer', padding: '10px 12px' }}>
              <span className="movement-row">
                <input
                  type="checkbox"
                  checked={done}
                  disabled={disabled}
                  onChange={() => onToggle(w.exercise, !done)}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{w.exercise}</span>
                  <span className="muted-row" style={{ display: 'block', marginTop: 2 }}>
                    {[w.dose, w.intensity, w.frequency, w.progression].filter(Boolean).join(' · ')}
                  </span>
                  {w.notes && <span style={{ display: 'block', fontSize: '0.8rem', marginTop: 3, lineHeight: 1.45 }}>{w.notes}</span>}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SignalLogRow({ signal, lastToday, sessionContext, onLog }) {
  const [value, setValue] = useState('');
  const [settled, setSettled] = useState(false);
  const [stiff, setStiff] = useState(false);
  const [provoking, setProvoking] = useState('');
  const [provokingOther, setProvokingOther] = useState('');
  const [msg, setMsg] = useState('');

  const isIsometric = signal.id === SIGNAL_IDS.ISOMETRIC;
  const isNeck = signal.id === SIGNAL_IDS.NECK;

  const submit = async () => {
    const n = Number(value);
    if (value === '' || Number.isNaN(n) || n < 0 || n > 10) {
      setMsg('0–10');
      return;
    }
    const entry = {
      signal_id: signal.id,
      value: n,
      session_context: sessionContext || null,
      settled_within_2h: isIsometric && settled ? true : null,
      next_morning_stiff: isIsometric && stiff ? true : null,
      provoking_movement: isNeck
        ? (provoking === 'other…' ? (provokingOther.trim() || null) : provoking || null)
        : null,
    };
    try {
      setMsg('…');
      await onLog(entry);
      setValue(''); setSettled(false); setStiff(false); setMsg('Logged ✓');
    } catch {
      setMsg('Save failed');
    }
  };

  return (
    <div className="signal-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <label style={{ fontSize: '0.84rem', fontWeight: 600 }} htmlFor={`sig-${signal.id}`}>
          {signal.label}
        </label>
        {lastToday != null && (
          <span className="muted-row" style={{ marginLeft: 8 }}>today: {lastToday}</span>
        )}
        {(isIsometric || isNeck) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {isIsometric && (
              <>
                <label className="signal-extra">
                  <input type="checkbox" checked={settled} onChange={(e) => setSettled(e.target.checked)} /> settled &lt;2h
                </label>
                <label className="signal-extra">
                  <input type="checkbox" checked={stiff} onChange={(e) => setStiff(e.target.checked)} /> AM stiffness
                </label>
              </>
            )}
            {isNeck && (
              <>
                <select
                  aria-label="Provoking movement"
                  value={provoking}
                  onChange={(e) => setProvoking(e.target.value)}
                  className="signal-select"
                >
                  <option value="">provoking: none / unsure</option>
                  {PROVOKING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                {provoking === 'other…' && (
                  <input
                    type="text"
                    aria-label="Provoking movement (other)"
                    placeholder="which movement?"
                    value={provokingOther}
                    onChange={(e) => setProvokingOther(e.target.value)}
                    className="signal-text"
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <input
          id={`sig-${signal.id}`}
          type="number" min="0" max="10" inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="signal-num"
          aria-label={`${signal.label} value 0 to 10`}
        />
        <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: '0.78rem' }} onClick={submit}>Log</button>
        {msg && <span className="muted-row" aria-live="polite">{msg}</span>}
      </div>
    </div>
  );
}

function StreakDots({ count, target }) {
  return (
    <span className="streak-dots" aria-label={`${count} of ${target} clean days`}>
      {Array.from({ length: target }, (_, i) => (
        <span key={i} className={`streak-dot ${i < count ? 'on' : ''}`} />
      ))}
    </span>
  );
}

export default function RehabDayCard({ date, day, block }) {
  const rehab = useRehabState(date);
  const { protocol, evaluation, compliance, loading, todayKey, logSignal, toggleCompliance } = rehab;
  const [sessionContext, setSessionContext] = useState('');

  const applies = protocolAppliesToBlock(protocol, block);

  const phase = evaluation.activePhase;
  const testsToday = useMemo(() => testsOnDate(protocol, todayKey), [protocol, todayKey]);
  const doneToday = useMemo(
    () => complianceByDay(compliance).get(todayKey) || new Map(),
    [compliance, todayKey]
  );

  const blockedHits = useMemo(() => {
    if (day?.kind !== 'strength') return [];
    return findBlockedMatches(`${day.focus || ''} ${day.notes || ''}`, protocol);
  }, [day, protocol]);

  const dueSignals = useMemo(() => {
    const due = new Set([SIGNAL_IDS.RESTING]);
    const work = [...(phase?.dailyWork || []), ...(phase?.sessionWork || [])];
    if (evaluation.escalation || work.some((w) => w.logSignal === SIGNAL_IDS.ISOMETRIC)) due.add(SIGNAL_IDS.ISOMETRIC);
    if (day && day.kind !== 'rest') due.add(SIGNAL_IDS.NECK);
    if (testsToday.some((t) => t.kind === 'retest')) due.add(SIGNAL_IDS.CROSSBODY);
    return protocol.signals.filter((s) => due.has(s.id));
  }, [protocol, phase, day, testsToday, evaluation.escalation]);

  const otherSignals = protocol.signals.filter((s) => !dueSignals.includes(s));

  if (!applies) return null;

  const lastTodayFor = (signalId) => {
    const today = rehab.logs.filter(
      (l) => l.signal_id === signalId && dayKeyLocal(l.logged_at) === todayKey
    );
    return today.length ? Number(today[today.length - 1].value) : null;
  };

  const headerPhaseLabel = evaluation.escalation
    ? 'Held'
    : phase ? `Phase ${phase.id}` : 'Complete';

  return (
    <section
      className={`tight-card rehab-card ${evaluation.escalation ? 'escalated' : ''}`}
      aria-label={`Rehab — ${headerPhaseLabel}`}
      style={{ marginBottom: 14 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="eyebrow">Rehab — {headerPhaseLabel}</div>
        <StatusChip status={evaluation.escalation ? 'held' : phase ? 'active' : 'passed'} />
      </div>
      {phase && !evaluation.escalation && (
        <div className="heading-serif" style={{ fontSize: '1.2rem', marginTop: 2 }}>{phase.name}</div>
      )}
      <div className="muted-row" style={{ marginTop: 4 }}>{protocol.region}</div>

      {evaluation.escalation && <EscalationBanner regression={evaluation.regression} />}

      {loading && <div className="muted-row" style={{ marginTop: 10 }}>Loading rehab log…</div>}

      {/* Today's pain rule */}
      <div className="rehab-rule" style={{ marginTop: 10 }}>
        <strong>Pain rule.</strong> During: {protocol.painRules.duringSession}. After: {protocol.painRules.afterSession}.
      </div>

      {/* Scheduled test today */}
      {testsToday.map((t) => (
        <div key={t.label} className="rehab-test-chip">★ Scheduled today — {t.label}</div>
      ))}

      {/* Gate progress (data, not dates) */}
      {!evaluation.escalation && phase?.id === '2A' && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StreakDots count={Math.min(evaluation.streak, 3)} target={3} />
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{Math.min(evaluation.streak, 3)}/3 clean days</span>
          <span className="muted-row">exit gate: isometric ≤ 1 for 3 consecutive days</span>
        </div>
      )}
      {!evaluation.escalation && phase?.id === '2B' && (
        <div className="muted-row" style={{ marginTop: 10 }}>
          Exit gate: cross-body ≤ 1 at the {evaluation.gates.retestKey} retest.
        </div>
      )}

      {/* Daily + session work with compliance checkboxes */}
      {!evaluation.escalation && phase && (
        <>
          <WorkChecklist
            title="Daily work"
            items={phase.dailyWork}
            doneMap={doneToday}
            disabled={false}
            onToggle={(item, completed) =>
              toggleCompliance({ phaseId: phase.id, item, completed }).catch(() => {})}
          />
          {day?.kind === 'strength' && (
            <WorkChecklist
              title="Session work (strength day)"
              items={phase.sessionWork}
              doneMap={doneToday}
              disabled={false}
              onToggle={(item, completed) =>
                toggleCompliance({ phaseId: phase.id, item, completed }).catch(() => {})}
            />
          )}
        </>
      )}

      {/* Blocked-movement filter against today's strength program */}
      {blockedHits.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {blockedHits.map((m) => (
            <div key={m.blocked} className="blocked-row">
              <span className="blocked-badge">blocked</span>
              <span style={{ fontSize: '0.84rem' }}>
                {m.blocked}
                {m.substitution && <span className="muted-row"> → {m.substitution}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {day?.kind === 'strength' && (
        <details style={{ marginTop: 10 }}>
          <summary className="muted-row" style={{ cursor: 'pointer' }}>
            Blocked list ({protocol.blockedMovements.current.length}) + substitutions
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: '0.82rem', lineHeight: 1.6 }}>
            {protocol.blockedMovements.current.map((b) => {
              const sub = findBlockedMatches(b, protocol).find((m) => m.blocked === b)?.substitution;
              return <li key={b}>{b}{sub && <span className="muted-row"> → {sub}</span>}</li>;
            })}
          </ul>
        </details>
      )}

      {/* Signal logging */}
      <div style={{ marginTop: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Log signals</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {dueSignals.map((s) => (
            <SignalLogRow
              key={s.id}
              signal={s}
              lastToday={lastTodayFor(s.id)}
              sessionContext={sessionContext}
              onLog={logSignal}
            />
          ))}
        </div>
        {otherSignals.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary className="muted-row" style={{ cursor: 'pointer' }}>Log another signal</summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {otherSignals.map((s) => (
                <SignalLogRow
                  key={s.id}
                  signal={s}
                  lastToday={lastTodayFor(s.id)}
                  sessionContext={sessionContext}
                  onLog={logSignal}
                />
              ))}
            </div>
          </details>
        )}
        <input
          type="text"
          value={sessionContext}
          onChange={(e) => setSessionContext(e.target.value)}
          placeholder="Session context (optional — what preceded this?)"
          aria-label="Session context"
          className="signal-text"
          style={{ width: '100%', marginTop: 8 }}
        />
      </div>
    </section>
  );
}

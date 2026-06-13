// Block-view rehab ladder (brief §2): the four phases + sub-phase 2A/2B as a
// vertical ladder, each node showing its entry gate, exit gate and derived
// status (locked / active / passed / held). Also hosts the persistent
// escalation-trigger checklist, the checkpoint schedule, the neck-protocol
// panel with its provocation map, and the blocked/allowed movement reference.
// Phase windows from the JSON are projections for display only — status is
// always derived from logged data.

import React, { useMemo } from 'react';
import { SIGNAL_IDS, protocolAppliesToBlock } from '../../lib/rehab';
import useRehabState from './useRehabState';
import StatusChip from './StatusChip';

function GateLine({ label, gate }) {
  if (!gate) return null;
  if (typeof gate === 'string') {
    return <div className="muted-row" style={{ marginTop: 4 }}><strong style={{ color: 'var(--text)' }}>{label}.</strong> {gate}</div>;
  }
  return (
    <div className="muted-row" style={{ marginTop: 4, lineHeight: 1.5 }}>
      <strong style={{ color: 'var(--text)' }}>{label}.</strong> {gate.criterion}
      {gate.scheduledRetest && <> · retest {gate.scheduledRetest}</>}
      {gate.onFail && <div style={{ marginTop: 2 }}>on fail: {gate.onFail}</div>}
    </div>
  );
}

function WorkList({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div className="eyebrow">{title}</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: '0.84rem', lineHeight: 1.55 }}>
        {items.map((w) => (
          <li key={w.exercise} style={{ marginBottom: 3 }}>
            <strong>{w.exercise}</strong>
            {[w.dose, w.intensity, w.frequency, w.progression].filter(Boolean).map((x) => ` · ${x}`).join('')}
            {w.notes && <span className="muted-row"> — {w.notes}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseNode({ phase, status, isLast }) {
  const expanded = status === 'active';
  return (
    <li className={`ladder-node ${status}`}>
      <span className="ladder-rail" aria-hidden="true">
        <span className={`ladder-dot ${status}`} />
        {!isLast && <span className="ladder-line" />}
      </span>
      <div className="ladder-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Phase {phase.id} — {phase.name}</span>
          <StatusChip status={status} />
        </div>
        <div className="muted-row" style={{ marginTop: 2 }}>{phase.window} <span style={{ opacity: 0.8 }}>(projection — gates decide)</span></div>
        <GateLine label="Entry" gate={phase.entryGate} />
        <GateLine label="Exit" gate={phase.exitGate} />
        {phase.result && <div className="muted-row" style={{ marginTop: 4 }}>{phase.result}</div>}
        {phase.midPhaseTest && (
          <div className="muted-row" style={{ marginTop: 4 }}>
            <strong style={{ color: 'var(--text)' }}>Mid-phase test.</strong> {phase.midPhaseTest.name}, {phase.midPhaseTest.dose} —
            pass: {phase.midPhaseTest.pass}; fail: {phase.midPhaseTest.fail}
          </div>
        )}
        {expanded && (
          <>
            <WorkList title="Daily work" items={phase.dailyWork} />
            <WorkList title="Session work" items={phase.sessionWork} />
          </>
        )}
        {phase.exitAction && (
          <div className="muted-row" style={{ marginTop: 6 }}>
            <strong style={{ color: 'var(--text)' }}>Exit action.</strong> {phase.exitAction}
          </div>
        )}
      </div>
    </li>
  );
}

const REGRESSION_TRIGGER = 'isometric regressionRule fired';

function EscalationChecklist({ protocol, evaluation, escState, updateEscalation }) {
  const manualTriggers = protocol.escalationTriggers.filter((t) => t !== REGRESSION_TRIGGER);
  const neckTriggers = protocol.neckProtocol.escalation.map((t) => `neck: ${t}`);

  const toggle = (trigger) => {
    const checked = escState.checked.includes(trigger)
      ? escState.checked.filter((t) => t !== trigger)
      : [...escState.checked, trigger];
    updateEscalation({ ...escState, checked });
  };

  const ackRegression = () => {
    if (window.confirm('Clear the regression flag? Only do this after the episode has been reported/reviewed.')) {
      updateEscalation({ ...escState, regressionAckTs: new Date().toISOString() });
    }
  };

  const renderRow = (trigger, label) => (
    <label key={trigger} className="escalation-row">
      <input
        type="checkbox"
        checked={escState.checked.includes(trigger)}
        onChange={() => toggle(trigger)}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className={`tight-card ${evaluation.escalation ? 'escalated' : ''}`} style={{ marginTop: 12 }}>
      <div className="eyebrow">Escalation triggers</div>
      {evaluation.escalation && (
        <div className="rehab-banner" role="alert">
          <strong>Escalation active — all progression held.</strong>
          <div style={{ marginTop: 4 }}>Contact GP/physio before resuming the ladder.</div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
        {manualTriggers.map((t) => renderRow(t, t))}
        {/* Computed from rehab_log — not manually checkable */}
        <div className="escalation-row computed">
          <input type="checkbox" checked={evaluation.regression.fired} disabled readOnly aria-label={REGRESSION_TRIGGER} />
          <span>
            {REGRESSION_TRIGGER} <span className="muted-row">(computed from log)</span>
            {evaluation.regression.fired && (
              <button className="btn-ghost" style={{ marginLeft: 8, padding: '3px 8px', fontSize: '0.72rem' }} onClick={ackRegression}>
                Mark reviewed — clear
              </button>
            )}
            {!evaluation.regression.fired && escState.regressionAckTs && (
              <span className="muted-row"> cleared {new Date(escState.regressionAckTs).toLocaleDateString()}</span>
            )}
          </span>
        </div>
        <div className="eyebrow" style={{ marginTop: 8 }}>Neck (separate thread)</div>
        {protocol.neckProtocol.escalation.map((t, i) => renderRow(neckTriggers[i], t))}
      </div>
    </div>
  );
}

function NeckPanel({ protocol, logs }) {
  const provocationMap = useMemo(() => {
    const map = new Map();
    for (const l of logs.filter((x) => x.signal_id === SIGNAL_IDS.NECK)) {
      const key = l.provoking_movement || 'unspecified';
      const cur = map.get(key) || { count: 0, max: 0 };
      map.set(key, { count: cur.count + 1, max: Math.max(cur.max, Number(l.value)) });
    }
    return [...map.entries()];
  }, [logs]);

  return (
    <div className="tight-card" style={{ marginTop: 12 }}>
      <div className="eyebrow">Neck protocol — status: {protocol.neckProtocol.status}</div>
      <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: '0.84rem', lineHeight: 1.55 }}>
        {protocol.neckProtocol.rules.map((r) => <li key={r} style={{ marginBottom: 3 }}>{r}</li>)}
      </ul>
      {provocationMap.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="eyebrow">Provocation map (logged)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {provocationMap.map(([movement, { count, max }]) => (
              <span key={movement} className="tag-chip">{movement} ×{count} · max {max}/10</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RehabBlockLadder({ block }) {
  const rehab = useRehabState();
  const { protocol, evaluation, logs, escState, updateEscalation, loading } = rehab;

  if (!protocolAppliesToBlock(protocol, block)) return null;

  return (
    <>
      <div className="section-title">
        <h3>Rehab ladder</h3>
        <span className="muted-row">{protocol.region} · v{protocol.version}</span>
      </div>

      {loading && <div className="muted-row" style={{ marginBottom: 8 }}>Loading rehab log…</div>}

      <ol className="ladder" aria-label="Rehab phase ladder">
        {protocol.phases.map((phase, i) => (
          <PhaseNode
            key={phase.id}
            phase={phase}
            status={evaluation.statuses[phase.id]}
            isLast={i === protocol.phases.length - 1}
          />
        ))}
      </ol>

      <div className="muted-row" style={{ marginTop: 6, fontSize: '0.78rem' }}>
        {protocol.painRules.globalRule}. Physio booking opens {protocol.context.physioBookingOpens}.
      </div>

      <EscalationChecklist
        protocol={protocol}
        evaluation={evaluation}
        escState={escState}
        updateEscalation={updateEscalation}
      />

      {(protocol.checkpoints || []).length > 0 && (
        <div className="tight-card" style={{ marginTop: 12 }}>
          <div className="eyebrow">Checkpoints</div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: '0.84rem', lineHeight: 1.55 }}>
            {protocol.checkpoints.map((cp) => (
              <li key={cp.date} style={{ marginBottom: 3 }}>
                <strong>{cp.date}.</strong> {cp.report.join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <NeckPanel protocol={protocol} logs={logs} />

      <details className="tight-card" style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          Blocked ({protocol.blockedMovements.current.length}) & allowed movements
        </summary>
        <div className="eyebrow" style={{ marginTop: 10 }}>Blocked</div>
        <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: '0.82rem', lineHeight: 1.55 }}>
          {protocol.blockedMovements.current.map((b) => {
            const subKey = Object.keys(protocol.blockedMovements.substitutions)
              .find((k) => b.toLowerCase().startsWith(k.toLowerCase()));
            return (
              <li key={b}>
                {b}
                {subKey && <span className="muted-row"> → {protocol.blockedMovements.substitutions[subKey]}</span>}
              </li>
            );
          })}
        </ul>
        <div className="eyebrow" style={{ marginTop: 10 }}>Allowed</div>
        <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: '0.82rem', lineHeight: 1.55 }}>
          {protocol.allowedMovements.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </details>
    </>
  );
}

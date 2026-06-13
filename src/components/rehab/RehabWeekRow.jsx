// Week-view rehab strip (brief §2): one dot per day showing daily-work
// compliance, plus markers for scheduled tests (e.g. the June 26 cross-body
// retest). Dots derive from logged rehab_compliance rows — the phase each
// row was logged under supplies the denominator, so past weeks stay correct
// even after the athlete moves phases.

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dateForWeekday } from '../../lib/blocks';
import { protocolAppliesToBlock, testsOnDate, complianceByDay, dayKeyLocal } from '../../lib/rehab';
import useRehabState from './useRehabState';
import StatusChip from './StatusChip';

const ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function dotState({ dayMap, compliance, protocol, dayKey, todayKey }) {
  if (dayKey > todayKey) return 'future';
  const items = dayMap.get(dayKey);
  if (!items || items.size === 0) return 'none';
  const completed = [...items.values()].filter(Boolean).length;
  if (completed === 0) return 'none';
  // Denominator: the daily work of the phase the rows were logged under.
  const phaseId = [...compliance]
    .filter((r) => dayKeyLocal(r.logged_at) === dayKey)
    .map((r) => r.phase_id)
    .pop();
  const phase = protocol.phases.find((p) => p.id === phaseId);
  const expected = (phase?.dailyWork || phase?.sessionWork || []).length || items.size;
  return completed >= expected ? 'full' : 'partial';
}

export default function RehabWeekRow({ block, week }) {
  const navigate = useNavigate();
  const rehab = useRehabState();
  const { protocol, compliance, evaluation, todayKey } = rehab;

  const days = useMemo(
    () => ORDER.map((wd) => {
      const d = dateForWeekday(block, week, wd);
      return { wd, date: d, key: dayKeyLocal(d) };
    }),
    [block, week]
  );

  const dayMap = useMemo(() => complianceByDay(compliance), [compliance]);

  if (!protocolAppliesToBlock(protocol, block)) return null;

  const weekTests = days
    .flatMap(({ key, date }) => testsOnDate(protocol, key).map((t) => ({ ...t, key, date })));

  const goToDay = (d) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    navigate(`/workout?date=${iso}`);
  };

  return (
    <section
      className={`tight-card ${evaluation.escalation ? 'escalated' : ''}`}
      aria-label="Rehab week compliance"
      style={{ marginTop: 14, padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="eyebrow">
          Rehab {evaluation.activePhase ? `— Phase ${evaluation.activePhase.id}` : ''}
        </div>
        {evaluation.escalation && <StatusChip status="held" />}
      </div>
      <div className="rehab-week-grid" style={{ marginTop: 8 }}>
        {days.map(({ wd, date, key }) => {
          const state = dotState({ dayMap, compliance, protocol, dayKey: key, todayKey });
          const hasTest = testsOnDate(protocol, key).length > 0;
          const isToday = key === todayKey;
          return (
            <button
              key={wd}
              onClick={() => goToDay(date)}
              className={`rehab-week-cell ${isToday ? 'today' : ''}`}
              aria-label={`${wd}, compliance ${state}${hasTest ? ', test scheduled' : ''}`}
            >
              <span className="muted-row" style={{ fontSize: '0.66rem' }}>{wd[0].toUpperCase()}{wd[1]}</span>
              <span className={`compliance-dot ${state}`} />
              <span style={{ fontSize: '0.62rem', height: 12, color: 'var(--accent-decision)' }}>{hasTest ? '★' : ''}</span>
            </button>
          );
        })}
      </div>
      {weekTests.length > 0 && (
        <div className="muted-row" style={{ marginTop: 8, lineHeight: 1.5 }}>
          {weekTests.map((t) => (
            <div key={`${t.key}-${t.label}`}>
              ★ {t.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} — {t.label}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

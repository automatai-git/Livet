// Shared state for the rehab views (Day card, Week row, Block ladder).
// Loads the append-only logs, recomputes every gate from scratch via
// lib/rehab.evaluateProtocol on each load/change — no cached gate state —
// and exposes optimistic write helpers that revert on network failure.

import { useCallback, useEffect, useMemo, useState } from 'react';
import protocol from '../../data/rehabProtocol.json';
import { dayKeyLocal, evaluateProtocol } from '../../lib/rehab';
import {
  fetchRehabLogs,
  fetchRehabCompliance,
  insertRehabLog,
  insertRehabCompliance,
  getEscalationState,
  setEscalationState,
} from '../../services/rehabService';

export default function useRehabState(date = new Date()) {
  const [logs, setLogs] = useState(null); // null until first load resolves
  const [compliance, setCompliance] = useState([]);
  const [escState, setEscState] = useState(() => getEscalationState(protocol.protocolId));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [l, c] = await Promise.all([
        fetchRehabLogs(protocol.protocolId),
        fetchRehabCompliance(protocol.protocolId),
      ]);
      if (!cancelled) {
        setLogs(l);
        setCompliance(c);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const todayKey = dayKeyLocal(date);

  const evaluation = useMemo(
    () => evaluateProtocol(protocol, logs || [], {
      todayKey,
      checkedTriggers: escState.checked,
      regressionAckTs: escState.regressionAckTs,
    }),
    [logs, todayKey, escState]
  );

  /** Insert a rehab_log row, optimistically reflected in local state. */
  const logSignal = useCallback(async (entry) => {
    const optimistic = {
      ...entry,
      protocol_id: protocol.protocolId,
      logged_at: new Date().toISOString(),
      id: `optimistic-${Math.random().toString(36).slice(2)}`,
    };
    setLogs((prev) => [...(prev || []), optimistic]);
    try {
      const row = await insertRehabLog({ ...entry, protocol_id: protocol.protocolId });
      setLogs((prev) => (prev || []).map((l) => (l.id === optimistic.id ? row : l)));
    } catch (err) {
      setLogs((prev) => (prev || []).filter((l) => l.id !== optimistic.id));
      throw err;
    }
  }, []);

  /** Insert a rehab_compliance row (append-only; latest row wins per item/day). */
  const toggleCompliance = useCallback(async ({ phaseId, item, completed }) => {
    const optimistic = {
      protocol_id: protocol.protocolId,
      phase_id: phaseId,
      item,
      completed,
      logged_at: new Date().toISOString(),
      id: `optimistic-${Math.random().toString(36).slice(2)}`,
    };
    setCompliance((prev) => [...prev, optimistic]);
    try {
      const row = await insertRehabCompliance({
        protocol_id: protocol.protocolId,
        phase_id: phaseId,
        item,
        completed,
      });
      setCompliance((prev) => prev.map((r) => (r.id === optimistic.id ? row : r)));
    } catch (err) {
      setCompliance((prev) => prev.filter((r) => r.id !== optimistic.id));
      throw err;
    }
  }, []);

  const updateEscalation = useCallback((next) => {
    setEscalationState(protocol.protocolId, next);
    setEscState(next);
  }, []);

  return {
    protocol,
    loading: logs === null,
    logs: logs || [],
    compliance,
    escState,
    updateEscalation,
    evaluation,
    todayKey,
    logSignal,
    toggleCompliance,
  };
}

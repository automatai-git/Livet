// Service layer for the rehab module — the only file touching rehab_log and
// rehab_compliance (see input/rehab-schema.sql). Pages and components import
// from here, never from supabase directly.
//
// Both tables are append-only: signal entries and compliance toggles are
// inserted, never updated, so gate logic can always be recomputed from the
// full history (no cached gate state). Reads fall back to a localStorage
// snapshot so the workout views stay usable offline, matching lib/blocks.js.

import { supabase } from './supabase';

const LS_LOGS_PREFIX = 'rehab-log-cache::';
const LS_COMPLIANCE_PREFIX = 'rehab-compliance-cache::';
const LS_ESCALATION_PREFIX = 'rehab-escalation::';

function readCached(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCached(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export async function fetchRehabLogs(protocolId) {
  try {
    const { data, error } = await supabase
      .from('rehab_log')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('logged_at', { ascending: true });
    if (error) throw error;
    writeCached(LS_LOGS_PREFIX + protocolId, data || []);
    return data || [];
  } catch (err) {
    console.warn('[rehab] log fetch failed, using cache', err);
    return readCached(LS_LOGS_PREFIX + protocolId) || [];
  }
}

export async function insertRehabLog({
  protocol_id,
  signal_id,
  value,
  provoking_movement = null,
  session_context = null,
  settled_within_2h = null,
  next_morning_stiff = null,
}) {
  const { data, error } = await supabase
    .from('rehab_log')
    .insert({
      protocol_id,
      signal_id,
      value,
      provoking_movement,
      session_context,
      settled_within_2h,
      next_morning_stiff,
    })
    .select()
    .single();
  if (error) throw error;
  const cacheKey = LS_LOGS_PREFIX + protocol_id;
  writeCached(cacheKey, [...(readCached(cacheKey) || []), data]);
  return data;
}

export async function fetchRehabCompliance(protocolId) {
  try {
    const { data, error } = await supabase
      .from('rehab_compliance')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('logged_at', { ascending: true });
    if (error) throw error;
    writeCached(LS_COMPLIANCE_PREFIX + protocolId, data || []);
    return data || [];
  } catch (err) {
    console.warn('[rehab] compliance fetch failed, using cache', err);
    return readCached(LS_COMPLIANCE_PREFIX + protocolId) || [];
  }
}

export async function insertRehabCompliance({ protocol_id, phase_id, item, completed }) {
  const { data, error } = await supabase
    .from('rehab_compliance')
    .insert({ protocol_id, phase_id, item, completed })
    .select()
    .single();
  if (error) throw error;
  const cacheKey = LS_COMPLIANCE_PREFIX + protocol_id;
  writeCached(cacheKey, [...(readCached(cacheKey) || []), data]);
  return data;
}

// ---------- escalation checklist ---------------------------------------------
// User-asserted state (which triggers are checked, when the computed
// regression flag was last reviewed), not derived data — so it lives in
// localStorage rather than rehab_log. Shape:
//   { checked: string[], regressionAckTs: string|null }

export function getEscalationState(protocolId) {
  const state = readCached(LS_ESCALATION_PREFIX + protocolId);
  return {
    checked: Array.isArray(state?.checked) ? state.checked : [],
    regressionAckTs: state?.regressionAckTs || null,
  };
}

export function setEscalationState(protocolId, state) {
  writeCached(LS_ESCALATION_PREFIX + protocolId, {
    checked: state.checked || [],
    regressionAckTs: state.regressionAckTs || null,
  });
}

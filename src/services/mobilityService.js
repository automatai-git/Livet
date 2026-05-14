import { supabase } from './supabase';
import { trainingService } from './trainingService';

const OFFLINE_QUEUE_KEY = 'mobilitySessionQueue';
const WEEKS_PER_BLOCK = 12;

const todayISO = () => new Date().toISOString().split('T')[0];

const readQueue = () => {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); }
  catch { return []; }
};

const writeQueue = (q) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
};

export const mobilityService = {
  async getBlockWeek() {
    const startDate = await trainingService.getStartDate();
    const pos = trainingService.calculateProgramPosition(startDate);
    if (!pos || isNaN(pos.week)) return null;
    const block = Math.ceil(pos.week / WEEKS_PER_BLOCK);
    const blockWeek = ((pos.week - 1) % WEEKS_PER_BLOCK) + 1;
    return { block, week: blockWeek, absoluteWeek: pos.week };
  },

  async saveSession(session, setLogs) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');

      const pos = await this.getBlockWeek().catch(() => null);

      const { data: sessionRow, error: sessErr } = await supabase
        .from('mobility_sessions')
        .insert({
          ...session,
          user_id: user.id,
          block: pos?.block ?? null,
          week: pos?.week ?? null,
          date: session.date ?? todayISO(),
        })
        .select()
        .single();
      if (sessErr) throw sessErr;

      if (setLogs && setLogs.length > 0) {
        const logs = setLogs.map((l) => ({ ...l, session_id: sessionRow.id, user_id: user.id }));
        const { error: logErr } = await supabase.from('mobility_exercise_logs').insert(logs);
        if (logErr) throw logErr;
      }
      return { ok: true, sessionId: sessionRow.id };
    } catch (err) {
      console.warn('[mobilityService] save failed, queueing offline:', err?.message ?? err);
      const q = readQueue();
      q.push({ session, setLogs, queuedAt: Date.now() });
      writeQueue(q);
      return { ok: false, queued: true, error: err?.message ?? String(err) };
    }
  },

  async flushOfflineQueue() {
    const queue = readQueue();
    if (queue.length === 0) return { flushed: 0, remaining: 0 };
    const remaining = [];
    let flushed = 0;
    for (const item of queue) {
      const res = await this.saveSession(item.session, item.setLogs);
      if (res.ok) flushed += 1;
      else remaining.push(item);
    }
    writeQueue(remaining);
    return { flushed, remaining: remaining.length };
  },

  async getRecentSessions(days = 30) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const { data, error } = await supabase
        .from('mobility_sessions')
        .select('*')
        .gte('date', cutoff.toISOString().split('T')[0])
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[mobilityService] getRecentSessions failed:', err?.message ?? err);
      return [];
    }
  },

  async getLastWeightFor(exerciseName) {
    try {
      const { data, error } = await supabase
        .from('mobility_exercise_logs')
        .select('weight_kg')
        .eq('exercise_name', exerciseName)
        .not('weight_kg', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.weight_kg ?? null;
    } catch {
      return null;
    }
  },

  async getLastWeightsFor(exerciseNames) {
    if (!exerciseNames?.length) return {};
    const result = {};
    await Promise.all(
      exerciseNames.map(async (name) => {
        result[name] = await this.getLastWeightFor(name);
      })
    );
    return result;
  },

  async getWeeklyCount() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { count, error } = await supabase
        .from('mobility_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('date', cutoff.toISOString().split('T')[0])
        .neq('status', 'skipped');
      if (error) throw error;
      return count ?? 0;
    } catch {
      return 0;
    }
  },
};

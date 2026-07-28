import React, { useEffect, useMemo, useReducer, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3';
import { MOBILITY_DATA, DAYS } from '../data/mobilityData';
import { parseSets, uniqueTags } from '../lib/mobility';
import { mobilityService } from '../services/mobilityService';
import RoutineOverview from '../components/mobility/RoutineOverview';
import FocusMode from '../components/mobility/FocusMode';
import SessionSummary from '../components/mobility/SessionSummary';

const ACTIVE_SESSION_KEY = 'mobilitySession:active';
const todayISO = () => new Date().toISOString().split('T')[0];

// Scope selector shows the current week Monday-first (DAYS is Sunday-first
// because it's indexed by Date#getDay()).
const WEEK_DAYS = [...DAYS.slice(1), DAYS[0]];

const buildInitialSession = (routine) => ({
  status: 'in-progress',
  startedAt: Date.now(),
  finishedAt: null,
  currentExerciseIndex: 0,
  exercises: Object.fromEntries(
    routine.exercises.map((ex) => {
      const p = parseSets(ex.sets);
      return [
        ex.order,
        {
          skipped: false,
          sets: Array.from({ length: p.setCount }, () => ({
            completed: false,
            reps: null,
            holdSeconds: p.holdSeconds,
            weightKg: null,
            failed: false,
            note: null,
          })),
        },
      ];
    })
  ),
  notes: '',
});

const sessionReducer = (state, action) => {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;
    case 'START':
      return buildInitialSession(action.routine);
    case 'TOGGLE_SET': {
      const ex = state.exercises[action.order];
      if (!ex) return state;
      const sets = ex.sets.map((s, i) => {
        if (i !== action.setIndex) return s;
        const completed = !s.completed;
        const next = { ...s, completed };
        if (completed && next.reps == null && action.parsed?.repTarget != null) {
          next.reps = Array.isArray(action.parsed.repTarget) ? action.parsed.repTarget[1] : action.parsed.repTarget;
        }
        return next;
      });
      return { ...state, exercises: { ...state.exercises, [action.order]: { ...ex, sets } } };
    }
    case 'UPDATE_SET': {
      const ex = state.exercises[action.order];
      if (!ex) return state;
      const sets = ex.sets.map((s, i) => (i === action.setIndex ? { ...s, ...action.patch } : s));
      return { ...state, exercises: { ...state.exercises, [action.order]: { ...ex, sets } } };
    }
    case 'SKIP_EXERCISE': {
      const ex = state.exercises[action.order];
      if (!ex) return state;
      return {
        ...state,
        exercises: { ...state.exercises, [action.order]: { ...ex, skipped: true } },
      };
    }
    case 'NEXT_EXERCISE': {
      const next = Math.min(state.currentExerciseIndex + 1, action.max ?? state.currentExerciseIndex + 1);
      return { ...state, currentExerciseIndex: next };
    }
    case 'PREV_EXERCISE':
      return { ...state, currentExerciseIndex: Math.max(0, state.currentExerciseIndex - 1) };
    case 'GOTO_EXERCISE':
      return { ...state, currentExerciseIndex: action.index };
    case 'FINISH':
      return { ...state, status: 'finished', finishedAt: Date.now() };
    case 'UPDATE_NOTES':
      return { ...state, notes: action.notes };
    case 'RESET':
      return null;
    default:
      return state;
  }
};

const buildSetLogs = (routine, state) => {
  const logs = [];
  for (const ex of routine.exercises) {
    const exState = state.exercises[ex.order];
    if (!exState || exState.skipped) continue;
    const parsed = parseSets(ex.sets);
    exState.sets.forEach((set, i) => {
      if (!set.completed) return;
      logs.push({
        exercise_order: ex.order,
        exercise_name: ex.name,
        set_number: i + 1,
        reps: set.reps ?? null,
        hold_seconds: set.holdSeconds ?? null,
        weight_kg: set.weightKg ?? null,
        each_side: !!parsed.eachSide,
        side: null,
        failed: !!set.failed,
        note: set.note ?? null,
      });
    });
  }
  return logs;
};

const sessionStatus = (state) => {
  let any = false;
  let all = true;
  for (const key of Object.keys(state.exercises)) {
    const ex = state.exercises[key];
    const done = ex.sets.some((s) => s.completed);
    if (done) any = true;
    if (!done && !ex.skipped) all = false;
  }
  if (!any) return 'skipped';
  return all ? 'completed' : 'partial';
};

const Mobility = () => {
  const todayName = DAYS[new Date().getDay()];
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('day-pick');
  const [selectedDay, setSelectedDay] = useState(todayName);
  const [routineKey, setRoutineKey] = useState(null);
  const [sessionState, dispatch] = useReducer(sessionReducer, null);
  const [lastWeights, setLastWeights] = useState({});
  const [blockWeek, setBlockWeek] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hydratedOnce, setHydratedOnce] = useState(false);

  const routine = routineKey ? MOBILITY_DATA[selectedDay]?.routines?.[routineKey] : null;

  useEffect(() => {
    mobilityService.flushOfflineQueue().catch(() => {});
    mobilityService.getBlockWeek().then(setBlockWeek).catch(() => {});

    const saved = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    let restoredFromSession = false;
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.date === todayISO() && MOBILITY_DATA[data.dayName]?.routines?.[data.routineKey]) {
          setSelectedDay(data.dayName);
          setRoutineKey(data.routineKey);
          dispatch({ type: 'HYDRATE', state: data.state });
          setView(data.state.status === 'finished' ? 'summary' : 'focus');
          restoredFromSession = true;
        } else {
          sessionStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      } catch {
        sessionStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    }

    // Deep-link from Dashboard agenda: ?day=wednesday&routine=full-session.
    // An in-progress session always wins (don't drop unsaved progress).
    if (!restoredFromSession) {
      const qDay = searchParams.get('day');
      const qRoutine = searchParams.get('routine');
      if (qDay && qRoutine && MOBILITY_DATA[qDay]?.routines?.[qRoutine]) {
        setSelectedDay(qDay);
        setRoutineKey(qRoutine);
        setView('overview');
        prefetchLastWeights(MOBILITY_DATA[qDay].routines[qRoutine]);
        setSearchParams({}, { replace: true });
      }
    }

    setHydratedOnce(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedOnce) return;
    if (!sessionState || !routineKey || view === 'day-pick' || view === 'overview') return;
    sessionStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({
        date: todayISO(),
        dayName: selectedDay,
        routineKey,
        state: sessionState,
      })
    );
  }, [sessionState, routineKey, selectedDay, view, hydratedOnce]);

  const prefetchLastWeights = useCallback(async (rt) => {
    if (!rt) return;
    const names = rt.exercises
      .filter((ex) => ex.load && ex.load !== 'None' && !/bodyweight/i.test(ex.load))
      .map((ex) => ex.name);
    if (names.length === 0) {
      setLastWeights({});
      return;
    }
    const map = await mobilityService.getLastWeightsFor(names);
    setLastWeights(map);
  }, []);

  const handleSelectRoutine = (key) => {
    setRoutineKey(key);
    setView('overview');
    prefetchLastWeights(MOBILITY_DATA[selectedDay].routines[key]);
  };

  const handleStartRoutine = () => {
    if (!routine) return;
    dispatch({ type: 'START', routine });
    setView('focus');
  };

  const handleSkipToday = async () => {
    if (!routine) return;
    setSaving(true);
    await mobilityService.saveSession(
      {
        day_name: selectedDay,
        day_label: MOBILITY_DATA[selectedDay].name,
        routine_key: routineKey,
        routine_name: routine.name,
        status: 'skipped',
        duration_seconds: 0,
      },
      []
    );
    setSaving(false);
    setView('day-pick');
    setRoutineKey(null);
  };

  const handleExitFocus = () => {
    setView('overview');
  };

  const handleFinishRoutine = () => {
    dispatch({ type: 'FINISH' });
    setView('summary');
  };

  const guardedNext = useCallback(
    (action) => {
      if (action.type === 'NEXT_EXERCISE' && routine) {
        dispatch({ ...action, max: routine.exercises.length - 1 });
      } else {
        dispatch(action);
      }
    },
    [routine]
  );

  const handleSaveSession = async () => {
    if (!routine || !sessionState) return;
    setSaving(true);
    const status = sessionStatus(sessionState);
    const durationSec = sessionState.finishedAt && sessionState.startedAt
      ? Math.round((sessionState.finishedAt - sessionState.startedAt) / 1000)
      : 0;
    const setLogs = buildSetLogs(routine, sessionState);

    await mobilityService.saveSession(
      {
        day_name: selectedDay,
        day_label: MOBILITY_DATA[selectedDay].name,
        routine_key: routineKey,
        routine_name: routine.name,
        status,
        duration_seconds: durationSec,
        notes: sessionState.notes || null,
      },
      setLogs
    );
    setSaving(false);
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    dispatch({ type: 'RESET' });
    setView('day-pick');
    setRoutineKey(null);
  };

  const handleDiscardSession = () => {
    if (!window.confirm('Discard this session without saving?')) return;
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    dispatch({ type: 'RESET' });
    setView('day-pick');
    setRoutineKey(null);
  };

  const dayLabel = useMemo(() => MOBILITY_DATA[selectedDay]?.name ?? selectedDay, [selectedDay]);

  // AppShellV3 slots (day-pick view). Scope = 7 equal day cells for the
  // current week; hero = the day's routine; sticky action = Start session.
  const weekDates = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return WEEK_DAYS.map((day, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { day, date: d.getDate() };
    });
  }, []);

  const dayEntries = Object.entries(MOBILITY_DATA[selectedDay]?.routines ?? {});
  const firstRoutine = dayEntries[0]?.[1] ?? null;

  const scope = view === 'day-pick' ? (
    <div className="scope-row equal" role="tablist" aria-label="Day of week">
      {weekDates.map(({ day, date }) => (
        <ScopePill
          key={day}
          day
          on={selectedDay === day}
          today={day === todayName}
          onClick={() => setSelectedDay(day)}
          role="tab"
          aria-selected={selectedDay === day}
          aria-current={day === todayName ? 'date' : undefined}
          aria-label={`${day}${day === todayName ? ' (today)' : ''}`}
        >
          <span className="scope-day-letter">{day[0].toUpperCase()}</span>
          <span className="scope-day-date">{date}</span>
        </ScopePill>
      ))}
    </div>
  ) : undefined;

  const hero = view === 'day-pick' ? (
    firstRoutine ? (
      <HeroCard
        eyebrow={dayLabel}
        title={firstRoutine.name}
        meta={`${firstRoutine.exercises.length} exercises${blockWeek ? ` · Block ${blockWeek.block} · Week ${blockWeek.week}` : ''}`}
        chips={uniqueTags(firstRoutine)}
      />
    ) : (
      <HeroCard eyebrow={dayLabel} title="Rest day" meta={`Nothing scheduled for ${selectedDay}.`} />
    )
  ) : undefined;

  const action =
    view === 'day-pick' && dayEntries.length > 0
      ? { label: 'Start session', onClick: () => handleSelectRoutine(dayEntries[0][0]) }
      : view === 'overview' && routine
        ? { label: 'Start session', onClick: handleStartRoutine }
        : undefined;

  return (
    <AppShellV3
      app="mobility"
      maxWidth={760}
      hideTabBar={view === 'focus'}
      scope={scope}
      hero={hero}
      action={action}
    >
      {view === 'day-pick' && dayEntries.length > 0 && (
        <div className="routine-list">
          {dayEntries.map(([key, rot]) => (
            <button
              key={key}
              type="button"
              className="routine-list-card"
              onClick={() => handleSelectRoutine(key)}
            >
              <div>
                <div className="heading-serif routine-list-name">{rot.name}</div>
                <div className="muted-row routine-list-meta">
                  {rot.exercises.length} exercises
                </div>
              </div>
              <span className="routine-list-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}

      {view === 'overview' && routine && (
        <RoutineOverview
          dayLabel={dayLabel}
          routine={routine}
          blockWeek={blockWeek}
          onSkip={handleSkipToday}
          onBack={() => { setView('day-pick'); setRoutineKey(null); }}
        />
      )}

      {view === 'focus' && routine && sessionState && (
        <FocusMode
          routine={routine}
          state={sessionState}
          dispatch={guardedNext}
          lastWeights={lastWeights}
          blockWeek={blockWeek}
          onFinish={handleFinishRoutine}
          onExit={handleExitFocus}
        />
      )}

      {view === 'summary' && routine && sessionState && (
        <SessionSummary
          routine={routine}
          state={sessionState}
          lastWeights={lastWeights}
          saving={saving}
          onSave={handleSaveSession}
          onDiscard={handleDiscardSession}
        />
      )}
    </AppShellV3>
  );
};

export default Mobility;

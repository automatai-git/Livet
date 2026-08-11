import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { trainingService } from '../services/trainingService';
import { mobilityService } from '../services/mobilityService';
import { lifeTreeService } from '../services/lifeTreeService';
import { MOBILITY_DATA, DAYS as MOBILITY_DAYS } from '../data/mobilityData';
import { pickRoutineForTime } from '../lib/mobility';
import { LIFE_TREE } from '../data/lifeTreeData';
import { weekKey, isoWeekParts, rollUp } from '../lib/lifeTree';
import { getDayWindow, parseHM, windowFraction, minutesOfDay, hourLabels } from '../lib/dayWindow';
import { sortByUsage } from '../lib/appUsage';
import { APP_REGISTRY } from '../data/appRegistry';
import { propertyService } from '../services/propertyService';
import { goalService } from '../services/goalService';
import { crossedToday } from '../lib/propertySeen';
import { displayPrice, formatNokCompact, priceCut, VIEWING_THRESHOLD } from '../lib/property';
import { sprintProgress } from '../lib/goals';
import { ScoreChip } from '../components/property/ListingCard';
import AppIcon from '../components/AppIcon';
import TabBar from '../components/shell/TabBar';

// Nominal times pinning each agenda item to the day track. The apps don't
// schedule sessions yet, so these are the owner's chosen defaults.
const AGENDA_TIMES = { workout: '12:00', mobility: '15:00', dinner: '17:00' };

// On-dark pillar tints for the Life Tree summary dots.
const PILLAR_TINTS = { health: '#8FBF96', wealth: '#7FB2C4', happiness: '#DBA283' };

// Quiet fallback meta lines for apps without a live signal. Every registry
// route must resolve to a non-empty meta (v3.2 §2) — /menu, /mobility,
// /life, /property and /goals are computed live in metaFor.
const STATIC_META = {
  '/workout': 'Your training block',
  '/travel': 'Itineraries & satellite map',
  '/books': 'Theme clouds & read next',
  '/bucket': '425 lifetime experiences',
  '/colour': 'Outfit combinations',
  '/decision': 'Weighted choices',
  '/property': 'Finn.no watchlist',
  '/goals': 'Sprint & north star',
};

const registryFor = (route) => APP_REGISTRY.find((a) => a.route === route);

const Today = () => {
  const [agenda, setAgenda] = useState({ meal: null, workout: null, mobility: null, blockWeek: null, loading: true });
  const [streak, setStreak] = useState(null);
  const [dinnersPlanned, setDinnersPlanned] = useState(null);
  const [ticks, setTicks] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [propListings, setPropListings] = useState(propertyService.getCachedListings);

  const dayWindow = useMemo(() => getDayWindow(), []);
  const currentWeek = weekKey(now);

  // Keep the day track honest while the app sits open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchAgenda();
    lifeTreeService.getWeeks([currentWeek]).then(({ weeks }) => {
      setTicks(weeks[currentWeek] || {});
    });
    // Refresh the listings cache quietly so the moment card and the
    // Property meta line reflect today's scores (cache fallback offline).
    propertyService.getListings().then(({ listings }) => setPropListings(listings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgenda = async () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayName = days[today.getDay()];

    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dateStr = `${dd}.${mm}.${today.getFullYear()}`;

    // Mobility comes from local data; the pre/post routine picks by hour.
    const mobilityDay = MOBILITY_DAYS[today.getDay()];
    const mobilityRoutines = MOBILITY_DATA[mobilityDay]?.routines ?? {};
    const picked = pickRoutineForTime(mobilityRoutines, today.getHours());
    const mobility = picked
      ? { day: mobilityDay, routineKey: picked.key, name: picked.routine.name, count: picked.routine.exercises.length }
      : null;

    try {
      const startDate = await trainingService.getStartDate();
      const pos = trainingService.calculateProgramPosition(startDate);

      let workoutQuery = supabase.from('workouts').select('session_type, main_workout');
      if (pos && !isNaN(pos.week)) {
        workoutQuery = workoutQuery.eq('week_num', pos.week).eq('day_name', pos.dayName).maybeSingle();
      } else {
        workoutQuery = workoutQuery.eq('date', dateStr).maybeSingle();
      }

      const [mealRes, workoutRes, weekCount, blockWeek, menuRes] = await Promise.all([
        supabase.from('weekly_menu').select('meals(emoji, name)').eq('day_of_week', dayName).maybeSingle(),
        workoutQuery,
        mobilityService.getWeeklyCount().catch(() => 0),
        mobilityService.getBlockWeek().catch(() => null),
        supabase.from('weekly_menu').select('day_of_week, meals(name)'),
      ]);

      setAgenda({
        meal: mealRes?.data?.meals || null,
        workout: workoutRes?.data || null,
        mobility,
        blockWeek,
        loading: false,
      });
      setStreak(typeof weekCount === 'number' ? weekCount : 0);
      const rows = menuRes?.data;
      setDinnersPlanned(Array.isArray(rows) ? rows.filter((r) => r.meals).length : null);
    } catch (e) {
      console.error('Today fetchAgenda failed:', e);
      setAgenda({ meal: null, workout: null, mobility, blockWeek: null, loading: false });
      setStreak(0);
    }
  };

  // ----- agenda rows pinned to the day track -----
  const items = useMemo(() => {
    const list = [];
    if (agenda.mobility) {
      list.push({
        key: 'mobility',
        time: AGENDA_TIMES.mobility,
        label: 'Mobility',
        title: `${agenda.mobility.name} · ${agenda.mobility.count} exercises`,
        to: `/mobility?day=${agenda.mobility.day}&routine=${agenda.mobility.routineKey}`,
        ...registryFor('/mobility'),
      });
    } else {
      list.push({
        key: 'mobility', time: AGENDA_TIMES.mobility, label: 'Mobility',
        title: 'Rest day', to: '/mobility', empty: true, ...registryFor('/mobility'),
      });
    }
    const wk = agenda.blockWeek;
    list.push({
      key: 'workout',
      time: AGENDA_TIMES.workout,
      label: wk ? `Workout · Wk ${wk.week}/12` : 'Workout',
      title: agenda.workout ? `${agenda.workout.session_type}: ${agenda.workout.main_workout}` : 'Rest day',
      to: '/workout',
      empty: !agenda.workout,
      ...registryFor('/workout'),
    });
    list.push({
      key: 'dinner',
      time: AGENDA_TIMES.dinner,
      label: 'Dinner',
      title: agenda.meal ? agenda.meal.name : 'Not planned',
      to: '/menu',
      icon: 'menu',
      emoji: agenda.meal?.emoji || null,
      empty: !agenda.meal,
      tintBg: 'rgba(27,59,47,.06)',
      tintFg: '#1B3B2F',
      dotColor: '#C57B57',
    });
    return list
      .map((it) => ({ ...it, minutes: parseHM(it.time) }))
      .sort((a, b) => a.minutes - b.minutes);
  }, [agenda]);

  const nowMin = minutesOfDay(now);
  const upNextKey = useMemo(() => {
    const winEnd = parseHM(dayWindow.end);
    const candidate = items
      .filter((it) => !it.empty && it.minutes >= nowMin && it.minutes <= winEnd)
      .sort((a, b) => a.minutes - b.minutes)[0];
    return candidate?.key ?? null;
  }, [items, nowMin, dayWindow]);

  // ----- life tree summary -----
  const roll = useMemo(() => rollUp(LIFE_TREE, ticks), [ticks]);
  const root = roll[LIFE_TREE.id];
  const weakestPillar = useMemo(() => {
    const open = LIFE_TREE.children
      .map((p) => ({ pillar: p, ...roll[p.id] }))
      .filter((p) => !p.complete)
      .sort((a, b) => a.done / a.total - b.done / b.total);
    return open[0] ?? null;
  }, [roll]);
  const treeHint = weakestPillar
    ? `${weakestPillar.pillar.label} branch needs a tick`
    : 'All branches complete';

  // ----- property moment card (v3.2 §2): listings that crossed the
  // viewing threshold today, gone again tomorrow. -----
  const crossed = useMemo(() => crossedToday(propListings, now), [propListings, now]);
  const propActive = propListings.filter((l) => l.active !== false && l.user_state !== 'hidden');
  const propHot = propActive.filter((l) => (l.score ?? 0) >= VIEWING_THRESHOLD).length;
  const propUnscored = propActive.filter((l) => l.score == null).length;

  // ----- most used -----
  const mostUsed = useMemo(() => sortByUsage(APP_REGISTRY).slice(0, 3), []);
  const metaFor = (route) => {
    if (route === '/menu') return dinnersPlanned != null ? `${dinnersPlanned} of 7 dinners planned` : 'Plan the week’s dinners';
    if (route === '/mobility') return streak != null ? `${streak} of last 7 days` : 'Weekly mobility work';
    if (route === '/life') return treeHint;
    if (route === '/property' && propActive.length > 0) {
      return `${propHot} worth a viewing · ${propUnscored} awaiting score`;
    }
    if (route === '/goals') {
      const doc = goalService.getCachedDoc();
      if (doc?.items?.length) {
        const p = sprintProgress(doc.items);
        return `Sprint ${p.pct}% · ${p.total - p.done} open`;
      }
    }
    return STATIC_META[route] ?? '';
  };

  // ----- header bits -----
  const { week } = isoWeekParts(now);
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const elapsed = windowFraction(nowMin, dayWindow);

  return (
    <div className="tab-page">
      <header className="today-header">
        <div>
          <div className="eyebrow today-eyebrow">{dateLabel} · Week {week}</div>
          <h1 className="heading-serif page-display">Today<span className="display-dot">.</span></h1>
        </div>
        {streak != null && (
          <Link to="/mobility" className="streak-pill">
            <span className="streak-dot-mark" aria-hidden="true" />
            {streak}-day streak
          </Link>
        )}
      </header>

      <div className="day-track" aria-hidden="true">
        <div className="day-track-line">
          <div className="day-track-rail" />
          <div className="day-track-elapsed" style={{ width: `${elapsed * 100}%` }} />
          <div className="day-track-now" style={{ left: `${elapsed * 100}%` }} />
          {items.filter((it) => !it.empty).map((it) => (
            <div
              key={it.key}
              className="day-track-item"
              style={{ left: `${windowFraction(it.minutes, dayWindow) * 100}%`, borderColor: it.dotColor ?? it.tintFg }}
            />
          ))}
        </div>
        <div className="day-track-hours">
          {hourLabels(dayWindow).map((h, i) => <span key={i}>{h}</span>)}
        </div>
      </div>

      <div className="surface-card agenda-card">
        {items.map((it, i) => {
          const isNext = it.key === upNextKey;
          const past = it.minutes < nowMin && !isNext;
          return (
            <React.Fragment key={it.key}>
              {i > 0 && <div className="inset-divider" />}
              <Link to={it.to} className={`agenda-row${past ? ' past' : ''}`}>
                <div className="icon-chip lg" style={{ background: it.tintBg, color: it.tintFg }}>
                  {it.emoji
                    ? <span className="chip-emoji">{it.emoji}</span>
                    : <AppIcon name={it.icon} size={21} />}
                </div>
                <div className="agenda-row-body">
                  <div className="row-eyebrow" style={isNext ? { color: it.tintFg } : undefined}>
                    {isNext ? `Up next · ${it.time}` : `${it.label} · ${it.time}`}
                  </div>
                  <div className="row-title">{it.title}</div>
                </div>
                {isNext
                  ? <span className="ink-pill sm">Start</span>
                  : <AppIcon name="chev" size={16} className="row-chev" />}
              </Link>
            </React.Fragment>
          );
        })}
      </div>

      {crossed.length > 0 && (() => {
        const one = crossed.length === 1 ? crossed[0] : null;
        const cut = one ? priceCut(one.price_history) : null;
        return (
          <Link
            to={one ? `/property/${one.finnkode}` : '/property'}
            className="surface-card moment-card"
            style={{ '--moment-accent': 'var(--accent-property)' }}
          >
            <div className="moment-body">
              <div className="row-eyebrow moment-eyebrow">
                Crossed {VIEWING_THRESHOLD} today · Property
              </div>
              <div className="row-title">
                {one ? (one.heading ?? `Finn ${one.finnkode}`) : `${crossed.length} crossed ${VIEWING_THRESHOLD} today`}
              </div>
              <div className="row-meta ellipsis">
                {one
                  ? [formatNokCompact(displayPrice(one)), cut ? `price cut −${formatNokCompact(cut.delta)}` : null]
                    .filter(Boolean).join(' · ')
                  : crossed.map((l) => l.heading ?? l.finnkode).join(' · ')}
              </div>
            </div>
            {one && <ScoreChip listing={one} />}
          </Link>
        );
      })()}

      <Link to="/life" className="tree-summary-card">
        <div className="tree-summary-main">
          <div className="heading-serif tree-summary-title">Life Tree</div>
          <div className="tree-summary-hint">{treeHint}</div>
        </div>
        <div className="tree-summary-dots" aria-hidden="true">
          {LIFE_TREE.children.map((p) => {
            const r = roll[p.id];
            const ratio = r.total ? r.done / r.total : 0;
            return (
              <span
                key={p.id}
                style={{ background: PILLAR_TINTS[p.id] ?? '#8FBF96', opacity: r.complete ? 1 : 0.35 + 0.35 * ratio }}
              />
            );
          })}
        </div>
        <div className="tree-summary-frac">
          <span className="heading-serif">{root.done}</span>
          <span>/{root.total}</span>
        </div>
      </Link>

      <div className="section-head">
        <div className="eyebrow">Most used</div>
        <div className="section-hint">sorted by your use</div>
      </div>
      <div className="row-stack">
        {mostUsed.map((app) => (
          <Link key={app.route} to={app.route} className="mu-row">
            <div className="icon-chip md" style={{ background: app.tintBg, color: app.tintFg }}>
              <AppIcon name={app.icon} size={20} />
            </div>
            <div className="mu-row-body">
              <div className="row-title">{app.name}</div>
              <div className="row-meta">{metaFor(app.route)}</div>
            </div>
            <AppIcon name="chev" size={16} className="row-chev" />
          </Link>
        ))}
      </div>

      <TabBar />
    </div>
  );
};

export default Today;

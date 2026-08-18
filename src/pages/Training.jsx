import React, { useEffect, useMemo, useState } from 'react';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3';
import OfflineNote from '../components/feedback/OfflineNote';
import { trainingDataService } from '../services/trainingDataService';
import {
  DAY_LABELS,
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  osloDateParts,
  weekRangeOf,
  weekLabel,
  sessionsInRange,
  groupByDomain,
  blockWeekCount,
  blockWeekOf,
  buildBlockGrid,
  formatKm,
  sessionMeta,
  formatSleep,
  sparkPath,
  wellnessSeries,
  seriesLatest,
} from '../lib/training';

// Training: the read-only data dashboard over the NAS pipeline
// (training_sessions / training_wellness / training_blocks). The content
// apps (/workout, /mobility) are untouched — this screen only displays what
// intervals.icu and Hevy computed (HANDOVER-training-pipeline.md §1: no
// re-deriving of load metrics; grouping/max/mean for display only).

const VIEWS = [
  { id: 'uke', label: 'Uke' },
  { id: 'blokk', label: 'Blokk' },
  { id: 'trend', label: 'Trend' },
];

// Week compliance targets vs the block plan — dormant until the coach's
// Block 5 design supplies real numbers (handover §B3: "targets hardcoded
// from block config v1"). Shape when it lands: { run: 3, strength: 2,
// mobility: 1 }. null = render no compliance chips.
const WEEK_TARGETS = null;

const WaitingNote = ({ children }) => (
  <div className="training-waiting" role="status">
    {children || 'Venter på data fra NAS-pipeline.'}
  </div>
);

// Shared-scale multi-line chart for CTL/ATL (+ TSB = CTL − ATL, which is
// intervals.icu's own definition — arithmetic on their columns, not fitness
// modelling). Points are the session-snapshot series, evenly spaced.
const LoadChart = ({ sessions }) => {
  const pts = sessions
    .filter((s) => s.ctl != null || s.atl != null)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  if (pts.length < 2) {
    return <WaitingNote>Venter på data fra NAS-pipeline — CTL/ATL kommer med Strava-historikken.</WaitingNote>;
  }
  const W = 320;
  const H = 120;
  const PAD = 4;
  const ctl = pts.map((p) => p.ctl);
  const atl = pts.map((p) => p.atl);
  const tsb = pts.map((p) => (p.ctl != null && p.atl != null ? p.ctl - p.atl : null));
  const all = [...ctl, ...atl, ...tsb].filter((v) => v != null && Number.isFinite(v));
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const path = (vals) => vals
    .map((v, i) => (v == null ? null : `${x(i).toFixed(1)} ${y(v).toFixed(1)}`))
    .filter(Boolean)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`)
    .join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="training-load-chart" role="img" aria-label="CTL, ATL og TSB over tid">
        {min < 0 && max > 0 && (
          <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} className="zero" />
        )}
        <path d={path(tsb)} className="tsb" />
        <path d={path(atl)} className="atl" />
        <path d={path(ctl)} className="ctl" />
      </svg>
      <div className="training-legend">
        <span><i className="dot ctl" />CTL {seriesLatest(ctl)?.toFixed(0) ?? '–'}</span>
        <span><i className="dot atl" />ATL {seriesLatest(atl)?.toFixed(0) ?? '–'}</span>
        <span><i className="dot tsb" />TSB {seriesLatest(tsb)?.toFixed(0) ?? '–'}</span>
      </div>
    </div>
  );
};

const Spark = ({ values, unit, label, fmt = (v) => v }) => {
  const latest = seriesLatest(values);
  const path = sparkPath(values, 130, 34);
  return (
    <div className="training-spark surface-card">
      <div className="row-eyebrow">{label}</div>
      <div className="training-spark-value">
        {latest != null ? `${fmt(latest)}${unit ? ` ${unit}` : ''}` : '–'}
      </div>
      {path
        ? <svg viewBox="0 0 130 34" className="training-spark-line"><path d={path} /></svg>
        : <div className="training-spark-empty">venter på data</div>}
    </div>
  );
};

const Training = () => {
  const [data, setData] = useState(() => ({
    ...trainingDataService.getCached(),
    wellness: trainingDataService.getCachedWellness(),
  }));
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState('uke');

  useEffect(() => {
    let cancelled = false;
    trainingDataService.getTraining().then(({ offline: off, ...fetched }) => {
      if (cancelled) return;
      setData(fetched);
      setOffline(off);
    });
    return () => { cancelled = true; };
  }, []);

  const { sessions = [], blocks = [], wellness = [] } = data;
  const todayStr = osloDateParts(new Date())?.date;
  const activeBlock = useMemo(
    () => blocks.find((b) => b.status === 'active') || blocks[blocks.length - 1] || null,
    [blocks]
  );

  // ---------- hero: the current block ----------
  const totalWeeks = blockWeekCount(activeBlock);
  const currentBlockWeek = activeBlock && todayStr ? blockWeekOf(todayStr, activeBlock) : null;
  const daysToStart = activeBlock && todayStr && todayStr < activeBlock.start_date
    ? Math.round((new Date(activeBlock.start_date) - new Date(todayStr)) / 86400000)
    : 0;
  const daysToEnd = activeBlock?.end_date && todayStr && todayStr <= activeBlock.end_date
    ? Math.round((new Date(activeBlock.end_date) - new Date(todayStr)) / 86400000)
    : null;

  const hero = activeBlock ? (
    <HeroCard
      eyebrow={`Blokk ${activeBlock.block}${currentBlockWeek ? ` · uke ${currentBlockWeek} av ${totalWeeks}` : daysToStart > 0 ? ` · starter om ${daysToStart} ${daysToStart === 1 ? 'dag' : 'dager'}` : ''}`}
      title={activeBlock.phase || `Blokk ${activeBlock.block}`}
      meta={activeBlock.a_goal || undefined}
      chips={[
        DOMAIN_LABELS[activeBlock.primary_domain] ?? activeBlock.primary_domain,
        daysToEnd != null ? `${daysToEnd} dager igjen` : null,
      ].filter(Boolean)}
    />
  ) : (
    <HeroCard
      eyebrow="Treningsdata"
      title="Ingen aktiv blokk"
      meta="Venter på data fra NAS-pipeline."
    />
  );

  // ---------- Uke ----------
  // Current calendar week (Europe/Oslo, Mon–Sun). Pre-Block-5 rows carry no
  // block stamp, so the week view keys on the calendar, not `week`.
  const range = todayStr ? weekRangeOf(todayStr) : null;
  const weekSessions = range ? sessionsInRange(sessions, range) : [];
  const weekGroups = groupByDomain(weekSessions);

  // ---------- Blokk ----------
  const grid = activeBlock ? buildBlockGrid(sessions, activeBlock) : [];
  const stampedCount = grid.reduce(
    (n, w) => n + DOMAIN_ORDER.reduce((m, d) => m + w.counts[d], 0),
    0
  );
  const longRunSeries = grid.map((w) => (w.longestRunM != null ? w.longestRunM / 1000 : null));
  const mobilityTotal = grid.reduce((n, w) => n + w.mobilityCount, 0);

  // ---------- Trend ----------
  const hrvSeries = todayStr ? wellnessSeries(wellness, 'hrv', todayStr, 28) : [];
  const rhrSeries = todayStr ? wellnessSeries(wellness, 'resting_hr', todayStr, 28) : [];
  const sleepSeries = todayStr ? wellnessSeries(wellness, 'sleep_secs', todayStr, 14) : [];

  const nothingYet = sessions.length === 0 && blocks.length === 0;

  return (
    <AppShellV3
      app="training"
      scope={
        <div className="scope-row equal">
          {VIEWS.map((v) => (
            <ScopePill key={v.id} on={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </ScopePill>
          ))}
        </div>
      }
      hero={hero}
    >
      {nothingYet && <WaitingNote />}

      {!nothingYet && view === 'uke' && (
        <>
          <div className="training-section-head">
            <span className="row-eyebrow">Denne uken</span>
            {range && <span className="row-meta tnum">{weekLabel(range)}</span>}
          </div>
          {weekGroups.length === 0 && (
            <WaitingNote>Ingen økter registrert denne uken ennå.</WaitingNote>
          )}
          {weekGroups.map((group) => (
            <section key={group.domain} className="surface-card training-group">
              <div className="training-group-head">
                <span className="row-title sm">{group.label}</span>
                <span className="row-meta tnum">{group.sessions.length}</span>
              </div>
              {group.sessions.map((s) => {
                const parts = osloDateParts(s.start_time);
                const meta = sessionMeta(s);
                return (
                  <div key={s.source_id} className="training-session-row">
                    <span className="training-day tnum">{DAY_LABELS[parts?.isoDay] ?? ''}</span>
                    <div className="training-session-main">
                      <div className="row-title sm">{s.title || s.okt_type || DOMAIN_LABELS[s.domain]}</div>
                      {meta && <div className="row-meta tnum">{meta}</div>}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
          {WEEK_TARGETS != null && null /* compliance chips land with the Block 5 design */}
        </>
      )}

      {!nothingYet && view === 'blokk' && (
        <>
          {stampedCount === 0 && (
            <WaitingNote>
              Blokk-visningen fylles fra {activeBlock?.start_date ?? 'blokkstart'} — ingen økter er blokk-stemplet ennå.
            </WaitingNote>
          )}
          <section className="surface-card training-grid-card">
            <div className="row-eyebrow">Økter per uke</div>
            <div className="training-grid" role="img" aria-label="Økter per uke per domene">
              <div className="training-grid-row head">
                <span />
                {grid.map((w) => <span key={w.week} className="tnum">{w.week}</span>)}
              </div>
              {DOMAIN_ORDER.map((d) => (
                <div key={d} className="training-grid-row">
                  <span className="training-grid-label">{DOMAIN_LABELS[d]}</span>
                  {grid.map((w) => (
                    <span
                      key={w.week}
                      className={`training-grid-cell${w.counts[d] > 0 ? ' on' : ''}`}
                      style={w.counts[d] > 0 ? { opacity: Math.min(1, 0.35 + w.counts[d] * 0.22) } : undefined}
                    >
                      {w.counts[d] > 0 ? w.counts[d] : ''}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>
          <section className="surface-card training-grid-card">
            <div className="row-eyebrow">Lengste løpetur per uke</div>
            {sparkPath(longRunSeries, 300, 44) ? (
              <>
                <svg viewBox="0 0 300 44" className="training-longrun"><path d={sparkPath(longRunSeries, 300, 44)} /></svg>
                <div className="row-meta tnum">
                  Siste: {formatKm((seriesLatest(longRunSeries) ?? 0) * 1000) ?? '–'}
                </div>
              </>
            ) : (
              <div className="training-spark-empty">venter på løpeøkter</div>
            )}
          </section>
          <section className="surface-card training-grid-card">
            <div className="training-group-head">
              <span className="row-title sm">Mobilitet</span>
              <span className="row-meta tnum">{mobilityTotal} økter · mål ≥1/uke</span>
            </div>
            {/* A count stuck on 0 usually means Hevy titles don't follow the
                "mobility"/"exercise" naming convention (§7.3.4) — flag it to
                the coach, never "fix" it app-side. */}
          </section>
        </>
      )}

      {!nothingYet && view === 'trend' && (
        <>
          <section className="surface-card training-grid-card">
            <div className="row-eyebrow">Form · CTL / ATL / TSB</div>
            <LoadChart sessions={sessions} />
          </section>
          <div className="training-spark-row">
            <Spark values={hrvSeries} label="HRV · 28 d" unit="ms" fmt={(v) => v.toFixed(0)} />
            <Spark values={rhrSeries} label="Hvilepuls · 28 d" unit="bpm" fmt={(v) => v.toFixed(0)} />
          </div>
          <section className="surface-card training-grid-card">
            <div className="row-eyebrow">Søvn · siste 14 netter</div>
            {sleepSeries.some((v) => v != null) ? (
              <>
                <div className="training-sleep-bars" role="img" aria-label="Søvntimer per natt">
                  {sleepSeries.map((v, i) => (
                    <span
                      key={i}
                      className={`training-sleep-bar${v != null ? ' on' : ''}`}
                      style={v != null ? { height: `${Math.min(100, (v / 3600 / 10) * 100)}%` } : undefined}
                    />
                  ))}
                </div>
                <div className="row-meta tnum">Siste: {formatSleep(seriesLatest(sleepSeries)) ?? '–'}</div>
              </>
            ) : (
              <div className="training-spark-empty">venter på data</div>
            )}
          </section>
        </>
      )}

      {offline && <OfflineNote />}
    </AppShellV3>
  );
};

export default Training;

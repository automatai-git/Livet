import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { lifeTreeService } from '../services/lifeTreeService';
import { LIFE_TREE } from '../data/lifeTreeData';
import { weekKey, lastNWeekKeys, weekLabel, rollUp } from '../lib/lifeTree';
import TreeFigure from '../components/life/TreeFigure';
import WeekHeatmap from '../components/life/WeekHeatmap';
import TabBar from '../components/shell/TabBar';

const HISTORY_WEEKS = 12;

// On-dark pillar tints (design tokens for the app's one dark screen).
const PILLAR_TINTS = { health: '#8FBF96', wealth: '#7FB2C4', happiness: '#DBA283' };

const Life = () => {
  const currentWeek = weekKey(new Date());
  const weekKeys = useMemo(() => lastNWeekKeys(new Date(), HISTORY_WEEKS), []);
  const [weeks, setWeeks] = useState({});
  const [activeWeek, setActiveWeek] = useState(currentWeek);
  const [offline, setOffline] = useState(false);
  const [popId, setPopId] = useState(null);

  // The app's only dark screen: paint the body while mounted so the
  // radial gradient bleeds edge-to-edge behind the safe areas.
  useEffect(() => {
    document.body.classList.add('screen-dark');
    return () => document.body.classList.remove('screen-dark');
  }, []);

  useEffect(() => {
    lifeTreeService.getWeeks(weekKeys).then(({ weeks: fetched, offline: off }) => {
      setWeeks(fetched);
      setOffline(off);
    });
  }, [weekKeys]);

  const ticks = useMemo(() => weeks[activeWeek] || {}, [weeks, activeWeek]);

  const toggleLeaf = (leafId) => {
    const next = { ...ticks };
    if (next[leafId]) delete next[leafId];
    else next[leafId] = true;
    setPopId(next[leafId] ? leafId : null);
    setWeeks((w) => ({ ...w, [activeWeek]: next }));
    lifeTreeService.saveWeek(activeWeek, next);
  };

  const roll = useMemo(() => rollUp(LIFE_TREE, ticks), [ticks]);
  const root = roll[LIFE_TREE.id];

  // Weakest branch = pillar with the lowest completion ratio this week.
  const weakest = useMemo(() => {
    const open = LIFE_TREE.children
      .map((p) => ({ pillar: p, ...roll[p.id] }))
      .filter((p) => !p.complete)
      .sort((a, b) => a.done / a.total - b.done / b.total);
    if (!open.length) return null;
    const leaf = open[0].pillar.children.find((l) => !ticks[l.id]);
    return leaf ? { pillar: open[0].pillar, leaf } : null;
  }, [roll, ticks]);

  const weekNum = Number(activeWeek.split('-W')[1]);

  return (
    <div className="tab-page life-screen">
      {activeWeek !== currentWeek && (
        <div className="life-backfill-note">
          Editing {weekLabel(activeWeek)}
          <button type="button" onClick={() => setActiveWeek(currentWeek)}>
            Back to this week
          </button>
        </div>
      )}

      <header className="life-head">
        <div className="life-eyebrow">Week {weekNum} · The Tree</div>
        <div className="heading-serif life-frac">
          {root.done}<span> / {root.total}</span>
        </div>
        <div className="life-subline">Every tick this week grows the tree.</div>
      </header>

      <TreeFigure tree={LIFE_TREE} ticks={ticks} onToggle={toggleLeaf} popId={popId} />

      <div className="pillar-chip-row">
        {LIFE_TREE.children.map((p) => {
          const r = roll[p.id];
          return (
            <div key={p.id} className="pillar-chip">
              <span style={{ background: PILLAR_TINTS[p.id] }} aria-hidden="true" />
              {p.label} {r.done}/{r.total}
            </div>
          );
        })}
      </div>

      {weakest && (
        <div className="weakest-card">
          <div className="weakest-ring" style={{ borderColor: PILLAR_TINTS[weakest.pillar.id] }} aria-hidden="true" />
          <div className="weakest-body">
            <div className="weakest-eyebrow" style={{ color: PILLAR_TINTS[weakest.pillar.id] }}>
              Weakest branch · {weakest.pillar.label}
            </div>
            <div className="weakest-label">{weakest.leaf.label}</div>
            <div className="weakest-criterion">{weakest.leaf.criterion}</div>
          </div>
          <button type="button" className="ivory-pill" onClick={() => toggleLeaf(weakest.leaf.id)}>
            Tick
          </button>
        </div>
      )}

      <section className="life-history" aria-label="Weekly history">
        <div className="life-history-head">Last {HISTORY_WEEKS} weeks</div>
        <WeekHeatmap
          tree={LIFE_TREE}
          weekKeys={weekKeys}
          weeks={weeks}
          activeWeek={activeWeek}
          currentWeek={currentWeek}
          onSelect={setActiveWeek}
        />
        {offline && (
          <p className="life-offline-dark">Couldn't reach the database — ticks are kept locally and sync once it's reachable.</p>
        )}
        <Link to="/timeline" className="life-milestones-link">
          Milestone timeline
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <TabBar dark />
    </div>
  );
};

export default Life;

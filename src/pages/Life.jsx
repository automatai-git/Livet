import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { lifeTreeService } from '../services/lifeTreeService';
import { LIFE_TREE } from '../data/lifeTreeData';
import { weekKey, lastNWeekKeys, weekLabel, rollUp } from '../lib/lifeTree';
import TreeFigure from '../components/life/TreeFigure';
import WeekHeatmap from '../components/life/WeekHeatmap';
import OfflineNote from '../components/feedback/OfflineNote';
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
  // v3.1 fix 2: tap 1 selects a leaf (bottom card shows its criterion),
  // tap 2 confirms. null = default selection (the weakest branch's leaf).
  const [selectedLeafId, setSelectedLeafId] = useState(null);

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
    setSelectedLeafId(leafId);
    setWeeks((w) => ({ ...w, [activeWeek]: next }));
    lifeTreeService.saveWeek(activeWeek, next);
  };

  const selectWeek = (week) => {
    setSelectedLeafId(null);
    setActiveWeek(week);
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

  // The bottom card follows the selection; the weakest-branch leaf is
  // simply the default selection when nothing is tapped.
  // (Plain computation — React Compiler memoizes renders.)
  const explicitSelection = selectedLeafId
    ? LIFE_TREE.children
        .map((pillar) => {
          const leaf = pillar.children.find((l) => l.id === selectedLeafId);
          return leaf ? { pillar, leaf, isWeakestDefault: false } : null;
        })
        .find(Boolean) ?? null
    : null;
  const selection = explicitSelection ?? (weakest ? { ...weakest, isWeakestDefault: true } : null);

  const weekNum = Number(activeWeek.split('-W')[1]);

  return (
    <div className="tab-page life-screen">
      {activeWeek !== currentWeek && (
        <div className="life-backfill-note">
          Editing {weekLabel(activeWeek)}
          <button type="button" onClick={() => selectWeek(currentWeek)}>
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

      <TreeFigure
        tree={LIFE_TREE}
        ticks={ticks}
        selectedId={selection?.leaf.id ?? null}
        onSelect={setSelectedLeafId}
        onToggle={toggleLeaf}
        popId={popId}
      />

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

      {selection && (() => {
        const tint = PILLAR_TINTS[selection.pillar.id];
        const ticked = Boolean(ticks[selection.leaf.id]);
        return (
          <div className="weakest-card">
            <div
              className={`weakest-ring${ticked ? ' ticked' : ''}`}
              style={{ borderColor: tint, background: ticked ? tint : 'transparent' }}
              aria-hidden="true"
            />
            <div className="weakest-body">
              <div className="weakest-eyebrow" style={{ color: tint }}>
                {selection.isWeakestDefault
                  ? `Weakest branch · ${selection.pillar.label}`
                  : selection.pillar.label}
              </div>
              <div className="weakest-label">{selection.leaf.label}</div>
              <div className="weakest-criterion">{selection.leaf.criterion}</div>
            </div>
            <button type="button" className="ivory-pill" onClick={() => toggleLeaf(selection.leaf.id)}>
              {ticked ? 'Untick' : 'Tick'}
            </button>
          </div>
        );
      })()}

      <section className="life-history" aria-label="Weekly history">
        <div className="life-history-head">Last {HISTORY_WEEKS} weeks</div>
        <WeekHeatmap
          tree={LIFE_TREE}
          weekKeys={weekKeys}
          weeks={weeks}
          activeWeek={activeWeek}
          currentWeek={currentWeek}
          onSelect={selectWeek}
        />
        <Link to="/timeline" className="life-milestones-link">
          Milestone timeline
          <span aria-hidden="true">→</span>
        </Link>
        {offline && <OfflineNote dark />}
      </section>

      <TabBar dark />
    </div>
  );
};

export default Life;

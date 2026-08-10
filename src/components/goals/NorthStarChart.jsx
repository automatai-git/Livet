import React, { useMemo, useState } from 'react';
import { NORTH_STAR, pillarById } from '../../data/northStarData.js';

// The one-pager drawn as a constellation: the north star (the 10-year
// horizon) at the top, the three identity pillars beneath it, each with its
// sub-goals fanned out as smaller stars. Select-then-detail like the life
// tree: tapping a pillar points the card below at its identity statement.
// Under the chart, the annual markers sit on a 2026 → 2036 timeline.

const W = 720;
const H = 400;
const STAR = { x: 360, y: 78 };
const PILLAR_POS = {
  career: { x: 150, y: 218 },
  connection: { x: 360, y: 252 },
  bold: { x: 570, y: 218 },
};

// Sub-goal stars fan on an arc below their pillar.
const fanPoints = (cx, cy, n) => {
  const pts = [];
  const spread = Math.PI * 0.7;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 - spread / 2 + (n === 1 ? spread / 2 : (spread * i) / (n - 1));
    const r = 74 + (i % 2) * 22; // alternate radii — constellation, not a grid
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
};

const StarGlyph = ({ x, y, r, color, opacity = 1 }) => (
  <path
    d={`M ${x} ${y - r} L ${x + r * 0.22} ${y - r * 0.22} L ${x + r} ${y} L ${x + r * 0.22} ${y + r * 0.22} L ${x} ${y + r} L ${x - r * 0.22} ${y + r * 0.22} L ${x - r} ${y} L ${x - r * 0.22} ${y - r * 0.22} Z`}
    fill={color}
    opacity={opacity}
  />
);

// ---- timeline scale: the near years get most of the width ----
const yearOf = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.getFullYear() + (d.getMonth() + d.getDate() / 31) / 12;
};
const T0 = 2026.45; // just before intake
const T1 = 2028;
const T2 = NORTH_STAR.horizonYear;
const NEAR_SHARE = 0.62;
const timeX = (yr, x0, x1) => {
  const w = x1 - x0;
  const t = Math.min(Math.max(yr, T0), T2);
  if (t <= T1) return x0 + ((t - T0) / (T1 - T0)) * w * NEAR_SHARE;
  return x0 + w * NEAR_SHARE + ((t - T1) / (T2 - T1)) * w * (1 - NEAR_SHARE);
};

const TL = { x0: 36, x1: W - 36, y: 60, h: 130 };

// Marker x positions, nudged apart when dates (nearly) coincide so both
// dots stay visible. Static data → computed once at module load.
const MARKER_X = (() => {
  let lastX = -Infinity;
  return NORTH_STAR.markers.map((m) => {
    let x = timeX(yearOf(m.date), TL.x0, TL.x1);
    if (x - lastX < 14) x = lastX + 14;
    lastX = x;
    return x;
  });
})();

const NorthStarChart = () => {
  const [selectedId, setSelectedId] = useState(NORTH_STAR.activePillarId);
  const selected = pillarById(selectedId);

  const todayYear = useMemo(() => yearOf(new Date().toISOString().slice(0, 10)), []);

  return (
    <>
      <section className="surface-card ns-card">
        <div className="eyebrow">North star · {NORTH_STAR.horizonLabel}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="ns-svg"
          role="img"
          aria-label="North star constellation: three identity pillars"
        >
          {/* constellation lines star → pillars */}
          {NORTH_STAR.pillars.map((p) => {
            const pos = PILLAR_POS[p.id];
            return (
              <line
                key={p.id}
                x1={STAR.x} y1={STAR.y + 26} x2={pos.x} y2={pos.y - 30}
                stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="2 5"
              />
            );
          })}

          {/* the north star */}
          <g>
            <circle cx={STAR.x} cy={STAR.y} r={40} fill="var(--ink)" opacity="0.05" />
            <StarGlyph x={STAR.x} y={STAR.y} r={24} color="var(--ink)" />
            <StarGlyph x={STAR.x + 34} y={STAR.y - 22} r={6} color="var(--text-faint)" />
            <StarGlyph x={STAR.x - 38} y={STAR.y - 12} r={4} color="var(--text-faint)" />
            <text x={STAR.x} y={STAR.y - 44} textAnchor="middle" className="ns-star-label">
              {NORTH_STAR.horizonYear}
            </text>
          </g>

          {/* pillars + their sub-goal fans */}
          {NORTH_STAR.pillars.map((p) => {
            const pos = PILLAR_POS[p.id];
            const on = p.id === selectedId;
            const active = p.id === NORTH_STAR.activePillarId;
            const fan = fanPoints(pos.x, pos.y, p.subGoals.length);
            return (
              <g key={p.id}>
                {fan.map((pt, i) => (
                  <g key={i}>
                    <line
                      x1={pos.x} y1={pos.y} x2={pt.x} y2={pt.y}
                      stroke={p.color} strokeWidth="1" opacity="0.3"
                    />
                    <StarGlyph x={pt.x} y={pt.y} r={5} color={p.color} opacity={on ? 0.9 : 0.45} />
                  </g>
                ))}
                {/* ≥44px hit area */}
                <g
                  className="ns-pillar"
                  onClick={() => setSelectedId(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(p.id); }}
                  aria-label={`Pillar ${p.n} — ${p.name}`}
                >
                  <circle cx={pos.x} cy={pos.y} r={30} fill="transparent" />
                  {on && (
                    <circle
                      cx={pos.x} cy={pos.y} r={26}
                      fill="none" stroke={p.color} strokeWidth="1.6" opacity="0.9"
                    />
                  )}
                  <circle cx={pos.x} cy={pos.y} r={19} fill={p.color} opacity={on ? 1 : 0.85} />
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" className="ns-pillar-n">{p.n}</text>
                </g>
                <text x={pos.x} y={pos.y + 42} textAnchor="middle" className="ns-pillar-name">
                  {p.short}
                </text>
                {active && (
                  <text x={pos.x} y={pos.y + 58} textAnchor="middle" className="ns-pillar-active">
                    ACTIVE
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* selected pillar detail — the identity is the point, not the tactics */}
        {selected && (
          <div className="ns-detail" style={{ '--pillar': selected.color }}>
            <div className="ns-detail-head">
              <span className="ns-detail-dot" />
              <strong>Pillar {selected.n} — {selected.name}</strong>
              {selected.id === NORTH_STAR.activePillarId && <span className="ns-active-chip">active</span>}
            </div>
            <p className="ns-identity">“{selected.identity}”</p>
            <p className="ns-note">{selected.note}</p>
            <ul className="ns-subgoals">
              {selected.subGoals.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* timeline card */}
      <section className="surface-card ns-card">
        <div className="eyebrow">Timeline · annual markers</div>
        <svg viewBox={`0 0 ${W} 190`} className="ns-svg" role="img" aria-label="Marker timeline 2026 to 2036">
          <line x1={TL.x0} y1={TL.y + TL.h / 2} x2={TL.x1} y2={TL.y + TL.h / 2} stroke="var(--border)" strokeWidth="1.6" />
          {/* scale break mark at 2028 */}
          <g opacity="0.7">
            <line x1={timeX(T1, TL.x0, TL.x1) - 4} y1={TL.y + TL.h / 2 - 7} x2={timeX(T1, TL.x0, TL.x1) + 4} y2={TL.y + TL.h / 2 + 7} stroke="var(--text-faint)" strokeWidth="1.4" />
          </g>
          {/* year ticks */}
          {[2027, 2028, 2030, 2033, 2036].map((yr) => (
            <g key={yr}>
              <line x1={timeX(yr, TL.x0, TL.x1)} y1={TL.y + TL.h / 2 - 4} x2={timeX(yr, TL.x0, TL.x1)} y2={TL.y + TL.h / 2 + 4} stroke="var(--text-faint)" strokeWidth="1" />
              <text x={timeX(yr, TL.x0, TL.x1)} y={TL.y + TL.h / 2 + 24} textAnchor="middle" className="ns-tick">{yr}</text>
            </g>
          ))}
          {/* today */}
          {todayYear >= T0 && todayYear <= T2 && (
            <g>
              <line x1={timeX(todayYear, TL.x0, TL.x1)} y1={TL.y + TL.h / 2 - 16} x2={timeX(todayYear, TL.x0, TL.x1)} y2={TL.y + TL.h / 2 + 16} stroke="var(--accent-timeline)" strokeWidth="1.4" />
              <text x={timeX(todayYear, TL.x0, TL.x1)} y={TL.y + TL.h / 2 + 38} textAnchor="middle" className="ns-today">today</text>
            </g>
          )}
          {/* markers, labels alternating above/below */}
          {NORTH_STAR.markers.map((m, i) => {
            const x = MARKER_X[i];
            const above = i % 2 === 0;
            const color = m.pillarId ? pillarById(m.pillarId).color : 'var(--ink)';
            const yDot = TL.y + TL.h / 2;
            const yLab = above ? yDot - 34 : yDot + 52;
            const xLab = Math.min(Math.max(x, 92), W - 92); // keep labels inside the viewBox
            return (
              <g key={m.id} onClick={() => m.pillarId && setSelectedId(m.pillarId)} className={m.pillarId ? 'ns-pillar' : undefined}>
                <line x1={x} y1={yDot} x2={x} y2={above ? yLab + 8 : yLab - 16} stroke={color} strokeWidth="1" opacity="0.4" />
                {m.achieved
                  ? <StarGlyph x={x} y={yDot} r={8} color={color} />
                  : <circle cx={x} cy={yDot} r={5.5} fill="var(--card)" stroke={color} strokeWidth="1.6" />}
                <text x={xLab} y={yLab} textAnchor="middle" className={`ns-marker-label${m.achieved ? ' achieved' : ''}`}>
                  {m.label.length > 30 ? `${m.label.slice(0, 28)}…` : m.label}
                </text>
                <text x={xLab} y={yLab + 13} textAnchor="middle" className="ns-marker-date">{m.date}</text>
              </g>
            );
          })}
        </svg>
        <ul className="ns-marker-list">
          {NORTH_STAR.markers.filter((m) => m.pillarId).map((m) => (
            <li key={m.id} style={{ '--pillar': pillarById(m.pillarId).color }}>
              <span className="ns-detail-dot" />
              <div>
                <div className="ns-marker-row-label">
                  {m.label} <span className="ns-marker-date-inline">· {m.date}{m.achieved ? ' · done' : ''}</span>
                </div>
                <div className="ns-marker-row-detail">{m.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

export default NorthStarChart;

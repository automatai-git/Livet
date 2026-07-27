import React, { useMemo } from 'react';
import { buildClouds, buildEdges, layoutClouds, relation, NODE_R } from '../../lib/bookCloud.js';

// SVG rendering of the book cloud. Pure function of the library:
// clouds = theme groups (soft blurred fill in the theme colour), nodes =
// books (solid = read, dashed outline = wishlist), faint curves = links
// between related books. Selecting a book lights up everything related.
//
// Props: books, selectedId, onSelect(bookId | null)

const CURVE = 0.18; // perpendicular pull of the edge curves

const edgePath = (p1, p2) => {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return `M ${p1.x} ${p1.y} Q ${mx - dy * CURVE} ${my + dx * CURVE} ${p2.x} ${p2.y}`;
};

const BookCloud = ({ books, selectedId, onSelect }) => {
  const layout = useMemo(() => layoutClouds(buildClouds(books)), [books]);
  const edges = useMemo(() => buildEdges(books), [books]);

  const pos = useMemo(() => {
    const map = {};
    for (const c of layout.clouds) for (const n of c.nodes) map[n.book.id] = { x: n.x, y: n.y, color: c.color };
    return map;
  }, [layout]);

  const selected = selectedId ? books.find((b) => b.id === selectedId) : null;

  // With a selection, related ids get highlighted edges (recomputed live so
  // even same-cloud theme-mates connect, not just the drawn base edges).
  const related = useMemo(() => {
    if (!selected) return new Set();
    return new Set(books.filter((b) => b.id !== selected.id && relation(selected, b).weight > 0).map((b) => b.id));
  }, [books, selected]);

  if (!layout.clouds.length) return null;

  const showLabels = books.length <= 24;

  return (
    <svg
      className="book-cloud-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Book cloud: books grouped by theme, related books connected"
      onClick={() => onSelect(null)}
    >
      <defs>
        <filter id="cloud-soften" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* cloud bodies */}
      {layout.clouds.map((c) => (
        <g key={c.id}>
          <g filter="url(#cloud-soften)" opacity="0.13">
            <circle cx={c.cx} cy={c.cy} r={c.r - 4} fill={c.color} />
            <circle cx={c.cx - c.r * 0.35} cy={c.cy + c.r * 0.2} r={c.r * 0.55} fill={c.color} />
            <circle cx={c.cx + c.r * 0.35} cy={c.cy - c.r * 0.2} r={c.r * 0.5} fill={c.color} />
          </g>
          <text className="book-cloud-label" x={c.cx} y={c.cy - c.r + 12} textAnchor="middle" fill={c.color}>
            {c.label}
          </text>
          <text className="book-cloud-count" x={c.cx} y={c.cy + c.r - 6} textAnchor="middle">
            {c.readCount} read{c.avgRating ? ` · ★${c.avgRating}` : ''}{c.wishCount ? ` · ${c.wishCount} wish` : ''}
          </text>
        </g>
      ))}

      {/* base edges, dimmed further when a selection is active */}
      <g fill="none" opacity={selected ? 0.35 : 1}>
        {edges.map((e) => {
          const p1 = pos[e.a];
          const p2 = pos[e.b];
          if (!p1 || !p2) return null;
          return (
            <path
              key={`${e.a}-${e.b}`}
              d={edgePath(p1, p2)}
              stroke="var(--primary)"
              strokeWidth={e.sameAuthor ? 1.4 : 1}
              opacity={0.08 + Math.min(e.weight, 5) * 0.015}
            />
          );
        })}
      </g>

      {/* highlighted edges from the selected book */}
      {selected && pos[selected.id] && (
        <g fill="none">
          {[...related].map((id) =>
            pos[id] ? (
              <path
                key={id}
                d={edgePath(pos[selected.id], pos[id])}
                stroke={pos[selected.id].color}
                strokeWidth="1.8"
                opacity="0.65"
              />
            ) : null
          )}
        </g>
      )}

      {/* book nodes */}
      {layout.clouds.map((c) =>
        c.nodes.map(({ book, x, y }) => {
          const isSel = book.id === selectedId;
          const isRelated = related.has(book.id);
          const dim = selected && !isSel && !isRelated;
          const wish = book.status === 'wishlist';
          return (
            <g
              key={book.id}
              className="book-node"
              opacity={dim ? 0.3 : 1}
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect(isSel ? null : book.id);
              }}
            >
              {/* generous invisible hit area for touch */}
              <circle cx={x} cy={y} r={NODE_R + 7} fill="transparent" />
              {isSel && <circle cx={x} cy={y} r={NODE_R + 5} fill="none" stroke={c.color} strokeWidth="1.5" opacity="0.6" />}
              <circle
                cx={x}
                cy={y}
                r={isSel ? NODE_R + 1.5 : NODE_R}
                fill={wish ? 'var(--card)' : c.color}
                stroke={c.color}
                strokeWidth={wish ? 1.7 : 1}
                strokeDasharray={wish ? '3 2.4' : undefined}
              >
                <title>{`${book.title}${book.author ? ` — ${book.author}` : ''}${wish ? ' (wishlist)' : ''}`}</title>
              </circle>
              {(showLabels || isSel) && (
                <text className="book-node-label" x={x} y={y + NODE_R + 11} textAnchor="middle">
                  {book.title.length > 16 ? `${book.title.slice(0, 15)}…` : book.title}
                </text>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
};

export default BookCloud;

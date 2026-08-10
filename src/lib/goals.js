// Pure engine for the Goals app: a scoped markdown parser (the subset the
// sprint/status files actually use — headings, lists, tables, quotes, hr,
// bold/italic/code/strike/link inline) and the sprint-item extractor that
// turns a sprint markdown file into trackable commitments.
//
// Item shape used throughout:
//   { id, label, detail, type: 'tick' | 'count', target, count,
//     status: 'open' | 'done' | 'closed', source: 'md' | 'manual' }
// A 'count' item is done when count >= target; 'closed' means consciously
// closed out (dropped / out of scope), distinct from done.

// ---------- block parser ----------

const HEADING = /^(#{1,6})\s+(.*)$/;
const ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;
const HR = /^\s*(---+|\*\*\*+|___+)\s*$/;

const splitCells = (line) =>
  line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

// Parses markdown into a flat list of blocks:
//   { type: 'heading', level, text } · { type: 'para', text }
//   { type: 'list', ordered, items: [{ text, depth }] }
//   { type: 'quote', lines: [text] } · { type: 'table', header, rows }
//   { type: 'hr' }
export const parseBlocks = (md) => {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i += 1; continue; }

    if (HR.test(line)) { blocks.push({ type: 'hr' }); i += 1; continue; }

    const h = line.match(HEADING);
    if (h) { blocks.push({ type: 'heading', level: h[1].length, text: h[2].trim() }); i += 1; continue; }

    if (line.trimStart().startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', lines: quote });
      continue;
    }

    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const header = splitCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(splitCells(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const ord = line.match(ORDERED);
    const bul = ord ? null : line.match(BULLET);
    if (ord || bul) {
      const ordered = Boolean(ord);
      const items = [];
      while (i < lines.length) {
        // Loose lists: a blank line between items doesn't end the list as
        // long as the next non-blank line is another item of the same kind.
        if (!lines[i].trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j += 1;
          if (j < lines.length && (ordered ? ORDERED : BULLET).test(lines[j])) { i = j; continue; }
          break;
        }
        const m = lines[i].match(ordered ? ORDERED : BULLET);
        if (!m) break;
        const depth = Math.floor(m[1].length / 2);
        let text = (ordered ? m[3] : m[2]).trim();
        // Continuation lines: indented non-blank lines that are not
        // themselves new list items fold into the current item.
        i += 1;
        while (
          i < lines.length && lines[i].trim() &&
          /^\s{2,}/.test(lines[i]) &&
          !ORDERED.test(lines[i]) && !BULLET.test(lines[i]) && !HEADING.test(lines[i])
        ) {
          text += ` ${lines[i].trim()}`;
          i += 1;
        }
        items.push({ text, depth });
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph: fold consecutive plain lines together.
    let text = line.trim();
    i += 1;
    while (
      i < lines.length && lines[i].trim() &&
      !HEADING.test(lines[i]) && !HR.test(lines[i]) &&
      !ORDERED.test(lines[i]) && !BULLET.test(lines[i]) &&
      !lines[i].trimStart().startsWith('>') && !TABLE_ROW.test(lines[i])
    ) {
      text += ` ${lines[i].trim()}`;
      i += 1;
    }
    blocks.push({ type: 'para', text });
  }
  return blocks;
};

// ---------- inline tokenizer ----------

const INLINE = /(\*\*(.+?)\*\*|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_)/;

// Flat inline tokens: { type: 'text'|'bold'|'strike'|'code'|'link'|'italic', text, href? }
export const parseInline = (text) => {
  const tokens = [];
  let rest = String(text || '');
  while (rest) {
    const m = rest.match(INLINE);
    if (!m) { tokens.push({ type: 'text', text: rest }); break; }
    if (m.index > 0) tokens.push({ type: 'text', text: rest.slice(0, m.index) });
    if (m[2] !== undefined) tokens.push({ type: 'bold', text: m[2] });
    else if (m[3] !== undefined) tokens.push({ type: 'strike', text: m[3] });
    else if (m[4] !== undefined) tokens.push({ type: 'code', text: m[4] });
    else if (m[5] !== undefined) tokens.push({ type: 'link', text: m[5], href: m[6] });
    else if (m[7] !== undefined) tokens.push({ type: 'italic', text: m[7] });
    else if (m[8] !== undefined) tokens.push({ type: 'italic', text: m[8] });
    rest = rest.slice(m.index + m[0].length);
  }
  return tokens;
};

// Strip inline markup down to plain text.
export const plainText = (text) => parseInline(text).map((t) => t.text).join('');

// First heading = the document's title.
export const titleFromMarkdown = (md) => {
  const h = parseBlocks(md).find((b) => b.type === 'heading');
  return h ? plainText(h.text).replace(/\.md$/i, '') : '';
};

// ---------- sprint item extraction ----------

// Detect a numeric target inside a commitment label/detail. Tried in order;
// 4-digit numbers are excluded everywhere so dates/years never match.
const TARGET_PATTERNS = [
  /≥\s*(\d{1,3})\b/,                       // "≥4 pipeline outreach actions"
  /\(target\s*(\d{1,3})\)/i,               // "(target 12)"
  /—\s*(\d{1,3})\b/,                       // "initiations — 12 reps over the sprint"
  /\b(\d{1,3})\s+(?:reps?|over the sprint|times|per week)\b/i,
];

export const detectTarget = (text) => {
  const t = plainText(text);
  for (const re of TARGET_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 500) return n;
    }
  }
  return null;
};

const slug = (s) =>
  plainText(s).toLowerCase().replace(/[^a-z0-9æøå]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

// Section headings whose numbered items / commitment tables hold the
// trackable points. Matches "Success criteria", "Process commitments", …
const SECTION_RE = /commitment|criteri|success/i;

const makeItem = (rawLabel, detail, seen) => {
  const label = plainText(rawLabel).replace(/\s+/g, ' ').trim().replace(/[.:]$/, '');
  if (!label || label.length < 4) return null;
  let id = slug(label) || `item-${seen.size}`;
  while (seen.has(id)) id = `${id}-x`;
  seen.add(id);
  const target = detectTarget(`${rawLabel} ${detail || ''}`);
  return {
    id,
    label: label.length > 90 ? `${label.slice(0, 87)}…` : label,
    detail: plainText(detail || '').trim(),
    type: target && target > 1 ? 'count' : 'tick',
    target: target && target > 1 ? target : null,
    count: 0,
    status: 'open',
    source: 'md',
  };
};

// Pull trackable items out of a sprint markdown file: numbered list entries
// and "Commitment" table rows under headings matching SECTION_RE. Labels
// prefer the leading bold span (the files' convention); a numeric target
// turns the item into a counter. Heuristic by design — the UI lets items be
// added or removed by hand.
export const extractSprintItems = (md) => {
  const blocks = parseBlocks(md);
  const items = [];
  const seen = new Set();
  let inSection = false;
  let sectionLevel = 0;

  for (const b of blocks) {
    if (b.type === 'heading') {
      if (inSection && b.level <= sectionLevel) inSection = false;
      if (SECTION_RE.test(plainText(b.text))) { inSection = true; sectionLevel = b.level; }
      continue;
    }
    if (!inSection) continue;

    if (b.type === 'list' && b.ordered) {
      for (const li of b.items.filter((x) => x.depth === 0)) {
        if (/^~~/.test(li.text)) continue; // struck-through = already excluded
        const bold = li.text.match(/^\*\*(.+?)\*\*[\s:—–-]*(.*)$/);
        const item = bold
          ? makeItem(bold[1], bold[2], seen)
          : makeItem(li.text.split(/(?<=[.!?])\s/)[0], li.text, seen);
        if (item) items.push(item);
      }
    }

    if (b.type === 'table') {
      const col = b.header.findIndex((h) => /commitment|criteri|task|goal/i.test(h));
      if (col === -1) continue;
      const deadlineCol = b.header.findIndex((h) => /deadline|due/i.test(h));
      for (const row of b.rows) {
        const cell = row[col];
        if (!cell) continue;
        const detail = deadlineCol !== -1 && row[deadlineCol] ? `Deadline ${row[deadlineCol]}` : '';
        const item = makeItem(cell, detail, seen);
        if (item) items.push(item);
      }
    }
  }
  return items;
};

// Re-importing an updated sprint file re-extracts items; logged state
// (count, status) carries over by item id, and hand-added items survive at
// the end of the list.
export const mergeItems = (extracted, existing) => {
  const prev = new Map((existing || []).map((it) => [it.id, it]));
  const merged = extracted.map((it) => {
    const old = prev.get(it.id);
    return old ? { ...it, count: old.count, status: old.status } : it;
  });
  const keptIds = new Set(merged.map((it) => it.id));
  const manual = (existing || []).filter((it) => it.source === 'manual' && !keptIds.has(it.id));
  return [...merged, ...manual];
};

// ---------- item state transitions ----------

export const isDone = (item) =>
  item.status === 'done' || (item.type === 'count' && item.target && item.count >= item.target);

// Progress across open+done items (closed ones are out of the denominator):
// counters contribute fractionally, ticks are 0/1.
export const sprintProgress = (items) => {
  const live = items.filter((it) => it.status !== 'closed');
  if (!live.length) return { done: 0, total: 0, pct: 0 };
  let score = 0;
  for (const it of live) {
    if (it.type === 'count' && it.target) score += Math.min(it.count / it.target, 1);
    else score += isDone(it) ? 1 : 0;
  }
  const done = live.filter(isDone).length;
  return { done, total: live.length, pct: Math.round((score / live.length) * 100) };
};

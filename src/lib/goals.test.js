import { describe, it, expect } from 'vitest';
import {
  parseBlocks,
  parseInline,
  plainText,
  titleFromMarkdown,
  detectTarget,
  extractSprintItems,
  mergeItems,
  isDone,
  sprintProgress,
} from './goals.js';

// A trimmed replica of the real SPRINT.md shape the parser must handle.
const SPRINT_MD = `# SPRINT.md

> Active sprint for ONE pillar. 2–4 weeks of process commitments.

**Status: ACTIVE.**

---

## Sprint: Pillar 2 — Connection — 2026-07-12 to 2026-07-26

### Success criteria (what passes this sprint)
Pass = **both** of the two rejection-edge commitments met.

### Process commitments (controllable actions, never outcomes)

1. **New-person initiations — 12 reps over the sprint (~6/week, the marker cadence).**
   Implementation intention: *"When I am in a shared space with a stranger…"*
   Log each rep so the count is real.

2. **Rejection-risk asks — 3 over the sprint.** A deliberate ask that can get a clear "no".

3. **One social økt per stretch home in Bergen.** From the North Star.

4. **Grooming — ONE small enabler, backgrounded, capped.**

### Single most likely obstacle
In-the-moment hesitation: talking yourself out of the initiation.
`;

// The STATUS.md convention: criteria as a numbered list, commitments as a table.
const STATUS_MD = `# Career Transition — Status & Pipeline

## Current sprint — P1 Career Sprint 2 (2026-07-27 → 2026-08-09)

### Success criteria (pass = both)

1. **≥4 pipeline outreach actions sent** over the sprint (2/week), each to a named contact.
2. **Thesis one-pager written and attached to at least one outreach** by 2026-08-02 (Sun).

### Process commitments (controllable, trigger-anchored)

| # | Commitment | Implementation intention (when → then) | Deadline |
|---|-----------|----------------------------------------|----------|
| 1 | Pål meeting-conversion message | When I sit down Wednesday morning | 2026-07-29 (Wed) |
| 2 | 3 further outreach actions | When I open the laptop at home | 2026-08-09 |
`;

describe('parseBlocks', () => {
  const blocks = parseBlocks(SPRINT_MD);

  it('parses headings with levels', () => {
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: 'SPRINT.md' });
    expect(blocks.some((b) => b.type === 'heading' && b.level === 3)).toBe(true);
  });

  it('parses quotes, hr and paragraphs', () => {
    expect(blocks.find((b) => b.type === 'quote').lines[0]).toMatch(/^Active sprint/);
    expect(blocks.some((b) => b.type === 'hr')).toBe(true);
    expect(blocks.find((b) => b.type === 'para').text).toMatch(/^\*\*Status/);
  });

  it('folds indented continuation lines into their list item', () => {
    const list = blocks.find((b) => b.type === 'list' && b.ordered);
    expect(list.items).toHaveLength(4);
    expect(list.items[0].text).toContain('Implementation intention');
    expect(list.items[0].text).toContain('count is real');
  });

  it('parses tables with header and rows', () => {
    const table = parseBlocks(STATUS_MD).find((b) => b.type === 'table');
    expect(table.header[1]).toBe('Commitment');
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][1]).toBe('Pål meeting-conversion message');
  });

  it('handles CRLF input and empty input', () => {
    expect(parseBlocks('# A\r\n\r\ntext\r\n')).toHaveLength(2);
    expect(parseBlocks('')).toEqual([]);
  });
});

describe('inline tokens', () => {
  it('tokenizes bold, italic, code, strike and links', () => {
    expect(parseInline('a **b** *c* `d` ~~e~~ [f](https://g)')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', text: 'b' },
      { type: 'text', text: ' ' },
      { type: 'italic', text: 'c' },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'd' },
      { type: 'text', text: ' ' },
      { type: 'strike', text: 'e' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'f', href: 'https://g' },
    ]);
  });

  it('strips markup to plain text and finds the doc title', () => {
    expect(plainText('**≥4 actions** sent')).toBe('≥4 actions sent');
    expect(titleFromMarkdown(SPRINT_MD)).toBe('SPRINT');
    expect(titleFromMarkdown(STATUS_MD)).toBe('Career Transition — Status & Pipeline');
  });
});

describe('detectTarget', () => {
  it('reads ≥N, em-dash counts, (target N) and "N reps"', () => {
    expect(detectTarget('**≥4 pipeline outreach actions sent** (2/week)')).toBe(4);
    expect(detectTarget('New-person initiations — 12 reps over the sprint')).toBe(12);
    expect(detectTarget('Initiations (target 12)')).toBe(12);
    expect(detectTarget('Rejection-risk asks — 3 over the sprint.')).toBe(3);
  });

  it('never mistakes years or dates for targets', () => {
    expect(detectTarget('Thesis one-pager written by 2026-08-02')).toBe(null);
    expect(detectTarget('Close on 2026-07-26 regardless')).toBe(null);
  });
});

describe('extractSprintItems', () => {
  it('extracts numbered commitments with counter targets from SPRINT-style files', () => {
    const items = extractSprintItems(SPRINT_MD);
    const labels = items.map((i) => i.label);
    expect(labels.some((l) => l.startsWith('New-person initiations'))).toBe(true);
    const init = items.find((i) => i.label.startsWith('New-person initiations'));
    expect(init.type).toBe('count');
    expect(init.target).toBe(12);
    const social = items.find((i) => i.label.startsWith('One social økt'));
    expect(social.type).toBe('tick');
  });

  it('extracts both list criteria and table commitments from STATUS-style files', () => {
    const items = extractSprintItems(STATUS_MD);
    const outreach = items.find((i) => i.label.includes('pipeline outreach'));
    expect(outreach.type).toBe('count');
    expect(outreach.target).toBe(4);
    const pal = items.find((i) => i.label.includes('Pål'));
    expect(pal).toBeTruthy();
    expect(pal.detail).toContain('2026-07-29');
    expect(items.find((i) => i.label.includes('Thesis one-pager')).type).toBe('tick');
  });

  it('skips struck-through (excluded) entries and gives stable unique ids', () => {
    const md = '## Criteria\n1. ~~Old excluded rep~~\n2. **Real thing — 3 over the sprint.**';
    const items = extractSprintItems(md);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('real-thing-3-over-the-sprint');
  });

  it('returns nothing outside commitment/criteria sections', () => {
    expect(extractSprintItems('## Notes\n1. **Not a commitment — 5 things.**')).toEqual([]);
  });
});

describe('mergeItems', () => {
  it('carries logged state over by id and keeps manual items', () => {
    const md = '## Criteria\n1. **Real thing — 3 over the sprint.**';
    const first = extractSprintItems(md);
    const worked = [
      { ...first[0], count: 2 },
      { id: 'hand', label: 'Hand-added', type: 'tick', target: null, count: 0, status: 'done', source: 'manual' },
    ];
    const merged = mergeItems(extractSprintItems(md), worked);
    expect(merged[0].count).toBe(2);
    expect(merged[1].id).toBe('hand');
    expect(merged[1].status).toBe('done');
  });

  it('drops md items that vanished from the new file', () => {
    const merged = mergeItems([], [{ id: 'gone', source: 'md', count: 1, status: 'open' }]);
    expect(merged).toEqual([]);
  });
});

describe('progress', () => {
  const tick = (status = 'open') =>
    ({ id: 't', label: 't', type: 'tick', target: null, count: 0, status });
  const counter = (count, target = 4, status = 'open') =>
    ({ id: 'c', label: 'c', type: 'count', target, count, status });

  it('marks counters done at target and scores fractional progress', () => {
    expect(isDone(counter(4))).toBe(true);
    expect(isDone(counter(3))).toBe(false);
    expect(sprintProgress([counter(2), tick('done')])).toEqual({ done: 1, total: 2, pct: 75 });
  });

  it('drops closed items from the denominator', () => {
    expect(sprintProgress([tick('done'), tick('closed')])).toEqual({ done: 1, total: 1, pct: 100 });
    expect(sprintProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

import React from 'react';
import { parseBlocks, parseInline } from '../../lib/goals.js';

// Read-only renderer for the sprint markdown, scoped to the subset the
// parser produces. Tables scroll inside their own container; everything
// else flows in the card.

const Inline = ({ text }) => (
  <>
    {parseInline(text).map((t, i) => {
      switch (t.type) {
        case 'bold': return <strong key={i}>{t.text}</strong>;
        case 'italic': return <em key={i}>{t.text}</em>;
        case 'strike': return <s key={i}>{t.text}</s>;
        case 'code': return <code key={i} className="md-code">{t.text}</code>;
        case 'link':
          return (
            <a key={i} href={t.href} target="_blank" rel="noreferrer" className="md-link">
              {t.text}
            </a>
          );
        default: return <React.Fragment key={i}>{t.text}</React.Fragment>;
      }
    })}
  </>
);

const MarkdownView = ({ markdown }) => {
  const blocks = parseBlocks(markdown);
  return (
    <div className="md-view">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading': {
            const Tag = `h${Math.min(b.level + 1, 6)}`; // page owns h1
            return <Tag key={i} className={`md-h md-h${b.level}`}><Inline text={b.text} /></Tag>;
          }
          case 'quote':
            return (
              <blockquote key={i} className="md-quote">
                {b.lines.map((l, j) => <p key={j}><Inline text={l} /></p>)}
              </blockquote>
            );
          case 'list': {
            const Tag = b.ordered ? 'ol' : 'ul';
            return (
              <Tag key={i} className="md-list">
                {b.items.map((li, j) => (
                  <li key={j} style={li.depth ? { marginLeft: li.depth * 16 } : undefined}>
                    <Inline text={li.text} />
                  </li>
                ))}
              </Tag>
            );
          }
          case 'table':
            return (
              <div key={i} className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>{b.header.map((h, j) => <th key={j}><Inline text={h} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j}>{row.map((c, k) => <td key={k}><Inline text={c} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'hr':
            return <hr key={i} className="md-hr" />;
          default:
            return <p key={i} className="md-para"><Inline text={b.text} /></p>;
        }
      })}
    </div>
  );
};

export default MarkdownView;

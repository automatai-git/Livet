import React, { useRef, useState } from 'react';

// Load the current sprint markdown: pick the .md file straight from disk or
// paste its contents. Re-loading an updated file keeps logged tracker state
// (the page merges by item id).

const SprintImport = ({ onLoad, hasDoc }) => {
  const fileRef = useRef(null);
  const [text, setText] = useState('');

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onLoad(String(reader.result || ''), file.name);
    reader.readAsText(file);
  };

  return (
    <section className="surface-card goal-card">
      <div className="eyebrow">{hasDoc ? 'Replace sprint file' : 'Load sprint file'}</div>
      <p className="muted-row">
        Point this at the active sprint markdown (SPRINT.md / STATUS.md). The commitments and
        success criteria become trackable items; reloading an updated file keeps your logged state.
      </p>
      <div className="goal-import-actions">
        <button type="button" className="goal-import-btn" onClick={() => fileRef.current?.click()}>
          Choose .md file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
      <textarea
        className="goal-import-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…or paste the markdown here"
        rows={6}
      />
      {text.trim() && (
        <button
          type="button"
          className="goal-import-apply"
          onClick={() => { onLoad(text, ''); setText(''); }}
        >
          Use pasted markdown
        </button>
      )}
    </section>
  );
};

export default SprintImport;

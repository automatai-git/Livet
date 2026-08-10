import React, { useEffect, useMemo, useState } from 'react';
import AppShellV3, { HeroCard, ScopePill } from '../components/AppShellV3';
import MarkdownView from '../components/goals/MarkdownView';
import NorthStarChart from '../components/goals/NorthStarChart';
import SprintTracker from '../components/goals/SprintTracker';
import SprintImport from '../components/goals/SprintImport';
import { titleFromMarkdown, extractSprintItems, mergeItems, sprintProgress } from '../lib/goals.js';
import { NORTH_STAR, pillarById } from '../data/northStarData.js';
import { goalService } from '../services/goalService.js';

// Goals: the layer above the other sub-apps. Three views —
//   Current   the active sprint file (markdown), loaded from disk/paste
//   Long term the North Star one-pager as a constellation + marker timeline
//   State     the sprint's commitments as tick/count/close trackers + notes
// Persistence via goalService (Supabase `goal_sprints`, localStorage cache).

const VIEWS = [
  { id: 'current', label: 'Current' },
  { id: 'longterm', label: 'Long term' },
  { id: 'state', label: 'Sprint state' },
];

const Goals = () => {
  const [doc, setDoc] = useState(goalService.getCachedDoc);
  const [view, setView] = useState('current');
  const [importing, setImporting] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    goalService.getDoc().then(({ doc: fetched, offline: off }) => {
      if (cancelled) return;
      if (fetched) setDoc(fetched);
      setOffline(off);
    });
    return () => { cancelled = true; };
  }, []);

  const save = (next) => {
    setDoc(next);
    goalService.saveDoc(next).then(({ ok }) => setOffline(!ok));
  };

  const handleLoad = (markdown, filename) => {
    const title = titleFromMarkdown(markdown) || filename.replace(/\.(md|markdown|txt)$/i, '') || 'Current sprint';
    const items = mergeItems(extractSprintItems(markdown), doc?.items || []);
    save({ ...(doc || { notes: [] }), title, markdown, items });
    setImporting(false);
  };

  const items = doc?.items || [];
  const notes = doc?.notes || [];
  const progress = useMemo(() => sprintProgress(doc?.items || []), [doc]);
  const activePillar = pillarById(NORTH_STAR.activePillarId);

  const hero = view === 'longterm' ? (
    <HeroCard
      eyebrow="Layer 1 · identity pillars"
      title="Who Andreas is becoming"
      meta={`Locked ${NORTH_STAR.finalized} · rewritten only at annual review`}
      chips={NORTH_STAR.pillars.map((p) => p.short)}
    />
  ) : (
    <HeroCard
      eyebrow={view === 'current' ? 'Active sprint' : 'Sprint state'}
      title={doc?.title || 'No sprint loaded'}
      meta={
        doc
          ? `${progress.done} of ${progress.total} commitments done · ${progress.pct}%${offline ? ' · offline, saved locally' : ''}`
          : 'Load the active sprint markdown to start tracking.'
      }
      chips={activePillar ? [`Active pillar: ${activePillar.short}`] : []}
    >
      {doc && progress.total > 0 && (
        <div className="goal-progress-track" role="img" aria-label={`${progress.pct}% complete`}>
          <div className="goal-progress-fill" style={{ width: `${progress.pct}%` }} />
        </div>
      )}
    </HeroCard>
  );

  const action =
    view === 'current'
      ? { label: importing ? 'Cancel' : (doc ? 'Replace sprint file' : 'Load sprint file'), onClick: () => setImporting((v) => !v) }
      : undefined;

  return (
    <AppShellV3
      app="goals"
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
      action={action}
    >
      {view === 'current' && (
        <>
          {(importing || !doc) && <SprintImport onLoad={handleLoad} hasDoc={Boolean(doc)} />}
          {doc && (
            <section className="surface-card goal-card">
              <MarkdownView markdown={doc.markdown} />
            </section>
          )}
        </>
      )}

      {view === 'longterm' && <NorthStarChart />}

      {view === 'state' && (
        <SprintTracker
          items={items}
          notes={notes}
          onItemsChange={(next) => save({ ...(doc || { title: 'Current sprint', markdown: '', notes: [] }), items: next })}
          onNotesChange={(next) => save({ ...(doc || { title: 'Current sprint', markdown: '', items: [] }), notes: next })}
        />
      )}
    </AppShellV3>
  );
};

export default Goals;

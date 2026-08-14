-- =============================================================================
-- property_listings retention — run once in the Livet project's Supabase SQL
-- editor (safe to re-run: scheduling the same job name replaces the job).
--
-- The NAS collector only upserts; nothing ever deleted rows, so the table
-- grows ~100-140 rows/day forever. This pg_cron job trims stale noise daily:
--   - never touches anything the user marked (user_state / user_notes)
--   - never touches active listings (still on Finn)
--   - gone + never scored        -> delete 30 days after last_seen
--   - gone + scored below 65     -> delete 90 days after last_seen
--     (65 = the pipeline's prospect threshold, see VIEWING_THRESHOLD)
--   - gone + scored 65+          -> kept (market reference)
-- Runs at 03:30 UTC, outside the collector's sync windows.
-- =============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'property-listings-trim',
  '30 3 * * *',
  $$
    delete from public.property_listings
    where user_state is null
      and user_notes is null
      and active = false
      and (
        (score is null and last_seen < now() - interval '30 days') or
        (score < 65    and last_seen < now() - interval '90 days')
      )
  $$
);

-- Verify: select jobname, schedule, command from cron.job;
-- Undo:   select cron.unschedule('property-listings-trim');

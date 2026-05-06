-- Block + decision-tree migration for workout-finder refactor.
-- Source of truth for Block content is the Google Sheet `workouts - plan`
-- which was unreachable at migration time. Reconcile this seed against it.

-- 1. Tables ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blocks (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    primary_domain  TEXT NOT NULL,
    goals           JSONB NOT NULL,
    phases          JSONB NOT NULL,
    weekly_template JSONB NOT NULL,
    modifiers       JSONB NOT NULL DEFAULT '[]'::jsonb,
    deload_weeks    JSONB NOT NULL DEFAULT '[]'::jsonb,
    test_dates      JSONB NOT NULL DEFAULT '[]'::jsonb,
    mid_block_checkin DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mobility_sessions (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    duration_min  INT NOT NULL,
    prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
    blocks        JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mobility_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT NOT NULL REFERENCES mobility_sessions(id),
    completed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    movements_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
    rpe                 INT,
    notes               TEXT
);

CREATE TABLE IF NOT EXISTS user_config (
    id              TEXT PRIMARY KEY,
    active_block_id TEXT REFERENCES blocks(id)
);

-- 2. RLS (single-user PWA, mirror existing convention) -----------------------

ALTER TABLE blocks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "blocks all"  ON blocks            FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mobs all"    ON mobility_sessions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mobh all"    ON mobility_history  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "uc all"      ON user_config       FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Seed: Block 4 -----------------------------------------------------------
-- NOTE: seed default. Source of truth is Google Sheet `workouts - plan`.

INSERT INTO blocks (
    id, name, start_date, end_date, primary_domain,
    goals, phases, weekly_template, modifiers, deload_weeks, test_dates, mid_block_checkin
) VALUES (
    'block-4',
    'Block 4 — Strength Lead, Run Maintenance',
    DATE '2026-05-11',
    DATE '2026-08-02',
    'strength',
    '{
      "a": {"statement": "Add visible upper body mass; close DB-bench gap to barbell",
            "metric": "DB bench press 3x8 @ 27.5kg by week 12 (current 3x5 @ 22.5kg max)",
            "deadline": "2026-08-02"},
      "b": [
        {"statement": "Wednesday mobility — zero misses", "metric": "12/12 weeks, session marked complete"},
        {"statement": "Strength compliance >=85%", "metric": "weekly logged sessions / planned sessions, averaged across block"},
        {"statement": "Aerobic base maintenance", "metric": ">=2 easy runs/week in >=80% of weeks"}
      ],
      "c": {"statement": "10 strict consecutive pull-ups (current 7)"}
    }'::jsonb,
    '[
      {"name":"accumulation","weeks":[1,2,3,4],
       "bias":{"strength":"high volume, hypertrophy bias on chest/arms/back, RPE 6-7","running":"easy aerobic only, 2-3x/wk, 30-45min","mobility":"Wed full session + 10min daily flow"}},
      {"name":"intensification","weeks":[5,6,7,8],
       "bias":{"strength":"heavier loads, lower reps, RPE 7-8","running":"1 tempo + 1 easy + 1 long","mobility":"Wed full + 3x/wk targeted snippets"}},
      {"name":"realization","weeks":[9,10,11],
       "bias":{"strength":"specificity — 5RM tests programmed, RPE 8-9","running":"maintenance — 2x/wk easy + 1 long","mobility":"Wed + 2x/wk"}},
      {"name":"deload","weeks":[12],
       "bias":{"strength":"50% volume, intensity preserved","running":"easy only, 2x/wk max","mobility":"Wed only, half volume"}}
    ]'::jsonb,
    '{
      "monday":   {"kind":"strength","focus":"Lower — squat-pattern primary","intensity":"hard","route_to":"macrofactor","rpe_target":"RPE 7-8","notes":"Sunday was the long run. No run today."},
      "tuesday":  {"kind":"run","quality":"easy","route_to":"runna","rpe_target":"RPE 4-5, conversational","notes":"Phase overrides apply — see Runna for distance.",
                   "phase_overrides":{"intensification":{"quality":"easy","rpe_target":"RPE 4-5"},"realization":{"quality":"recovery","rpe_target":"RPE 3-4"}}},
      "wednesday":{"kind":"mobility","session_id":"wed-corrective-full","route_to":"internal"},
      "thursday": {"kind":"strength","focus":"Upper push — chest emphasis","intensity":"hard","route_to":"macrofactor","rpe_target":"RPE 7-8","notes":"Submaximal DB pressing — no failure on dumbbells. Shoulder stability is the limiter."},
      "friday":   {"kind":"run","quality":"easy","route_to":"runna","rpe_target":"RPE 4-5","notes":"Phase determines quality.",
                   "phase_overrides":{"intensification":{"quality":"tempo","rpe_target":"RPE 6-7"},"realization":{"quality":"intervals","rpe_target":"RPE 8-9 in work intervals"}}},
      "saturday": {"kind":"flex","notes":"Cap padel + football combined at 1x/wk except tournament weeks.",
                   "options":[
                     {"kind":"sport","activity":"padel","cap_check":true},
                     {"kind":"strength","focus":"Upper pull — back/arms accessory","intensity":"moderate","route_to":"macrofactor","rpe_target":"RPE 6-7"},
                     {"kind":"rest"}
                   ]},
      "sunday":   {"kind":"run","quality":"long","route_to":"runna","rpe_target":"RPE 4-5 mostly easy, last 20% RPE 6","notes":"60-90min depending on phase. Phase overrides apply."}
    }'::jsonb,
    '[
      {"type":"injury","description":"Shoulder stability is the limiting factor in pressing. DB work submaximal, no failure. Pre-press band activation 2x15 each side.","active_weeks":[]},
      {"type":"injury","description":"Leg length discrepancy (left longer than right). Single-leg work always starts with weaker right side. Match volume both sides regardless of how it feels.","active_weeks":[]},
      {"type":"sport_ceiling","description":"Padel + football combined <=1 session/wk except tournament weeks. Tournament weeks: padel 2 max, football 0.","active_weeks":[]}
    ]'::jsonb,
    '[12]'::jsonb,
    '[
      {"date":"2026-07-26","what":"Bench 5RM test (close grip)"},
      {"date":"2026-07-27","what":"Pull-up max strict reps test"},
      {"date":"2026-08-02","what":"DB bench 3x8 attempt at target load"}
    ]'::jsonb,
    DATE '2026-06-22'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    primary_domain = EXCLUDED.primary_domain,
    goals = EXCLUDED.goals,
    phases = EXCLUDED.phases,
    weekly_template = EXCLUDED.weekly_template,
    modifiers = EXCLUDED.modifiers,
    deload_weeks = EXCLUDED.deload_weeks,
    test_dates = EXCLUDED.test_dates,
    mid_block_checkin = EXCLUDED.mid_block_checkin,
    updated_at = now();

-- 4. Seed: Wednesday Corrective Full mobility session ------------------------

INSERT INTO mobility_sessions (id, name, duration_min, prerequisites, blocks)
VALUES (
    'wed-corrective-full',
    'Wednesday Corrective — Full',
    45,
    '["5min easy spin on the bike or row to warm up. Get HR to 110-120 bpm."]'::jsonb,
    '[
      {"name":"Hip / Groin","duration_min":15,"movements":[
        {"id":"cossack-squat-weighted","name":"Cossack squat (weighted)","sets":3,"reps_or_time":"8/side","load":"10-15kg goblet","target":["groin","hip"],"cue":"Sit deep into the bent side, extended foot stays flat. Drive through the heel coming up."},
        {"id":"ninety-ninety-switch","name":"90/90 hip switch with reach","sets":3,"reps_or_time":"6/side","target":["hip","glute"],"cue":"Reach over the front knee on each switch. Chest tall, no rounding."},
        {"id":"adductor-side-plank","name":"Adductor side plank","sets":3,"reps_or_time":"30s/side","target":["groin"],"cue":"Top leg stacked, bottom heel pressing into the floor."}
      ]},
      {"name":"Ankle","duration_min":8,"movements":[
        {"id":"weighted-knee-to-wall","name":"Weighted knee-to-wall (dorsiflexion)","sets":3,"reps_or_time":"10/side","load":"10-15kg goblet at chest","target":["ankle"],"cue":"Knee tracks over middle toe. Heel does not lift."},
        {"id":"weighted-slant-calf","name":"Calf stretch on slant board, weighted","sets":2,"reps_or_time":"45s/side","load":"20kg held","target":["ankle","calf"],"cue":"Hips slightly forward. Heel pinned. Breathe."}
      ]},
      {"name":"Spine / Posture","duration_min":12,"movements":[
        {"id":"jefferson-curl","name":"Jefferson curl","sets":3,"reps_or_time":"8 slow","load":"20-30kg, progress weekly","target":["spine","hamstring","posterior-chain"],"cue":"Roll down vertebra by vertebra. Soft knees. 3s down, 1s pause, 3s up."},
        {"id":"prone-y-t-w","name":"Prone Y-T-W (weighted)","sets":2,"reps_or_time":"8 each letter","load":"2-5kg DBs","target":["upper-back","posture"],"cue":"Thumbs up. Pinch shoulder blades. No neck involvement."},
        {"id":"dead-bug-anti-extension","name":"Dead bug — anti-extension","sets":3,"reps_or_time":"8/side","target":["core","butt-wink"],"cue":"Lower back PRESSED into the floor the entire set. If it lifts, reduce range. This owns the butt wink."}
      ]},
      {"name":"Asymmetry / Leg length","duration_min":10,"movements":[
        {"id":"single-leg-rdl-right-first","name":"Single-leg RDL — start right (weaker)","sets":3,"reps_or_time":"8/side","load":"10-15kg DB or KB","target":["glute","hamstring","asymmetry"],"cue":"Hinge from hip. Foot stays under hip, not behind. Match volume both sides regardless of how it feels."},
        {"id":"step-up-knee-drive-right-first","name":"Step-up with knee drive — start right","sets":2,"reps_or_time":"10/side","load":"bodyweight or 5-10kg DBs","target":["glute","asymmetry"],"cue":"Drive through the planted heel. Don't push off the trailing leg."}
      ]}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    duration_min = EXCLUDED.duration_min,
    prerequisites = EXCLUDED.prerequisites,
    blocks = EXCLUDED.blocks,
    updated_at = now();

-- 5. Seed: user_config singleton --------------------------------------------

INSERT INTO user_config (id, active_block_id)
VALUES ('singleton', 'block-4')
ON CONFLICT (id) DO UPDATE SET active_block_id = EXCLUDED.active_block_id;

-- Block + decision-tree migration for workout-finder.
-- Block 4 source: Google Sheet `workouts - plan` (id 1vS3S_PBOqb6o_L_9dLp1w6Blvj_NNbV4Sfn2JJX2Kko)
--   pulled 2026-05-07. Daily template is derived from Sheet config:
--     - Strength 3x/wk (MacroFactor: Upper / Lower / Full Body, hypertrophy, 60min cap)
--     - Run Tue/Thu/Sun (Runna: Train Your Way, endurance, long run Sunday)
--     - Wed mobility non-negotiable (Locked Principle #1)
--   The Sheet does not pin which weekday gets Upper vs Full Body, so this seed
--   places: Mon=Full Body, Fri=Upper, Sat=flex (Lower / sport / rest).

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

-- 2. RLS ---------------------------------------------------------------------

ALTER TABLE blocks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "blocks all"  ON blocks            FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "mobs all"    ON mobility_sessions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "mobh all"    ON mobility_history  FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "uc all"      ON user_config       FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Block 4 (from Sheet) ----------------------------------------------------

INSERT INTO blocks (
    id, name, start_date, end_date, primary_domain,
    goals, phases, weekly_template, modifiers, deload_weeks, test_dates, mid_block_checkin
) VALUES (
    'block-4',
    'Block 4 — Mobility + Run Base (Maintenance)',
    DATE '2026-05-04',
    DATE '2026-07-26',
    'mobility',
    '{
      "a": {
        "statement": "Complete one 18 km Zone 2 long run (<=170 bpm, 6:30–7:00/km)",
        "metric": "single 18 km run logged in Runna under target HR/pace by W11 (Jul 13–19)",
        "deadline": "2026-07-19"
      },
      "b": [
        {"statement": "Wednesday mobility >=10/12 weeks", "metric": "marked complete in workout-finder"},
        {"statement": "Strength compliance >=85%", "metric": "logged sessions / planned, averaged across block"}
      ],
      "c": {"statement": "W4 baselines logged: wall-ankle (cm both sides), Copenhagen plank max reps each side, video back squat at 80kg (butt-wink check)"}
    }'::jsonb,
    '[
      {"name":"accumulation","weeks":[1,2,3,4,5,6],
       "bias":{"strength":"hypertrophy maintenance, RPE 6-7, 60min cap; chest +2, posterior chain +1, core +1, arms +1; quads de-emphasized","running":"easy aerobic base, Tue/Thu/Sun, building Sun long run from ~8 km toward 18 km","mobility":"Wed full corrective non-negotiable; daily 5-min activations on training days"}},
      {"name":"deload","weeks":[7,12],
       "bias":{"strength":"50% volume, RPE preserved; W12 full deload","running":"Tue easy + Sun easy; no Thu intensity","mobility":"Wed full session preserved"}},
      {"name":"realization","weeks":[8,9,10,11],
       "bias":{"strength":"maintain hypertrophy; protect long-run recovery","running":"Tue easy + Thu mid-tempo + Sun long progressing 14→18 km; W11 18 km test","mobility":"Wed full + targeted ankle/groin snippets pre-run"}}
    ]'::jsonb,
    '{
      "monday":   {"kind":"strength","focus":"Full Body — chest +2, posterior chain +1, core +1, arms +1","intensity":"moderate","route_to":"macrofactor","rpe_target":"RPE 6-7","notes":"60min cap. No heavy OH press during shoulder flares; goblet only for deep squat work."},
      "tuesday":  {"kind":"run","quality":"easy","route_to":"runna","rpe_target":"RPE 4-5, conversational","notes":"Easy aerobic. Pre-run: ankle circles + leg swings."},
      "wednesday":{"kind":"mobility","session_id":"wed-corrective-full","route_to":"internal"},
      "thursday": {"kind":"run","quality":"easy","route_to":"runna","rpe_target":"RPE 4-5","notes":"Mid-week. Phase determines quality.",
                   "phase_overrides":{
                     "realization":{"quality":"tempo","rpe_target":"RPE 6-7"},
                     "deload":{"quality":"recovery","rpe_target":"RPE 3-4"}
                   }},
      "friday":   {"kind":"strength","focus":"Upper — chest emphasis (no heavy OH press during shoulder flares)","intensity":"moderate","route_to":"macrofactor","rpe_target":"RPE 6-7","notes":"60min cap. Submaximal pressing — shoulder stability is the limiter."},
      "saturday": {"kind":"flex","notes":"Sport ceiling: padel + football combined <=2/wk. Tournament weeks max 1.",
                   "options":[
                     {"kind":"sport","activity":"padel","cap_check":true},
                     {"kind":"sport","activity":"football","cap_check":true},
                     {"kind":"strength","focus":"Lower — knee-friendly (goblet/SL work, no deep heavy squats)","intensity":"moderate","route_to":"macrofactor","rpe_target":"RPE 6-7"},
                     {"kind":"rest"}
                   ]},
      "sunday":   {"kind":"run","quality":"long","route_to":"runna","rpe_target":"RPE 4-5 (Z2, <=170 bpm, 6:30–7:00/km)","notes":"Long run. Build distance week-over-week toward 18 km W11 test.",
                   "phase_overrides":{
                     "realization":{"notes":"Build from 14 km W8 → 18 km W11. Strict Z2."},
                     "deload":{"quality":"easy","rpe_target":"RPE 3-4","notes":"Cut to ~8-10 km easy."}
                   }}
    }'::jsonb,
    '[
      {"type":"injury","description":"Right shoulder management item — no heavy overhead barbell press during flares; submaximal DB pressing only.","active_weeks":[]},
      {"type":"injury","description":"Posterior left knee — no deep heavy back squats. Bodyweight goblet only for deep squat work.","active_weeks":[]},
      {"type":"vessel_rotation","description":"Vessel rotation expected. Switch active gym profile (Land/Vessel) per session in MacroFactor.","active_weeks":[]},
      {"type":"sport_ceiling","description":"Padel + football combined <=2 sessions/wk. Tournament weeks excepted, max 1 such week per block.","active_weeks":[]}
    ]'::jsonb,
    '[7,12]'::jsonb,
    '[
      {"date":"2026-05-25","what":"W4 baseline: wall-ankle (cm both sides)"},
      {"date":"2026-05-26","what":"W4 baseline: Copenhagen plank max reps each side"},
      {"date":"2026-05-27","what":"W4 baseline: video back squat at 80kg (butt-wink check)"},
      {"date":"2026-07-19","what":"W11: 18 km Zone 2 long run test (A-goal attempt)"}
    ]'::jsonb,
    DATE '2026-06-15'
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

-- 4. wed-corrective-full mobility session (from Sheet's full Wed table) ------

INSERT INTO mobility_sessions (id, name, duration_min, prerequisites, blocks)
VALUES (
    'wed-corrective-full',
    'Wednesday Corrective — Full',
    45,
    '["5min easy spin on the bike or row to warm up. Get HR to 110-120 bpm."]'::jsonb,
    '[
      {"name":"Spine / Posture","duration_min":10,"movements":[
        {"id":"foam-roller-tspine","name":"Foam Roller T-Spine Extension","sets":2,"reps_or_time":"10 extensions","target":["t-spine","posture"],"cue":"Extend over roller at each segment."},
        {"id":"dead-bug-full","name":"Dead Bug (full)","sets":3,"reps_or_time":"10/side","target":["core","butt-wink"],"cue":"Low back STAYS on floor."},
        {"id":"pallof-press","name":"Pallof Press","sets":3,"reps_or_time":"10/side","load":"Band/Cable","target":["core","butt-wink","anti-rotation"],"cue":"No rotation, brace hard."}
      ]},
      {"name":"Hip / Groin","duration_min":12,"movements":[
        {"id":"copenhagen-plank","name":"Copenhagen Plank","sets":3,"reps_or_time":"8/side","load":"Bodyweight","target":["groin"],"cue":"Progress: bent → straight leg."},
        {"id":"ninety-ninety-flow","name":"90/90 Flow + Holds","sets":3,"reps_or_time":"5 transitions + 30s hold weak side","target":["hip"],"cue":"Extra time on left."},
        {"id":"cossack-squat","name":"Cossack Squat","sets":3,"reps_or_time":"8/side","load":"Goblet 12-16kg","target":["groin","ankle"],"cue":"Heel down, chest up."}
      ]},
      {"name":"Ankle","duration_min":8,"movements":[
        {"id":"wall-ankle-stretch-weighted","name":"Wall Ankle Stretch (weighted)","sets":3,"reps_or_time":"45s/side","load":"10kg plate","target":["ankle"],"cue":"Track knee over toe."},
        {"id":"tibialis-raise","name":"Tibialis Raise","sets":3,"reps_or_time":"15","load":"Bodyweight or band","target":["ankle"],"cue":"Toes up, control down."}
      ]},
      {"name":"Posterior chain & end-range","duration_min":15,"movements":[
        {"id":"jefferson-curl","name":"Jefferson Curl","sets":3,"reps_or_time":"8 slow","load":"10-15kg","target":["spine","hamstring","posterior-chain"],"cue":"Slow, segmental."},
        {"id":"atg-split-squat","name":"ATG Split Squat","sets":3,"reps_or_time":"8/side","load":"DBs 5-10kg","target":["hip","butt-wink"],"cue":"Back knee touches floor."},
        {"id":"goblet-squat-hold-pulses","name":"Goblet Squat Hold + Pulses","sets":2,"reps_or_time":"30s + 10 pulses","load":"16-20kg","target":["squat-pattern"],"cue":"Elbows push knees, stay deep."},
        {"id":"glute-bridge-posterior-tilt","name":"Glute Bridge w/ Posterior Tilt","sets":3,"reps_or_time":"12","target":["glute","butt-wink"],"cue":"Tuck pelvis, squeeze top."}
      ]}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    duration_min = EXCLUDED.duration_min,
    prerequisites = EXCLUDED.prerequisites,
    blocks = EXCLUDED.blocks,
    updated_at = now();

-- 5. user_config -------------------------------------------------------------

INSERT INTO user_config (id, active_block_id)
VALUES ('singleton', 'block-4')
ON CONFLICT (id) DO UPDATE SET active_block_id = EXCLUDED.active_block_id;

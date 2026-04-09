-- 1. Modify existing `meals` table
ALTER TABLE meals ADD COLUMN IF NOT EXISTS portions INT DEFAULT 2;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS cuisine TEXT;

-- 2. Create `workouts` table
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_num INT,
    start_date TEXT,
    end_date TEXT,
    phase TEXT,
    date TEXT,
    day_name TEXT,
    session_type TEXT,
    main_workout TEXT,
    support TEXT,
    rpe TEXT,
    notes TEXT,
    comments TEXT
);

-- 3. Create `timeline_events` table
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    what TEXT NOT NULL,
    when_date TEXT,
    why TEXT,
    icon TEXT
);

-- 4. Set up simple RLS (Row Level Security) policies if needed
-- If you want your app to be public for now:
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON workouts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON workouts FOR INSERT WITH CHECK (true);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON timeline_events FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON timeline_events FOR INSERT WITH CHECK (true);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON meals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON meals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON meals FOR UPDATE USING (true) WITH CHECK (true);

-- Create the travel plans table
CREATE TABLE IF NOT EXISTS travel_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Optional: Link to authenticated user if enforcing auth
    destination_id TEXT NOT NULL,
    experience_id TEXT NOT NULL,
    status TEXT DEFAULT 'planned', -- 'planned', 'booked', 'completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(destination_id, experience_id) -- Prevent duplicate entries for the same experience
);

-- Enable RLS
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;

-- Allow public access (matching existing patterns in the app for simplicity)
-- Ideally this would be restricted to authenticated users matching user_id
CREATE POLICY "Enable all access for all users on travel plans" ON travel_plans FOR ALL USING (true) WITH CHECK (true);

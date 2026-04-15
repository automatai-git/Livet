-- Create the bucket list items table
CREATE TABLE IF NOT EXISTS bucket_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_label TEXT NOT NULL, -- 'andreas' or 'julie'
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;

-- Allow public access (matching existing patterns in the app)
CREATE POLICY "Enable all access for all users" ON bucket_list_items FOR ALL USING (true) WITH CHECK (true);

-- Create a table to store relevant dates for the user (e.g., training program start)
CREATE TABLE IF NOT EXISTS public.relevant_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_label TEXT UNIQUE NOT NULL,
    date_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS for simple personal use, or configure as needed
ALTER TABLE public.relevant_dates DISABLE ROW LEVEL SECURITY;

-- Insert a default placeholder for training start date if it doesn't exist
INSERT INTO public.relevant_dates (date_label, date_value)
VALUES ('training_start', '')
ON CONFLICT (date_label) DO NOTHING;

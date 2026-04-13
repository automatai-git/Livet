-- Run this SQL in your Supabase SQL Editor to create the tables

CREATE TABLE public.meals (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Dinner',
  time_to_cook TEXT,
  macros JSONB,
  ingredients JSONB,
  emoji TEXT DEFAULT '🍲'
);

CREATE TABLE public.weekly_menu (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  day_of_week TEXT NOT NULL,
  meal_type TEXT DEFAULT 'Dinner',
  meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE
);

-- Note: Ensure Row Level Security (RLS) is either disabled for testing,
-- or properly configured with policies to allow anonymous/authenticated users to read & write.
-- For a private personal app, the easiest (though less secure) method is disabling RLS:
ALTER TABLE public.meals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_menu DISABLE ROW LEVEL SECURITY;

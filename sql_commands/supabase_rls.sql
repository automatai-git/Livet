-- 1. Enable RLS on your tables
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_menu ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for the 'meals' table
-- This allows any user who is logged in (authenticated) to select, insert, update, or delete ANY meal.
CREATE POLICY "Allow authenticated users full access to meals" 
  ON public.meals FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 3. Create Policy for the 'weekly_menu' table
-- This allows any logged-in user to manage the weekly schedule.
CREATE POLICY "Allow authenticated users full access to weekly_menu" 
  ON public.weekly_menu FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

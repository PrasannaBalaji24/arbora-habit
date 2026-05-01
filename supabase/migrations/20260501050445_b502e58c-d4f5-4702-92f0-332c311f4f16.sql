-- Add day_entries table to persist per-day notes, time blocks, and wasted time entries
CREATE TABLE IF NOT EXISTS public.day_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  time_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  wasted_time JSONB NOT NULL DEFAULT '[]'::jsonb,
  backfilled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

ALTER TABLE public.day_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_day_entries_all" ON public.day_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_day_entries_updated_at
  BEFORE UPDATE ON public.day_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_day_entries_user_date ON public.day_entries (user_id, entry_date);

-- Also add updated_at trigger to habits and habit_logs (idempotent)
DO $$ BEGIN
  CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON public.habits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_habit_logs_updated_at BEFORE UPDATE ON public.habit_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unique log per habit per day (so upserts work)
DO $$ BEGIN
  ALTER TABLE public.habit_logs ADD CONSTRAINT habit_logs_user_habit_date_uniq UNIQUE (user_id, habit_id, log_date);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
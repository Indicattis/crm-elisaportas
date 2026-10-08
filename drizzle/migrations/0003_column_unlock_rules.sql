ALTER TABLE public.funnel_columns
  ADD COLUMN IF NOT EXISTS lock_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_depends_on_column_id uuid NULL,
  ADD COLUMN IF NOT EXISTS lock_conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lock_accepted_colors text[] NOT NULL DEFAULT '{green}';
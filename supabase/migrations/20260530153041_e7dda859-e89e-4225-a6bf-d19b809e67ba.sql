ALTER TABLE public.funnel_columns
ADD COLUMN IF NOT EXISTS daily_colors text[] NOT NULL DEFAULT ARRAY['red','yellow','green'];
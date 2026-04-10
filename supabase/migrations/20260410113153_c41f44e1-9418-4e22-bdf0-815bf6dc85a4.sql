ALTER TABLE public.funnel_columns 
ADD COLUMN allowed_actions text[] NOT NULL DEFAULT ARRAY['sold','lost','disqualified'];
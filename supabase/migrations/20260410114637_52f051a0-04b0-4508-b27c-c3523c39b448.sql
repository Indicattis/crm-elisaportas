ALTER TABLE public.funnel_columns
ADD COLUMN is_notice boolean NOT NULL DEFAULT false,
ADD COLUMN notice_text text;

-- Add heat column to deals
ALTER TABLE public.deals ADD COLUMN heat integer NOT NULL DEFAULT 0;

-- Create deal_comments table
CREATE TABLE public.deal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deal comments"
  ON public.deal_comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deal comments"
  ON public.deal_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deal comments"
  ON public.deal_comments FOR DELETE
  USING (auth.uid() = user_id);

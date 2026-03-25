-- 1. Create funnels table
CREATE TABLE public.funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funnels" ON public.funnels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own funnels" ON public.funnels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own funnels" ON public.funnels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own funnels" ON public.funnels FOR DELETE USING (auth.uid() = user_id);

-- 2. Create funnel_columns table
CREATE TABLE public.funnel_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funnel_columns" ON public.funnel_columns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own funnel_columns" ON public.funnel_columns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own funnel_columns" ON public.funnel_columns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own funnel_columns" ON public.funnel_columns FOR DELETE USING (auth.uid() = user_id);

-- 3. Add funnel_id to deals
ALTER TABLE public.deals ADD COLUMN funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL;
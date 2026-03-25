
-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Deal-Tags junction table
CREATE TABLE public.deal_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, tag_id)
);
ALTER TABLE public.deal_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deal_tags" ON public.deal_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_tags.deal_id AND deals.user_id = auth.uid())
);
CREATE POLICY "Users can create their own deal_tags" ON public.deal_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_tags.deal_id AND deals.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own deal_tags" ON public.deal_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.deals WHERE deals.id = deal_tags.deal_id AND deals.user_id = auth.uid())
);

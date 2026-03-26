ALTER TABLE public.deals ADD COLUMN archived boolean NOT NULL DEFAULT false;
CREATE INDEX idx_deals_not_archived ON public.deals (funnel_id) WHERE archived = false;
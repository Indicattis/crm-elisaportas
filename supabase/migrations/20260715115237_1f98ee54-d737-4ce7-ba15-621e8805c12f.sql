ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sold_at timestamptz;
UPDATE public.deals SET sold_at = updated_at WHERE status = 'Vendido' AND sold_at IS NULL;
CREATE INDEX IF NOT EXISTS deals_sold_at_idx ON public.deals (sold_at);
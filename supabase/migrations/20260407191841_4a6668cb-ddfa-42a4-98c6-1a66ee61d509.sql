CREATE TABLE public.deal_daily_color (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  color text NOT NULL DEFAULT 'red',
  date date NOT NULL DEFAULT CURRENT_DATE,
  updated_by uuid NOT NULL,
  UNIQUE(deal_id, date)
);

ALTER TABLE public.deal_daily_color ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read deal_daily_color"
  ON public.deal_daily_color FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert deal_daily_color"
  ON public.deal_daily_color FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update deal_daily_color"
  ON public.deal_daily_color FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
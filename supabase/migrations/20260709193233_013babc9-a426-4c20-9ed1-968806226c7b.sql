
CREATE TABLE public.column_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL,
  column_name text NOT NULL,
  seller_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX column_daily_snapshots_unique
ON public.column_daily_snapshots (funnel_id, column_name, date, COALESCE(seller_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX column_daily_snapshots_lookup
ON public.column_daily_snapshots (funnel_id, date);

GRANT SELECT, INSERT ON public.column_daily_snapshots TO authenticated;
GRANT ALL ON public.column_daily_snapshots TO service_role;

ALTER TABLE public.column_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read snapshots"
ON public.column_daily_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert snapshots"
ON public.column_daily_snapshots FOR INSERT TO authenticated WITH CHECK (true);

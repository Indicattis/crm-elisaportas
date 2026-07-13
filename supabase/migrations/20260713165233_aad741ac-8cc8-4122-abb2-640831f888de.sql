
DO $$ BEGIN
  CREATE TYPE public.sales_temperature AS ENUM ('hot', 'warm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.sales_planning_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  temperature public.sales_temperature NOT NULL DEFAULT 'hot',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_planning_clients TO authenticated;
GRANT ALL ON public.sales_planning_clients TO service_role;

ALTER TABLE public.sales_planning_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view planning clients"
  ON public.sales_planning_clients FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert planning clients"
  ON public.sales_planning_clients FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update planning clients"
  ON public.sales_planning_clients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete planning clients"
  ON public.sales_planning_clients FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_sales_planning_clients_updated_at
  BEFORE UPDATE ON public.sales_planning_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sales_planning_clients_seller ON public.sales_planning_clients(seller_id);

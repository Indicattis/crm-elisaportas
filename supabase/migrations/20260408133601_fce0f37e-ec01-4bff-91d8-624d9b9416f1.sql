CREATE TABLE public.lead_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funnel_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Lead',
  acquisition_channel text,
  user_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead_flows" ON public.lead_flows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Authenticated can view lead_flows" ON public.lead_flows
  FOR SELECT TO authenticated USING (true);
CREATE TABLE public.external_integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'hunt',
  status text NOT NULL,
  http_status int NOT NULL,
  title text,
  phone text,
  deal_id uuid,
  assigned_to uuid,
  warning text,
  error_message text,
  ip text,
  user_agent text,
  raw_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.external_integration_logs TO authenticated;
GRANT ALL ON public.external_integration_logs TO service_role;

ALTER TABLE public.external_integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read integration logs"
  ON public.external_integration_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete integration logs"
  ON public.external_integration_logs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX external_integration_logs_created_at_idx
  ON public.external_integration_logs (created_at DESC);
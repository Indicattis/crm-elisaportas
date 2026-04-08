CREATE TABLE public.acquisition_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'megaphone',
  position integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.acquisition_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage channels" ON public.acquisition_channels
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Authenticated can view channels" ON public.acquisition_channels
  FOR SELECT TO authenticated
  USING (true);
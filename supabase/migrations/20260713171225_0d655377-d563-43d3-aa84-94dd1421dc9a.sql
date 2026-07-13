
CREATE TABLE public.company_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  value numeric NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.company_revenue TO authenticated;
GRANT ALL ON public.company_revenue TO service_role;

ALTER TABLE public.company_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view company revenue"
ON public.company_revenue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert company revenue"
ON public.company_revenue FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company revenue"
ON public.company_revenue FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_company_revenue_updated_at
BEFORE UPDATE ON public.company_revenue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.company_revenue (singleton, value) VALUES (true, 0);

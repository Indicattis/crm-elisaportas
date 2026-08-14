CREATE TABLE public.crm_monitoring (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_time time without time zone,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (seller_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_monitoring TO authenticated;
GRANT ALL ON public.crm_monitoring TO service_role;

ALTER TABLE public.crm_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all monitoring"
ON public.crm_monitoring FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR seller_id = auth.uid());

CREATE POLICY "Admins can insert monitoring"
ON public.crm_monitoring FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update monitoring"
ON public.crm_monitoring FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete monitoring"
ON public.crm_monitoring FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_crm_monitoring_updated_at
BEFORE UPDATE ON public.crm_monitoring
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_crm_monitoring_date ON public.crm_monitoring(date);
CREATE TABLE public.shared_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.shared_notes TO authenticated;
GRANT ALL ON public.shared_notes TO service_role;

ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view shared notes"
ON public.shared_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert shared notes"
ON public.shared_notes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update shared notes"
ON public.shared_notes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.shared_notes (content) VALUES ('');
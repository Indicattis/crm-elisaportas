CREATE TABLE public.contact_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  color text NOT NULL DEFAULT 'red',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_colors TO authenticated;
GRANT ALL ON public.contact_colors TO service_role;

ALTER TABLE public.contact_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funnel members can view contact colors"
  ON public.contact_colors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_colors.contact_id
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM public.funnel_members fm
            WHERE fm.funnel_id = c.funnel_id AND fm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Funnel members can insert contact colors"
  ON public.contact_colors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_colors.contact_id
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM public.funnel_members fm
            WHERE fm.funnel_id = c.funnel_id AND fm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Funnel members can update contact colors"
  ON public.contact_colors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_colors.contact_id
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM public.funnel_members fm
            WHERE fm.funnel_id = c.funnel_id AND fm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Funnel members can delete contact colors"
  ON public.contact_colors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_colors.contact_id
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR EXISTS (
            SELECT 1 FROM public.funnel_members fm
            WHERE fm.funnel_id = c.funnel_id AND fm.user_id = auth.uid()
          )
        )
    )
  );

CREATE TRIGGER update_contact_colors_updated_at
  BEFORE UPDATE ON public.contact_colors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
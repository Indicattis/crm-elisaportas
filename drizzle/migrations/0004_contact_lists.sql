CREATE TABLE public.contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_lists TO authenticated;
GRANT ALL ON public.contact_lists TO service_role;
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contact lists readable" ON public.contact_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Contact lists admin manage" ON public.contact_lists FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.contacts ADD COLUMN list_id uuid REFERENCES public.contact_lists(id) ON DELETE SET NULL;
CREATE INDEX contacts_list_id_idx ON public.contacts(list_id);

INSERT INTO public.contact_lists (id, name, color, position)
SELECT fc.id, fc.name, fc.color, fc.position FROM public.funnel_columns fc WHERE fc.column_type = 'contacts';
UPDATE public.contacts SET list_id = column_id WHERE column_id IN (SELECT id FROM public.contact_lists);

ALTER TABLE public.contacts ALTER COLUMN column_id DROP NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN funnel_id DROP NOT NULL;
ALTER TABLE public.contacts DROP CONSTRAINT contacts_column_id_fkey;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.funnel_columns(id) ON DELETE SET NULL;
ALTER TABLE public.contacts DROP CONSTRAINT contacts_funnel_id_fkey;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.contacts.column_id IS 'DEPRECATED: replaced by list_id';
COMMENT ON COLUMN public.contacts.funnel_id IS 'DEPRECATED: contacts live in contact_lists';
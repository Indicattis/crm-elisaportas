
-- 1. Enum de tipos de coluna
DO $$ BEGIN
  CREATE TYPE public.column_type AS ENUM ('deals','notice','contacts');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Coluna column_type em funnel_columns
ALTER TABLE public.funnel_columns
  ADD COLUMN IF NOT EXISTS column_type public.column_type NOT NULL DEFAULT 'deals';

-- Migrar is_notice existente
UPDATE public.funnel_columns SET column_type = 'notice' WHERE is_notice = true AND column_type = 'deals';

-- 3. Tabela contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.funnel_columns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  state text,
  city text,
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contacts view accessible" ON public.contacts;
CREATE POLICY "Contacts view accessible" ON public.contacts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = contacts.funnel_id AND fm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Contacts insert own" ON public.contacts;
CREATE POLICY "Contacts insert own" ON public.contacts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Contacts update own" ON public.contacts;
CREATE POLICY "Contacts update own" ON public.contacts FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Contacts delete own" ON public.contacts;
CREATE POLICY "Contacts delete own" ON public.contacts FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Vínculo deals.contact_id
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON public.deals(contact_id);


CREATE TABLE public.column_blocked_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.funnel_columns(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (column_id, field_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.column_blocked_fields TO authenticated;
GRANT ALL ON public.column_blocked_fields TO service_role;

ALTER TABLE public.column_blocked_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view blocked fields"
  ON public.column_blocked_fields FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blocked fields"
  ON public.column_blocked_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE INDEX idx_column_blocked_fields_column_id ON public.column_blocked_fields(column_id);

-- Trigger to clear blocked fields on deal insert/status change
CREATE OR REPLACE FUNCTION public.clear_blocked_fields_on_deal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked text[];
BEGIN
  IF NEW.funnel_id IS NULL OR NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.funnel_id IS NOT DISTINCT FROM NEW.funnel_id THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(cbf.field_name) INTO v_blocked
  FROM public.column_blocked_fields cbf
  JOIN public.funnel_columns fc ON fc.id = cbf.column_id
  WHERE fc.funnel_id = NEW.funnel_id AND fc.name = NEW.status;

  IF v_blocked IS NULL THEN
    RETURN NEW;
  END IF;

  IF 'phone' = ANY(v_blocked) THEN NEW.phone := NULL; END IF;
  IF 'email' = ANY(v_blocked) THEN NEW.email := NULL; END IF;
  IF 'value' = ANY(v_blocked) THEN NEW.value := NULL; END IF;
  IF 'state' = ANY(v_blocked) THEN NEW.state := NULL; END IF;
  IF 'city' = ANY(v_blocked) THEN NEW.city := NULL; END IF;
  IF 'acquisition_channel' = ANY(v_blocked) THEN NEW.acquisition_channel := NULL; END IF;
  IF 'notes' = ANY(v_blocked) THEN NEW.notes := NULL; END IF;
  IF 'return_date' = ANY(v_blocked) THEN NEW.return_date := NULL; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_blocked_fields ON public.deals;
CREATE TRIGGER trg_clear_blocked_fields
  BEFORE INSERT OR UPDATE OF status, funnel_id ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.clear_blocked_fields_on_deal_change();

-- AFTER trigger to clear tags on status change
CREATE OR REPLACE FUNCTION public.clear_blocked_tags_on_deal_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked_tags boolean;
BEGIN
  IF NEW.funnel_id IS NULL OR NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.funnel_id IS NOT DISTINCT FROM NEW.funnel_id THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.column_blocked_fields cbf
    JOIN public.funnel_columns fc ON fc.id = cbf.column_id
    WHERE fc.funnel_id = NEW.funnel_id AND fc.name = NEW.status
      AND cbf.field_name = 'tags'
  ) INTO v_blocked_tags;

  IF v_blocked_tags THEN
    DELETE FROM public.deal_tags WHERE deal_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_blocked_tags ON public.deals;
CREATE TRIGGER trg_clear_blocked_tags
  AFTER INSERT OR UPDATE OF status, funnel_id ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.clear_blocked_tags_on_deal_change();

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_digits text;
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_phone_digits_uniq ON public.clients(user_id, phone_digits) WHERE phone_digits IS NOT NULL;

CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.upsert_client_from_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_digits text;
  v_owner uuid;
  v_client uuid;
BEGIN
  IF NEW.status <> 'Vendido' THEN RETURN NEW; END IF;
  v_digits := regexp_replace(coalesce(NEW.phone,''), '\D', '', 'g');
  IF length(v_digits) < 10 THEN RETURN NEW; END IF;
  v_owner := coalesce(NEW.assigned_to, NEW.user_id);
  INSERT INTO public.clients (user_id, name, phone, email, phone_digits)
  VALUES (v_owner, NEW.title, NEW.phone, NEW.email, v_digits)
  ON CONFLICT (user_id, phone_digits) WHERE phone_digits IS NOT NULL
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_client;
  IF NEW.client_id IS DISTINCT FROM v_client THEN
    UPDATE public.deals SET client_id = v_client WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_upsert_client_from_deal
AFTER INSERT OR UPDATE OF status, sold_at, assigned_to, phone ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.upsert_client_from_deal();

INSERT INTO public.clients (user_id, name, phone, email, phone_digits)
SELECT DISTINCT ON (owner, digits) owner, title, phone, email, digits
FROM (
  SELECT coalesce(assigned_to, user_id) owner, regexp_replace(coalesce(phone,''),'\D','','g') digits,
         title, phone, email, coalesce(sold_at, updated_at) ts
  FROM public.deals WHERE status = 'Vendido'
) s
WHERE length(digits) >= 10
ORDER BY owner, digits, ts DESC
ON CONFLICT DO NOTHING;

UPDATE public.deals d SET client_id = c.id
FROM public.clients c
WHERE d.status = 'Vendido'
  AND c.user_id = coalesce(d.assigned_to, d.user_id)
  AND c.phone_digits = regexp_replace(coalesce(d.phone,''),'\D','','g');
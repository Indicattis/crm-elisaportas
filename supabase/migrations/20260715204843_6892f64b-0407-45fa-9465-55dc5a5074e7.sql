CREATE OR REPLACE FUNCTION public.mark_deal_as_sold(_deal_id uuid, _sold_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_deal public.deals%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_deal
  FROM public.deals
  WHERE id = _deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negociação não encontrada';
  END IF;

  IF NOT (
    public.has_role(v_user, 'admin'::public.app_role)
    OR v_deal.user_id = v_user
    OR v_deal.assigned_to = v_user
    OR EXISTS (
      SELECT 1
      FROM public.funnel_members fm
      WHERE fm.funnel_id = v_deal.funnel_id
        AND fm.user_id = v_user
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para marcar esta negociação como vendida';
  END IF;

  UPDATE public.deals
  SET status = 'Vendido',
      sold_at = _sold_at,
      updated_at = now()
  WHERE id = _deal_id;

  INSERT INTO public.deal_history (deal_id, user_id, event_type, description, metadata)
  VALUES (
    _deal_id,
    v_user,
    'column_change',
    format('Moveu de "%s" para "Vendido"', v_deal.status),
    jsonb_build_object('from', v_deal.status, 'to', 'Vendido')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_deal_as_sold(uuid, timestamptz) TO authenticated;
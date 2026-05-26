CREATE OR REPLACE FUNCTION public.add_deal_tasks_cycle(_deal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_cycle int;
  v_last_stage_id uuid;
  v_has_any boolean;
  v_src RECORD;
  v_now timestamptz := now();
  v_deadline_hours int;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.deal_tasks WHERE deal_id = _deal_id) INTO v_has_any;
  IF NOT v_has_any THEN
    RETURN;
  END IF;

  SELECT MAX(cycle) INTO v_last_cycle FROM public.deal_tasks WHERE deal_id = _deal_id;

  -- Determine the last stage within the last cycle (highest position in task_group_stages)
  SELECT dt.stage_id INTO v_last_stage_id
  FROM public.deal_tasks dt
  LEFT JOIN public.task_group_stages tgs ON tgs.id = dt.stage_id
  WHERE dt.deal_id = _deal_id AND dt.cycle = v_last_cycle
  ORDER BY (dt.stage_id IS NULL) ASC, COALESCE(tgs.position, -1) DESC
  LIMIT 1;

  -- Insert copies of the source-stage tasks as a new cycle
  FOR v_src IN
    SELECT dt.template_id, dt.type, dt.description, dt.stage_id, dt.next_recurrence_at,
           tt.deadline_hours
    FROM public.deal_tasks dt
    LEFT JOIN public.task_templates tt ON tt.id = dt.template_id
    WHERE dt.deal_id = _deal_id
      AND dt.cycle = v_last_cycle
      AND dt.stage_id IS NOT DISTINCT FROM v_last_stage_id
  LOOP
    v_deadline_hours := COALESCE(v_src.deadline_hours, 24);
    INSERT INTO public.deal_tasks
      (deal_id, template_id, type, description, deadline_at, stage_id, next_recurrence_at, cycle)
    VALUES
      (_deal_id, v_src.template_id, v_src.type, v_src.description,
       v_now + (v_deadline_hours || ' hours')::interval,
       v_src.stage_id, v_src.next_recurrence_at, v_last_cycle + 1);
  END LOOP;
END;
$function$;
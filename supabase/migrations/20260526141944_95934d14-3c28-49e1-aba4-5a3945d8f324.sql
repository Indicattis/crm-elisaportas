ALTER TABLE public.deal_tasks ADD COLUMN IF NOT EXISTS cycle INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_deal_tasks_deal_cycle ON public.deal_tasks(deal_id, cycle);

CREATE OR REPLACE FUNCTION public.add_deal_tasks_cycle(_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_task_group_id uuid;
  v_group RECORD;
  v_template RECORD;
  v_sched RECORD;
  v_now timestamptz := now();
  v_next_at timestamptz;
  v_diff int;
  v_last_day int;
  v_day int;
  v_deadline timestamptz;
  v_next_cycle int;
BEGIN
  SELECT id, funnel_id, status INTO v_deal
  FROM public.deals WHERE id = _deal_id;

  IF NOT FOUND OR v_deal.funnel_id IS NULL THEN
    RETURN;
  END IF;

  SELECT fc.task_group_id INTO v_task_group_id
  FROM public.funnel_columns fc
  WHERE fc.funnel_id = v_deal.funnel_id AND fc.name = v_deal.status
  LIMIT 1;

  IF v_task_group_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(cycle), 0) + 1 INTO v_next_cycle
  FROM public.deal_tasks WHERE deal_id = _deal_id;

  IF v_next_cycle < 2 THEN
    v_next_cycle := 2;
  END IF;

  SELECT * INTO v_group FROM public.task_groups WHERE id = v_task_group_id;

  IF v_group.schedule_mode = 'recurring_days' THEN
    FOR v_sched IN
      SELECT task_type, task_description, days, "time"
      FROM public.task_group_schedules
      WHERE group_id = v_task_group_id
      ORDER BY position
    LOOP
      IF v_sched.days IS NOT NULL AND array_length(v_sched.days, 1) > 0 THEN
        FOREACH v_day IN ARRAY v_sched.days LOOP
          v_deadline := date_trunc('day', v_now) + (v_day || ' days')::interval + v_sched."time";
          INSERT INTO public.deal_tasks (deal_id, type, description, deadline_at, cycle)
          VALUES (_deal_id, v_sched.task_type, v_sched.task_description, v_deadline, v_next_cycle);
        END LOOP;
      END IF;
    END LOOP;
    RETURN;
  END IF;

  FOR v_template IN
    SELECT id, type, description, deadline_hours, recurrence_type, recurrence_value, stage_id
    FROM public.task_templates
    WHERE group_id = v_task_group_id
    ORDER BY position
  LOOP
    v_next_at := NULL;

    IF v_template.recurrence_type IS NOT NULL AND v_template.recurrence_value IS NOT NULL THEN
      IF v_template.recurrence_type = 'interval' THEN
        v_next_at := v_now + (v_template.recurrence_value || ' hours')::interval;
      ELSIF v_template.recurrence_type = 'weekday' THEN
        v_diff := (v_template.recurrence_value - EXTRACT(DOW FROM v_now)::int + 7) % 7;
        IF v_diff = 0 THEN v_diff := 7; END IF;
        v_next_at := date_trunc('day', v_now) + (v_diff || ' days')::interval + interval '9 hours';
      ELSIF v_template.recurrence_type = 'monthday' THEN
        IF EXTRACT(DAY FROM v_now)::int >= v_template.recurrence_value THEN
          v_next_at := date_trunc('month', v_now) + interval '1 month';
        ELSE
          v_next_at := date_trunc('month', v_now);
        END IF;
        v_last_day := EXTRACT(DAY FROM (v_next_at + interval '1 month' - interval '1 day'))::int;
        v_next_at := v_next_at + (LEAST(v_template.recurrence_value, v_last_day) - 1 || ' days')::interval + interval '9 hours';
      END IF;
    END IF;

    INSERT INTO public.deal_tasks (deal_id, template_id, type, description, deadline_at, stage_id, next_recurrence_at, cycle)
    VALUES (
      _deal_id,
      v_template.id,
      v_template.type,
      v_template.description,
      v_now + (v_template.deadline_hours || ' hours')::interval,
      v_template.stage_id,
      v_next_at,
      v_next_cycle
    );
  END LOOP;
END;
$function$;
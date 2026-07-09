-- 1. Update trigger function to delete ALL tasks on column change
CREATE OR REPLACE FUNCTION public.handle_deal_tasks_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Remove ALL tasks (pending + completed) from previous column
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    DELETE FROM public.deal_tasks WHERE deal_id = NEW.id;
  END IF;

  IF NEW.funnel_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fc.task_group_id INTO v_task_group_id
  FROM public.funnel_columns fc
  WHERE fc.funnel_id = NEW.funnel_id AND fc.name = NEW.status
  LIMIT 1;

  IF v_task_group_id IS NULL THEN
    RETURN NEW;
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
          INSERT INTO public.deal_tasks (deal_id, type, description, deadline_at)
          VALUES (NEW.id, v_sched.task_type, v_sched.task_description, v_deadline);
        END LOOP;
      END IF;
    END LOOP;
    RETURN NEW;
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

    INSERT INTO public.deal_tasks (deal_id, template_id, type, description, deadline_at, stage_id, next_recurrence_at)
    VALUES (
      NEW.id,
      v_template.id,
      v_template.type,
      v_template.description,
      v_now + (v_template.deadline_hours || ' hours')::interval,
      v_template.stage_id,
      v_next_at
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 2. Update recreate_deal_tasks to delete ALL tasks
CREATE OR REPLACE FUNCTION public.recreate_deal_tasks(_deal_id uuid)
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
BEGIN
  SELECT id, funnel_id, status INTO v_deal
  FROM public.deals WHERE id = _deal_id;

  IF NOT FOUND OR v_deal.funnel_id IS NULL THEN
    RETURN;
  END IF;

  -- Remove ALL tasks before recreating
  DELETE FROM public.deal_tasks WHERE deal_id = _deal_id;

  SELECT fc.task_group_id INTO v_task_group_id
  FROM public.funnel_columns fc
  WHERE fc.funnel_id = v_deal.funnel_id AND fc.name = v_deal.status
  LIMIT 1;

  IF v_task_group_id IS NULL THEN
    RETURN;
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
          INSERT INTO public.deal_tasks (deal_id, type, description, deadline_at)
          VALUES (_deal_id, v_sched.task_type, v_sched.task_description, v_deadline);
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

    INSERT INTO public.deal_tasks (deal_id, template_id, type, description, deadline_at, stage_id, next_recurrence_at)
    VALUES (
      _deal_id,
      v_template.id,
      v_template.type,
      v_template.description,
      v_now + (v_template.deadline_hours || ' hours')::interval,
      v_template.stage_id,
      v_next_at
    );
  END LOOP;
END;
$function$;

-- 3. Cleanup: delete tasks from deals in columns without task_group_id (or without matching column)
DELETE FROM public.deal_tasks dt
USING public.deals d
LEFT JOIN public.funnel_columns fc
  ON fc.funnel_id = d.funnel_id AND fc.name = d.status
WHERE dt.deal_id = d.id
  AND (fc.id IS NULL OR fc.task_group_id IS NULL);

-- 4. For deals whose current column has a task_group but existing tasks belong to a different group,
--    delete those orphan tasks and recreate from the correct group.
WITH orphans AS (
  SELECT DISTINCT d.id AS deal_id
  FROM public.deals d
  JOIN public.funnel_columns fc
    ON fc.funnel_id = d.funnel_id AND fc.name = d.status
  JOIN public.deal_tasks dt ON dt.deal_id = d.id
  LEFT JOIN public.task_templates tt ON tt.id = dt.template_id
  WHERE fc.task_group_id IS NOT NULL
    AND (
      (dt.template_id IS NOT NULL AND tt.group_id IS DISTINCT FROM fc.task_group_id)
    )
)
SELECT public.recreate_deal_tasks(deal_id) FROM orphans;

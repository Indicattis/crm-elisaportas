-- 1. Create task_group_schedules table
CREATE TABLE public.task_group_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  task_type text NOT NULL DEFAULT 'personalizada',
  task_description text,
  days integer[] NOT NULL DEFAULT '{}',
  time time without time zone NOT NULL DEFAULT '09:00:00',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_group_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view task_group_schedules"
ON public.task_group_schedules FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert task_group_schedules"
ON public.task_group_schedules FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Admins can update task_group_schedules"
ON public.task_group_schedules FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete task_group_schedules"
ON public.task_group_schedules FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_task_group_schedules_group ON public.task_group_schedules(group_id);

-- 2. Migrate existing data from task_groups
INSERT INTO public.task_group_schedules (group_id, user_id, task_type, task_description, days, time, position)
SELECT id, user_id, schedule_task_type, schedule_task_description, schedule_days, schedule_time, 0
FROM public.task_groups
WHERE schedule_mode = 'recurring_days'
  AND schedule_days IS NOT NULL
  AND array_length(schedule_days, 1) > 0;

-- 3. Update recreate_deal_tasks
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
BEGIN
  SELECT id, funnel_id, status INTO v_deal
  FROM public.deals WHERE id = _deal_id;

  IF NOT FOUND OR v_deal.funnel_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.deal_tasks
  WHERE deal_id = _deal_id AND completed = false;

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
          INSERT INTO public.deal_tasks (deal_id, type, description, deadline_at)
          VALUES (
            _deal_id,
            v_sched.task_type,
            v_sched.task_description,
            date_trunc('day', v_now) + (v_day || ' days')::interval + v_sched."time"
          );
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

-- 4. Update handle_deal_tasks_on_status_change
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
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.funnel_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.deal_tasks
    WHERE deal_id = NEW.id AND completed = false;
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
          INSERT INTO public.deal_tasks (deal_id, type, description, deadline_at)
          VALUES (
            NEW.id,
            v_sched.task_type,
            v_sched.task_description,
            date_trunc('day', v_now) + (v_day || ' days')::interval + v_sched."time"
          );
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
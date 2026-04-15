
-- Function to handle automatic task creation on deal status change
CREATE OR REPLACE FUNCTION public.handle_deal_tasks_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_group_id uuid;
  v_template RECORD;
  v_now timestamptz := now();
  v_next_at timestamptz;
  v_diff int;
  v_last_day int;
BEGIN
  -- On UPDATE, skip if status didn't change
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Skip if no funnel_id
  IF NEW.funnel_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, delete pending (not completed) tasks
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.deal_tasks
    WHERE deal_id = NEW.id AND completed = false;
  END IF;

  -- Find the task_group_id for this column
  SELECT fc.task_group_id INTO v_task_group_id
  FROM public.funnel_columns fc
  WHERE fc.funnel_id = NEW.funnel_id AND fc.name = NEW.status
  LIMIT 1;

  IF v_task_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create tasks from templates
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
$$;

-- Create trigger
CREATE TRIGGER trg_deal_tasks_on_status_change
AFTER INSERT OR UPDATE OF status ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.handle_deal_tasks_on_status_change();

-- RPC to manually recreate tasks for a deal
CREATE OR REPLACE FUNCTION public.recreate_deal_tasks(_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_task_group_id uuid;
  v_template RECORD;
  v_now timestamptz := now();
  v_next_at timestamptz;
  v_diff int;
  v_last_day int;
BEGIN
  SELECT id, funnel_id, status INTO v_deal
  FROM public.deals WHERE id = _deal_id;

  IF NOT FOUND OR v_deal.funnel_id IS NULL THEN
    RETURN;
  END IF;

  -- Delete pending tasks
  DELETE FROM public.deal_tasks
  WHERE deal_id = _deal_id AND completed = false;

  -- Find task_group_id
  SELECT fc.task_group_id INTO v_task_group_id
  FROM public.funnel_columns fc
  WHERE fc.funnel_id = v_deal.funnel_id AND fc.name = v_deal.status
  LIMIT 1;

  IF v_task_group_id IS NULL THEN
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
$$;

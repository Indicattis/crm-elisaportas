-- Unique index for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS deal_daily_color_deal_date_unique
ON public.deal_daily_color (deal_id, date);

-- Trigger function: set green when a task is completed
CREATE OR REPLACE FUNCTION public.set_green_on_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    v_user := COALESCE(NEW.completed_by, auth.uid());
    IF v_user IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.deal_daily_color (deal_id, date, color, updated_by)
    VALUES (NEW.deal_id, CURRENT_DATE, 'green', v_user)
    ON CONFLICT (deal_id, date) DO UPDATE
      SET color = 'green', updated_by = EXCLUDED.updated_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_green_on_task_completion_trigger ON public.deal_tasks;

CREATE TRIGGER set_green_on_task_completion_trigger
AFTER UPDATE ON public.deal_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_green_on_task_completion();
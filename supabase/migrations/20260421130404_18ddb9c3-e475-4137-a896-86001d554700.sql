CREATE OR REPLACE FUNCTION public.prevent_late_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed = true
     AND OLD.completed = false
     AND now() > OLD.deadline_at + interval '1 day' THEN
    RAISE EXCEPTION 'Tarefa expirada há mais de 1 dia não pode ser concluída';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_late_task_completion_trigger ON public.deal_tasks;

CREATE TRIGGER prevent_late_task_completion_trigger
BEFORE UPDATE ON public.deal_tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_late_task_completion();
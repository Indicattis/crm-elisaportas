CREATE OR REPLACE FUNCTION public.prevent_task_uncomplete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.completed = true AND NEW.completed = false THEN
    RAISE EXCEPTION 'Tarefas concluídas não podem ser desmarcadas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_task_uncomplete_trigger ON public.deal_tasks;

CREATE TRIGGER prevent_task_uncomplete_trigger
BEFORE UPDATE ON public.deal_tasks
FOR EACH ROW EXECUTE FUNCTION public.prevent_task_uncomplete();
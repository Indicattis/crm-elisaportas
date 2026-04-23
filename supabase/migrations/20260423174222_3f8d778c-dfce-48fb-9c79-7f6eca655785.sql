CREATE OR REPLACE FUNCTION public.prevent_task_uncomplete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.completed = true AND NEW.completed = false THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Tarefas concluídas não podem ser desmarcadas';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DELETE FROM public.deal_tasks dt
USING public.deals d, public.funnel_columns fc
WHERE dt.deal_id = d.id
  AND fc.funnel_id = d.funnel_id
  AND fc.name = d.status
  AND fc.task_group_id IS NULL
  AND dt.completed = false;

DELETE FROM public.deal_tasks dt
USING public.deals d
WHERE dt.deal_id = d.id
  AND d.funnel_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.funnel_columns fc
    WHERE fc.funnel_id = d.funnel_id AND fc.name = d.status
  )
  AND dt.completed = false;
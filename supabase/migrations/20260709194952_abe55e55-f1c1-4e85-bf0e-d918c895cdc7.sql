DELETE FROM public.deal_tasks dt
USING public.deals d
LEFT JOIN public.funnel_columns fc
  ON fc.funnel_id = d.funnel_id AND fc.name = d.status
WHERE dt.deal_id = d.id
  AND (fc.id IS NULL OR fc.task_group_id IS NULL);
DROP POLICY "Users can view accessible deals" ON public.deals;

CREATE POLICY "Users can view accessible deals" ON public.deals
FOR SELECT TO authenticated
USING (
  (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to IS NULL
    OR assigned_to = auth.uid()
  )
);
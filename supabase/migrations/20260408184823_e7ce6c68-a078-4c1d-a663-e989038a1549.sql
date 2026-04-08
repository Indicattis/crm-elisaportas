DROP POLICY "Users can update accessible deals" ON public.deals;

CREATE POLICY "Users can update accessible deals"
ON public.deals FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM funnel_members fm
    WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()
  )
);
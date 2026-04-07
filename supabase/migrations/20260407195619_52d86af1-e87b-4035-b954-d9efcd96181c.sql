DROP POLICY "Users can create deals in accessible funnels" ON public.deals;

CREATE POLICY "Users can create deals in accessible funnels" ON public.deals
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR funnel_id IS NULL
    OR EXISTS (SELECT 1 FROM funnels f WHERE f.id = deals.funnel_id AND f.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Users can view accessible funnels" ON public.funnels;

CREATE POLICY "Users can view accessible funnels" ON public.funnels
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM funnel_members fm
    WHERE fm.funnel_id = funnels.id AND fm.user_id = auth.uid()
  )
);
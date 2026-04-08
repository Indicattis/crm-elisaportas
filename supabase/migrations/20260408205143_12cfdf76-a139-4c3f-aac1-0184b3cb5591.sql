
DROP POLICY "Users can view accessible deal_tasks" ON public.deal_tasks;
CREATE POLICY "Users can view accessible deal_tasks"
ON public.deal_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_tasks.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);

DROP POLICY "Users can insert deal_tasks" ON public.deal_tasks;
CREATE POLICY "Users can insert deal_tasks"
ON public.deal_tasks FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_tasks.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);

DROP POLICY "Users can update deal_tasks" ON public.deal_tasks;
CREATE POLICY "Users can update deal_tasks"
ON public.deal_tasks FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_tasks.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);

DROP POLICY "Users can delete deal_tasks" ON public.deal_tasks;
CREATE POLICY "Users can delete deal_tasks"
ON public.deal_tasks FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_tasks.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);

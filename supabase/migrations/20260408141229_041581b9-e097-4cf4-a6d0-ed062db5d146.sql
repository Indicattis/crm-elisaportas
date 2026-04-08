DROP POLICY "Users can view accessible deal_history" ON deal_history;

CREATE POLICY "Users can view accessible deal_history"
ON deal_history FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_history.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);
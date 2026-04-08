
DROP POLICY "Users can view accessible deal_comments" ON public.deal_comments;

CREATE POLICY "Users can view accessible deal_comments"
ON public.deal_comments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = deal_comments.deal_id
    AND (
      deals.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM funnel_members fm
        WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY "Users can create deal comments on accessible deals" ON public.deal_comments;

CREATE POLICY "Users can create deal comments on accessible deals"
ON public.deal_comments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_comments.deal_id
      AND (
        deals.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM funnel_members fm
          WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid()
        )
      )
    )
  )
);

-- Fix funnels SELECT policy (bug: fm.funnel_id = fm.id -> fm.funnel_id = funnels.id)
DROP POLICY IF EXISTS "Users can view accessible funnels" ON public.funnels;
CREATE POLICY "Users can view accessible funnels" ON public.funnels
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.funnel_members fm
      WHERE fm.funnel_id = funnels.id AND fm.user_id = auth.uid()
    )
  );

-- Fix deal_tags SELECT: allow funnel members to see tags
DROP POLICY IF EXISTS "Users can view their own deal_tags" ON public.deal_tags;
CREATE POLICY "Users can view accessible deal_tags" ON public.deal_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_tags.deal_id
      AND (
        deals.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
      )
    )
  );

-- Fix deal_comments SELECT: allow funnel members to see comments
DROP POLICY IF EXISTS "Users can view their own deal comments" ON public.deal_comments;
CREATE POLICY "Users can view accessible deal_comments" ON public.deal_comments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_comments.deal_id
      AND EXISTS (SELECT 1 FROM funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
    )
  );

-- Allow funnel members to create comments on accessible deals
DROP POLICY IF EXISTS "Users can create their own deal comments" ON public.deal_comments;
CREATE POLICY "Users can create deal comments on accessible deals" ON public.deal_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_comments.deal_id
      AND (
        deals.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM funnel_members fm WHERE fm.funnel_id = deals.funnel_id AND fm.user_id = auth.uid())
      )
    )
  );
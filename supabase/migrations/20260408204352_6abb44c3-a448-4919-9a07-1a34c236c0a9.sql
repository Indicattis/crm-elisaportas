
-- Security definer function to check deal access without being blocked by deals RLS
CREATE OR REPLACE FUNCTION public.can_access_deal(_user_id uuid, _deal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = _deal_id
    AND (
      has_role(_user_id, 'admin'::app_role)
      OR d.user_id = _user_id
      OR EXISTS (
        SELECT 1 FROM public.funnel_members fm
        WHERE fm.funnel_id = d.funnel_id AND fm.user_id = _user_id
      )
    )
  )
$$;

-- Update SELECT policy
DROP POLICY "Users can view accessible deal_comments" ON public.deal_comments;
CREATE POLICY "Users can view accessible deal_comments"
ON public.deal_comments FOR SELECT TO authenticated
USING (
  can_access_deal(auth.uid(), deal_id)
);

-- Update INSERT policy
DROP POLICY "Users can create deal comments on accessible deals" ON public.deal_comments;
CREATE POLICY "Users can create deal comments on accessible deals"
ON public.deal_comments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND can_access_deal(auth.uid(), deal_id)
);

-- Update DELETE policy to also use the function
DROP POLICY "Users can delete their own deal comments" ON public.deal_comments;
CREATE POLICY "Users can delete their own deal comments"
ON public.deal_comments FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
);

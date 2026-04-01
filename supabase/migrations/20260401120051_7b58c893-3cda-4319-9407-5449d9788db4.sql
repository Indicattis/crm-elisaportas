-- Fix funnel_columns SELECT RLS to include admin override
DROP POLICY IF EXISTS "Users can view accessible funnel_columns" ON public.funnel_columns;

CREATE POLICY "Users can view accessible funnel_columns" ON public.funnel_columns
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM funnel_members fm
    WHERE fm.funnel_id = funnel_columns.funnel_id AND fm.user_id = auth.uid()
  )
);

-- Also fix funnel_columns INSERT/UPDATE/DELETE for admins
DROP POLICY IF EXISTS "Users can create their own funnel_columns" ON public.funnel_columns;
CREATE POLICY "Users can create their own funnel_columns" ON public.funnel_columns
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can update their own funnel_columns" ON public.funnel_columns;
CREATE POLICY "Users can update their own funnel_columns" ON public.funnel_columns
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can delete their own funnel_columns" ON public.funnel_columns;
CREATE POLICY "Users can delete their own funnel_columns" ON public.funnel_columns
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
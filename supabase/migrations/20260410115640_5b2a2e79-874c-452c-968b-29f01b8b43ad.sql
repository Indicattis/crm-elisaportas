DROP POLICY "Users can delete their own deals" ON public.deals;
CREATE POLICY "Users can delete own deals or admin"
ON public.deals FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage channels" ON public.acquisition_channels;

CREATE POLICY "Admins can manage channels"
ON public.acquisition_channels
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
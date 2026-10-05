DROP POLICY "Contacts view accessible" ON public.contacts;

CREATE POLICY "Contacts view own"
ON public.contacts
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
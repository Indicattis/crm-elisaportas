GRANT SELECT ON public.column_blocked_fields TO anon;
DROP POLICY IF EXISTS "Authenticated can view blocked fields" ON public.column_blocked_fields;
CREATE POLICY "Anyone can view blocked fields"
  ON public.column_blocked_fields FOR SELECT
  USING (true);
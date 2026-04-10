
CREATE TABLE public.column_entry_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.funnel_columns(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(column_id, field_name)
);

ALTER TABLE public.column_entry_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage entry requirements"
ON public.column_entry_requirements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Authenticated can view entry requirements"
ON public.column_entry_requirements
FOR SELECT
TO authenticated
USING (true);

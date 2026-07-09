CREATE TABLE public.funnel_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  start_column_id UUID NOT NULL REFERENCES public.funnel_columns(id) ON DELETE CASCADE,
  end_column_id UUID NOT NULL REFERENCES public.funnel_columns(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  label TEXT NOT NULL DEFAULT '',
  row_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_tracks TO authenticated;
GRANT ALL ON public.funnel_tracks TO service_role;

ALTER TABLE public.funnel_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funnel members can view tracks"
ON public.funnel_tracks FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.funnel_members fm WHERE fm.funnel_id = funnel_tracks.funnel_id AND fm.user_id = auth.uid())
);

CREATE POLICY "Admins can insert tracks"
ON public.funnel_tracks FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tracks"
ON public.funnel_tracks FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tracks"
ON public.funnel_tracks FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_funnel_tracks_updated_at
BEFORE UPDATE ON public.funnel_tracks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_funnel_tracks_funnel ON public.funnel_tracks(funnel_id);
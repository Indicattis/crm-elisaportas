
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-attachments', 'deal-attachments', true);

-- Storage policies
CREATE POLICY "Public read access on deal-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'deal-attachments');

CREATE POLICY "Authenticated users can upload to deal-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deal-attachments');

CREATE POLICY "Authenticated users can delete from deal-attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'deal-attachments');

-- Create table
CREATE TABLE public.deal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments on accessible deals"
ON public.deal_attachments FOR SELECT TO authenticated
USING (can_access_deal(auth.uid(), deal_id));

CREATE POLICY "Users can insert attachments on accessible deals"
ON public.deal_attachments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND can_access_deal(auth.uid(), deal_id));

CREATE POLICY "Owner or admin can delete attachments"
ON public.deal_attachments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

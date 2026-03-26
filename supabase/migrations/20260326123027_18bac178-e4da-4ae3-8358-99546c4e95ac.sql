
-- Create deal_history table
CREATE TABLE public.deal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_history ENABLE ROW LEVEL SECURITY;

-- RLS: view accessible deal history (same logic as deal_tasks)
CREATE POLICY "Users can view accessible deal_history"
ON public.deal_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_history.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);

-- RLS: insert deal history
CREATE POLICY "Users can insert deal_history"
ON public.deal_history
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_history.deal_id
    AND (d.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM funnel_members fm
      WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
    ))
  )
);

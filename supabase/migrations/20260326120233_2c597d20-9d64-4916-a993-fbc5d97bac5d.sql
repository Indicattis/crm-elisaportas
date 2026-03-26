
-- Add task_group_id to funnel_columns
ALTER TABLE public.funnel_columns ADD COLUMN task_group_id uuid REFERENCES public.task_groups(id) ON DELETE SET NULL;

-- Create deal_tasks table
CREATE TABLE public.deal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'personalizada',
  description text,
  deadline_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: users can view deal_tasks for deals they can access (via funnel_members or ownership)
CREATE POLICY "Users can view accessible deal_tasks" ON public.deal_tasks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_tasks.deal_id
    AND (
      d.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.funnel_members fm
        WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
      )
    )
  )
);

-- RLS: users can insert deal_tasks for accessible deals
CREATE POLICY "Users can insert deal_tasks" ON public.deal_tasks
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_tasks.deal_id
    AND (
      d.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.funnel_members fm
        WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
      )
    )
  )
);

-- RLS: users can update deal_tasks for accessible deals
CREATE POLICY "Users can update deal_tasks" ON public.deal_tasks
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_tasks.deal_id
    AND (
      d.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.funnel_members fm
        WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
      )
    )
  )
);

-- RLS: users can delete deal_tasks for accessible deals
CREATE POLICY "Users can delete deal_tasks" ON public.deal_tasks
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_tasks.deal_id
    AND (
      d.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.funnel_members fm
        WHERE fm.funnel_id = d.funnel_id AND fm.user_id = auth.uid()
      )
    )
  )
);

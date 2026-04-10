
-- Create task_group_stages table
CREATE TABLE public.task_group_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  position integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_group_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage task_group_stages"
ON public.task_group_stages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Authenticated can view task_group_stages"
ON public.task_group_stages
FOR SELECT
TO authenticated
USING (true);

-- Add stage_id to task_templates
ALTER TABLE public.task_templates
ADD COLUMN stage_id uuid REFERENCES public.task_group_stages(id) ON DELETE SET NULL;

-- Add stage_id to deal_tasks
ALTER TABLE public.deal_tasks
ADD COLUMN stage_id uuid REFERENCES public.task_group_stages(id) ON DELETE SET NULL;

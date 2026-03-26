
-- Create task_groups table
CREATE TABLE public.task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view task_groups" ON public.task_groups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert task_groups" ON public.task_groups
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Admins can update task_groups" ON public.task_groups
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete task_groups" ON public.task_groups
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create task_templates table
CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'personalizada',
  description text,
  deadline_hours integer NOT NULL DEFAULT 24,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view task_templates" ON public.task_templates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert task_templates" ON public.task_templates
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Admins can update task_templates" ON public.task_templates
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete task_templates" ON public.task_templates
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

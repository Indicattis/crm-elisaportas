CREATE TABLE public.recurring_task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_key text NOT NULL CHECK (task_key IN ('weekly_authorized','monthly_partners')),
  period_start date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_key, period_start)
);

GRANT SELECT, INSERT, DELETE ON public.recurring_task_completions TO authenticated;
GRANT ALL ON public.recurring_task_completions TO service_role;

ALTER TABLE public.recurring_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own completions, admins see all"
ON public.recurring_task_completions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users insert own completions"
ON public.recurring_task_completions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own or admin"
ON public.recurring_task_completions FOR DELETE TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE INDEX idx_rtc_user_period ON public.recurring_task_completions(user_id, period_start DESC);
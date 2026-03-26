
ALTER TABLE task_templates
  ADD COLUMN recurrence_type text DEFAULT null,
  ADD COLUMN recurrence_value integer DEFAULT null;

ALTER TABLE deal_tasks
  ADD COLUMN next_recurrence_at timestamptz DEFAULT null;

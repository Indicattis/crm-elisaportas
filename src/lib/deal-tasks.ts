import { supabase } from "@/integrations/supabase/client";

function getNextWeekday(from: Date, targetDay: number): Date {
  const d = new Date(from);
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d;
}

function getNextMonthday(from: Date, targetDay: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + (d.getDate() >= targetDay ? 1 : 0));
  d.setDate(Math.min(targetDay, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  d.setHours(9, 0, 0, 0);
  return d;
}

/**
 * Create deal tasks based on the task group linked to a funnel column.
 * Call this when a deal is created or moved to a new column.
 */
export async function createDealTasksForColumn(dealId: string, columnName: string, funnelId: string) {
  // Find the column and its task_group_id
  const { data: col } = await supabase
    .from("funnel_columns")
    .select("id, task_group_id")
    .eq("funnel_id", funnelId)
    .eq("name", columnName)
    .single();

  if (!col || !(col as any).task_group_id) return;

  const taskGroupId = (col as any).task_group_id as string;

  // Fetch templates for this group
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, type, description, deadline_hours, recurrence_type, recurrence_value")
    .eq("group_id", taskGroupId)
    .order("position");

  if (!templates || templates.length === 0) return;

  const now = new Date();
  const tasks = templates.map((t: any) => {
    const task: any = {
      deal_id: dealId,
      template_id: t.id,
      type: t.type,
      description: t.description,
      deadline_at: new Date(now.getTime() + t.deadline_hours * 60 * 60 * 1000).toISOString(),
      stage_id: t.stage_id || null,
    };
    // For recurring templates, set next_recurrence_at
    if (t.recurrence_type && t.recurrence_value != null) {
      let nextAt: Date | null = null;
      if (t.recurrence_type === "interval") {
        nextAt = new Date(now.getTime() + t.recurrence_value * 60 * 60 * 1000);
      } else if (t.recurrence_type === "weekday") {
        nextAt = getNextWeekday(now, t.recurrence_value);
      } else if (t.recurrence_type === "monthday") {
        nextAt = getNextMonthday(now, t.recurrence_value);
      }
      if (nextAt) task.next_recurrence_at = nextAt.toISOString();
    }
    return task;
  });

  await supabase.from("deal_tasks").insert(tasks);
}

/**
 * Delete pending (not completed) deal tasks for a deal.
 * Call this before creating new tasks when moving between columns.
 */
export async function deletePendingDealTasks(dealId: string) {
  await supabase
    .from("deal_tasks")
    .delete()
    .eq("deal_id", dealId)
    .eq("completed", false);
}

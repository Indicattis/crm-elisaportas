import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Get completed tasks whose templates are recurring
  const { data: completedTasks, error: err1 } = await supabase
    .from("deal_tasks")
    .select("id, deal_id, template_id, completed_at, type, description")
    .eq("completed", true)
    .not("template_id", "is", null);

  if (err1) {
    return new Response(JSON.stringify({ error: err1.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!completedTasks || completedTasks.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Get unique template IDs and fetch templates with recurrence config
  const templateIds = [...new Set(completedTasks.map((t) => t.template_id))];
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, group_id, type, description, deadline_hours, recurrence_type, recurrence_value")
    .in("id", templateIds)
    .not("recurrence_type", "is", null);

  if (!templates || templates.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const templateMap = new Map(templates.map((t) => [t.id, t]));

  // 3. Get unique deal IDs and fetch deals with their status
  const dealIds = [...new Set(completedTasks.map((t) => t.deal_id))];
  const { data: deals } = await supabase
    .from("deals")
    .select("id, status, funnel_id")
    .in("id", dealIds);

  const dealMap = new Map((deals || []).map((d) => [d.id, d]));

  // 4. Get funnel columns to check if deal is still in the right column for the group
  const funnelIds = [...new Set((deals || []).filter((d) => d.funnel_id).map((d) => d.funnel_id))];
  const { data: columns } = await supabase
    .from("funnel_columns")
    .select("id, funnel_id, name, task_group_id")
    .in("funnel_id", funnelIds)
    .not("task_group_id", "is", null);

  // Map: group_id -> Set of column names per funnel
  const groupColumnMap = new Map<string, Map<string, Set<string>>>();
  for (const col of columns || []) {
    if (!col.task_group_id) continue;
    if (!groupColumnMap.has(col.task_group_id)) {
      groupColumnMap.set(col.task_group_id, new Map());
    }
    const funnelMap = groupColumnMap.get(col.task_group_id)!;
    if (!funnelMap.has(col.funnel_id)) {
      funnelMap.set(col.funnel_id, new Set());
    }
    funnelMap.get(col.funnel_id)!.add(col.name);
  }

  // 5. Get existing pending tasks to avoid duplicates
  const { data: pendingTasks } = await supabase
    .from("deal_tasks")
    .select("deal_id, template_id")
    .eq("completed", false)
    .not("template_id", "is", null)
    .in("deal_id", dealIds);

  const pendingSet = new Set(
    (pendingTasks || []).map((t) => `${t.deal_id}:${t.template_id}`)
  );

  const now = new Date();
  const tasksToInsert: any[] = [];

  for (const task of completedTasks) {
    const template = templateMap.get(task.template_id);
    if (!template) continue;

    const deal = dealMap.get(task.deal_id);
    if (!deal || !deal.funnel_id) continue;

    // Check deal is still in column linked to this template's group
    const funnelColumns = groupColumnMap.get(template.group_id);
    if (!funnelColumns) continue;
    const validStatuses = funnelColumns.get(deal.funnel_id);
    if (!validStatuses || !validStatuses.has(deal.status)) continue;

    // Check no pending duplicate
    const key = `${task.deal_id}:${task.template_id}`;
    if (pendingSet.has(key)) continue;

    // Check recurrence condition
    const completedAt = new Date(task.completed_at || now);
    let shouldCreate = false;

    switch (template.recurrence_type) {
      case "interval":
        shouldCreate =
          completedAt.getTime() + (template.recurrence_value || 0) * 3600000 <= now.getTime();
        break;
      case "weekday":
        shouldCreate = now.getDay() === (template.recurrence_value || 0);
        break;
      case "monthday":
        shouldCreate = now.getDate() === (template.recurrence_value || 1);
        break;
    }

    if (shouldCreate) {
      tasksToInsert.push({
        deal_id: task.deal_id,
        template_id: template.id,
        type: template.type,
        description: template.description,
        deadline_at: new Date(now.getTime() + template.deadline_hours * 3600000).toISOString(),
      });
      pendingSet.add(key); // Prevent multiple inserts for same deal+template
    }
  }

  if (tasksToInsert.length > 0) {
    await supabase.from("deal_tasks").insert(tasksToInsert);
  }

  return new Response(
    JSON.stringify({ processed: tasksToInsert.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

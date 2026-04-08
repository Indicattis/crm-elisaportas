import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, phone, email, estado, cidade, funnel_id, status, canal_aquisicao } = await req.json();

    if (!name || !funnel_id) {
      return new Response(
        JSON.stringify({ error: "name e funnel_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get funnel owner as user_id for the deal
    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .select("user_id")
      .eq("id", funnel_id)
      .single();

    if (funnelError || !funnel) {
      return new Response(
        JSON.stringify({ error: "Funil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate phone
    let duplicateWarning: string | null = null;
    if (phone) {
      const { data: existing } = await supabase
        .from("deals")
        .select("title, status, assigned_to")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();
      if (existing) {
        let assignedName = "Não atribuído";
        if (existing.assigned_to) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", existing.assigned_to)
            .maybeSingle();
          if (profile?.full_name) assignedName = profile.full_name;
        }
        duplicateWarning = `Telefone já cadastrado na negociação "${existing.title}" (etapa: ${existing.status}), atendido por ${assignedName}`;
      }
    }

    // Store estado/cidade in dedicated columns
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: name,
        value: 0,
        status: status || "Lead",
        funnel_id,
        user_id: funnel.user_id,
        heat: 0,
        phone: phone || null,
        email: email || null,
        state: estado || null,
        city: cidade || null,
        notes: null,
        acquisition_channel: canal_aquisicao || null,
      })
      .select("id")
      .single();

    if (dealError) {
      console.error("Error inserting deal:", dealError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar negociação", details: dealError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create tasks for the column's task group
    const dealStatus = status || "Lead";
    const { data: col } = await supabase
      .from("funnel_columns")
      .select("id, task_group_id")
      .eq("funnel_id", funnel_id)
      .eq("name", dealStatus)
      .maybeSingle();

    if (col?.task_group_id) {
      const { data: templates } = await supabase
        .from("task_templates")
        .select("id, type, description, deadline_hours, recurrence_type, recurrence_value")
        .eq("group_id", col.task_group_id)
        .order("position");

      if (templates && templates.length > 0) {
        const now = new Date();
        const tasks = templates.map((t: any) => {
          const task: any = {
            deal_id: deal.id,
            template_id: t.id,
            type: t.type,
            description: t.description,
            deadline_at: new Date(now.getTime() + t.deadline_hours * 3600000).toISOString(),
          };
          if (t.recurrence_type && t.recurrence_value != null) {
            let nextAt: Date | null = null;
            if (t.recurrence_type === "interval") {
              nextAt = new Date(now.getTime() + t.recurrence_value * 3600000);
            } else if (t.recurrence_type === "weekday") {
              const diff = (t.recurrence_value - now.getDay() + 7) % 7 || 7;
              nextAt = new Date(now);
              nextAt.setDate(nextAt.getDate() + diff);
              nextAt.setHours(9, 0, 0, 0);
            } else if (t.recurrence_type === "monthday") {
              nextAt = new Date(now);
              nextAt.setMonth(nextAt.getMonth() + (now.getDate() >= t.recurrence_value ? 1 : 0));
              const lastDay = new Date(nextAt.getFullYear(), nextAt.getMonth() + 1, 0).getDate();
              nextAt.setDate(Math.min(t.recurrence_value, lastDay));
              nextAt.setHours(9, 0, 0, 0);
            }
            if (nextAt) task.next_recurrence_at = nextAt.toISOString();
          }
          return task;
        });
        await supabase.from("deal_tasks").insert(tasks);
      }
    }

    return new Response(
      JSON.stringify({ success: true, deal_id: deal.id, ...(duplicateWarning ? { warning: duplicateWarning } : {}) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

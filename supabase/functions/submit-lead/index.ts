import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function writeLog(entry: {
  status: string;
  http_status: number;
  title?: string | null;
  phone?: string | null;
  deal_id?: string | null;
  assigned_to?: string | null;
  warning?: string | null;
  error_message?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  raw_body?: unknown;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("external_integration_logs").insert({
      source: "lead_flow",
      status: entry.status,
      http_status: entry.http_status,
      title: entry.title ?? null,
      phone: entry.phone ?? null,
      deal_id: entry.deal_id ?? null,
      assigned_to: entry.assigned_to ?? null,
      warning: entry.warning ?? null,
      error_message: entry.error_message ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.user_agent ?? null,
      raw_body: entry.raw_body ?? null,
    });
  } catch (e) {
    console.error("Failed to write lead_flow log:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  let body: any = null;
  try {
    body = await req.json();
    let { name, phone, email, estado, cidade, funnel_id, status, canal_aquisicao, flow_id } = body;

    const supabase = getSupabaseAdmin();

    // If flow_id is provided, load the flow config
    let acquisition_channel = canal_aquisicao || null;
    let assignment_mode = "unassigned";
    let flow_name: string | null = null;
    if (flow_id) {
      const { data: flow, error: flowError } = await supabase
        .from("lead_flows")
        .select("funnel_id, status, acquisition_channel, assignment_mode, active, name")
        .eq("id", flow_id)
        .single();

      if (flowError || !flow) {
        await writeLog({
          status: "error", http_status: 404, title: name ?? null, phone: phone ?? null,
          error_message: "Fluxo não encontrado", ip, user_agent: userAgent, raw_body: body,
        });
        return new Response(
          JSON.stringify({ error: "Fluxo não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!flow.active) {
        await writeLog({
          status: "error", http_status: 400, title: name ?? null, phone: phone ?? null,
          error_message: `Fluxo inativo (${flow.name})`, ip, user_agent: userAgent, raw_body: body,
        });
        return new Response(
          JSON.stringify({ error: "Fluxo inativo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      funnel_id = flow.funnel_id;
      status = flow.status;
      flow_name = flow.name || null;
      if (flow.acquisition_channel) acquisition_channel = flow.acquisition_channel;
      if (flow.assignment_mode) assignment_mode = flow.assignment_mode;
    }

    if (!name || !funnel_id) {
      await writeLog({
        status: "error", http_status: 400, title: name ?? null, phone: phone ?? null,
        error_message: "name e funnel_id são obrigatórios", ip, user_agent: userAgent, raw_body: body,
      });
      return new Response(
        JSON.stringify({ error: "name e funnel_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get funnel owner as user_id for the deal
    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .select("user_id")
      .eq("id", funnel_id)
      .single();

    if (funnelError || !funnel) {
      await writeLog({
        status: "error", http_status: 404, title: name, phone: phone ?? null,
        error_message: "Funil não encontrado", ip, user_agent: userAgent, raw_body: body,
      });
      return new Response(
        JSON.stringify({ error: "Funil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine assigned_to based on assignment_mode
    let assigned_to: string | null = null;
    if (assignment_mode === "round_robin") {
      const { data: members } = await supabase
        .from("funnel_members")
        .select("user_id")
        .eq("funnel_id", funnel_id);

      if (members && members.length > 0) {
        const memberIds = members.map((m: any) => m.user_id);
        const counts: Record<string, number> = {};
        for (const mid of memberIds) counts[mid] = 0;

        const { data: deals } = await supabase
          .from("deals")
          .select("assigned_to")
          .eq("funnel_id", funnel_id)
          .eq("archived", false)
          .in("assigned_to", memberIds);

        if (deals) {
          for (const d of deals) {
            if (d.assigned_to && counts[d.assigned_to] !== undefined) {
              counts[d.assigned_to]++;
            }
          }
        }

        let minCount = Infinity;
        let chosen: string | null = null;
        for (const mid of memberIds) {
          if (counts[mid] < minCount) {
            minCount = counts[mid];
            chosen = mid;
          }
        }
        assigned_to = chosen;
      }
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
        acquisition_channel: acquisition_channel || null,
        assigned_to: assigned_to,
      })
      .select("id")
      .single();

    if (dealError) {
      console.error("Error inserting deal:", dealError);
      await writeLog({
        status: "error", http_status: 500, title: name, phone: phone ?? null,
        assigned_to, warning: duplicateWarning,
        error_message: `Erro ao criar negociação: ${dealError.message}`,
        ip, user_agent: userAgent, raw_body: body,
      });
      return new Response(
        JSON.stringify({ error: "Erro ao criar negociação", details: dealError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record creation origin in deal_history
    const historyDesc = flow_name
      ? `Negociação criada via fluxo de captação "${flow_name}"`
      : "Negociação criada via fluxo de captação";
    await supabase.from("deal_history").insert({
      deal_id: deal.id,
      event_type: "creation",
      description: historyDesc,
      user_id: funnel.user_id,
    });

    await writeLog({
      status: duplicateWarning ? "duplicate" : "success",
      http_status: 200,
      title: name,
      phone: phone ?? null,
      deal_id: deal.id,
      assigned_to,
      warning: duplicateWarning ? `${duplicateWarning}${flow_name ? ` | Fluxo: ${flow_name}` : ""}` : (flow_name ? `Fluxo: ${flow_name}` : null),
      ip,
      user_agent: userAgent,
      raw_body: body,
    });

    return new Response(
      JSON.stringify({ success: true, deal_id: deal.id, ...(duplicateWarning ? { warning: duplicateWarning } : {}) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    await writeLog({
      status: "error", http_status: 500,
      error_message: `Erro interno: ${(err as Error)?.message ?? String(err)}`,
      ip, user_agent: userAgent, raw_body: body,
    });
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNNEL_ID = "027c0fb7-eb3d-49a8-8377-9a533d9768b5";
const STATUS = "Fazer orçamento";
const ROTATION_USER_IDS = [
  "053feb1f-6d60-4c4d-a01a-a3e9146d09f1",
  "99964511-d379-4795-901e-094a3e062051",
  "611351a8-c5f3-4e95-876d-ffeb2b0f785f",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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
      source: "hunt",
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
    console.error("Failed to write integration log:", e);
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

  if (req.method !== "POST") {
    await writeLog({
      status: "error",
      http_status: 405,
      error_message: "Método não permitido",
      ip,
      user_agent: userAgent,
    });
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  // API key auth
  const expectedKey = Deno.env.get("HUNT_INTEGRATION");
  if (!expectedKey) {
    console.error("HUNT_INTEGRATION not configured");
    await writeLog({
      status: "error",
      http_status: 500,
      error_message: "Integração não configurada (HUNT_INTEGRATION ausente)",
      ip,
      user_agent: userAgent,
    });
    return jsonResponse({ error: "Integração não configurada" }, 500);
  }
  const providedKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!providedKey || providedKey !== expectedKey) {
    await writeLog({
      status: "error",
      http_status: 401,
      error_message: "Chave de API inválida ou ausente",
      ip,
      user_agent: userAgent,
    });
    return jsonResponse({ error: "Não autorizado" }, 401);
  }

  let body: any = null;
  try {
    try {
      body = await req.json();
    } catch {
      await writeLog({
        status: "error",
        http_status: 400,
        error_message: "JSON inválido",
        ip,
        user_agent: userAgent,
      });
      return jsonResponse({ error: "JSON inválido" }, 400);
    }

    const { title, phone, observation } = body ?? {};

    // Validation
    if (typeof title !== "string" || title.trim().length === 0) {
      await writeLog({
        status: "error",
        http_status: 400,
        title: typeof title === "string" ? title : null,
        phone: typeof phone === "string" ? phone : null,
        error_message: "title é obrigatório",
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "title é obrigatório" }, 400);
    }
    if (title.length > 255) {
      await writeLog({
        status: "error",
        http_status: 400,
        title,
        phone: typeof phone === "string" ? phone : null,
        error_message: "title deve ter no máximo 255 caracteres",
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "title deve ter no máximo 255 caracteres" }, 400);
    }
    if (typeof phone !== "string" || phone.replace(/\D/g, "").length < 4) {
      await writeLog({
        status: "error",
        http_status: 400,
        title,
        phone: typeof phone === "string" ? phone : null,
        error_message: "phone é obrigatório (mínimo 4 dígitos)",
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse(
        { error: "phone é obrigatório (mínimo 4 dígitos)" },
        400
      );
    }
    if (observation !== undefined && observation !== null && typeof observation !== "string") {
      await writeLog({
        status: "error",
        http_status: 400,
        title,
        phone,
        error_message: "observation deve ser uma string",
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "observation deve ser uma string" }, 400);
    }
    if (typeof observation === "string" && observation.length > 5000) {
      await writeLog({
        status: "error",
        http_status: 400,
        title,
        phone,
        error_message: "observation deve ter no máximo 5000 caracteres",
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "observation deve ter no máximo 5000 caracteres" }, 400);
    }

    const cleanTitle = title.trim();
    const maskedPhone = maskPhoneBR(phone);
    const phoneDigits = phone.replace(/\D/g, "");
    const cleanObservation =
      typeof observation === "string" && observation.trim().length > 0
        ? observation.trim()
        : null;


    const supabase = getSupabaseAdmin();

    // Round-robin
    const counts: Record<string, number> = {};
    for (const id of ROTATION_USER_IDS) counts[id] = 0;

    const { data: logRows, error: countError } = await supabase
      .from("external_integration_logs")
      .select("assigned_to")
      .eq("source", "hunt")
      .in("status", ["success", "duplicate"])
      .in("assigned_to", ROTATION_USER_IDS);

    if (countError) {
      console.error("Error counting integration logs:", countError);
      await writeLog({
        status: "error",
        http_status: 500,
        title: cleanTitle,
        phone: maskedPhone,
        error_message: `Erro ao calcular rotação: ${countError.message}`,
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "Erro ao calcular rotação" }, 500);
    }

    for (const r of logRows ?? []) {
      if (r.assigned_to && counts[r.assigned_to] !== undefined) {
        counts[r.assigned_to]++;
      }
    }

    let chosen = ROTATION_USER_IDS[0];
    let minCount = counts[chosen];
    for (const id of ROTATION_USER_IDS) {
      if (counts[id] < minCount) {
        minCount = counts[id];
        chosen = id;
      }
    }

    // Duplicate phone warning
    let duplicateWarning: string | null = null;
    const { data: existingByPhone } = await supabase
      .from("deals")
      .select("title, status, assigned_to")
      .eq("phone", maskedPhone)
      .limit(1)
      .maybeSingle();

    if (existingByPhone) {
      let assignedName = "Não atribuído";
      if (existingByPhone.assigned_to) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", existingByPhone.assigned_to)
          .maybeSingle();
        if (profile?.full_name) assignedName = profile.full_name;
      }
      duplicateWarning = `Telefone já cadastrado na negociação "${existingByPhone.title}" (etapa: ${existingByPhone.status}), atendido por ${assignedName}`;
    } else if (phoneDigits.length >= 4) {
      const { data: byDigits } = await supabase
        .from("deals")
        .select("title, status")
        .ilike("phone", `%${phoneDigits.slice(-8)}%`)
        .limit(1)
        .maybeSingle();
      if (byDigits) {
        duplicateWarning = `Telefone já cadastrado na negociação "${byDigits.title}" (etapa: ${byDigits.status})`;
      }
    }

    // Insert deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: cleanTitle,
        status: STATUS,
        funnel_id: FUNNEL_ID,
        user_id: chosen,
        assigned_to: chosen,
        phone: maskedPhone,
        notes: cleanObservation,
        heat: 0,
        archived: false,
      })
      .select("id, deal_number")
      .single();


    if (dealError) {
      console.error("Error inserting deal:", dealError);
      await writeLog({
        status: "error",
        http_status: 500,
        title: cleanTitle,
        phone: maskedPhone,
        assigned_to: chosen,
        error_message: `Erro ao criar negociação: ${dealError.message}`,
        warning: duplicateWarning,
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse(
        { error: "Erro ao criar negociação", details: dealError.message },
        500
      );
    }

    await supabase.from("deal_history").insert({
      deal_id: deal.id,
      event_type: "creation",
      description: "Negociação criada via integração externa",
      user_id: chosen,
    });

    await writeLog({
      status: duplicateWarning ? "duplicate" : "success",
      http_status: 200,
      title: cleanTitle,
      phone: maskedPhone,
      deal_id: deal.id,
      assigned_to: chosen,
      warning: duplicateWarning,
      ip,
      user_agent: userAgent,
      raw_body: body,
    });

    return jsonResponse({
      success: true,
      deal_id: deal.id,
      deal_number: deal.deal_number,
      assigned_to: chosen,
      ...(duplicateWarning ? { warning: duplicateWarning } : {}),
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    await writeLog({
      status: "error",
      http_status: 500,
      error_message: `Erro interno: ${(err as Error)?.message ?? String(err)}`,
      ip,
      user_agent: userAgent,
      raw_body: body,
    });
    return jsonResponse({ error: "Erro interno" }, 500);
  }
});

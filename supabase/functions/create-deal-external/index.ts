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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  // API key auth
  const expectedKey = Deno.env.get("HUNT_INTEGRATION");
  if (!expectedKey) {
    console.error("HUNT_INTEGRATION not configured");
    return jsonResponse({ error: "Integração não configurada" }, 500);
  }
  const providedKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!providedKey || providedKey !== expectedKey) {
    return jsonResponse({ error: "Não autorizado" }, 401);
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON inválido" }, 400);
    }

    const { title, phone, heat: _heatIgnored } = body ?? {};

    // Validation
    if (typeof title !== "string" || title.trim().length === 0) {
      return jsonResponse({ error: "title é obrigatório" }, 400);
    }
    if (title.length > 255) {
      return jsonResponse({ error: "title deve ter no máximo 255 caracteres" }, 400);
    }
    if (typeof phone !== "string" || phone.replace(/\D/g, "").length < 4) {
      return jsonResponse(
        { error: "phone é obrigatório (mínimo 4 dígitos)" },
        400
      );
    }

    const cleanTitle = title.trim();
    const maskedPhone = maskPhoneBR(phone);
    const phoneDigits = phone.replace(/\D/g, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Round-robin: pick the rotation user with fewest active deals in this funnel
    const counts: Record<string, number> = {};
    for (const id of ROTATION_USER_IDS) counts[id] = 0;

    const { data: existingDeals, error: countError } = await supabase
      .from("deals")
      .select("assigned_to")
      .eq("funnel_id", FUNNEL_ID)
      .eq("archived", false)
      .in("assigned_to", ROTATION_USER_IDS);

    if (countError) {
      console.error("Error counting deals:", countError);
      return jsonResponse({ error: "Erro ao calcular rotação" }, 500);
    }

    for (const d of existingDeals ?? []) {
      if (d.assigned_to && counts[d.assigned_to] !== undefined) {
        counts[d.assigned_to]++;
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

    // Duplicate phone warning (non-blocking)
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
      // Fallback search by digits substring in case of mask differences
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
        heat: 0,
        archived: false,
      })
      .select("id, deal_number")
      .single();

    if (dealError) {
      console.error("Error inserting deal:", dealError);
      return jsonResponse(
        { error: "Erro ao criar negociação", details: dealError.message },
        500
      );
    }

    // History
    await supabase.from("deal_history").insert({
      deal_id: deal.id,
      event_type: "creation",
      description: "Negociação criada via integração externa",
      user_id: chosen,
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
    return jsonResponse({ error: "Erro interno" }, 500);
  }
});

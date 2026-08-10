import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNNEL_ID = "027c0fb7-eb3d-49a8-8377-9a533d9768b5";
const STATUS = "Fazer orçamento";

// Vendedores ativos = possuem role 'vendedor' (a desativação remove a role)
// e, preferencialmente, são membros do funil de destino.
async function getRotationUserIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<string[]> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "vendedor");
  if (error) throw new Error(`Erro ao buscar vendedores: ${error.message}`);

  const activeIds = Array.from(
    new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)),
  );
  if (activeIds.length === 0) return [];

  const { data: members } = await supabase
    .from("funnel_members")
    .select("user_id")
    .eq("funnel_id", FUNNEL_ID)
    .in("user_id", activeIds);

  const memberIds = Array.from(
    new Set((members ?? []).map((m: { user_id: string }) => m.user_id)),
  );

  return (memberIds.length > 0 ? memberIds : activeIds).sort();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhoneDigitsBR(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // Remove country code 55 quando vem prefixado (12 ou 13 dígitos iniciando em 55)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

function maskPhoneBR(raw: string): string {
  const digits = normalizePhoneDigitsBR(raw);
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

    // Validate attachments (optional)
    const attachmentsInput = body?.attachments;
    if (attachmentsInput !== undefined && attachmentsInput !== null) {
      if (!Array.isArray(attachmentsInput)) {
        await writeLog({
          status: "error", http_status: 400, title, phone,
          error_message: "attachments deve ser um array",
          ip, user_agent: userAgent, raw_body: body,
        });
        return jsonResponse({ error: "attachments deve ser um array" }, 400);
      }
      if (attachmentsInput.length > 10) {
        return jsonResponse({ error: "attachments: máximo 10 itens" }, 400);
      }
      for (const [i, a] of attachmentsInput.entries()) {
        if (!a || typeof a !== "object") {
          return jsonResponse({ error: `attachments[${i}]: item inválido` }, 400);
        }
        if (typeof a.file_name !== "string" || a.file_name.trim().length === 0 || a.file_name.length > 255) {
          return jsonResponse({ error: `attachments[${i}].file_name é obrigatório (1-255 chars)` }, 400);
        }
        const hasUrl = typeof a.url === "string" && a.url.trim().length > 0;
        const hasData = typeof a.data_base64 === "string" && a.data_base64.trim().length > 0;
        if (hasUrl === hasData) {
          return jsonResponse({ error: `attachments[${i}]: informe apenas 'url' OU 'data_base64'` }, 400);
        }
      }
    }

    const cleanTitle = title.trim();
    const maskedPhone = maskPhoneBR(phone);
    const phoneDigits = normalizePhoneDigitsBR(phone);
    const cleanObservation =
      typeof observation === "string" && observation.trim().length > 0
        ? observation.trim()
        : null;


    const supabase = getSupabaseAdmin();

    // Round-robin entre vendedores ativos (buscados dinamicamente)
    let rotationIds: string[] = [];
    try {
      rotationIds = await getRotationUserIds(supabase);
    } catch (e) {
      await writeLog({
        status: "error",
        http_status: 500,
        title: cleanTitle,
        phone: maskedPhone,
        error_message: (e as Error).message,
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "Erro ao buscar vendedores ativos" }, 500);
    }

    if (rotationIds.length === 0) {
      await writeLog({
        status: "error",
        http_status: 503,
        title: cleanTitle,
        phone: maskedPhone,
        error_message: "Nenhum vendedor ativo disponível para receber leads",
        ip,
        user_agent: userAgent,
        raw_body: body,
      });
      return jsonResponse({ error: "Nenhum vendedor ativo disponível" }, 503);
    }

    const counts: Record<string, number> = {};
    for (const id of rotationIds) counts[id] = 0;

    const { data: logRows, error: countError } = await supabase
      .from("external_integration_logs")
      .select("assigned_to")
      .eq("source", "hunt")
      .in("status", ["success", "duplicate"])
      .in("assigned_to", rotationIds);

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

    let chosen = rotationIds[0];
    let minCount = counts[chosen];
    for (const id of rotationIds) {
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

    // Process attachments (best-effort — never fail the deal)
    const MAX_BYTES = 10 * 1024 * 1024;
    const attachmentsWarnings: string[] = [];
    let attachmentsUploaded = 0;
    const items = Array.isArray(attachmentsInput) ? attachmentsInput : [];
    for (const a of items) {
      const fileName: string = a.file_name.trim();
      try {
        let bytes: Uint8Array;
        let contentType: string = typeof a.content_type === "string" ? a.content_type : "application/octet-stream";
        if (typeof a.url === "string" && a.url.trim().length > 0) {
          const resp = await fetch(a.url);
          if (!resp.ok) throw new Error(`URL retornou ${resp.status}`);
          const buf = await resp.arrayBuffer();
          if (buf.byteLength > MAX_BYTES) throw new Error("arquivo excede 10 MB");
          bytes = new Uint8Array(buf);
          if (!a.content_type) {
            contentType = resp.headers.get("content-type")?.split(";")[0] || contentType;
          }
        } else {
          const b64 = (a.data_base64 as string).replace(/^data:[^;]+;base64,/, "");
          const bin = atob(b64);
          if (bin.length > MAX_BYTES) throw new Error("arquivo excede 10 MB");
          bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        }
        const safeName = fileName.replace(/[^\w.\-]+/g, "_");
        const path = `${deal.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("deal-attachments")
          .upload(path, bytes, { contentType, upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { error: insErr } = await supabase.from("deal_attachments").insert({
          deal_id: deal.id,
          user_id: chosen,
          file_path: path,
          file_name: fileName,
        });
        if (insErr) throw new Error(insErr.message);
        attachmentsUploaded++;
      } catch (e) {
        attachmentsWarnings.push(`${fileName}: ${(e as Error).message}`);
      }
    }

    const combinedWarning = [
      duplicateWarning,
      items.length > 0
        ? `Anexos: ${attachmentsUploaded}/${items.length} enviados${attachmentsWarnings.length ? ` — falhas: ${attachmentsWarnings.join("; ")}` : ""}`
        : null,
    ].filter(Boolean).join(" | ") || null;

    await writeLog({
      status: duplicateWarning ? "duplicate" : "success",
      http_status: 200,
      title: cleanTitle,
      phone: maskedPhone,
      deal_id: deal.id,
      assigned_to: chosen,
      warning: combinedWarning,
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
      ...(items.length > 0 ? { attachments_uploaded: attachmentsUploaded } : {}),
      ...(attachmentsWarnings.length > 0 ? { attachments_warnings: attachmentsWarnings } : {}),
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

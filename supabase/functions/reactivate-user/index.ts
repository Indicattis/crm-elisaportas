import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: myRole } = await anon.rpc("get_my_role");
    if (myRole !== "admin") return json({ error: "Apenas administradores" }, 403);

    const { user_id, role, funnel_ids } = await req.json();
    if (typeof user_id !== "string" || !UUID.test(user_id)) return json({ error: "user_id inválido" }, 400);
    if (role !== "vendedor" && role !== "admin") return json({ error: "Papel inválido" }, 400);
    const funnels: string[] = Array.isArray(funnel_ids) ? funnel_ids.filter((f) => typeof f === "string" && UUID.test(f)) : [];

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: banErr } = await admin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
    if (banErr) return json({ error: `Falha ao reativar acesso: ${banErr.message}` }, 500);

    await admin.from("user_roles").delete().eq("user_id", user_id);
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id, role });
    if (roleErr) return json({ error: roleErr.message }, 500);

    if (funnels.length) {
      await admin.from("funnel_members").delete().eq("user_id", user_id).in("funnel_id", funnels);
      const { error: fmErr } = await admin.from("funnel_members").insert(funnels.map((funnel_id) => ({ funnel_id, user_id })));
      if (fmErr) return json({ error: fmErr.message }, 500);
    }
    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

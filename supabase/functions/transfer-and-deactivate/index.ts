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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: roleData, error: roleError } = await anonClient.rpc("get_my_role");
    if (roleError || roleData !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller } } = await anonClient.auth.getUser();

    const body = await req.json();
    const { from_user_id, to_user_id, include_archived } = body;

    if (!from_user_id || !to_user_id) {
      return new Response(JSON.stringify({ error: "from_user_id e to_user_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (from_user_id === to_user_id) {
      return new Response(JSON.stringify({ error: "Origem e destino devem ser diferentes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate both users exist
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", [from_user_id, to_user_id]);

    if (!profiles || profiles.length !== 2) {
      return new Response(JSON.stringify({ error: "Usuário(s) não encontrado(s)" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromName = profiles.find((p) => p.id === from_user_id)?.full_name || "usuário";
    const toName = profiles.find((p) => p.id === to_user_id)?.full_name || "usuário";

    // Fetch deals to transfer
    let dealsQuery = adminClient
      .from("deals")
      .select("id, funnel_id, assigned_to")
      .eq("user_id", from_user_id);
    if (!include_archived) {
      dealsQuery = dealsQuery.eq("archived", false);
    }
    const { data: deals, error: dealsErr } = await dealsQuery;
    if (dealsErr) throw dealsErr;

    const dealIds = (deals || []).map((d) => d.id);
    const fromFunnelIds = Array.from(new Set((deals || []).map((d) => d.funnel_id).filter(Boolean)));

    // Add destination to funnel_members for each funnel containing transferred deals
    if (fromFunnelIds.length > 0) {
      for (const fid of fromFunnelIds) {
        const { data: existing } = await adminClient
          .from("funnel_members")
          .select("id")
          .eq("funnel_id", fid)
          .eq("user_id", to_user_id)
          .maybeSingle();
        if (!existing) {
          await adminClient.from("funnel_members").insert({ funnel_id: fid, user_id: to_user_id });
        }
      }
    }

    // Also add destination to all funnels the source was a member of
    const { data: sourceMemberships } = await adminClient
      .from("funnel_members")
      .select("funnel_id")
      .eq("user_id", from_user_id);
    for (const m of sourceMemberships || []) {
      const { data: existing } = await adminClient
        .from("funnel_members")
        .select("id")
        .eq("funnel_id", m.funnel_id)
        .eq("user_id", to_user_id)
        .maybeSingle();
      if (!existing) {
        await adminClient.from("funnel_members").insert({ funnel_id: m.funnel_id, user_id: to_user_id });
      }
    }

    // Transfer deals: user_id and assigned_to (when matching source)
    if (dealIds.length > 0) {
      const { error: updErr } = await adminClient
        .from("deals")
        .update({ user_id: to_user_id })
        .in("id", dealIds);
      if (updErr) throw updErr;

      await adminClient
        .from("deals")
        .update({ assigned_to: to_user_id })
        .in("id", dealIds)
        .eq("assigned_to", from_user_id);

      // History entries (best effort)
      const historyRows = dealIds.map((id) => ({
        deal_id: id,
        user_id: caller?.id || to_user_id,
        event_type: "transferred",
        description: `Transferido de ${fromName} para ${toName}`,
        metadata: { from_user_id, to_user_id },
      }));
      // Insert in chunks to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < historyRows.length; i += chunkSize) {
        await adminClient.from("deal_history").insert(historyRows.slice(i, i + chunkSize));
      }
    }

    // Remove source's funnel memberships and role
    await adminClient.from("funnel_members").delete().eq("user_id", from_user_id);
    await adminClient.from("user_roles").delete().eq("user_id", from_user_id);

    // Ban (deactivate) the user — ~100 years
    const { error: banErr } = await adminClient.auth.admin.updateUserById(from_user_id, {
      ban_duration: "876000h",
    });
    if (banErr) {
      return new Response(
        JSON.stringify({ error: `Leads transferidos, mas falha ao desativar: ${banErr.message}`, transferred_count: dealIds.length }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, transferred_count: dealIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

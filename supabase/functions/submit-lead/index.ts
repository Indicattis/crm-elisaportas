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
    const { name, phone, email, estado, cidade, funnel_id, status } = await req.json();

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

    // Store lead info in deal notes
    const notes = [
      phone ? `Tel: ${phone}` : null,
      email ? `Email: ${email}` : null,
      estado ? `Estado: ${estado}` : null,
      cidade ? `Cidade: ${cidade}` : null,
    ].filter(Boolean).join(" | ");

    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        title: name,
        value: 0,
        status: status || "Lead",
        funnel_id,
        user_id: funnel.user_id,
        heat: 0,
        notes: notes || null,
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

    return new Response(
      JSON.stringify({ success: true, deal_id: deal.id }),
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

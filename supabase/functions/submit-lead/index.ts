import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTERNAL_SUPABASE_URL = "https://zddnvwqhfcqspmxscwyy.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZG52d3FoZmNxc3BteHNjd3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjgyMzcsImV4cCI6MjA2NzE0NDIzN30.-DllUGMpirnjRGchwGsc3w2dna8SqSbq-_fKFvXKOfs";

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

    // Insert client into external database
    const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
    const { data: clientData, error: clientError } = await externalSupabase
      .from("clientes")
      .insert({
        nome: name,
        telefone: phone || null,
        email: email || null,
        estado: estado || null,
        cidade: cidade || null,
        ativo: true,
        fidelizado: false,
        parceiro: false,
      })
      .select("id")
      .single();

    if (clientError) {
      console.error("Error inserting external client:", clientError);
      return new Response(
        JSON.stringify({ error: "Erro ao cadastrar cliente", details: clientError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create deal in internal database using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Get funnel owner as user_id for the deal
    const { data: funnel, error: funnelError } = await internalSupabase
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

    const { data: deal, error: dealError } = await internalSupabase
      .from("deals")
      .insert({
        title: name,
        client_id: clientData.id,
        value: 0,
        status: status || "Lead",
        funnel_id,
        user_id: funnel.user_id,
        heat: 0,
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

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

    // Verify caller is admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: roleData, error: roleError } = await anonClient.rpc("get_my_role");
    if (roleError || roleData !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores podem convidar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Use service role for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- RESET PASSWORD ACTION ---
    if (action === "reset_password") {
      const { user_id, full_name } = body;
      if (!user_id || !full_name) {
        return new Response(JSON.stringify({ error: "user_id e full_name são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nameParts = full_name.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((p: string) => p.length > 0);

      const tempPassword = nameParts.length > 1
        ? nameParts[0][0] + nameParts[nameParts.length - 1]
        : nameParts[0] || "senha123";

      const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: tempPassword,
      });
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("profiles").update({ must_change_password: true }).eq("id", user_id);

      return new Response(
        JSON.stringify({ success: true, temp_password: tempPassword }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- INVITE USER ACTION (default) ---
    const { email, role, full_name } = body;

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email e cargo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (role === "admin" && userData.user) {
      await adminClient
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", userData.user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user?.id,
        temp_password: tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

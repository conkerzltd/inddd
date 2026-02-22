import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function deriveSyntheticEmail(code: string): string {
  return `mkt_${code.toLowerCase()}@inddd.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, referral_code, new_password } = body;

    if (!referral_code || !new_password || new_password.length < 6) {
      return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);
    }

    const code = referral_code.toUpperCase().trim();
    const syntheticEmail = deriveSyntheticEmail(code);

    // ── ADMIN RESET ──
    if (action === "admin_reset") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Missing auth" }, 401);

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await callerClient.auth.getUser();
      if (!caller) return json({ error: "Invalid token" }, 401);

      const { data: saRoles } = await callerClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "superadmin");

      if (!saRoles || saRoles.length === 0) return json({ error: "Forbidden" }, 403);

      // Find marketer
      const { data: marketer } = await adminClient
        .from("marketers")
        .select("id")
        .eq("referral_code", code)
        .single();

      if (!marketer) return json({ error: "كود المسوق غير موجود" }, 404);

      // Find or create auth user
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      let authUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === syntheticEmail
      );

      if (authUser) {
        const { error } = await adminClient.auth.admin.updateUserById(authUser.id, {
          password: new_password,
        });
        if (error) return json({ error: error.message }, 400);
      } else {
        const { data: newUser, error } = await adminClient.auth.admin.createUser({
          email: syntheticEmail,
          password: new_password,
          email_confirm: true,
        });
        if (error) return json({ error: error.message }, 400);
        authUser = newUser.user;

        // Upsert mapping
        await adminClient.from("marketer_users").upsert({
          user_id: authUser.id,
          marketer_id: marketer.id,
        }, { onConflict: "user_id" });
      }

      // Set must_set_password = true
      await adminClient.from("marketers").update({ must_set_password: true }).eq("id", marketer.id);

      // Resolve any pending reset requests
      await adminClient
        .from("marketer_password_reset_requests")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: caller.id })
        .eq("marketer_id", marketer.id)
        .eq("status", "pending");

      return json({ ok: true });
    }

    // ── FIRST-TIME SETUP ──
    // No auth required, but marketer must be valid + active
    const { data: marketer } = await adminClient
      .from("marketers")
      .select("id, status")
      .eq("referral_code", code)
      .single();

    if (!marketer) return json({ error: "كود المسوق غير صالح" }, 400);
    if (marketer.status !== "active") return json({ error: "حساب المسوق غير مفعّل" }, 403);

    // Check if account already exists
    const { data: existingMapping } = await adminClient
      .from("marketer_users")
      .select("user_id")
      .eq("marketer_id", marketer.id)
      .maybeSingle();

    if (existingMapping) {
      return json({ error: "هذا الحساب موجود بالفعل. يرجى تسجيل الدخول." }, 400);
    }

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: new_password,
      email_confirm: true,
    });

    if (createError) {
      // If user already exists in auth but not in mapping (edge case)
      if (createError.message?.includes("already been registered")) {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const existing = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === syntheticEmail
        );
        if (existing) {
          await adminClient.auth.admin.updateUserById(existing.id, {
            password: new_password,
          });
          await adminClient.from("marketer_users").upsert({
            user_id: existing.id,
            marketer_id: marketer.id,
          }, { onConflict: "user_id" });
          await adminClient.from("marketers").update({ must_set_password: false }).eq("id", marketer.id);
          return json({ ok: true, email: syntheticEmail });
        }
      }
      return json({ error: createError.message }, 400);
    }

    // Create mapping
    await adminClient.from("marketer_users").insert({
      user_id: newUser.user.id,
      marketer_id: marketer.id,
    });

    // Clear must_set_password
    await adminClient.from("marketers").update({ must_set_password: false }).eq("id", marketer.id);

    return json({ ok: true, email: syntheticEmail });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});

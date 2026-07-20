import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_clinic_info",
  title: "Get clinic info",
  description:
    "Get the signed-in user's clinic: name, status, timezone, and current session flags (paused, intake open).",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = sb(ctx);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("clinic_id")
      .eq("user_id", ctx.getUserId());
    const clinicId = roles?.[0]?.clinic_id;
    if (!clinicId) {
      return { content: [{ type: "text", text: "No clinic for this user." }], isError: true };
    }
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name_ar, status, timezone, session_paused, intake_open")
      .eq("id", clinicId)
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { clinic: data },
    };
  },
});

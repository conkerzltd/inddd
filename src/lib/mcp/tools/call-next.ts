import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "call_next",
  title: "Call next patient",
  description: "Call the next patient in the signed-in user's clinic queue.",
  inputSchema: {},
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
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
    const { data, error } = await supabase.rpc("call_next", { p_clinic_id: clinicId });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { result: data as z.infer<typeof z.unknown> },
    };
  },
});

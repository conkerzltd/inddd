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
  name: "list_tickets",
  title: "List clinic tickets",
  description:
    "List active tickets for the signed-in user's clinic. Returns id, patient name, phone, status, source, and created_at.",
  inputSchema: {
    status: z
      .string()
      .optional()
      .describe(
        "Optional status filter, e.g. INSIDE_WAITING, REMOTE_BOOKED, LINK_SENT, CALLED, IN_SERVICE, DONE, MISSED.",
      ),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
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
    let q = supabase
      .from("tickets")
      .select("id, patient_name, patient_phone, status, source, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tickets: data ?? [] },
    };
  },
});

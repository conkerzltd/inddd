import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTicketsTool from "./tools/list-tickets";
import callNextTool from "./tools/call-next";
import clinicInfoTool from "./tools/clinic-info";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "inddd-clinic-mcp",
  title: "INDDD Clinic MCP",
  version: "0.1.0",
  instructions:
    "Tools for the INDDD clinic queue app. Use `get_clinic_info` to identify the clinic, `list_tickets` to inspect the queue, and `call_next` to call the next patient.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTicketsTool, callNextTool, clinicInfoTool],
});

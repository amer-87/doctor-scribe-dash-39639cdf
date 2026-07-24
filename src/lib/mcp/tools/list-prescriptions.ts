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
  name: "list_prescriptions",
  title: "List prescriptions",
  description: "List prescriptions for a given patient, most recent first.",
  inputSchema: {
    patient_id: z.string().uuid().describe("Patient id (UUID)."),
    limit: z.number().int().min(1).max(50).nullable().describe("Max rows to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("prescriptions")
      .select("id, content, created_at, updated_at")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    return error
      ? { content: [{ type: "text", text: error.message }], isError: true }
      : { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { prescriptions: data ?? [] } };
  },
});

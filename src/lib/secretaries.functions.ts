import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteSecretary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { secretaryId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, doctor_id")
      .eq("id", data.secretaryId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!prof || prof.doctor_id !== userId) {
      throw new Error("Not allowed");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.secretaryId);
    if (delErr) throw new Error(delErr.message);
    return { ok: true as const };
  });

export const cleanupRejectedSecretaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("doctor_id", userId)
      .eq("status", "rejected");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { deleted: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let deleted = 0;
    for (const r of rows) {
      const { error: dErr } = await supabaseAdmin.auth.admin.deleteUser(r.id);
      if (!dErr) deleted++;
    }
    return { deleted };
  });

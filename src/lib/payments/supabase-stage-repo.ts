import { createAdminClient } from "@/lib/supabase/admin";
import type { StageRepo } from "./stage";

/** Server-only (service role). Marks stage invoices paid and writes the audit entry. */
export function createSupabaseStageRepo(): StageRepo {
  const db = createAdminClient();
  return {
    async getInvoice(workspaceId, stage) {
      const { data, error } = await db.from("invoice").select("amount_cents,paid_at").eq("workspace_id", workspaceId).eq("stage", stage).maybeSingle();
      if (error) throw error;
      return data ? { amountCents: data.amount_cents as number | null, paid: !!data.paid_at } : null;
    },
    async markPaid(workspaceId, stage) {
      const { data, error } = await db.from("invoice").update({ paid_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId).eq("stage", stage).is("paid_at", null).select("stage");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    async markChargeFailed(workspaceId, stage, reason) {
      const { error } = await db.from("invoice").update({ charge_error: reason.slice(0, 200) }).eq("workspace_id", workspaceId).eq("stage", stage).is("paid_at", null);
      if (error) throw error;
    },
    async logPaid(workspaceId, stage, paymentId) {
      const { error } = await db.from("event_log").insert({ workspace_id: workspaceId, actor: null, action: "invoice.paid", detail: { stage, payment: paymentId } });
      if (error) throw error;
    },
  };
}

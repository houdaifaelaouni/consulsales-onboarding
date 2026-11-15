import { isPlanKey } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_CHARGE_ATTEMPTS, type ChargeRepo } from "./charge";

/** Server-only (service role). */
export function createSupabaseChargeRepo(): ChargeRepo {
  const db = createAdminClient();
  return {
    async loadAccount(workspaceId) {
      const [ws, bill] = await Promise.all([
        db.from("workspace").select("plan").eq("id", workspaceId).maybeSingle(),
        db.from("billing_account").select("member_id,payment_method_id").eq("workspace_id", workspaceId).maybeSingle(),
      ]);
      if (ws.error) throw ws.error;
      if (bill.error) throw bill.error;
      if (!ws.data || !bill.data || !isPlanKey(ws.data.plan)) return null;
      return { plan: ws.data.plan, memberId: bill.data.member_id as string, paymentMethodId: bill.data.payment_method_id as string };
    },
    async listUnpaid(workspaceId) {
      const { data, error } = await db.from("invoice").select("stage,charge_attempts,charge_attempted_at,charge_error").eq("workspace_id", workspaceId).in("stage", [2, 3]).is("paid_at", null);
      if (error) throw error;
      return (data ?? []).map((r) => ({ stage: r.stage as 2 | 3, attempts: r.charge_attempts as number, attemptedAt: (r.charge_attempted_at as string | null) ?? null, failed: r.charge_error !== null }));
    },
    async claim(workspaceId, stage, amountCents, currency, retryBefore) {
      // Takes the invoice only if it was never tried, or its last try failed before the retry cutoff.
      const { data: cur, error: readErr } = await db.from("invoice").select("charge_attempts").eq("workspace_id", workspaceId).eq("stage", stage).is("paid_at", null).maybeSingle();
      if (readErr) throw readErr;
      if (!cur || (cur.charge_attempts as number) >= MAX_CHARGE_ATTEMPTS) return false;
      const { data, error } = await db.from("invoice")
        .update({ amount_cents: amountCents, currency, charge_attempts: (cur.charge_attempts as number) + 1, charge_attempted_at: new Date().toISOString(), charge_error: null })
        .eq("workspace_id", workspaceId).eq("stage", stage).is("paid_at", null).eq("charge_attempts", cur.charge_attempts)
        .or(`charge_attempted_at.is.null,and(charge_error.not.is.null,charge_attempted_at.lt.${retryBefore})`)
        .select("stage");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    async recordFailure(workspaceId, stage, reason) {
      const { error } = await db.from("invoice").update({ charge_error: reason.slice(0, 200) }).eq("workspace_id", workspaceId).eq("stage", stage).is("paid_at", null);
      if (error) throw error;
    },
  };
}

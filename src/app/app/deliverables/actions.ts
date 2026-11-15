"use server";

import { getViewer } from "@/lib/auth/viewer";
import { getPaymentProvider } from "@/lib/payments";
import { chargeDueInvoices } from "@/lib/payments/charge";
import { createSupabaseChargeRepo } from "@/lib/payments/supabase-charge-repo";
import { createClient } from "@/lib/supabase/server";

export type DecideResult = { ok: true } | { ok: false; reason: "stale" | "failed" };

/**
 * The client (or an admin) approves or asks for changes. The database bills the next stage when an ideal client profile or a
 * LinkedIn profile is approved; we then charge the saved card for it, so the next stage is paid before its work starts.
 */
export async function decideDeliverable(id: string, decision: "approve" | "request_changes", note: string | null, version: number | null): Promise<DecideResult> {
  if (!(await getViewer())) return { ok: false, reason: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("deliverable_decide", { p_id: id, p_decision: decision, p_note: note, p_version: version });
  if (error) return { ok: false, reason: /newer version/i.test(error.message) ? "stale" : "failed" };
  if (decision === "approve") {
    try {
      const { data } = await supabase.from("deliverable").select("workspace_id").eq("id", id).single();
      if (data?.workspace_id) await chargeDueInvoices({ repo: createSupabaseChargeRepo(), provider: getPaymentProvider() }, data.workspace_id as string);
    } catch { /* approving worked; the payments page offers a link and the daily job retries */ }
  }
  return { ok: true };
}

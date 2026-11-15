"use server";

import { getViewer } from "@/lib/auth/viewer";
import { getPaymentProvider } from "@/lib/payments";
import { chargeDueInvoices } from "@/lib/payments/charge";
import { createSupabaseChargeRepo } from "@/lib/payments/supabase-charge-repo";
import { createClient } from "@/lib/supabase/server";

export type SendResult = { ok: true } | { ok: false; reason: "forbidden" | "failed" };

/**
 * Sends a deliverable to the client. The database decides who may (delivery lead or admin) and bills stage 2 or 3 when the
 * profile or the DM sequences become visible; here we then charge the saved card for whatever just became due.
 */
export async function sendForReview(deliverableId: string): Promise<SendResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, reason: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("deliverable_submit", { p_id: deliverableId });
  if (error) return { ok: false, reason: "failed" };
  try {
    const { data } = await supabase.from("deliverable").select("workspace_id").eq("id", deliverableId).single();
    if (data?.workspace_id) await chargeDueInvoices({ repo: createSupabaseChargeRepo(), provider: getPaymentProvider() }, data.workspace_id as string);
  } catch {
    // Sending worked. If charging could not start (no key yet), the page offers a pay link and the daily job retries.
  }
  return { ok: true };
}

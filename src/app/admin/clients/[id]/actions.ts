"use server";

import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export type SendResult = { ok: true } | { ok: false; reason: "forbidden" | "unpaid" | "failed" };

/** Sends a deliverable to the client. The database decides who may, and refuses until the stage it belongs to is paid. */
export async function sendForReview(deliverableId: string): Promise<SendResult> {
  if (!(await getViewer())) return { ok: false, reason: "forbidden" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("deliverable_submit", { p_id: deliverableId });
  if (error) return { ok: false, reason: /payment required/i.test(error.message) ? "unpaid" : "failed" };
  return { ok: true };
}

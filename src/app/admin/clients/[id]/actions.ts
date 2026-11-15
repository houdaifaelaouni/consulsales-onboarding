"use server";

import { revalidatePath } from "next/cache";
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

export type BillingResult = { ok: true } | { ok: false; reason: string };

/** Turns a database refusal into a short reason the panel can show. Never passes raw database text through. */
function reasonOf(message: string): string {
  if (/already paid/i.test(message)) return "paid";
  if (/charge is in progress/i.test(message)) return "charging";
  if (/reason is required/i.test(message)) return "reason";
  if (/not allowed/i.test(message)) return "forbidden";
  return "failed";
}

/** Admin only (the database checks): a custom price for a stage, in cents, or null for the plan price. */
export async function setStagePrice(workspaceId: string, stage: number, cents: number | null): Promise<BillingResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_stage_price", { p_ws: workspaceId, p_stage: stage, p_cents: cents });
  if (error) return { ok: false, reason: reasonOf(error.message) };
  revalidatePath(`/admin/clients/${workspaceId}`);
  return { ok: true };
}

/** Admin only: the stage counts as paid with no money taken (free stage, pilot, goodwill). */
export async function waiveStage(workspaceId: string, stage: number, reason: string): Promise<BillingResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_waive_stage", { p_ws: workspaceId, p_stage: stage, p_reason: reason });
  if (error) return { ok: false, reason: reasonOf(error.message) };
  revalidatePath(`/admin/clients/${workspaceId}`);
  return { ok: true };
}

/** Admin only: free trial access to the workspace for some days (0 ends it). */
export async function setTrial(workspaceId: string, days: number): Promise<BillingResult> {
  const until = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_trial", { p_ws: workspaceId, p_until: until });
  if (error) return { ok: false, reason: reasonOf(error.message) };
  revalidatePath(`/admin/clients/${workspaceId}`);
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { parseLeadsCsv } from "@/lib/outreach/leads";
import { getOwnerContext } from "@/lib/outreach/owner";

export type ImportResult =
  | { ok: true; added: number; duplicates: number; skipped: number }
  | { ok: false; reason: "forbidden" | "empty" | "too_big" | "too_many" | "no_columns" | "limit" | "failed" };

/** Reads the client's CSV, keeps the valid rows, and hands them to the database, which removes people already in the list. */
export async function importLeads(csv: string): Promise<ImportResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const parsed = parseLeadsCsv(csv);
  if (parsed.error) return { ok: false, reason: parsed.error };
  const { data, error } = await ctx.supabase.rpc("outreach_leads_import", { p_ws: ctx.workspaceId, p_rows: parsed.rows });
  if (error) return { ok: false, reason: /lead limit/i.test(error.message) ? "limit" : /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  const r = data as { added: number; duplicates: number };
  revalidatePath("/app/outreach/leads");
  return { ok: true, added: r.added, duplicates: r.duplicates, skipped: parsed.skipped.length };
}

export type StatusResult = { ok: true; changed: number } | { ok: false; reason: "forbidden" | "failed" };

export async function setLeadStatus(ids: string[], status: "new" | "approved" | "rejected"): Promise<StatusResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { data, error } = await ctx.supabase.rpc("outreach_leads_set_status", { p_ws: ctx.workspaceId, p_ids: ids, p_status: status });
  if (error) return { ok: false, reason: /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach/leads");
  return { ok: true, changed: data as number };
}

export async function approveAllNew(): Promise<StatusResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { data, error } = await ctx.supabase.rpc("outreach_leads_approve_all", { p_ws: ctx.workspaceId });
  if (error) return { ok: false, reason: /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach/leads");
  return { ok: true, changed: data as number };
}

"use server";

import { revalidatePath } from "next/cache";
import { validateCampaign, type CampaignField, type StepInput } from "@/lib/outreach/campaign";
import { getOwnerContext } from "@/lib/outreach/owner";

export type SaveResult = { ok: true; id: string } | { ok: false; reason: "forbidden" | "locked" | "failed" | CampaignField; step?: number };

/** Saves a draft (new or existing). The same limits are checked here and again by the database. */
export async function saveCampaign(id: string | null, name: string, steps: StepInput[]): Promise<SaveResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const v = validateCampaign(name, steps);
  if (!v.ok) return { ok: false, reason: v.field, step: v.step };
  const { data, error } = await ctx.supabase.rpc("outreach_campaign_save", {
    p_ws: ctx.workspaceId, p_id: id, p_name: name.trim(), p_steps: steps.map((s) => ({ delay_days: s.delayDays, body: s.body })),
  });
  if (error) return { ok: false, reason: /only a draft/i.test(error.message) ? "locked" : /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach/campaigns");
  return { ok: true, id: data as string };
}

export type RunResult = { ok: true; count: number } | { ok: false; reason: "forbidden" | "no_leads" | "not_running" | "failed" };

function runReason(message: string): Exclude<RunResult, { ok: true }>["reason"] {
  if (/no approved leads/i.test(message)) return "no_leads";
  if (/not allowed/i.test(message)) return "forbidden";
  if (/only a draft|not running/i.test(message)) return "not_running";
  return "failed";
}

/** Starts a draft: every approved lead not already in a campaign is enrolled. Nothing is sent until sending is switched on. */
export async function launchCampaign(id: string): Promise<RunResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { data, error } = await ctx.supabase.rpc("outreach_campaign_launch", { p_ws: ctx.workspaceId, p_id: id });
  if (error) return { ok: false, reason: runReason(error.message) };
  revalidatePath("/app/outreach/campaigns");
  return { ok: true, count: data as number };
}

export async function syncCampaign(id: string): Promise<RunResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { data, error } = await ctx.supabase.rpc("outreach_campaign_sync", { p_ws: ctx.workspaceId, p_id: id });
  if (error) return { ok: false, reason: runReason(error.message) };
  revalidatePath("/app/outreach/campaigns");
  return { ok: true, count: data as number };
}

export async function setCampaignStatus(id: string, status: "active" | "paused"): Promise<RunResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { error } = await ctx.supabase.rpc("outreach_campaign_set_status", { p_ws: ctx.workspaceId, p_id: id, p_status: status });
  if (error) return { ok: false, reason: runReason(error.message) };
  revalidatePath("/app/outreach/campaigns");
  return { ok: true, count: 0 };
}

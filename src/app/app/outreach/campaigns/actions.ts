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

export type CreateResult = { ok: true; id: string } | { ok: false; reason: "forbidden" | "name" | "failed" };

export interface CampaignOptions {
  engage_before: boolean;
  engage_after: boolean;
  contact_again_days: number | null;
  skip_existing: boolean;
  warmup_mode: boolean;
}

/** Creates an empty draft from the create dialog. The Build tab fills in the steps and launches it. */
export async function createCampaign(input: {
  name: string; description: string; channel: "LINKEDIN"; options: CampaignOptions;
}): Promise<CreateResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) return { ok: false, reason: "name" };
  const { data, error } = await ctx.supabase.rpc("outreach_campaign_create", {
    p_ws: ctx.workspaceId, p_name: name, p_description: input.description, p_channel: input.channel, p_options: input.options,
  });
  if (error) return { ok: false, reason: /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach/campaigns");
  return { ok: true, id: data as string };
}

/** Copies a campaign and its steps into a new draft. Enrollments stay with the original. */
export async function duplicateCampaign(id: string): Promise<CreateResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { data, error } = await ctx.supabase.rpc("outreach_campaign_duplicate", { p_ws: ctx.workspaceId, p_id: id });
  if (error) return { ok: false, reason: /not allowed|unknown/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach/campaigns");
  return { ok: true, id: data as string };
}

export type AssignResult = { ok: true; count: number } | { ok: false; reason: "forbidden" | "failed" };

/** Picks which connected profiles run this campaign. Accounts from other workspaces are ignored by the database. */
export async function assignCampaignAccounts(id: string, accountIds: string[]): Promise<AssignResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { data, error } = await ctx.supabase.rpc("outreach_campaign_accounts_set", {
    p_ws: ctx.workspaceId, p_campaign: id, p_accounts: accountIds,
  });
  if (error) return { ok: false, reason: /not allowed|unknown/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath(`/app/outreach/campaigns/${id}/accounts`);
  return { ok: true, count: data as number };
}

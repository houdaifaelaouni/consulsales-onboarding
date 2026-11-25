"use server";

import { revalidatePath } from "next/cache";
import { validateAgent, type AgentProfile } from "@/lib/outreach/agent";
import { getOwnerContext } from "@/lib/outreach/owner";

export type AgentSaveResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" | "failed" };

/** Saves the AI Super Agents knowledge base. Only the client owner; the table checks the same lengths. */
export async function saveAgentProfile(input: AgentProfile): Promise<AgentSaveResult> {
  const ctx = await getOwnerContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const check = validateAgent(input);
  if (!check.ok) return { ok: false, reason: "invalid" };
  const { error } = await ctx.supabase.rpc("outreach_agent_profile_save", {
    p_ws: ctx.workspaceId,
    p_domain: check.value.domain,
    p_context: check.value.context,
    p_icp: check.value.icp,
    p_identity: check.value.identity,
    p_positioning: check.value.positioning,
    p_instructions: check.value.instructions,
    p_notes: check.value.notes,
    p_timezone: check.value.timezone,
  });
  if (error) return { ok: false, reason: /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach/agents");
  return { ok: true };
}

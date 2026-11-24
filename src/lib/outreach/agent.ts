import { TIMEZONES } from "./settings";

/**
 * The AI Super Agents knowledge base: one row per workspace, read by the agent runtime when it writes outreach copy.
 * Nothing here talks to a language model yet; this story only stores and edits the source material.
 */
export interface AgentProfile {
  domain: string;
  context: string;
  icp: string;
  identity: "ai" | "founder";
  positioning: string;
  instructions: string;
  notes: string;
  timezone: string;
}

export const AGENT_LIMITS = { domain: 200, context: 8000, icp: 4000, positioning: 1000, instructions: 4000, notes: 2000 } as const;

export const EMPTY_AGENT: AgentProfile = {
  domain: "", context: "", icp: "", identity: "ai", positioning: "", instructions: "", notes: "", timezone: "Europe/Madrid",
};

export type AgentField = keyof typeof AGENT_LIMITS | "timezone";
export type AgentCheck = { ok: true; value: AgentProfile } | { ok: false; field: AgentField };

/** The same lengths the table checks. The first problem names the field to fix. */
export function validateAgent(input: AgentProfile): AgentCheck {
  for (const key of Object.keys(AGENT_LIMITS) as Array<keyof typeof AGENT_LIMITS>) {
    const value = input[key];
    if (typeof value !== "string") return { ok: false, field: key };
    if (value.length > AGENT_LIMITS[key]) return { ok: false, field: key };
  }
  if (input.identity !== "ai" && input.identity !== "founder") return { ok: false, field: "identity" as AgentField };
  if (!(TIMEZONES as readonly string[]).includes(input.timezone)) return { ok: false, field: "timezone" };
  return { ok: true, value: input };
}

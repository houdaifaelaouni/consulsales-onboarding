/** Campaign rules shared by the builder and the sender. The database enforces the same limits. */
export const LIMITS = { noteMax: 300, messageMax: 2000, maxMessages: 8, maxDelayDays: 30, nameMax: 80 } as const;

export interface StepInput { delayDays: number; body: string }
export type CampaignField = "name" | "note" | "messages" | "message" | "delay";
export type CampaignCheck = { ok: true } | { ok: false; field: CampaignField; step?: number };

/** steps[0] is the connection request (its note may be empty); steps[1..] are messages, each sent `delayDays` after the one before. */
export function validateCampaign(name: string, steps: StepInput[]): CampaignCheck {
  const n = name.trim();
  if (n.length < 1 || n.length > LIMITS.nameMax) return { ok: false, field: "name" };
  if (steps.length < 2 || steps.length - 1 > LIMITS.maxMessages) return { ok: false, field: "messages" };
  if (steps[0].body.length > LIMITS.noteMax) return { ok: false, field: "note", step: 0 };
  for (let i = 1; i < steps.length; i++) {
    const s = steps[i];
    if (s.body.trim().length < 1 || s.body.length > LIMITS.messageMax) return { ok: false, field: "message", step: i };
    if (!Number.isInteger(s.delayDays) || s.delayDays < 0 || s.delayDays > LIMITS.maxDelayDays) return { ok: false, field: "delay", step: i };
  }
  return { ok: true };
}

export interface TemplateLead { fullName: string; title?: string | null; company?: string | null }

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";
const lastName = (full: string) => full.trim().split(/\s+/).slice(1).join(" ");

/**
 * Fills {first_name}, {last_name}, {full_name}, {company}, {title}. A value we do not have becomes empty (never the raw tag),
 * and the spacing around it is tidied so "Hi , " cannot reach anyone.
 */
export function renderTemplate(text: string, lead: TemplateLead): string {
  const values: Record<string, string> = {
    first_name: firstName(lead.fullName), last_name: lastName(lead.fullName), full_name: lead.fullName.trim(),
    company: (lead.company ?? "").trim(), title: (lead.title ?? "").trim(),
  };
  return text
    .replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "")
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

/** Days until the first connection requests are all sent, at a daily limit. 0 when there is nobody or no limit. */
export function daysToSend(leads: number, perDay: number): number {
  return leads > 0 && perDay > 0 ? Math.ceil(leads / perDay) : 0;
}

export const PLACEHOLDERS = ["first_name", "last_name", "full_name", "company", "title"] as const;

import type { AdminClient, AdminStage, Flag } from "./types";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Thresholds from the PDR: access blocked 72 h, invoice unpaid 7 days, any overdue task. */
export const ACCESS_BLOCKED_HOURS = 72;
export const INVOICE_UNPAID_DAYS = 7;

export const STAGE_ORDER: AdminStage[] = ["intake", "building", "review", "live"];

export function computeFlags(c: AdminClient, now = new Date()): Flag[] {
  const flags: Flag[] = [];
  const overdue = c.tasks.filter((t) => t.status !== "done" && t.dueAt !== null && Date.parse(t.dueAt) < now.getTime()).length;
  if (overdue > 0) flags.push({ kind: "task_overdue", amount: overdue });
  if (c.accessBlockedSince) {
    const hours = Math.floor((now.getTime() - Date.parse(c.accessBlockedSince)) / HOUR_MS);
    if (hours >= ACCESS_BLOCKED_HOURS) flags.push({ kind: "access_blocked", amount: hours });
  }
  if (c.invoiceUnpaidSince) {
    const days = Math.floor((now.getTime() - Date.parse(c.invoiceUnpaidSince)) / DAY_MS);
    if (days >= INVOICE_UNPAID_DAYS) flags.push({ kind: "invoice_unpaid", amount: days });
  }
  return flags;
}

export interface Filters { plan: string; owner: string }

export function filterClients(clients: AdminClient[], f: Filters): AdminClient[] {
  return clients.filter((c) => (f.plan === "all" || c.plan === f.plan) && (f.owner === "all" || c.owner === f.owner));
}

/** Blocked clients rise to the top of their column; more flags first, then the one furthest into the journey. */
export function sortForBoard(clients: AdminClient[], now = new Date()): AdminClient[] {
  return [...clients].sort((a, b) => {
    const fa = computeFlags(a, now).length;
    const fb = computeFlags(b, now).length;
    return fb - fa || Date.parse(a.startDate) - Date.parse(b.startDate) || a.company.localeCompare(b.company);
  });
}

export function groupByStage(clients: AdminClient[], now = new Date()): Record<AdminStage, AdminClient[]> {
  const out: Record<AdminStage, AdminClient[]> = { intake: [], building: [], review: [], live: [] };
  for (const c of sortForBoard(clients, now)) out[c.stage].push(c);
  return out;
}

export function uniqueOwners(clients: AdminClient[]): string[] {
  return [...new Set(clients.map((c) => c.owner))].sort();
}

export function blockedCount(clients: AdminClient[], now = new Date()): number {
  return clients.filter((c) => computeFlags(c, now).length > 0).length;
}

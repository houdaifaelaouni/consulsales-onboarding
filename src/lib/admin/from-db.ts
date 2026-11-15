import type { AdminClient, AdminEvent, AdminPlan, AdminStage, AdminTask, AdminTaskStatus } from "./types";

export interface WorkspaceRow { id: string; company: string; plan: string; stage: string; start_date: string }
export interface TaskRow { id: string; workspace_id: string; type: string; status: string; due_at: string | null }
export interface MemberRow { workspace_id: string; user_id: string; role: string }
export interface EventRow { workspace_id: string; actor: string | null; action: string; at: string }
export interface PersonRow { id: string; name: string | null; email: string }

const PLANS: AdminPlan[] = ["starter", "pro", "enterprise"];
const STAGES: AdminStage[] = ["intake", "building", "review", "live"];
const STATUSES: AdminTaskStatus[] = ["todo", "in_progress", "blocked", "done"];

const personName = (p?: PersonRow) => p?.name?.trim() || p?.email.split("@")[0] || "";

/** Builds the admin board's client list from raw rows. Invoices, files and notes have no tables yet, so they stay empty. */
export function toAdminClients(
  workspaces: WorkspaceRow[], tasks: TaskRow[], members: MemberRow[], events: EventRow[], people: PersonRow[],
): AdminClient[] {
  const who = new Map(people.map((p) => [p.id, p]));
  return workspaces.map((w) => {
    const lead = members.find((m) => m.workspace_id === w.id && m.role === "delivery_lead");
    const ts: AdminTask[] = tasks.filter((t) => t.workspace_id === w.id).map((t) => ({
      id: t.id, type: t.type, dueAt: t.due_at,
      status: STATUSES.includes(t.status as AdminTaskStatus) ? (t.status as AdminTaskStatus) : "todo",
    }));
    const evs: AdminEvent[] = events.filter((e) => e.workspace_id === w.id)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((e) => ({ at: e.at, action: e.action, actor: e.actor ? personName(who.get(e.actor)) || "Client" : "System" }));
    return {
      id: w.id, company: w.company, startDate: w.start_date,
      plan: PLANS.includes(w.plan as AdminPlan) ? (w.plan as AdminPlan) : "starter",
      stage: STAGES.includes(w.stage as AdminStage) ? (w.stage as AdminStage) : "intake",
      owner: lead ? personName(who.get(lead.user_id)) || "Unassigned" : "Unassigned",
      tasks: ts, files: [], invoices: [], events: evs, notes: [],
    };
  });
}

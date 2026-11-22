import { PLANS, type TaskTemplate } from "@/lib/plans";

/** Storage port, so opening a room is testable without a database. */
export interface RoomRepo {
  upsertUserByEmail(email: string, locale: string): Promise<string>;
  /** Fails with "limit" when the agency's tier has no rooms left (the database enforces it). */
  createRoom(r: { company: string; agencyId: string; ownerId: string; contactEmail: string }): Promise<{ ok: true; workspaceId: string } | { ok: false; reason: "limit" }>;
  addMember(workspaceId: string, userId: string, role: "client_owner" | "delivery_lead"): Promise<void>;
  addTasks(workspaceId: string, userId: string, tasks: Array<TaskTemplate & { dueAt: string }>): Promise<void>;
  sendInvite(email: string, locale: string): Promise<void>;
}

export type NewRoomCheck = { ok: true; company: string; email: string } | { ok: false; reason: "company" | "email" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewRoom(input: { company: string; clientEmail: string }): NewRoomCheck {
  const company = input.company.trim().replace(/\s+/g, " ");
  const email = input.clientEmail.trim().toLowerCase();
  if (company.length < 2 || company.length > 80) return { ok: false, reason: "company" };
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, reason: "email" };
  return { ok: true, company, email };
}

export type OpenRoomResult = { ok: true; workspaceId: string } | { ok: false; reason: "company" | "email" | "limit" | "failed" };

/**
 * Opens a client room for an agency: the client becomes its owner, the agency member who opened it becomes its delivery lead,
 * and the client gets the standard task list and a sign-in link. The invite goes last so a failure never emails the client.
 */
export async function openRoom(repo: RoomRepo, input: { agencyId: string; openerId: string; company: string; clientEmail: string }, now = new Date()): Promise<OpenRoomResult> {
  const v = validateNewRoom(input);
  if (!v.ok) return v;
  try {
    const clientId = await repo.upsertUserByEmail(v.email, "en");
    const room = await repo.createRoom({ company: v.company, agencyId: input.agencyId, ownerId: clientId, contactEmail: v.email });
    if (!room.ok) return room;
    await repo.addMember(room.workspaceId, clientId, "client_owner");
    await repo.addMember(room.workspaceId, input.openerId, "delivery_lead");
    await repo.addTasks(room.workspaceId, clientId, PLANS.pro.tasks.map((t) => ({ ...t, dueAt: new Date(now.getTime() + t.dueInDays * 86_400_000).toISOString() })));
    await repo.sendInvite(v.email, "en");
    return { ok: true, workspaceId: room.workspaceId };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

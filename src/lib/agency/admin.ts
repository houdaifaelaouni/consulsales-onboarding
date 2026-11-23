import type { AgencyTier } from "./tiers";

export interface AgencyListRow { id: string; name: string; tier: AgencyTier; ownerEmail: string | null; createdAt: string }

/** Storage port, so the create flow is testable without a database. */
export interface AgencyAdminRepo {
  upsertUserByEmail(email: string, locale: string): Promise<string>;
  createAgency(name: string): Promise<string>;
  addOwner(agencyId: string, userId: string): Promise<void>;
  sendInvite(email: string, locale: string): Promise<void>;
  list(): Promise<AgencyListRow[]>;
}

export type NewAgencyCheck = { ok: true; name: string; email: string } | { ok: false; reason: "name" | "email" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewAgency(input: { name: string; ownerEmail: string }): NewAgencyCheck {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.ownerEmail.trim().toLowerCase();
  if (name.length < 2 || name.length > 80) return { ok: false, reason: "name" };
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, reason: "email" };
  return { ok: true, name, email };
}

export type CreateAgencyResult = { ok: true; agencyId: string } | { ok: false; reason: "name" | "email" | "failed" };

/** Makes the agency on the free tier, makes its owner, and emails them a sign-in link. The invite goes last so a failure never emails a stranger. */
export async function createAgency(repo: AgencyAdminRepo, input: { name: string; ownerEmail: string }): Promise<CreateAgencyResult> {
  const v = validateNewAgency(input);
  if (!v.ok) return v;
  try {
    const userId = await repo.upsertUserByEmail(v.email, "en");
    const agencyId = await repo.createAgency(v.name);
    await repo.addOwner(agencyId, userId);
    await repo.sendInvite(v.email, "en");
    return { ok: true, agencyId };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

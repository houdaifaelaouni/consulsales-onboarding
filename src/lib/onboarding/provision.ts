import { PLANS, isPlanKey, type PlanKey, type TaskTemplate } from "@/lib/plans";
import type { NormalizedPayment } from "@/lib/payments/types";

/** Storage port so provisioning is testable without a database. */
export interface ProvisionRepo {
  /** True if a workspace already exists for this payment (idempotency key). */
  workspaceExistsForPayment(provider: string, paymentId: string): Promise<boolean>;
  /** Audit trail of processed deliveries. Called only after provisioning succeeded. */
  recordEvent(id: string, provider: string, type: string): Promise<void>;
  upsertUserByEmail(email: string, locale: string): Promise<string>;
  createWorkspace(w: {
    company: string; plan: PlanKey; language: string; ownerId: string;
    paymentProvider: string; paymentId: string; contactEmail: string;
  }): Promise<string>;
  addMembership(workspaceId: string, userId: string, role: "client_owner"): Promise<void>;
  addTasks(workspaceId: string, userId: string, tasks: Array<TaskTemplate & { dueAt: string }>): Promise<void>;
  sendInvite(email: string, locale: string): Promise<void>;
}

const LOCALES = ["en", "fr", "es", "de", "pt-br", "zh"];

export type ProvisionResult =
  | { status: "created"; workspaceId: string }
  | { status: "duplicate" }
  | { status: "rejected"; reason: string };

export async function provisionWorkspace(
  repo: ProvisionRepo, provider: string, p: NormalizedPayment, now = new Date(),
): Promise<ProvisionResult> {
  const plan = p.metadata.plan;
  if (!isPlanKey(plan)) return { status: "rejected", reason: "missing or unknown plan in metadata" };

  // Idempotent: a retried delivery finds the workspace already there. If a previous attempt
  // failed halfway, no workspace exists yet, so the retry provisions it properly.
  if (await repo.workspaceExistsForPayment(provider, p.paymentId)) return { status: "duplicate" };

  const locale = LOCALES.includes(p.metadata.language) ? p.metadata.language : "en";
  const userId = await repo.upsertUserByEmail(p.email, locale);
  const workspaceId = await repo.createWorkspace({
    company: p.metadata.company || p.email.split("@")[1] || "New client",
    plan, language: locale, ownerId: userId,
    paymentProvider: provider, paymentId: p.paymentId, contactEmail: p.email,
  });
  await repo.addMembership(workspaceId, userId, "client_owner");
  await repo.addTasks(
    workspaceId, userId,
    PLANS[plan].tasks.map((t) => ({ ...t, dueAt: new Date(now.getTime() + t.dueInDays * 86_400_000).toISOString() })),
  );
  await repo.sendInvite(p.email, locale);
  await repo.recordEvent(p.eventId, provider, "payment.succeeded");
  return { status: "created", workspaceId };
}

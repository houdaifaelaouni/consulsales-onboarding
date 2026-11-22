import { PLANS, isPlanKey, type PlanKey } from "@/lib/plans";
import { AGENCY_TIERS, type AgencyTier } from "@/lib/agency/tiers";
import type { NormalizedPayment } from "./types";

export type PaymentKind =
  | { type: "signup"; plan: PlanKey }
  | { type: "stage"; workspaceId: string; stage: 1 | 2 | 3 }
  | { type: "agency"; agencyId: string; tier: AgencyTier }
  | { type: "unknown"; reason: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Env = Record<string, string | undefined>;

const planEnvs = (env: Env) => (Object.keys(PLANS) as PlanKey[]).map((k) => ({ key: k, id: env[PLANS[k].whopPlanEnv]?.trim() })).filter((x) => !!x.id);

/** Which of our plans a Whop plan id means, from the settings. */
export function planFromWhopId(planId: string | undefined, env: Env): PlanKey | null {
  if (!planId) return null;
  return planEnvs(env).find((x) => x.id === planId)?.key ?? null;
}

const PAID_TIERS: AgencyTier[] = ["starter", "growth", "scale"];

/** Which agency tier a Whop plan id means, from the settings. */
export function tierFromWhopId(planId: string | undefined, env: Env): AgencyTier | null {
  if (!planId) return null;
  return PAID_TIERS.find((t) => {
    const name = AGENCY_TIERS[t].whopPlanEnv;
    return !!name && env[name]?.trim() === planId;
  }) ?? null;
}

/**
 * What a paid payment is for.
 * - a stage payment: made from a checkout WE created (metadata says which workspace and stage)
 * - an agency tier: the plan id is one of the agency tier plans in the settings (the agency id in metadata is trusted only then)
 * - a sign-up: the buyer picked one of the plans mapped in the settings. Metadata alone is trusted only while no plan ids are set at all.
 */
export function classifyPayment(p: NormalizedPayment, env: Env): PaymentKind {
  if (p.metadata.kind === "stage") {
    const stage = Number(p.metadata.stage);
    if (!UUID.test(p.metadata.workspace_id ?? "") || (stage !== 1 && stage !== 2 && stage !== 3)) return { type: "unknown", reason: "bad stage metadata" };
    return { type: "stage", workspaceId: p.metadata.workspace_id, stage };
  }
  const tier = tierFromWhopId(p.planId, env);
  if (tier) {
    if (!UUID.test(p.metadata.agency_id ?? "")) return { type: "unknown", reason: "bad agency metadata" };
    return { type: "agency", agencyId: p.metadata.agency_id, tier };
  }
  const mapped = planFromWhopId(p.planId, env);
  if (mapped) return { type: "signup", plan: mapped };
  if (planEnvs(env).length === 0 && isPlanKey(p.metadata.plan)) return { type: "signup", plan: p.metadata.plan };
  return { type: "unknown", reason: planEnvs(env).length ? "plan id not recognised" : "no plan" };
}

/** True when what was paid covers the price. Compared in cents, so "300.0" and "300" both match. Tax or fees on top are fine. */
export function amountAtLeast(paid: string, expectedMajor: number): boolean {
  const cents = Math.round(Number(paid) * 100);
  return Number.isFinite(cents) && cents >= Math.round(expectedMajor * 100);
}

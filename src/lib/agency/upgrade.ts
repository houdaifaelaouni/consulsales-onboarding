import { AGENCY_TIERS, isAgencyTier, tierRank, type AgencyTier } from "./tiers";

/** Tiers an agency could move up to. */
export function upgradeOptions(current: AgencyTier): AgencyTier[] {
  return (Object.keys(AGENCY_TIERS) as AgencyTier[]).filter((t) => tierRank(t) > tierRank(current));
}

export type UpgradeCheck =
  | { ok: true; tier: AgencyTier; planId: string }
  | { ok: false; reason: "forbidden" | "not_upgrade" | "unavailable" };

/** Who may start a checkout, for which tier, and with which Whop plan. Only an owner may buy, only upward, only when the plan is set up. */
export function checkUpgrade(input: { current: AgencyTier; requested: unknown; role: string | null; env: Record<string, string | undefined> }): UpgradeCheck {
  if (input.role !== "owner") return { ok: false, reason: "forbidden" };
  if (!isAgencyTier(input.requested) || tierRank(input.requested) <= tierRank(input.current)) return { ok: false, reason: "not_upgrade" };
  const name = AGENCY_TIERS[input.requested].whopPlanEnv;
  const planId = name ? input.env[name]?.trim() : undefined;
  return planId ? { ok: true, tier: input.requested, planId } : { ok: false, reason: "unavailable" };
}

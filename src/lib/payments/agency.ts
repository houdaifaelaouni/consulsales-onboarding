import { tierRank, type AgencyTier } from "@/lib/agency/tiers";

export type UpgradeResult = "upgraded" | "unchanged" | "not_found";

export interface AgencyRepo {
  /** Current tier, or null when the agency does not exist. */
  getTier(agencyId: string): Promise<AgencyTier | null>;
  /** Sets the tier only if the stored tier is still `from`, so two payments racing cannot overwrite each other. True when it changed. */
  setTier(agencyId: string, from: AgencyTier, to: AgencyTier): Promise<boolean>;
}

export interface AgencyBilling {
  upgradeTier(agencyId: string, tier: AgencyTier): Promise<UpgradeResult>;
}

/** Raises an agency to the tier it paid for. A repeated or late payment for the same or a lower tier changes nothing. */
export function createAgencyBilling(repo: AgencyRepo): AgencyBilling {
  return { upgradeTier: async (agencyId, tier) => {
    for (let i = 0; i < 3; i++) {
      const current = await repo.getTier(agencyId);
      if (!current) return "not_found";
      if (tierRank(current) >= tierRank(tier)) return "unchanged";
      if (await repo.setTier(agencyId, current, tier)) return "upgraded";
    }
    return "unchanged";
  } };
}

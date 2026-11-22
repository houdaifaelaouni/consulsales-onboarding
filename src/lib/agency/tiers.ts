/** Agency tiers. Mirrors the database function agency_room_limit; prices are placeholders: confirm before launch. */
export type AgencyTier = "free" | "starter" | "growth" | "scale";

export interface AgencyTierConfig {
  key: AgencyTier;
  title: string;
  /** Client rooms an agency may open. Free: 1 in total. Paid tiers: this many per calendar month. */
  roomLimit: number;
  period: "total" | "month";
  /** Monthly price in euros. Null for the free tier. */
  monthlyPrice: number | null;
  whiteLabel: boolean;
  multiBrand: boolean;
  /** Setting holding the Whop plan id for this tier. Null for the free tier. */
  whopPlanEnv: string | null;
}

export const AGENCY_TIERS: Record<AgencyTier, AgencyTierConfig> = {
  free: { key: "free", title: "Free", roomLimit: 1, period: "total", monthlyPrice: null, whiteLabel: false, multiBrand: false, whopPlanEnv: null },
  starter: { key: "starter", title: "Starter", roomLimit: 3, period: "month", monthlyPrice: 49, whiteLabel: false, multiBrand: false, whopPlanEnv: "WHOP_AGENCY_PLAN_STARTER" },
  growth: { key: "growth", title: "Growth", roomLimit: 10, period: "month", monthlyPrice: 129, whiteLabel: true, multiBrand: false, whopPlanEnv: "WHOP_AGENCY_PLAN_GROWTH" },
  scale: { key: "scale", title: "Scale", roomLimit: 50, period: "month", monthlyPrice: 299, whiteLabel: true, multiBrand: true, whopPlanEnv: "WHOP_AGENCY_PLAN_SCALE" },
};

const ORDER: AgencyTier[] = ["free", "starter", "growth", "scale"];

export function isAgencyTier(v: unknown): v is AgencyTier {
  return typeof v === "string" && (ORDER as string[]).includes(v);
}

/** Higher number = bigger tier. Used so a late or repeated payment can never downgrade an agency. */
export function tierRank(tier: AgencyTier): number {
  return ORDER.indexOf(tier);
}

export function tierPrice(tier: AgencyTier): number {
  return AGENCY_TIERS[tier].monthlyPrice ?? 0;
}

export function roomsLeft(tier: AgencyTier, used: number): number {
  return Math.max(AGENCY_TIERS[tier].roomLimit - used, 0);
}

export function canOpenRoom(tier: AgencyTier, used: number): boolean {
  return roomsLeft(tier, used) > 0;
}

/** The next tier up, or null on the top tier. Drives the upgrade prompt. */
export function nextTier(tier: AgencyTier): AgencyTier | null {
  return ORDER[ORDER.indexOf(tier) + 1] ?? null;
}

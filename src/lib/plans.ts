/** Plan config. Mirrors the website plans; confirm prices before launch. */
export type PlanKey = "starter" | "pro" | "enterprise";

export interface TaskTemplate { type: string; dueInDays: number }

export interface PlanConfig {
  key: PlanKey;
  title: string;
  /**
   * The three setup payments in euros (website: "Setup, paid in 3 stages"; setup 900 / 1,800 / 4,500). Founder's decision: every
   * plan pays 300 at checkout, then the rest in two equal payments, charged when the profile (day 7) and the DM sequences
   * (day 14) are visible to the client.
   */
  stagePrices: [number, number, number];
  /** Monthly fee in euros, starts after stage 3 (website prices, excluding VAT). */
  monthlyPrice: number;
  currency: "eur";
  /** Name of the setting holding the Whop plan id the buyer picks at checkout. */
  whopPlanEnv: string;
  tasks: TaskTemplate[];
}

const baseTasks: TaskTemplate[] = [
  { type: "book_kickoff", dueInDays: 3 },
  { type: "complete_intake", dueInDays: 3 },
  { type: "connect_linkedin", dueInDays: 3 },
  { type: "connect_crm", dueInDays: 5 },
  { type: "upload_brand_files", dueInDays: 5 },
  { type: "approve_icp", dueInDays: 7 },
];

export const PLANS: Record<PlanKey, PlanConfig> = {
  starter: { key: "starter", title: "Starter", stagePrices: [300, 300, 300], monthlyPrice: 750, currency: "eur", whopPlanEnv: "WHOP_PLAN_STARTER", tasks: baseTasks },
  pro: {
    key: "pro", title: "Growth", stagePrices: [300, 750, 750], monthlyPrice: 1200, currency: "eur", whopPlanEnv: "WHOP_PLAN_PRO",
    tasks: [...baseTasks, { type: "approve_profile", dueInDays: 13 }],
  },
  enterprise: {
    key: "enterprise", title: "Scale", stagePrices: [300, 2100, 2100], monthlyPrice: 3500, currency: "eur", whopPlanEnv: "WHOP_PLAN_ENTERPRISE",
    tasks: [...baseTasks, { type: "approve_profile", dueInDays: 13 }, { type: "approve_sequences", dueInDays: 13 }],
  },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "starter" || v === "pro" || v === "enterprise";
}

/** Custom stage prices set by an admin, in cents (null = the plan price). Stored on the workspace. */
export type StageOverrides = ReadonlyArray<number | null> | null | undefined;

/** What a stage costs this client, in euros: the admin's custom price if set, else the plan price. */
export function stagePrice(plan: PlanKey, stage: number, overrides?: StageOverrides): number {
  const custom = overrides?.[stage - 1];
  return typeof custom === "number" && custom > 0 ? custom / 100 : PLANS[plan].stagePrices[stage - 1];
}

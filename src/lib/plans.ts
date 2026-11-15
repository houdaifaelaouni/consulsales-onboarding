/** Plan config. Mirrors the website plans; confirm prices before launch. */
export type PlanKey = "starter" | "pro" | "enterprise";

export interface TaskTemplate { type: string; dueInDays: number }

export interface PlanConfig {
  key: PlanKey;
  title: string;
  /** Stage-1 setup fee in major units. null = not configured yet (checkout refuses). */
  stage1Price: number | null;
  currency: "eur";
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
  starter: { key: "starter", title: "Starter", stage1Price: null, currency: "eur", tasks: baseTasks },
  pro: { key: "pro", title: "Pro", stage1Price: null, currency: "eur", tasks: [...baseTasks, { type: "approve_profile", dueInDays: 13 }] },
  enterprise: {
    key: "enterprise", title: "Enterprise", stage1Price: null, currency: "eur",
    tasks: [...baseTasks, { type: "approve_profile", dueInDays: 13 }, { type: "approve_sequences", dueInDays: 13 }],
  },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "starter" || v === "pro" || v === "enterprise";
}

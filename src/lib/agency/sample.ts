/** Sample data for the agency demo screens. Illustrative only: never import this into a live screen. */
import type { AgencyTier } from "./tiers";

export const DEMO_AGENCY = { name: "North Growth Agency", tier: "starter" as AgencyTier };

export const DEMO_ROOMS = [
  { id: "r1", company: "Acme Robotics", email: "ceo@acme.example", daysAgo: 34 },
  { id: "r2", company: "Bluepeak Software", email: "founder@bluepeak.example", daysAgo: 9 },
];

export interface Milestone { key: string; day: string; status: "done" | "current" | "upcoming" }
export const DEMO_MILESTONES: Milestone[] = [
  { key: "admin", day: "Days 1 to 3", status: "done" },
  { key: "kickoff", day: "Days 4 to 7", status: "done" },
  { key: "first", day: "Week 2", status: "done" },
  { key: "d30", day: "Day 30", status: "current" },
  { key: "d60", day: "Day 60", status: "upcoming" },
  { key: "d90", day: "Day 90", status: "upcoming" },
];

export const DEMO_RATES = { acceptance: 43, reply: 36, meetings: 8, targetReply: "12 to 15" };

export const DEMO_QUIET = [
  { company: "Acme Robotics", quietDays: 2 },
  { company: "Bluepeak Software", quietDays: 11 },
  { company: "Cedar Legal", quietDays: 19 },
];

export const DEMO_INPUTS = ["icpNotes", "transcript", "leadList", "caseStudies", "proposal", "website"] as const;
export type DemoInput = (typeof DEMO_INPUTS)[number];

export interface IcpField { key: "industries" | "sizes" | "titles" | "geos" | "exclusions" | "triggers" | "disqualifiers"; value: string; confidence: number }
export const DEMO_ICP: IcpField[] = [
  { key: "industries", value: "B2B SaaS, IT consulting, marketing agencies", confidence: 92 },
  { key: "sizes", value: "11 to 200 employees", confidence: 88 },
  { key: "titles", value: "Founder, CEO, Head of Growth", confidence: 85 },
  { key: "geos", value: "Spain, Portugal, Netherlands", confidence: 74 },
  { key: "exclusions", value: "Competitors, current clients, freelancers", confidence: 61 },
  { key: "triggers", value: "Recent funding, new hire in sales, new product launch", confidence: 55 },
  { key: "disqualifiers", value: "Under 5 employees, no website", confidence: 48 },
];
export const VERIFY_BELOW = 70;

export const DEMO_ANGLES = ["a1", "a2", "a3"] as const;

export const DEMO_PACKS = [
  { key: "small", credits: 5, price: 19 },
  { key: "medium", credits: 25, price: 49 },
  { key: "large", credits: 100, price: 149 },
] as const;

export const BRAND_COLORS = ["#5e6ad2", "#16a34a", "#dc2626", "#d97706", "#0891b2"];

export const DEMO_AGENCIES = [
  { id: "g1", name: "North Growth Agency", owner: "sara@northgrowth.example", tier: "starter" as AgencyTier },
  { id: "g2", name: "Leadforge", owner: "marco@leadforge.example", tier: "growth" as AgencyTier },
];

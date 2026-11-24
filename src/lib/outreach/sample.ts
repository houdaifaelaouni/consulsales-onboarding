import type { CampaignCounts } from "./analytics";
import type { AgentProfile } from "./agent";
import type { StepInput } from "./campaign";
import type { CampaignCard, LeadRow, ProfileView } from "./workspace";

/** Sample data for /demo/outreach. Nothing here is written anywhere; the demo banner says so. */
export const DEMO_CAMPAIGN_ID = "sample-campaign";
export const DEMO_CAMPAIGN_NAME = "MOZAIC Media & Digital – LinkedIn Outreach (M. A. Achbah)";

export const DEMO_STEPS: StepInput[] = [
  { delayDays: 0, body: "Hi {first_name}, I work with agencies like {company} on LinkedIn outreach. Would you be open to a short call?" },
  { delayDays: 2, body: "Quick follow-up, {first_name}. We build the founder's outreach so you keep the calls and skip the prospecting. Worth 15 minutes?" },
  { delayDays: 4, body: "Last note from me, {first_name}. If the timing is wrong I'll close the loop and stay out of your inbox." },
];

export const DEMO_CAMPAIGNS: CampaignCard[] = [
  {
    id: DEMO_CAMPAIGN_ID, name: DEMO_CAMPAIGN_NAME, description: null, status: "paused", channel: "linkedin",
    leads: 1318, progress: 34.7, createdAt: "2026-09-29",
  },
  {
    id: "sample-campaign-2", name: "Outbound Campaign", description: "Default outbound campaign", status: "paused", channel: "linkedin",
    leads: 682, progress: 0.7, createdAt: "2026-09-16",
  },
];

export const DEMO_COUNTS: CampaignCounts = {
  leads: 1318, invites: 338, messages: 305, accepted: 146, replies: 110, positive: 74,
  conversations: 107, meetings: 8, completed: 201, failed: 0, stopped: 12, failedSends: 57,
};

export const DEMO_QUEUE = {
  pending: 791, inProgress: 326, completed: 201, failed: 0,
  steps: [{ step: 1, leads: 328 }, { step: 2, leads: 263 }, { step: 3, leads: 198 }],
};

const names: Array<[string, string, string, string]> = [
  ["Suraj", "Pawar", "Assistant Technical Services Manager", ""],
  ["Leander", "Goth", "Co-Founder bei PrintTexx", ""],
  ["Muhammad", "Hamza Javed", "Social Media Lead Generation", ""],
  ["Manuel", "Machado", "Helping organizations automate", ""],
  ["Jesus", "Lizandra", "Técnico en Sistemas Microinformáticos", ""],
  ["Harumi", "H Cruz", "Procurement / Purchaser", ""],
  ["Luke", "Webber", "Connecting Investors, Boards", ""],
  ["Mutasim", "Abdul Baqi", "UX/UI Designer | Human-centred", ""],
  ["Mara", "Slootmaker", "Portfoliomanagement", ""],
  ["Ana", "Costa", "Founder", "Nova Studio"],
  ["Marc", "Dubois", "Partner", "Atelier Nord"],
  ["Sofia", "Rossi", "Head of Growth", "Studio Nord"],
];

export const DEMO_LEADS: LeadRow[] = names.map(([first, last, title, company], i) => ({
  id: `sample-lead-${i + 1}`,
  fullName: `${first} ${last}`,
  email: i % 3 === 0 ? `${first.toLowerCase()}@${(company || "studionorth").toLowerCase().replace(/[^a-z]/g, "")}.com` : null,
  phone: null,
  company: company || null,
  title,
  domain: company ? `${company.toLowerCase().replace(/[^a-z]/g, "")}.com` : null,
  location: i % 4 === 0 ? "Barcelona, Spain" : null,
  status: i < 6 ? "approved" : i < 9 ? "new" : "rejected",
  platform: "linkedin",
}));

export const DEMO_PROFILES: ProfileView[] = [];

export const DEMO_AGENT: AgentProfile = {
  domain: "consulsales.app",
  context:
    "ConsulSales runs LinkedIn as a sales channel for B2B agencies and consultancies: personalised outreach and founder-voice content, built on one shared plan.\n\nWho it is for: founders of B2B agencies with 2 to 15 people who still do most of the selling themselves and get most clients from referrals.",
  icp:
    "Founders, CEOs and managing partners of B2B service businesses (marketing, design, development, IT services, recruitment, sales and growth consultancies) with 2 to 15 people and roughly €10K to €50K in monthly revenue.\nMain markets: Spain, the Nordics, the UK, France, the Netherlands and Germany.",
  identity: "founder",
  positioning:
    "Versus hiring a BDR: a BDR costs from €4K a month, takes around 90 days to ramp and leaves with the know-how.\nVersus an outreach tool alone: a tool sends messages but nobody owns the copy, the replies or the weekly testing. We run all of it and report every week.\nVersus doing it yourself: the founder gets back the hours spent on outreach and only joins the calls.",
  instructions:
    "House rules for every post: first person as the founder. Write \"I\", never \"we\".\nAudience: founders of B2B agencies and consultancies.\nOnly true numbers. Never invent a client, a result or a statistic.",
  notes: "",
  timezone: "Europe/Madrid",
};

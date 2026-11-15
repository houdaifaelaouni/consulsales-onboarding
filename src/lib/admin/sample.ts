import type { AdminClient, AdminTask } from "./types";

/** Fixed demo clock so the page is stable. */
export const ADMIN_NOW = "2026-11-15T12:00:00Z";
const ago = (h: number) => new Date(Date.parse(ADMIN_NOW) - h * 3_600_000).toISOString();
const inH = (h: number) => ago(-h);
const task = (id: string, type: string, status: AdminTask["status"], dueAt: string | null): AdminTask => ({ id, type, status, dueAt });
const baseTasks = (done: number): AdminTask[] => {
  const types = ["book_kickoff", "complete_intake", "connect_linkedin", "connect_crm", "upload_brand_files", "approve_icp"];
  return types.map((t, i) => task(`t${i}`, t, i < done ? "done" : "todo", inH(24 * (i + 1))));
};

export const SAMPLE_CLIENTS: AdminClient[] = [
  {
    id: "studio-north", company: "Studio North", plan: "pro", owner: "Alex", stage: "intake", startDate: "2026-11-13",
    tasks: [task("t0", "book_kickoff", "done", ago(30)), task("t1", "complete_intake", "in_progress", inH(20)), task("t2", "connect_linkedin", "todo", inH(30))],
    files: [], invoices: [{ stage: 1, amountCents: 50000, status: "paid" }, { stage: 2, amountCents: 90000, status: "locked" }],
    events: [
      { at: ago(48), actor: "System", action: "Workspace created after payment" },
      { at: ago(47), actor: "Sara Lopez", action: "Booked kickoff call" },
      { at: ago(5), actor: "Sara Lopez", action: "Completed intake step 2 of 4" },
    ],
    notes: [{ by: "Alex", at: ago(40), text: "Founder prefers mornings. Mobile first." }],
  },
  {
    id: "arc-media", company: "Arc Media", plan: "starter", owner: "Mia", stage: "intake", startDate: "2026-11-12",
    accessBlockedSince: ago(90),
    tasks: [task("t0", "book_kickoff", "done", ago(60)), task("t1", "complete_intake", "todo", ago(10)), task("t2", "connect_linkedin", "blocked", ago(20))],
    files: [{ name: "arc-logo.svg", size: 14_000 }],
    invoices: [{ stage: 1, amountCents: 30000, status: "paid" }],
    events: [
      { at: ago(72), actor: "System", action: "Workspace created after payment" },
      { at: ago(90), actor: "Arc Media", action: "Reported being stuck: LinkedIn access" },
      { at: ago(18), actor: "System", action: "Reminder sent: intake not started" },
    ],
    notes: [],
  },
  {
    id: "kite-labs", company: "Kite Labs", plan: "enterprise", owner: "Alex", stage: "building", startDate: "2026-11-06",
    tasks: [...baseTasks(6), task("t6", "approve_profile", "in_progress", inH(48))],
    files: [{ name: "brand-guide.pdf", size: 4_200_000 }, { name: "logo-white.svg", size: 12_000 }],
    invoices: [{ stage: 1, amountCents: 80000, status: "paid" }, { stage: 2, amountCents: 140000, status: "paid" }, { stage: 3, amountCents: 110000, status: "locked" }],
    events: [
      { at: ago(24 * 8), actor: "System", action: "Workspace created after payment" },
      { at: ago(24 * 4), actor: "Mark Diaz", action: "Approved ideal client profile (version 2)" },
      { at: ago(24 * 4 - 1), actor: "System", action: "Stage 2 invoice created" },
      { at: ago(24 * 2), actor: "Mark Diaz", action: "Paid stage 2 invoice" },
    ],
    notes: [],
  },
  {
    id: "mono-agency", company: "Mono Agency", plan: "pro", owner: "Mia", stage: "building", startDate: "2026-11-09",
    invoiceUnpaidSince: ago(24 * 9),
    tasks: baseTasks(6),
    files: [{ name: "case-study.pdf", size: 2_100_000 }],
    invoices: [{ stage: 1, amountCents: 50000, status: "paid" }, { stage: 2, amountCents: 90000, status: "overdue" }],
    events: [
      { at: ago(24 * 12), actor: "System", action: "Workspace created after payment" },
      { at: ago(24 * 9), actor: "Lena Roth", action: "Approved ideal client profile (version 1)" },
      { at: ago(24 * 9 - 1), actor: "System", action: "Stage 2 invoice created" },
      { at: ago(24 * 6), actor: "System", action: "Reminder sent: invoice due in 4 days" },
      { at: ago(24 * 2), actor: "System", action: "Reminder sent: invoice overdue" },
    ],
    notes: [{ by: "Mia", at: ago(24), text: "Called Lena. Finance is on holiday until Monday." }],
  },
  {
    id: "fold-co", company: "Fold & Co", plan: "pro", owner: "Alex", stage: "review", startDate: "2026-11-03",
    tasks: [...baseTasks(6), task("t6", "approve_profile", "todo", ago(30))],
    files: [], invoices: [{ stage: 1, amountCents: 50000, status: "paid" }, { stage: 2, amountCents: 90000, status: "paid" }],
    events: [
      { at: ago(24 * 12), actor: "System", action: "Workspace created after payment" },
      { at: ago(72), actor: "Alex", action: "Published LinkedIn profile rewrite (version 2)" },
      { at: ago(70), actor: "System", action: "Notified client: deliverable published" },
    ],
    notes: [],
  },
  {
    id: "orbit", company: "Orbit Consulting", plan: "starter", owner: "Mia", stage: "review", startDate: "2026-11-05",
    tasks: baseTasks(6), files: [], invoices: [{ stage: 1, amountCents: 30000, status: "paid" }, { stage: 2, amountCents: 60000, status: "due" }],
    events: [{ at: ago(24 * 10), actor: "System", action: "Workspace created after payment" }, { at: ago(30), actor: "Noah King", action: "Approved ideal client profile (version 1)" }],
    notes: [],
  },
  {
    id: "lumen", company: "Lumen", plan: "enterprise", owner: "Alex", stage: "live", startDate: "2026-10-05",
    tasks: baseTasks(6).map((t) => ({ ...t, status: "done" as const })), files: [{ name: "wins.pdf", size: 900_000 }],
    invoices: [{ stage: 1, amountCents: 80000, status: "paid" }, { stage: 2, amountCents: 140000, status: "paid" }, { stage: 3, amountCents: 110000, status: "paid" }],
    events: [{ at: ago(24 * 41), actor: "System", action: "Workspace created after payment" }, { at: ago(24 * 20), actor: "System", action: "First DM sent from client account" }],
    notes: [],
  },
  {
    id: "parallel", company: "Parallel", plan: "starter", owner: "Mia", stage: "live", startDate: "2026-10-13",
    tasks: baseTasks(6).map((t) => ({ ...t, status: "done" as const })), files: [],
    invoices: [{ stage: 1, amountCents: 30000, status: "paid" }, { stage: 2, amountCents: 60000, status: "paid" }, { stage: 3, amountCents: 50000, status: "paid" }],
    events: [{ at: ago(24 * 33), actor: "System", action: "Workspace created after payment" }],
    notes: [],
  },
];

export const findClient = (id: string) => SAMPLE_CLIENTS.find((c) => c.id === id);

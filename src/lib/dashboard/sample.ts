import type { HomeTask } from "@/lib/home";

/** Fixed demo clock so the overview is stable. */
export const DEMO_NOW = "2026-11-15T12:00:00Z";
const inH = (h: number) => new Date(Date.parse(DEMO_NOW) + h * 3_600_000).toISOString();
const ago = (h: number) => inH(-h);

export const DEMO_TASKS: HomeTask[] = [
  { id: "t1", type: "book_kickoff", status: "done", dueAt: ago(30) },
  { id: "t2", type: "complete_intake", status: "in_progress", dueAt: inH(20) },
  { id: "t3", type: "connect_linkedin", status: "todo", dueAt: inH(30) },
  { id: "t4", type: "connect_crm", status: "blocked", dueAt: inH(70) },
  { id: "t5", type: "upload_brand_files", status: "todo", dueAt: inH(72) },
  { id: "t6", type: "approve_icp", status: "todo", dueAt: inH(120) },
  { id: "t7", type: "approve_profile", status: "todo", dueAt: inH(260) },
];

/** In the demo, each task opens the finished demo screen that handles it. */
export function demoTaskHref(type: string): string {
  switch (type) {
    case "book_kickoff": return "/demo/booking";
    case "complete_intake": return "/demo/intake";
    case "connect_linkedin":
    case "connect_crm":
    case "upload_brand_files": return "/demo/access";
    default: return "/demo/review";
  }
}

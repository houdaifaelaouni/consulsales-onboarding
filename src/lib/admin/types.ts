export type AdminStage = "intake" | "building" | "review" | "live";
export type AdminPlan = "starter" | "pro" | "enterprise";
export type AdminTaskStatus = "todo" | "in_progress" | "blocked" | "done";

export interface AdminTask { id: string; type: string; status: AdminTaskStatus; dueAt: string | null }
export interface AdminEvent { at: string; actor: string; action: string }
export interface AdminInvoice { stage: 1 | 2 | 3; amountCents: number; status: "locked" | "due" | "paid" | "overdue" }

export interface AdminClient {
  id: string;
  company: string;
  plan: AdminPlan;
  owner: string;
  stage: AdminStage;
  startDate: string;
  tasks: AdminTask[];
  /** When an access item became blocked, if any is blocked now. */
  accessBlockedSince?: string;
  /** When the oldest unpaid invoice was created, if any is unpaid. */
  invoiceUnpaidSince?: string;
  files: Array<{ name: string; size: number }>;
  invoices: AdminInvoice[];
  events: AdminEvent[];
  notes: Array<{ by: string; at: string; text: string }>;
}

export type FlagKind = "task_overdue" | "access_blocked" | "invoice_unpaid";
export interface Flag { kind: FlagKind; /** hours for access_blocked, days for invoice_unpaid, count for task_overdue */ amount: number }

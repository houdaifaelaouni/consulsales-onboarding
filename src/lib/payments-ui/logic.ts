import type { InvoiceStatus, StageInvoice } from "./types";

const DAY_MS = 86_400_000;

/** Payment is due 7 days after the invoice is created; overdue after that (PDR: reminders at 3 and 7 days, flag at day 8). */
export const DUE_DAYS = 7;
export const REMINDER_DAYS = [3, 7] as const;
export const ADMIN_FLAG_DAY = 8;

export function invoiceStatus(inv: StageInvoice, now = new Date()): InvoiceStatus {
  if (inv.paidAt) return "paid";
  if (!inv.createdAt) return "locked";
  return daysSince(inv.createdAt, now) > DUE_DAYS ? "overdue" : "due";
}

export function daysSince(iso: string, now = new Date()): number {
  return Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS);
}

export function dueDate(inv: StageInvoice): Date | null {
  return inv.createdAt ? new Date(Date.parse(inv.createdAt) + DUE_DAYS * DAY_MS) : null;
}

/** Days until due: positive = days left, 0 = due today, negative = days overdue. */
export function daysUntilDue(inv: StageInvoice, now = new Date()): number | null {
  const due = dueDate(inv);
  if (!due) return null;
  return Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
}

/** The next reminder day still ahead for an unpaid invoice, or null when none is left. */
export function nextReminderDay(inv: StageInvoice, now = new Date()): number | null {
  if (!inv.createdAt || inv.paidAt) return null;
  const age = daysSince(inv.createdAt, now);
  return REMINDER_DAYS.find((d) => d > age) ?? null;
}

/** The overdue invoice should be flagged to the team from day 8. */
export function needsAdminFlag(inv: StageInvoice, now = new Date()): boolean {
  return !inv.paidAt && !!inv.createdAt && daysSince(inv.createdAt, now) >= ADMIN_FLAG_DAY;
}

export function summarize(invoices: StageInvoice[], now = new Date()) {
  const paid = invoices.filter((i) => invoiceStatus(i, now) === "paid");
  const open = invoices.filter((i) => ["due", "overdue"].includes(invoiceStatus(i, now)));
  return {
    paidCents: paid.reduce((n, i) => n + i.amountCents, 0),
    outstandingCents: open.reduce((n, i) => n + i.amountCents, 0),
    nextToPay: open.sort((a, b) => Date.parse(a.createdAt!) - Date.parse(b.createdAt!))[0] ?? null,
    paidCount: paid.length,
    total: invoices.length,
  };
}

/** Formats minor units in the reader's locale, e.g. 90000 -> "€900.00" (en) or "900,00 €" (fr). */
export function formatMoney(cents: number, currency: string, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

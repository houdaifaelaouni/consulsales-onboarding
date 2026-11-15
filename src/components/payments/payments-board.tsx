"use client";

import { useState } from "react";
import { Badge, Button, Card, Toast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { daysUntilDue, formatMoney, invoiceStatus, nextReminderDay, summarize } from "@/lib/payments-ui/logic";
import type { MonthlyPlan, StageInvoice } from "@/lib/payments-ui/types";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function PaymentsBoard({ initial, monthly, now }: { initial: StageInvoice[]; monthly: MonthlyPlan; now: string }) {
  const clock = new Date(now);
  const [invoices, setInvoices] = useState(initial);
  const [notice, setNotice] = useState(false);
  const s = summarize([...invoices], clock);
  const money = (c: number, cur: string) => formatMoney(c, cur);

  // Demo only: marks it paid so the states can be explored. The live app redirects to the provider's hosted page.
  function pay(stage: number) {
    setInvoices((list) => list.map((i) => (i.stage === stage ? { ...i, paidAt: clock.toISOString() } : i)));
    setNotice(true);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("payments.title")}</h1>
        <p className="text-ink-muted">{t("payments.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-1 p-4">
          <p className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("payments.paid")}</p>
          <p className="text-[22px] font-medium tracking-[-0.4px]">{money(s.paidCents, "eur")}</p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("payments.next")}</p>
          <p className="text-[22px] font-medium tracking-[-0.4px]">{s.nextToPay ? money(s.nextToPay.amountCents, s.nextToPay.currency) : "—"}</p>
          {!s.nextToPay && <p className="text-sm text-ink-subtle">{t("payments.nothingDue")}</p>}
        </Card>
      </div>

      {notice && <Toast tone="success" onClick={() => setNotice(false)}>{t("payments.demoPay")}</Toast>}

      <ol className="space-y-4">
        {invoices.map((inv) => <InvoiceCard key={inv.stage} inv={inv} now={clock} onPay={() => pay(inv.stage)} />)}
      </ol>

      <Card className="space-y-1">
        <h2 className="text-[22px] font-medium tracking-[-0.4px]">{t("payments.monthly")}</h2>
        <p className="text-ink-muted">{t("payments.monthlyBody", "en", { amount: formatMoney(monthly.amountCents, monthly.currency) })}</p>
      </Card>
    </div>
  );
}

function InvoiceCard({ inv, now, onPay }: { inv: StageInvoice; now: Date; onPay: () => void }) {
  const status = invoiceStatus(inv, now);
  const left = daysUntilDue(inv, now);
  const reminder = nextReminderDay(inv, now);
  const amount = formatMoney(inv.amountCents, inv.currency);
  const hid = `inv-${inv.stage}`;
  return (
    <li>
      <Card className={cn("space-y-3", status === "locked" && "opacity-75", status === "overdue" && "border-hairline-strong")} role="group" aria-labelledby={hid}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id={hid} className="text-[22px] leading-snug font-medium tracking-[-0.4px]">{t("payments.stage", "en", { n: inv.stage, title: inv.title })}</h2>
            <p className="text-lg">{amount}</p>
          </div>
          <Badge tone={status === "paid" ? "success" : "neutral"} className="shrink-0">{t(`payments.status.${status}` as "payments.status.due")}</Badge>
        </div>

        <p className="text-sm text-ink-muted">
          {status === "locked" ? t("payments.opensWhen", "en", { text: inv.unlockedBy }) : t("payments.unlockedBy", "en", { text: inv.unlockedBy })}
        </p>
        <p className="text-sm text-ink-subtle">{t("payments.unlocks", "en", { text: inv.unlocks })}</p>

        {status === "overdue" && <p className="border-l-2 border-ink pl-3 text-sm text-ink" role="status">{t("payments.overdueNote")} {t("payments.overdueBy", "en", { n: Math.abs(left ?? 0) })}.</p>}
        {status === "due" && left !== null && (
          <p className="text-sm text-ink-muted" role="status">
            {left <= 0 ? t("payments.dueToday") : t("payments.dueIn", "en", { n: left })}
            {reminder !== null && inv.createdAt ? ` · ${t("payments.reminder", "en", { n: Math.max(reminder - Math.floor((now.getTime() - Date.parse(inv.createdAt)) / 86_400_000), 1) })}` : ""}
          </p>
        )}
        {status === "paid" && inv.paidAt && <p className="text-sm text-success">{t("payments.paidOn", "en", { date: fmtDate(inv.paidAt) })}</p>}

        {(status === "due" || status === "overdue") && (
          <div className="space-y-2">
            <Button className="w-full sm:w-auto" onClick={onPay}>{t("payments.payNow", "en", { amount })}</Button>
            <p className="text-sm text-ink-subtle">{t("payments.methods")}</p>
          </div>
        )}
        {status !== "locked" && (
          <button type="button" disabled className="min-h-10 text-sm text-ink-subtle underline underline-offset-2 disabled:no-underline disabled:opacity-60">
            {t("payments.pdf")}
          </button>
        )}
      </Card>
    </li>
  );
}

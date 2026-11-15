"use client";

import { useState } from "react";
import { CheckCircle, FileDownload02, Lock01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { cx } from "@/utils/cx";
import { t } from "@/lib/i18n";
import { daysUntilDue, formatMoney, invoiceStatus, nextReminderDay, summarize } from "@/lib/payments-ui/logic";
import type { InvoiceStatus, MonthlyPlan, StageInvoice } from "@/lib/payments-ui/types";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const STATUS_COLOR: Record<InvoiceStatus, "success" | "warning" | "error" | "gray"> = { paid: "success", due: "warning", overdue: "error", locked: "gray" };

export function PaymentsBoard({ initial, monthly, now, live = false, confirming = false }: { initial: StageInvoice[]; monthly: MonthlyPlan; now: string; live?: boolean; confirming?: boolean }) {
  const clock = new Date(now);
  const [invoices, setInvoices] = useState(initial);
  const [notice, setNotice] = useState(false);
  const s = summarize([...invoices], clock);

  // Demo only: marks it paid so the states can be explored. The live app redirects to the provider's hosted page.
  function pay(stage: number) {
    if (live) {
      // Real invoices only go to the provider's hosted page. Until it is switched on there is no link yet.
      const url = invoices.find((i) => i.stage === stage)?.payUrl;
      if (url) window.location.href = url; else setNotice(true);
      return;
    }
    setInvoices((list) => list.map((i) => (i.stage === stage ? { ...i, paidAt: clock.toISOString() } : i)));
    setNotice(true);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("payments.title")}</h1>
        <p className="text-md text-tertiary">{t("payments.subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("payments.title")}>
        <StatCard label={t("payments.paid")} value={money(s.paidCents, "eur")} />
        <StatCard
          label={t("payments.next")} value={s.nextToPay ? money(s.nextToPay.amountCents, s.nextToPay.currency) : "—"}
          hint={s.nextToPay ? undefined : t("payments.nothingDue")}
        />
        <StatCard label={t("payments.stat.progress")} value={`${s.paidCount} / ${s.total}`} progress={{ value: s.paidCount, max: s.total }} hint={t("payments.stat.progressHint", "en", { total: s.total })} />
      </section>

      {confirming && <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary">{t("payments.confirming")}</p>}

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary">
          <p>{live ? t("payments.notReady") : t("payments.demoPay")}</p>
          <Button color="link-gray" size="sm" onPress={() => setNotice(false)} aria-label="Dismiss">✕</Button>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {invoices.map((inv) => <InvoiceCard key={inv.stage} inv={inv} now={clock} onPay={() => pay(inv.stage)} />)}
      </ol>

      <section className="flex flex-col gap-1 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
        <h2 className="text-md font-semibold text-primary">{t("payments.monthly")}</h2>
        <p className="text-sm text-tertiary">{t("payments.monthlyBody", "en", { amount: money(monthly.amountCents, monthly.currency) })}</p>
      </section>
    </main>
  );
}

/** An amount of zero means the price is not set yet, so show a dash instead of a misleading zero. */
const money = (cents: number, currency: string) => (cents > 0 ? formatMoney(cents, currency) : "—");

function InvoiceCard({ inv, now, onPay }: { inv: StageInvoice; now: Date; onPay: () => void }) {
  const status = invoiceStatus(inv, now);
  const left = daysUntilDue(inv, now);
  const reminder = nextReminderDay(inv, now);
  const amount = money(inv.amountCents, inv.currency);
  const hid = `inv-${inv.stage}`;
  const Icon = status === "paid" ? CheckCircle : status === "locked" ? Lock01 : null;

  return (
    <li>
      <section
        role="group" aria-labelledby={hid}
        className={cx("flex flex-col gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary", status === "locked" && "opacity-75", status === "overdue" && "ring-error_subtle")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={hid} className="flex items-center gap-2 text-lg font-semibold text-primary">
              {Icon && <Icon aria-hidden className="size-5 text-fg-quaternary" />}
              {t("payments.stage", "en", { n: inv.stage, title: inv.title })}
            </h2>
            <p className="text-display-xs font-semibold text-primary">{amount}</p>
          </div>
          <Badge size="md" color={STATUS_COLOR[status]} className="shrink-0">{t(`payments.status.${status}` as "payments.status.due")}</Badge>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <p className="text-secondary">{status === "locked" ? t("payments.opensWhen", "en", { text: inv.unlockedBy }) : t("payments.unlockedBy", "en", { text: inv.unlockedBy })}</p>
          <p className="text-tertiary">{t("payments.unlocks", "en", { text: inv.unlocks })}</p>
        </div>

        {status === "overdue" && (
          <p className="rounded-lg bg-error-primary p-3 text-sm text-error-primary" role="status">
            {t("payments.overdueNote")} {t("payments.overdueBy", "en", { n: Math.abs(left ?? 0) })}.
          </p>
        )}
        {status === "due" && left !== null && (
          <p className="text-sm text-secondary" role="status">
            {left <= 0 ? t("payments.dueToday") : t("payments.dueIn", "en", { n: left })}
            {reminder !== null && inv.createdAt ? ` · ${t("payments.reminder", "en", { n: Math.max(reminder - Math.floor((now.getTime() - Date.parse(inv.createdAt)) / 86_400_000), 1) })}` : ""}
          </p>
        )}
        {status === "paid" && inv.paidAt && <p className="text-sm text-success-primary">{t("payments.paidOn", "en", { date: fmtDate(inv.paidAt) })}</p>}

        {(status === "due" || status === "overdue") && inv.charging && (
          <p className="rounded-lg bg-secondary p-3 text-sm text-secondary" role="status">{t("payments.charging", "en", { amount })}</p>
        )}
        {(status === "due" || status === "overdue") && !inv.charging && (
          <div className="flex flex-col gap-2">
            {inv.chargeFailed && <p className="rounded-lg bg-error-primary p-3 text-sm text-error-primary" role="alert">{t("payments.chargeFailed")}</p>}
            <div><Button size="lg" onPress={onPay}>{t("payments.payNow", "en", { amount })}</Button></div>
            <p className="text-sm text-tertiary">{t("payments.methods")}</p>
          </div>
        )}
        {status !== "locked" && (
          <div><Button color="link-gray" size="sm" isDisabled iconLeading={FileDownload02}>{t("payments.pdf")}</Button></div>
        )}
      </section>
    </li>
  );
}

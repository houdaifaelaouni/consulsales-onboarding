"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStagePrice, setTrial, waiveStage } from "@/app/admin/clients/[id]/actions";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { parseEuros, type BillingRow, type BillingStatus } from "@/lib/admin/billing";
import { t, tDynamic } from "@/lib/i18n";
import { formatMoney } from "@/lib/payments-ui/logic";

const COLOR: Record<BillingStatus, "success" | "brand" | "warning" | "gray"> = { paid: "success", waived: "brand", charging: "warning", billed: "warning", not_billed: "gray" };
const TRIAL_DAYS = [7, 14, 30];

/** Admin-only money controls for one client: custom price (discount), free stage, free trial. Every change is logged by the database. */
export function BillingControls({ workspaceId, rows, trialUntil }: { workspaceId: string; rows: BillingRow[]; trialUntil: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});

  async function run(fn: () => Promise<{ ok: true } | { ok: false; reason: string }>) {
    setBusy(true); setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setError(r.reason); return; }
    setPrice({}); setReason({}); router.refresh();
  }

  const trialActive = trialUntil !== null && Date.parse(trialUntil) > Date.now();

  return (
    <section aria-labelledby="billing-title" className="flex flex-col gap-5 rounded-xl bg-primary p-6 ring-1 ring-secondary">
      <div className="flex flex-col gap-1">
        <h2 id="billing-title" className="text-md font-semibold text-primary">{t("billing.title")}</h2>
        <p className="text-sm text-tertiary">{t("billing.subtitle")}</p>
      </div>

      <ul className="flex flex-col gap-4">
        {rows.map((r) => {
          const typed = price[r.stage] ?? "";
          const cents = parseEuros(typed);
          return (
            <li key={r.stage} className="flex flex-col gap-3 rounded-lg bg-secondary p-4 ring-1 ring-secondary">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">
                  {t("billing.stage", "en", { n: r.stage })} · {formatMoney(r.priceCents, "eur")}
                  {r.custom && <span className="ml-2 text-xs font-normal text-tertiary">{t("billing.planWas", "en", { price: formatMoney(r.planCents, "eur") })}</span>}
                </p>
                <Badge size="sm" color={COLOR[r.status]}>{tDynamic(`billing.status.${r.status}`, "en", r.status)}</Badge>
              </div>
              {!r.locked && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-end gap-2">
                    <Input size="sm" label={t("billing.newPrice")} placeholder={String(r.priceCents / 100)} inputMode="decimal" value={typed} onChange={(v) => setPrice({ ...price, [r.stage]: v })} />
                    <Button size="sm" color="secondary" isDisabled={busy || cents === null} onPress={() => run(() => setStagePrice(workspaceId, r.stage, cents))}>{t("billing.save")}</Button>
                    {r.custom && <Button size="sm" color="link-gray" isDisabled={busy} onPress={() => run(() => setStagePrice(workspaceId, r.stage, null))}>{t("billing.reset")}</Button>}
                  </div>
                  <div className="flex items-end gap-2">
                    <Input size="sm" label={t("billing.waiveReason")} placeholder={t("billing.waivePlaceholder")} value={reason[r.stage] ?? ""} onChange={(v) => setReason({ ...reason, [r.stage]: v })} />
                    <Button size="sm" color="secondary" isDisabled={busy || !(reason[r.stage] ?? "").trim()} onPress={() => run(() => waiveStage(workspaceId, r.stage, reason[r.stage] ?? ""))}>{t("billing.waive")}</Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 border-t border-secondary pt-4">
        <div>
          <p className="text-sm font-semibold text-primary">{t("billing.trial")}</p>
          <p className="text-sm text-tertiary">
            {trialActive ? t("billing.trialUntil", "en", { date: new Date(trialUntil!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }) : t("billing.trialNone")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRIAL_DAYS.map((d) => (
            <Button key={d} size="sm" color="secondary" isDisabled={busy} onPress={() => run(() => setTrial(workspaceId, d))}>{t("billing.trialDays", "en", { d })}</Button>
          ))}
          {trialActive && <Button size="sm" color="link-gray" isDisabled={busy} onPress={() => run(() => setTrial(workspaceId, 0))}>{t("billing.trialEnd")}</Button>}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-error-primary">{tDynamic(`billing.error.${error}`, "en", t("billing.error.failed"))}</p>}
    </section>
  );
}

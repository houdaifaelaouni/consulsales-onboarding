"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Check, Lock01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import { PlanCard } from "./plan-card";

export interface PayToEnterProps {
  amount: string;
  nextAmount: string;
  planTitle: string;
  holder: string;
  company: string;
  email: string;
  /** Whop checkout session we created for stage 1. Null when payments are not switched on yet. */
  checkoutId: string | null;
  /** The same checkout as a page, for when the embed cannot load. */
  payUrl: string | null;
}

/** Shown instead of the workspace until stage 1 is paid. Card picture on one side, Whop's own checkout on the other. */
export function PayToEnter({ amount, nextAmount, planTitle, holder, company, email, checkoutId, payUrl }: PayToEnterProps) {
  const router = useRouter();
  const [paid, setPaid] = useState(false);

  // After paying, Whop tells our server (webhook). Re-check every few seconds; the workspace opens once it is recorded.
  useEffect(() => {
    if (!paid) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [paid, router]);

  const points = [t("entry.point.1"), t("entry.point.2"), t("entry.point.3", "en", { next: nextAmount })];

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:px-8">
      <section className="flex flex-col items-center gap-8 lg:items-start">
        <div className="flex flex-col gap-2 text-center lg:text-left">
          <p className="text-sm font-semibold text-brand-secondary">{t("entry.eyebrow")}</p>
          <h1 className="text-display-xs font-semibold text-primary sm:text-display-sm">{t("entry.title")}</h1>
          <p className="text-md text-tertiary">{t("entry.body", "en", { amount })}</p>
        </div>
        <PlanCard planTitle={planTitle} amount={amount} holder={holder} company={company} />
        <ul className="flex w-full max-w-sm flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-sm text-secondary">
              <Check className="mt-0.5 size-4 shrink-0 text-fg-brand-primary" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t("entry.checkout")} className="flex w-full flex-col gap-4 rounded-2xl bg-primary p-4 ring-1 ring-secondary sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-md font-semibold text-primary">{t("entry.checkout")}</h2>
          <span className="flex items-center gap-1.5 text-xs text-tertiary"><Lock01 className="size-3.5" aria-hidden="true" />{t("entry.secure")}</span>
        </div>

        {paid ? (
          <div role="status" className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-solid text-white"><Check className="size-6" aria-hidden="true" /></span>
            <p className="text-lg font-semibold text-primary">{t("entry.paid.title")}</p>
            <p className="text-sm text-tertiary">{t("entry.paid.body")}</p>
          </div>
        ) : checkoutId ? (
          <div className="min-h-[480px]">
            <WhopCheckoutEmbed
              sessionId={checkoutId}
              theme="dark"
              themeOptions={{ accentColor: "#5e6ad2", backgroundColor: "#0c0c0d", borderRadius: 8, buttonText: t("entry.cta", "en", { amount }) }}
              prefill={{ email }}
              setupFutureUsage="off_session"
              skipRedirect
              onComplete={() => setPaid(true)}
              fallback={<p role="status" className="py-24 text-center text-sm text-tertiary">{t("entry.loading")}</p>}
            />
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-sm text-tertiary">{t("entry.unavailable")}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary pt-4">
          <p className="text-xs text-tertiary">{t("entry.confirming")}</p>
          <div className="flex gap-2">
            {payUrl && !paid && <Button size="sm" color="link-gray" href={payUrl}>{t("entry.openPage")}</Button>}
            <Button size="sm" color="secondary" onPress={() => router.refresh()}>{t("entry.refresh")}</Button>
          </div>
        </div>
      </section>
    </main>
  );
}

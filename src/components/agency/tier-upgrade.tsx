"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Check } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { startTierCheckout, type CheckoutResult } from "@/app/app/agency/actions";
import { t } from "@/lib/i18n";

export interface TierOption { key: string; title: string; price: number; rooms: number; whiteLabel: boolean; multiBrand: boolean }

/** Upgrade prompt: pick a higher tier, pay in Whop's own checkout on this page. The tier changes when the payment webhook arrives. */
export function TierUpgrade({ options, canBuy }: { options: TierOption[]; canBuy: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<{ tier: TierOption; checkoutId: string } | null>(null);
  const [error, setError] = useState<Exclude<CheckoutResult, { ok: true }>["reason"] | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!paid) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [paid, router]);

  if (options.length === 0) return <p className="text-sm text-tertiary">{t("agency.topTier")}</p>;

  function choose(tier: TierOption) {
    setError(null);
    start(async () => {
      const r = await startTierCheckout(tier.key);
      if (r.ok) setOpen({ tier, checkoutId: r.checkoutId }); else setError(r.reason);
    });
  }

  if (paid) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl bg-primary p-8 text-center ring-1 ring-secondary">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-solid text-white"><Check className="size-6" aria-hidden="true" /></span>
        <p className="text-lg font-semibold text-primary">{t("agency.paid.title")}</p>
        <p className="text-sm text-tertiary">{t("agency.paid.body")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-3">
        {options.map((o) => (
          <li key={o.key} className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
            <h3 className="text-md font-semibold text-primary">{o.title}</h3>
            <p className="text-display-xs font-semibold text-primary">{t("agency.price", "en", { price: o.price })}</p>
            <ul className="flex flex-col gap-1 text-sm text-secondary">
              <li>{t("agency.perk.rooms", "en", { n: o.rooms })}</li>
              {o.whiteLabel && <li>{t("agency.perk.whiteLabel")}</li>}
              {o.multiBrand && <li>{t("agency.perk.multiBrand")}</li>}
            </ul>
            <Button size="md" isDisabled={!canBuy || pending} onPress={() => choose(o)}>{t("agency.upgrade.cta", "en", { tier: o.title })}</Button>
          </li>
        ))}
      </ul>
      {!canBuy && <p role="status" className="text-sm text-tertiary">{t("agency.ownerOnly")}</p>}
      {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`agency.error.${error}` as "agency.error.failed")}</p>}
      {open && (
        <section aria-label={t("agency.checkout")} className="min-h-[480px] rounded-xl bg-primary p-4 ring-1 ring-secondary">
          <WhopCheckoutEmbed
            sessionId={open.checkoutId}
            theme="dark"
            themeOptions={{ accentColor: "#5e6ad2", backgroundColor: "#0c0c0d", borderRadius: 8, buttonText: t("agency.upgrade.cta", "en", { tier: open.tier.title }) }}
            setupFutureUsage="off_session"
            skipRedirect
            onComplete={() => setPaid(true)}
            fallback={<p role="status" className="py-24 text-center text-sm text-tertiary">{t("entry.loading")}</p>}
          />
        </section>
      )}
    </div>
  );
}

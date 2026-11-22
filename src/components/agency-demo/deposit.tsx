"use client";

import { useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { t } from "@/lib/i18n";

/** Deposit on sample data: the agency sets an amount and its OWN payment link; the client sees a pay button; the agency marks it paid. */
export function DepositDemo() {
  const [amount, setAmount] = useState("500");
  const [link, setLink] = useState("https://pay.northgrowth.example/acme-deposit");
  const [paid, setPaid] = useState(false);
  const [saved, setSaved] = useState(true);
  const valid = Number(amount) > 0 && /^https:\/\//.test(link.trim());

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("deposit.title")}</h1>
        <p className="text-md text-tertiary">{t("deposit.subtitle")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={(e) => { e.preventDefault(); if (valid) setSaved(true); }} className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary" aria-labelledby="dep-agency">
          <h2 id="dep-agency" className="text-md font-semibold text-primary">{t("deposit.agencySide")}</h2>
          <Input label={t("deposit.amount")} inputMode="decimal" value={amount} onChange={(v) => { setAmount(v); setSaved(false); }} />
          <Input label={t("deposit.link")} value={link} onChange={(v) => { setLink(v); setSaved(false); }} hint={t("deposit.linkHint")} />
          {!valid && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t("deposit.invalid")}</p>}
          {valid && saved && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("deposit.saved")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" isDisabled={!valid}>{t("deposit.save")}</Button>
            <Button color="secondary" isDisabled={!valid || paid} onPress={() => setPaid(true)}>{t("deposit.markPaid")}</Button>
          </div>
          <p className="text-sm text-tertiary">{t("deposit.custody")}</p>
        </form>

        <section aria-labelledby="dep-client" className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary">
          <div className="flex items-center justify-between gap-2">
            <h2 id="dep-client" className="text-md font-semibold text-primary">{t("deposit.clientSide")}</h2>
            <Badge size="sm" color={paid ? "success" : "warning"}>{paid ? t("deposit.status.paid") : t("deposit.status.due")}</Badge>
          </div>
          <p className="text-display-xs font-semibold text-primary">€{Number(amount) > 0 ? Number(amount) : 0}</p>
          <p className="text-sm text-secondary">{t("deposit.clientBody", "en", { agency: "North Growth Agency" })}</p>
          {paid
            ? <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("deposit.thanks")}</p>
            : <div><Button isDisabled={!valid || !saved} onPress={() => undefined}>{t("deposit.pay", "en", { amount: Number(amount) > 0 ? Number(amount) : 0 })}</Button></div>}
        </section>
      </div>
    </main>
  );
}

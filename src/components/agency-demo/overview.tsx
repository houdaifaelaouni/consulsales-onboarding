"use client";

import { useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { StatCard } from "@/components/dashboard/stat-card";
import { AGENCY_TIERS, roomsLeft, type AgencyTier } from "@/lib/agency/tiers";
import { DEMO_AGENCY, DEMO_ROOMS } from "@/lib/agency/sample";
import { upgradeOptions } from "@/lib/agency/upgrade";
import { t } from "@/lib/i18n";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Agency home on sample data: open rooms until the tier limit, then upgrade in a (simulated) checkout and open more. */
export function AgencyOverviewDemo() {
  const [tier, setTier] = useState<AgencyTier>(DEMO_AGENCY.tier);
  const [rooms, setRooms] = useState(DEMO_ROOMS);
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const [checkout, setCheckout] = useState<AgencyTier | null>(null);
  const [upgraded, setUpgraded] = useState(false);

  const cfg = AGENCY_TIERS[tier];
  const left = roomsLeft(tier, rooms.length);
  const options = upgradeOptions(tier);

  function openRoom() {
    setDone(false);
    if (company.trim().length < 2 || !EMAIL.test(email.trim())) { setError(true); return; }
    setError(false);
    setRooms([{ id: `r${rooms.length + 1}`, company: company.trim(), email: email.trim(), daysAgo: 0 }, ...rooms]);
    setCompany(""); setEmail(""); setDone(true);
  }

  function pay(to: AgencyTier) {
    setTier(to); setCheckout(null); setUpgraded(true); setDone(false);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{DEMO_AGENCY.name}</h1>
        <p className="text-md text-tertiary">{t("agency.subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("agency.title")}>
        <StatCard label={t("agency.plan")} value={cfg.title} />
        <StatCard label={t("agency.rooms")} value={`${rooms.length} / ${cfg.roomLimit}`} progress={{ value: Math.min(rooms.length, cfg.roomLimit), max: cfg.roomLimit }} hint={t(cfg.period === "month" ? "agency.period.month" : "agency.period.total")} />
        <StatCard label={t("agency.roomsLeft")} value={String(left)} />
      </section>

      {upgraded && <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary">{t("agencyDemo.upgraded", "en", { tier: cfg.title })}</p>}

      {left <= 0 ? (
        <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary">{t("agency.rooms.none")}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); openRoom(); }} className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary" aria-labelledby="demo-new-room">
          <h2 id="demo-new-room" className="text-md font-semibold text-primary">{t("agency.rooms.new")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t("agency.rooms.company")} value={company} onChange={setCompany} />
            <Input label={t("agency.rooms.email")} type="email" value={email} onChange={setEmail} />
          </div>
          {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t("agencyDemo.rooms.invalid")}</p>}
          {done && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("agency.rooms.done")}</p>}
          <div><Button type="submit">{t("agency.rooms.cta")}</Button></div>
        </form>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="demo-rooms">
        <h2 id="demo-rooms" className="text-lg font-semibold text-primary">{t("agency.rooms.list")}</h2>
        <ul className="flex flex-col gap-3">
          {rooms.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-primary p-4 ring-1 ring-secondary">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-primary">{r.company}</span>
                <span className="text-sm text-tertiary">{r.email}</span>
              </div>
              <Badge size="sm" color={r.daysAgo === 0 ? "brand" : "gray"}>{r.daysAgo === 0 ? t("agencyDemo.rooms.new") : t("agencyDemo.rooms.daysAgo", "en", { n: r.daysAgo })}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="demo-upgrade">
        <h2 id="demo-upgrade" className="text-lg font-semibold text-primary">{t("agency.upgrade.title")}</h2>
        {options.length === 0 ? <p className="text-sm text-tertiary">{t("agency.topTier")}</p> : (
          <ul className="grid gap-4 sm:grid-cols-3">
            {options.map((k) => {
              const o = AGENCY_TIERS[k];
              return (
                <li key={k} className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                  <h3 className="text-md font-semibold text-primary">{o.title}</h3>
                  <p className="text-display-xs font-semibold text-primary">{t("agency.price", "en", { price: o.monthlyPrice ?? 0 })}</p>
                  <ul className="flex flex-col gap-1 text-sm text-secondary">
                    <li>{t("agency.perk.rooms", "en", { n: o.roomLimit })}</li>
                    {o.whiteLabel && <li>{t("agency.perk.whiteLabel")}</li>}
                    {o.multiBrand && <li>{t("agency.perk.multiBrand")}</li>}
                  </ul>
                  <Button size="md" onPress={() => setCheckout(k)}>{t("agency.upgrade.cta", "en", { tier: o.title })}</Button>
                </li>
              );
            })}
          </ul>
        )}
        {checkout && (
          <section aria-label={t("agency.checkout")} className="flex flex-col gap-3 rounded-xl bg-primary p-6 ring-1 ring-secondary">
            <p className="text-sm text-secondary">{t("agencyDemo.checkout.note", "en", { tier: AGENCY_TIERS[checkout].title })}</p>
            <div className="flex gap-2">
              <Button onPress={() => pay(checkout)}>{t("agencyDemo.checkout.pay", "en", { price: AGENCY_TIERS[checkout].monthlyPrice ?? 0 })}</Button>
              <Button color="secondary" onPress={() => setCheckout(null)}>{t("agencyDemo.cancel")}</Button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

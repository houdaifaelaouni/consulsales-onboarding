"use client";

import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AGENCY_TIERS } from "@/lib/agency/tiers";
import { DEMO_AGENCIES } from "@/lib/agency/sample";
import { t } from "@/lib/i18n";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Admin agencies page on sample data: add an agency and its owner; the owner is "emailed" a sign-in link. */
export function AgenciesAdminDemo() {
  const [rows, setRows] = useState(DEMO_AGENCIES);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<"name" | "email" | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    setDone(false);
    if (name.trim().length < 2 || name.trim().length > 80) { setError("name"); return; }
    if (!EMAIL.test(email.trim())) { setError("email"); return; }
    setError(null);
    setRows([{ id: `g${rows.length + 1}`, name: name.trim(), owner: email.trim().toLowerCase(), tier: "free" }, ...rows]);
    setName(""); setEmail(""); setDone(true);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("agencies.title")}</h1>
        <p className="text-md text-tertiary">{t("agencies.subtitle")}</p>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary" aria-labelledby="demo-new-agency">
        <h2 id="demo-new-agency" className="text-md font-semibold text-primary">{t("agencies.new.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t("agencies.new.name")} value={name} onChange={setName} />
          <Input label={t("agencies.new.email")} type="email" value={email} onChange={setEmail} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(error === "name" ? "agencies.error.name" : "agencies.error.email")}</p>}
        {done && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("agencies.new.done")}</p>}
        <div><Button type="submit">{t("agencies.new.cta")}</Button></div>
      </form>
      <ul className="flex flex-col gap-3">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary p-4 ring-1 ring-secondary">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-primary">{a.name}</span>
              <span className="text-sm text-tertiary">{a.owner}</span>
            </div>
            <span className="text-sm text-secondary">{AGENCY_TIERS[a.tier].title}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAgencyAction } from "@/app/admin/agencies/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { t } from "@/lib/i18n";

export function NewAgencyForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    setError(null); setDone(false);
    start(async () => {
      const r = await createAgencyAction(name, email);
      if (!r.ok) { setError(r.reason); return; }
      setName(""); setEmail(""); setDone(true); router.refresh();
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary" aria-labelledby="new-agency-h">
      <h2 id="new-agency-h" className="text-md font-semibold text-primary">{t("agencies.new.title")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t("agencies.new.name")} value={name} onChange={setName} isRequired />
        <Input label={t("agencies.new.email")} type="email" value={email} onChange={setEmail} isRequired />
      </div>
      {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`agencies.error.${error}` as "agencies.error.failed")}</p>}
      {done && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("agencies.new.done")}</p>}
      <div><Button type="submit" isDisabled={pending}>{t("agencies.new.cta")}</Button></div>
    </form>
  );
}

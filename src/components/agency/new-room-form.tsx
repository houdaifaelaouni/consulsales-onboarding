"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openRoomAction } from "@/app/app/agency/rooms-actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { t } from "@/lib/i18n";

/** Opens a client room. When the tier has no rooms left the form says so and points to the upgrade cards below it. */
export function NewRoomForm({ roomsLeft }: { roomsLeft: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    setError(null); setDone(false);
    start(async () => {
      const r = await openRoomAction(company, email);
      if (!r.ok) { setError(r.reason); if (r.reason === "limit") router.refresh(); return; }
      setCompany(""); setEmail(""); setDone(true); router.refresh();
    });
  }

  if (roomsLeft <= 0) return <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary">{t("agency.rooms.none")}</p>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary" aria-labelledby="new-room-h">
      <h2 id="new-room-h" className="text-md font-semibold text-primary">{t("agency.rooms.new")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t("agency.rooms.company")} value={company} onChange={setCompany} isRequired />
        <Input label={t("agency.rooms.email")} type="email" value={email} onChange={setEmail} isRequired />
      </div>
      {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`agency.rooms.error.${error}` as "agency.rooms.error.failed")}</p>}
      {done && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("agency.rooms.done")}</p>}
      <div><Button type="submit" isDisabled={pending}>{t("agency.rooms.cta")}</Button></div>
    </form>
  );
}

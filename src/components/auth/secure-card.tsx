"use client";

import { useEffect, useState } from "react";
import { ShieldTick } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { shouldPrompt } from "@/lib/auth/secure-prompt";
import { t } from "@/lib/i18n";

/** A one-line reminder to set a password and PIN. "Not now" hides it for a week, on this device only. */
export function SecureCard({ userId, pin }: { userId: string; pin: "on" | "off" | "unavailable" }) {
  const key = `cs.secure.snoozed.${userId}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let at: number | null = null;
    try { const raw = localStorage.getItem(key); at = raw ? Number(raw) : null; } catch { /* storage blocked: just show it */ }
    setShow(shouldPrompt({ pin, dismissedAt: at, now: Date.now() }));
  }, [key, pin]);

  if (!show) return null;
  return (
    <section aria-label={t("secure.title")} className="mx-auto mt-6 flex w-full max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div className="flex flex-1 flex-col gap-3 rounded-xl bg-secondary p-4 ring-1 ring-secondary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldTick aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />
          <div>
            <h2 className="text-md font-semibold text-primary">{t("secure.title")}</h2>
            <p className="text-sm text-tertiary">{t("secure.body")}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" href="/app/account">{t("secure.cta")}</Button>
          <Button size="sm" color="tertiary" onPress={() => { try { localStorage.setItem(key, String(Date.now())); } catch { /* ignore */ } setShow(false); }}>{t("secure.later")}</Button>
        </div>
      </div>
    </section>
  );
}

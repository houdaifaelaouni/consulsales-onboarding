"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptRisk, connectLinkedIn } from "@/app/app/outreach/actions";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import type { AccountStatus } from "@/lib/outreach/status";

const STATUS_COLOR = { ok: "success", connecting: "warning", credentials: "error", error: "error", deleted: "gray" } as const;
const STATUS_KEY = {
  ok: "outreach.status.ok", connecting: "outreach.status.connecting", credentials: "outreach.status.credentials", error: "outreach.status.error", deleted: "outreach.status.deleted",
} as const;
const NOTICE = ["outreach.notice.1", "outreach.notice.2", "outreach.notice.3", "outreach.notice.4"] as const;

export interface AccountView { id: string; status: AccountStatus }

/** Connect a LinkedIn account. The owner first accepts the risk notice; sign-in happens on Unipile's page, never here. */
export function ConnectCard({ accounts, consented, canConnect, ready }: { accounts: AccountView[]; consented: boolean; canConnect: boolean; ready: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    start(async () => {
      const r = await acceptRisk();
      if (!r.ok) setError(r.reason); else router.refresh();
    });
  }
  function connect() {
    setError(null);
    start(async () => {
      const r = await connectLinkedIn();
      if (r.ok) window.location.href = r.url; else setError(r.reason);
    });
  }

  return (
    <section aria-labelledby="out-account" className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary">
      <h2 id="out-account" className="text-md font-semibold text-primary">{t("outreach.account")}</h2>

      {accounts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-3">
              <span className="text-sm text-secondary">LinkedIn</span>
              <Badge size="sm" color={STATUS_COLOR[a.status]}>{t(STATUS_KEY[a.status])}</Badge>
            </li>
          ))}
        </ul>
      )}
      {accounts.some((a) => a.status === "credentials") && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t("outreach.reconnectNeeded")}</p>}

      {!ready && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("outreach.unavailable")}</p>}
      {ready && !canConnect && <p role="status" className="text-sm text-tertiary">{t("outreach.ownerOnly")}</p>}

      {ready && canConnect && !consented && (
        <div className="flex flex-col gap-3 rounded-lg bg-secondary p-4">
          <h3 className="text-sm font-semibold text-primary">{t("outreach.notice.title")}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">{NOTICE.map((k) => <li key={k}>{t(k)}</li>)}</ul>
          <label className="flex items-start gap-3 text-sm text-primary">
            <input type="checkbox" className="mt-0.5 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            {t("outreach.accept")}
          </label>
          <div><Button isDisabled={!agree || pending} onPress={accept}>{t("outreach.acceptCta")}</Button></div>
        </div>
      )}

      {ready && canConnect && consented && (
        <div><Button isDisabled={pending} onPress={connect}>{t(accounts.length > 0 ? "outreach.reconnect" : "outreach.connect")}</Button></div>
      )}

      {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`outreach.error.${error}` as "outreach.error.failed")}</p>}
    </section>
  );
}

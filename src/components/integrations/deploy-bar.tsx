"use client";

import { useEffect, useState } from "react";
import { deployNow } from "@/app/admin/integrations/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

/** Appears after a key is saved. New keys only reach the running app after a deployment. */
export function DeployBar() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<"idle" | "deploying" | "started" | "error">("idle");
  useEffect(() => {
    const on = () => { setPending(true); setState("idle"); };
    window.addEventListener("keys-saved", on);
    return () => window.removeEventListener("keys-saved", on);
  }, []);
  if (!pending) return null;

  async function go() {
    setState("deploying");
    const res = await deployNow();
    setState(res.ok ? "started" : "error");
  }

  return (
    <div role="status" className="sticky bottom-4 z-10 mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl bg-primary p-4 ring-1 ring-brand">
      <p className="text-sm text-secondary">
        {state === "started" ? t("integrations.deploy.started") : state === "error" ? t("integrations.deploy.error") : t("integrations.deploy.pending")}
      </p>
      {state !== "started" && <Button size="sm" isLoading={state === "deploying"} onPress={go}>{t("integrations.deploy.now")}</Button>}
    </div>
  );
}

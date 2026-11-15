"use client";

import { useState } from "react";
import { FloatingField } from "@/components/auth/floating-field";
import { Button } from "@/components/base/buttons/button";
import { passwordProblem } from "@/lib/auth/password";
import { t, type MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

/** Sets or changes the password of the signed-in person. Clients who first came in by email link set theirs here. */
export function PasswordForm({ email }: { email: string }) {
  const [pw, setPw] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [problem, setProblem] = useState<MessageKey | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = passwordProblem(pw, email);
    if (p) { setProblem(p); return; }
    setProblem(null); setState("saving");
    const { error } = await createClient().auth.updateUser({ password: pw });
    setPw("");
    setState(error ? "error" : "saved");
  }

  return (
    <form onSubmit={save} noValidate className="flex max-w-md flex-col gap-3">
      <FloatingField label={t("account.password.new")} type="password" autoComplete="new-password" value={pw} onChange={(v) => { setPw(v); setProblem(null); if (state !== "saving") setState("idle"); }} isInvalid={!!problem || state === "error"} describedBy="pw-msg" />
      <div id="pw-msg" className="min-h-5 text-sm" aria-live="polite">
        {problem && <p role="alert" className="text-error-primary">{t(problem)}</p>}
        {state === "error" && <p role="alert" className="text-error-primary">{t("account.password.error")}</p>}
        {state === "saved" && <p role="status" className="text-success-primary">{t("account.password.saved")}</p>}
      </div>
      <div><Button type="submit" isLoading={state === "saving"} isDisabled={!pw}>{t("account.password.save")}</Button></div>
    </form>
  );
}

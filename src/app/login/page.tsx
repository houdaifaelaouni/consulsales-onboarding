"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Frame } from "@/components/shell/frame";
import { Logo } from "@/components/shell/logo";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: false },
      });
      setState(error ? "error" : "sent");
    } catch {
      setState("error"); // for example, Supabase keys missing in this environment
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex justify-center"><Logo /></div>
        <Frame className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-display-xs font-semibold text-primary">{t("login.title")}</h1>
            <p className="text-sm text-tertiary">{t("login.subtitle")}</p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input type="email" label={t("login.email")} isRequired autoComplete="email" value={email} onChange={setEmail} placeholder="you@company.com" />
            <Button type="submit" size="lg" isLoading={state === "sending"} className="w-full">{t("login.submit")}</Button>
          </form>
          {state === "sent" && (
            <p role="status" className="flex items-start gap-2 rounded-lg bg-success-secondary p-3 text-sm text-success-primary"><CheckCircle aria-hidden className="mt-0.5 size-4 shrink-0" />{t("login.sent")}</p>
          )}
          {state === "error" && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-primary p-3 text-sm text-error-primary"><AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />{t("login.error")}</p>
          )}
        </Frame>
      </div>
    </main>
  );
}

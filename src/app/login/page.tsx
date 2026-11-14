"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: false },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("login.title")}</h1>
        <p className="text-ink-muted">{t("login.subtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="email" className="block text-[13px] font-medium tracking-[0.4px] text-ink-subtle">
          {t("login.email")}
        </label>
        <input
          id="email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-hairline bg-surface-1 px-3 py-2 text-ink placeholder:text-ink-subtle"
        />
        <button
          type="submit" disabled={state === "sending"}
          className="w-full rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {t("login.submit")}
        </button>
      </form>
      {state === "sent" && <p role="status" className="text-success">{t("login.sent")}</p>}
      {state === "error" && <p role="alert" className="text-ink-muted">{t("login.error")}</p>}
    </main>
  );
}

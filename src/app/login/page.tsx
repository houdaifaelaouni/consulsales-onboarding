"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Lock01 } from "@untitledui/icons";
import { FloatingField } from "@/components/auth/floating-field";
import { Button } from "@/components/base/buttons/button";
import { Logo } from "@/components/shell/logo";
import { cooldownLeft, looksLikeEmail } from "@/lib/auth/resend";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(0);
  const [touched, setTouched] = useState(false);
  const invalid = touched && !looksLikeEmail(email);
  const wait = state === "sent" ? cooldownLeft(sentAt, now) : 0;

  // Tick once a second while a cooldown is running.
  useEffect(() => {
    if (state !== "sent" || wait === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state, wait]);

  async function send() {
    setTouched(true);
    if (!looksLikeEmail(email)) return;
    setState("sending");
    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: false },
      });
      if (error) { setState("error"); return; }
      const at = Date.now();
      setSentAt(at); setNow(at); setState("sent");
    } catch {
      setState("error"); // for example, Supabase keys missing in this environment
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      {/* Faint grid lines frame the card, in the same spirit as the framed panels elsewhere. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--color-border-secondary)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border-secondary)_1px,transparent_1px)] [background-size:96px_96px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-8">
        <Logo />

        {state === "sent" ? (
          <section className="flex w-full flex-col items-center gap-6 text-center" aria-live="polite">
            <span className="grid size-12 place-items-center rounded-full bg-success-secondary text-success-primary"><CheckCircle aria-hidden className="size-6" /></span>
            <div className="flex flex-col gap-2">
              <h1 className="text-display-xs font-semibold text-primary">{t("login.sentTitle")}</h1>
              <p className="text-md text-tertiary">{t("login.sentBody", "en", { email: email.trim() })}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button color="secondary" size="lg" isDisabled={wait > 0} onPress={send}>
                {wait > 0 ? t("login.resendIn", "en", { s: wait }) : t("login.resend")}
              </Button>
              <Button color="tertiary" size="lg" onPress={() => { setState("idle"); setTouched(false); }}>{t("login.otherEmail")}</Button>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-display-xs font-semibold text-primary sm:text-display-sm">{t("login.title")}</h1>
              <p className="text-md text-tertiary">{t("login.subtitle")}</p>
            </div>
            <form noValidate onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex w-full flex-col gap-4">
              <FloatingField
                label={t("login.email")} type="email" autoComplete="email" autoFocus
                value={email} onChange={(v) => { setEmail(v); if (state === "error") setState("idle"); }}
                isInvalid={invalid || state === "error"} describedBy="login-msg"
              />
              <div id="login-msg" className="min-h-5" aria-live="polite">
                {invalid && state !== "error" && (
                  <p role="alert" className="flex items-start gap-2 text-sm text-error-primary"><AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />{t("login.invalid")}</p>
                )}
                {state === "error" && (
                  <p role="alert" className="flex items-start gap-2 text-sm text-error-primary"><AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />{t("login.error")}</p>
                )}
              </div>
              <Button type="submit" size="xl" isLoading={state === "sending"} className="w-full">{t("login.submit")}</Button>
            </form>
          </>
        )}

        <div className="flex flex-col items-center gap-2 text-center text-sm text-tertiary">
          <p>{t("login.help")}</p>
          <p className="flex items-center gap-1.5 text-quaternary"><Lock01 aria-hidden className="size-4" />{t("login.secure")}</p>
        </div>
      </div>
    </main>
  );
}

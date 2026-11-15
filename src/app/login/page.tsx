"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Lock01 } from "@untitledui/icons";
import { FloatingField } from "@/components/auth/floating-field";
import { PinPad } from "@/components/auth/pin-pad";
import { Button } from "@/components/base/buttons/button";
import { Logo } from "@/components/shell/logo";
import { passwordProblem } from "@/lib/auth/password";
import { cooldownLeft, looksLikeEmail } from "@/lib/auth/resend";
import { t, type MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

/** password = email and password, link = one-time email link, signup = create an account. */
type Mode = "password" | "link" | "signup" | "pin";
type State = "idle" | "sending" | "sent" | "error";

const TITLE: Record<Mode, MessageKey> = { password: "login.title", link: "login.title", signup: "login.signup.title", pin: "login.title" };
const SUBTITLE: Record<Mode, MessageKey> = { password: "login.subtitle.password", link: "login.subtitle", signup: "login.signup.subtitle", pin: "login.subtitle.pin" };
const SUBMIT: Record<Mode, MessageKey> = { password: "login.submit.password", link: "login.submit", signup: "login.signup.submit", pin: "login.submit.password" };

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>("idle");
  const [problem, setProblem] = useState<MessageKey | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(0);
  const [touched, setTouched] = useState(false);
  const [pin, setPin] = useState("");
  const emailBad = touched && !looksLikeEmail(email);
  const wait = state === "sent" ? cooldownLeft(sentAt, now) : 0;

  useEffect(() => {
    if (state !== "sent" || wait === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state, wait]);

  function switchMode(next: Mode) { setMode(next); setState("idle"); setProblem(null); setTouched(false); setPassword(""); setPin(""); }
  const done = () => { const at = Date.now(); setSentAt(at); setNow(at); setState("sent"); };

  async function submitPin(code: string) {
    setTouched(true); setProblem(null);
    if (!looksLikeEmail(email)) { setPin(""); return; }
    setState("sending");
    try {
      const res = await fetch("/api/auth/pin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), pin: code }) });
      if (res.ok) { window.location.assign("/app"); return; }
      setProblem("login.error.pin");
    } catch {
      setProblem("login.error.pin");
    }
    setPin(""); setState("idle");
  }

  async function submit() {
    if (mode === "pin") return;
    setTouched(true); setProblem(null);
    if (!looksLikeEmail(email)) return;
    if (mode === "signup") { const p = passwordProblem(password, email); if (p) { setProblem(p); return; } }
    if (mode === "password" && !password) { setProblem("login.pw.empty"); return; }
    setState("sending");
    try {
      const auth = createClient().auth;
      const redirect = `${location.origin}/auth/callback`;
      if (mode === "link") {
        const { error } = await auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect, shouldCreateUser: false } });
        if (error) { setState("error"); return; }
        done();
      } else if (mode === "signup") {
        // The answer is the same whether or not the address already exists, so this cannot be used to find out who has an account.
        const { error } = await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } });
        if (error) { setProblem("login.error.signup"); setState("idle"); return; }
        done();
      } else {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setProblem(/confirm/i.test(error.message) ? "login.error.unconfirmed" : "login.error.password"); setState("idle"); return; }
        window.location.assign("/app");
      }
    } catch {
      setState("error"); // for example, Supabase keys missing in this environment
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--color-border-secondary)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border-secondary)_1px,transparent_1px)] [background-size:96px_96px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-8">
        <Logo />

        {state === "sent" ? (
          <section className="flex w-full flex-col items-center gap-6 text-center" aria-live="polite">
            <span className="grid size-12 place-items-center rounded-full bg-success-secondary text-success-primary"><CheckCircle aria-hidden className="size-6" /></span>
            <div className="flex flex-col gap-2">
              <h1 className="text-display-xs font-semibold text-primary">{t("login.sentTitle")}</h1>
              <p className="text-md text-tertiary">{t(mode === "signup" ? "login.signup.sentBody" : "login.sentBody", "en", { email: email.trim() })}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button color="secondary" size="lg" isDisabled={wait > 0} onPress={submit}>
                {wait > 0 ? t("login.resendIn", "en", { s: wait }) : t("login.resend")}
              </Button>
              <Button color="tertiary" size="lg" onPress={() => switchMode("password")}>{t("login.otherEmail")}</Button>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-display-xs font-semibold text-primary sm:text-display-sm">{t(TITLE[mode])}</h1>
              <p className="text-md text-tertiary">{t(SUBTITLE[mode])}</p>
            </div>
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-3">
                <FloatingField
                  label={t("login.email")} type="email" autoComplete="email" autoFocus
                  value={email} onChange={(v) => { setEmail(v); if (state === "error") setState("idle"); }}
                  isInvalid={emailBad || state === "error"} describedBy="login-msg"
                />
                {mode === "pin" && (
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <PinPad value={pin} onChange={(v) => { setPin(v); setProblem(null); }} onComplete={submitPin} disabled={state === "sending"} isInvalid={!!problem} label={t("pin.label")} />
                  </div>
                )}
                {mode !== "link" && mode !== "pin" && (
                  <FloatingField
                    label={t("login.password")} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(v) => { setPassword(v); setProblem(null); }} isInvalid={!!problem} describedBy="login-msg"
                  />
                )}
              </div>
              <div id="login-msg" className="min-h-5" aria-live="polite">
                {emailBad && <Msg>{t("login.invalid")}</Msg>}
                {!emailBad && problem && <Msg>{t(problem)}</Msg>}
                {state === "error" && <Msg>{t("login.error")}</Msg>}
              </div>
              {mode !== "pin" && <Button type="submit" size="xl" isLoading={state === "sending"} className="w-full">{t(SUBMIT[mode])}</Button>}
            </form>

            <div className="flex flex-col items-center gap-1 text-sm">
              {mode === "password" && <>
                <button type="button" onClick={() => switchMode("pin")} className="font-medium text-brand-secondary hover:underline">{t("login.usePin")}</button>
                <button type="button" onClick={() => switchMode("link")} className="text-tertiary hover:text-primary">{t("login.useLink")}</button>
                <button type="button" onClick={() => switchMode("signup")} className="text-tertiary hover:text-primary">{t("login.toSignup")}</button>
              </>}
              {(mode === "link" || mode === "pin") && <button type="button" onClick={() => switchMode("password")} className="font-medium text-brand-secondary hover:underline">{t("login.usePassword")}</button>}
              {mode === "signup" && <button type="button" onClick={() => switchMode("password")} className="font-medium text-brand-secondary hover:underline">{t("login.toSignin")}</button>}
            </div>
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

function Msg({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="flex items-start gap-2 text-sm text-error-primary"><AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />{children}</p>;
}

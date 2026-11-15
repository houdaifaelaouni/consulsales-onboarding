"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle, Flag01, Lock01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Slider } from "@/components/base/slider/slider";
import { BookingPicker, type BookingStore } from "@/components/booking/booking-picker";
import { Logo } from "@/components/shell/logo";
import { describeSlot, generateSlots, KICKOFF_MINUTES, type BookingPlan } from "@/lib/booking/logic";
import { t, tDynamic } from "@/lib/i18n";
import { formatMoney } from "@/lib/payments-ui/logic";
import {
  ACCESS_CHOICES, back, canContinue, CLOSE_RATES, DEFAULT_STATE, estimate, LIMITS, markDone, next, parseState, remaining, serialize,
  skip, STEP_IDS, stepProgress, TRAIL_IDS, trailStatus, type AccessChoice, type StepId, type WelcomeState,
} from "@/lib/welcome/logic";
import { cx } from "@/utils/cx";

/** Where the new client is on the 30-day trail when they arrive: payment done, intake next. */
const CURRENT_TRAIL = 1;
const TZ_FALLBACK = "UTC";

/** A framed panel with corner marks, the visual anchor of each step. */
function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("relative rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary sm:p-6", className)}>
      {["-top-2 -left-2", "-top-2 -right-2", "-bottom-2 -left-2", "-bottom-2 -right-2"].map((pos) => (
        <span key={pos} aria-hidden className={cx("absolute z-0 hidden size-4 items-center justify-center text-base leading-none text-quaternary sm:flex", pos)}>+</span>
      ))}
      {children}
    </div>
  );
}

export function WelcomeFlow({ name, plan, now, dashboardHref, store, storageKey = "welcome-flow" }: {
  name: string; plan: BookingPlan; now: string; dashboardHref: string; store: BookingStore; storageKey?: string;
}) {
  const [state, setState] = useState<WelcomeState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // Saved progress is read after mount so the first render matches the server.
  useEffect(() => {
    try { setState(parseState(localStorage.getItem(storageKey))); } catch { /* private mode: start fresh */ }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, serialize(state)); } catch { /* ignore */ }
  }, [state, ready, storageKey]);

  // Move focus to the new step's heading so keyboard and screen reader users land in the right place.
  const stepRef = useRef(state.step);
  useEffect(() => {
    if (ready && stepRef.current !== state.step) { heading.current?.focus(); window.scrollTo({ top: 0 }); }
    stepRef.current = state.step;
  }, [state.step, ready]);

  const id: StepId = STEP_IDS[state.step];
  const go = useCallback((fn: (s: WelcomeState) => WelcomeState) => setState(fn), []);
  const tz = useMemo(() => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || TZ_FALLBACK : TZ_FALLBACK), []);
  const booked = useMemo(() => generateSlots(new Date(now), KICKOFF_MINUTES[plan]).slice(2, 6), [now, plan]);

  const title = t(`welcome.title.${id}` as "welcome.title.trail", "en", { name });
  const desc = t(`welcome.desc.${id}` as "welcome.desc.trail", "en", { min: KICKOFF_MINUTES[plan], name });
  const blocked = !canContinue(state);

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <header className="border-b border-secondary">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Logo className="[&_img]:h-7" />
          <p className="text-sm font-medium text-tertiary" aria-live="polite">{t("welcome.step", "en", { n: state.step + 1, total: STEP_IDS.length })}</p>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <ol className="grid grid-cols-5 gap-1.5" aria-label={t("welcome.step", "en", { n: state.step + 1, total: STEP_IDS.length })}>
            {STEP_IDS.map((s, i) => (
              <li key={s} aria-current={i === state.step ? "step" : undefined} className="flex flex-col gap-1.5">
                <span className={cx("h-1.5 rounded-full transition-colors", i <= state.step ? "bg-brand-solid" : "bg-quaternary")} />
                <span className={cx("hidden text-xs sm:block", i === state.step ? "font-medium text-primary" : "text-quaternary")}>{t(`welcome.stepLabel.${s}` as "welcome.stepLabel.trail")}</span>
              </li>
            ))}
          </ol>
          <p className="sr-only" role="progressbar" aria-valuenow={stepProgress(state.step)} aria-valuemin={0} aria-valuemax={100}>{stepProgress(state.step)}%</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 ref={heading} tabIndex={-1} className="text-display-sm font-semibold text-primary outline-none sm:text-display-md">{title}</h1>
          <p className="text-md text-tertiary">{desc}</p>
        </div>

        {id === "trail" && <TrailStep />}
        {id === "goals" && <GoalsStep state={state} setState={setState} />}
        {id === "access" && <AccessStep state={state} setState={setState} />}
        {id === "kickoff" && (
          <Frame>
            <BookingPicker
              plan={plan} now={now} booked={booked} store={store} fallbackUrl="https://cal.com"
              onBooked={(slot) => go((s) => markDone({ ...s, kickoff: slot }, "kickoff"))}
            />
          </Frame>
        )}
        {id === "ready" && <ReadyStep state={state} tz={tz} />}

        <p className="text-sm text-secondary" role="status" aria-live="polite">{summaryLine(state, tz)}</p>
        {blocked && <p className="text-sm text-error-primary" role="alert">{t("welcome.goals.dealRequired")}</p>}

        <div className="mt-auto flex flex-col-reverse gap-3 border-t border-secondary pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-quaternary">{t("welcome.saves")}</p>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {state.step > 0 && id !== "ready" && <Button color="secondary" onPress={() => go(back)}>{t("welcome.back")}</Button>}
            {id !== "ready" && id !== "trail" && <Button color="link-gray" onPress={() => go(skip)}>{t("welcome.skip")}</Button>}
            {id === "ready" ? (
              <Button size="lg" href={dashboardHref} iconTrailing={ArrowRight}>{t("welcome.finish")}</Button>
            ) : (
              <Button size="lg" isDisabled={blocked} onPress={() => go(next)} iconTrailing={ArrowRight}>{t("welcome.continue")}</Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function summaryLine(s: WelcomeState, tz: string): string {
  const id = STEP_IDS[s.step];
  if (id === "trail") {
    const next = TRAIL_IDS[CURRENT_TRAIL + 1];
    return t("welcome.trail.summary", "en", {
      title: t(`welcome.trail.${TRAIL_IDS[CURRENT_TRAIL]}.title` as "welcome.trail.paid.title"),
      next: t(`welcome.trail.${next}.title` as "welcome.trail.paid.title"),
    });
  }
  if (id === "goals") return t("welcome.goals.summary", "en", { calls: s.goals.callsPerMonth, rate: s.goals.closeRate, clients: estimate(s.goals).newClients });
  if (id === "access") return t("welcome.access.summary", "en", { choice: t(`welcome.access.${s.access}` as "welcome.access.seat") });
  if (id === "kickoff") return s.kickoff ? t("welcome.kickoff.summary.booked", "en", { when: describeSlot(s.kickoff, tz) }) : t("welcome.kickoff.summary.open");
  return t("welcome.ready.summary");
}

function TrailStep() {
  const [sel, setSel] = useState<number>(CURRENT_TRAIL);
  const id = TRAIL_IDS[sel];
  const unlock = tDynamic(`welcome.trail.${id}.unlock`, "en", "");
  return (
    <Frame className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-md font-semibold text-primary">{t("welcome.trail.card")}</h2>
        <span className="text-sm text-tertiary">{t("welcome.trail.reached", "en", { n: CURRENT_TRAIL + 1, total: TRAIL_IDS.length })}</span>
      </div>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TRAIL_IDS.map((m, i) => {
          const status = trailStatus(i, CURRENT_TRAIL);
          const Icon = status === "done" ? CheckCircle : status === "current" ? Flag01 : Lock01;
          return (
            <li key={m}>
              <button
                type="button" aria-pressed={sel === i} onClick={() => setSel(i)}
                className={cx(
                  "flex w-full flex-col items-start gap-2 rounded-xl p-3 text-left ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                  sel === i ? "bg-secondary ring-brand" : "bg-primary ring-secondary hover:bg-primary_hover",
                  status === "locked" && "opacity-80",
                )}
              >
                <span className={cx("grid size-9 place-items-center rounded-full ring-1 ring-inset", status === "locked" ? "text-fg-quaternary ring-secondary" : "bg-brand-solid text-fg-white ring-brand-solid")}>
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="text-sm font-semibold text-primary">{t(`welcome.trail.${m}.title` as "welcome.trail.paid.title")}</span>
                <span className="text-xs text-tertiary">{t(`welcome.trail.${m}.days` as "welcome.trail.paid.days")}</span>
                {status === "current" && <Badge size="sm" color="brand">{t("welcome.trail.here")}</Badge>}
                <span className="sr-only">{status}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <dl className="grid gap-4 rounded-xl bg-secondary p-4 text-sm sm:grid-cols-2" aria-live="polite">
        <div><dt className="font-semibold text-primary">{t("welcome.trail.you")}</dt><dd className="mt-1 text-tertiary">{t(`welcome.trail.${id}.you` as "welcome.trail.paid.you")}</dd></div>
        <div><dt className="font-semibold text-primary">{t("welcome.trail.we")}</dt><dd className="mt-1 text-tertiary">{t(`welcome.trail.${id}.we` as "welcome.trail.paid.we")}</dd></div>
        {unlock && <p className="text-secondary sm:col-span-2">{unlock}</p>}
      </dl>
    </Frame>
  );
}

function GoalsStep({ state, setState }: { state: WelcomeState; setState: React.Dispatch<React.SetStateAction<WelcomeState>> }) {
  const g = state.goals;
  const est = estimate(g);
  const set = (patch: Partial<typeof g>) => setState((s) => markDone({ ...s, goals: { ...s.goals, ...patch } }, "goals"));
  return (
    <Frame className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label id="calls-label" className="text-sm font-medium text-secondary">{t("welcome.goals.calls")}</label>
          <span className="text-display-xs font-semibold text-primary" aria-hidden>{g.callsPerMonth}</span>
        </div>
        <Slider
          aria-labelledby="calls-label" minValue={LIMITS.calls.min} maxValue={LIMITS.calls.max} step={1} value={g.callsPerMonth}
          labelFormatter={(v) => String(v)} onChange={(v) => set({ callsPerMonth: Array.isArray(v) ? v[0] : v })}
        />
      </div>

      <Input
        label={t("welcome.goals.deal")} type="number" inputMode="numeric" value={g.dealValue ? String(g.dealValue) : ""}
        placeholder="6000" onChange={(v) => set({ dealValue: Math.min(Math.max(Math.round(Number(v) || 0), 0), LIMITS.deal.max) })}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-secondary">{t("welcome.goals.rate")}</legend>
        <div className="grid grid-cols-4 gap-2">
          {CLOSE_RATES.map((r) => (
            <button
              key={r} type="button" aria-pressed={g.closeRate === r} onClick={() => set({ closeRate: r })}
              className={cx("min-h-11 rounded-lg text-sm font-medium ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                g.closeRate === r ? "bg-secondary text-primary ring-brand" : "bg-primary text-tertiary ring-secondary hover:bg-primary_hover")}
            >
              {t("welcome.goals.rateOption", "en", { n: r })}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1 rounded-xl bg-secondary p-4" aria-live="polite">
        <p className="text-sm text-tertiary">{t("welcome.goals.result", "en", { clients: est.newClients, revenue: formatMoney(est.monthlyRevenue * 100, "eur") })}</p>
        <p className="text-xs text-quaternary">{t("welcome.goals.change")}</p>
      </div>
    </Frame>
  );
}

function AccessStep({ state, setState }: { state: WelcomeState; setState: React.Dispatch<React.SetStateAction<WelcomeState>> }) {
  return (
    <Frame className="flex flex-col gap-5">
      <RadioGroup
        aria-label={t("welcome.title.access")} value={state.access} size="md" className="gap-3"
        onChange={(v) => setState((s) => markDone({ ...s, access: v as AccessChoice }, "access"))}
      >
        {ACCESS_CHOICES.map((c) => (
          <RadioButton
            key={c} value={c} size="md"
            label={t(`welcome.access.${c}` as "welcome.access.seat")} hint={t(`welcome.access.${c}.hint` as "welcome.access.seat.hint")}
            className={({ isSelected, isFocusVisible }) => cx("cursor-pointer rounded-xl p-4 ring-1 ring-inset transition", isSelected ? "bg-secondary ring-brand" : "ring-secondary hover:bg-primary_hover", isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring")}
          />
        ))}
      </RadioGroup>
      <p className="rounded-lg bg-secondary p-3 text-sm text-tertiary">{t("welcome.access.note")}</p>
    </Frame>
  );
}

function ReadyStep({ state, tz }: { state: WelcomeState; tz: string }) {
  const open = remaining(state);
  const done: string[] = [t("welcome.ready.goals", "en", { calls: state.goals.callsPerMonth })];
  if (!open.includes("access")) done.push(t("welcome.ready.access", "en", { choice: t(`welcome.access.${state.access}` as "welcome.access.seat") }));
  if (state.kickoff) done.push(t("welcome.ready.kickoff", "en", { when: describeSlot(state.kickoff, tz) }));
  return (
    <Frame className="grid gap-6 sm:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold text-primary">{t("welcome.ready.done")}</h2>
        <ul className="flex flex-col gap-2">
          {done.map((d) => (
            <li key={d} className="flex items-start gap-2 text-sm text-secondary"><CheckCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-success-primary" />{d}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold text-primary">{t("welcome.ready.todo")}</h2>
        {open.length === 0 ? <p className="text-sm text-tertiary">{t("welcome.ready.nothing")}</p> : (
          <ul className="flex flex-col gap-2">
            {open.map((o) => (
              <li key={o} className="flex items-start gap-2 text-sm text-secondary"><Lock01 aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />{t(`welcome.ready.todo.${o}` as "welcome.ready.todo.access")}</li>
            ))}
          </ul>
        )}
      </section>
    </Frame>
  );
}

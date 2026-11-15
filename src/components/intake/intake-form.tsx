"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { t } from "@/lib/i18n";
import { answeredCount, firstIncompleteStep, isComplete, minutesLeft, missingRequired, questionsForStep, type Answers } from "@/lib/intake/logic";
import { STEPS, type Question } from "@/lib/intake/questions";
import { cx } from "@/utils/cx";

type SaveState = "idle" | "saving" | "saved" | "error";

export interface IntakeStore {
  load(): Promise<Answers>;
  save(answers: Answers): Promise<void>;
}

/** Autosave interval from the PDR (FR-05). */
const AUTOSAVE_MS = 3000;

export function IntakeForm({ store }: { store: IntakeStore }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [showMissing, setShowMissing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const latest = useRef<Answers>({});

  // Resume: load saved answers and jump to the first unfinished step (FR-06).
  useEffect(() => {
    let alive = true;
    store.load().then((saved) => {
      if (!alive) return;
      setAnswers(saved);
      latest.current = saved;
      setStep(firstIncompleteStep(saved));
      setFinished(isComplete(saved));
      setReady(true);
    }).catch(() => { if (alive) { setSave("error"); setReady(true); } });
    return () => { alive = false; };
  }, [store]);

  const flush = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setSave("saving");
    try { await store.save(latest.current); setSave("saved"); } catch { dirty.current = true; setSave("error"); }
  }, [store]);

  // Debounced autosave 3 s after the last change; also when the tab is hidden so nothing is lost (FR-05).
  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(flush, AUTOSAVE_MS);
    return () => clearTimeout(id);
  }, [answers, flush]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); };
  }, [flush]);

  function update(key: string, patch: Partial<NonNullable<Answers[string]>>) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: { value: "", ...prev[key], ...patch } };
      latest.current = next;
      dirty.current = true;
      return next;
    });
    setSave("idle");
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label={t("intake.loading")}>
        {["h-4 w-40", "h-8 w-2/3", "h-28 w-full", "h-12 w-full"].map((c) => <div key={c} className={cx("animate-pulse rounded-md bg-quaternary", c)} />)}
      </div>
    );
  }

  const current = STEPS.find((s) => s.id === step) ?? STEPS[0];
  const qs = questionsForStep(step);
  const last = step === STEPS[STEPS.length - 1].id;
  const mins = minutesLeft(answers);
  const { done, total } = answeredCount(answers);

  async function go(delta: 1 | -1) {
    const missing = missingRequired(step, answers);
    if (delta === 1 && missing.length > 0) {
      setShowMissing(true);
      // Take the person to the first unanswered question so they do not have to hunt for it.
      document.querySelector<HTMLElement>(`[data-q="${missing[0].key}"] input:not([type=checkbox]), [data-q="${missing[0].key}"] textarea, [data-q="${missing[0].key}"] button`)?.focus();
      return;
    }
    setShowMissing(false);
    await flush();
    if (delta === 1 && last) { setFinished(true); return; }
    setStep((s) => s + delta);
    window.scrollTo({ top: 0 });
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-primary p-8 text-center shadow-xs ring-1 ring-secondary" role="status">
        <span className="grid size-12 place-items-center rounded-full bg-success-secondary text-fg-success-primary"><CheckCircle aria-hidden className="size-6" /></span>
        <h2 className="text-display-xs font-semibold text-primary">{t("intake.done.title")}</h2>
        <p className="text-md text-tertiary">{t("intake.done.body")}</p>
        <Button color="secondary" onPress={() => { setFinished(false); setStep(1); }}>{t("intake.done.review")}</Button>
      </div>
    );
  }

  const missingKeys = new Set(showMissing ? missingRequired(step, answers).map((q) => q.key) : []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-tertiary">
          <span>{t("intake.step", "en", { n: step, total: STEPS.length })}</span>
          <span aria-live="polite">{mins === 0 ? t("intake.allSet") : t("intake.timeLeft", "en", { min: mins })}</span>
        </div>
        <ol className="grid grid-cols-4 gap-2" aria-label={t("intake.title")}>
          {STEPS.map((s) => (
            <li key={s.id} aria-current={s.id === step ? "step" : undefined}>
              <button
                type="button" onClick={() => setStep(s.id)}
                className={cx("min-h-10 w-full rounded-lg px-2 text-left text-sm ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                  s.id === step ? "bg-secondary font-medium text-primary ring-brand" : "text-tertiary ring-secondary hover:bg-primary_hover")}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ol>
        <ProgressBarBase value={done} max={total} aria-hidden />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-display-sm font-semibold text-primary">{current.title}</h2>
        <p className="text-md text-tertiary">{current.intro}</p>
      </div>

      <div className="flex flex-col gap-8">
        {qs.map((q) => (
          <Field key={q.key} q={q} answer={answers[q.key]} invalid={missingKeys.has(q.key)} onChange={(p) => update(q.key, p)} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-secondary pt-5">
        <span className="text-sm text-tertiary" role="status" aria-live="polite">
          {save === "saving" && t("intake.saving")}
          {save === "saved" && t("intake.saved")}
          {save === "error" && t("intake.saveError")}
        </span>
        <div className="flex gap-3">
          {step > 1 && <Button color="secondary" onPress={() => go(-1)}>{t("intake.back")}</Button>}
          <Button size="lg" onPress={() => go(1)}>{last ? t("intake.finish") : t("intake.next")}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ q, answer, invalid, onChange }: {
  q: Question; answer: Answers[string]; invalid: boolean; onChange: (p: { value?: string; notSure?: boolean; note?: string }) => void;
}) {
  const notSure = answer?.notSure === true;
  const value = answer?.value ?? "";
  // Help and example sit under the field, where hints belong; a missing answer replaces them with the error.
  const help = [q.help, q.example ? t("intake.example", "en", { text: q.example }) : null].filter(Boolean).join(" ");
  const hint = invalid ? t("intake.fieldRequired") : help || undefined;
  const label = q.required ? q.label : `${q.label} (${t("intake.optional").toLowerCase()})`;
  const common = { label, isDisabled: notSure, isInvalid: invalid, isRequired: q.required, hint } as const;

  return (
    <div data-q={q.key} className="flex flex-col gap-2">
      {q.type === "textarea" && <TextArea {...common} rows={4} value={value} onChange={(v) => onChange({ value: v })} />}
      {q.type === "text" && <Input {...common} type="text" value={value} onChange={(v) => onChange({ value: v })} />}
      {q.type === "number" && <Input {...common} type="number" inputMode="numeric" value={value} onChange={(v) => onChange({ value: v })} />}
      {q.type === "select" && (
        <Select
          {...common} placeholder={t("intake.select")} selectedKey={value || null}
          items={(q.options ?? []).map((o) => ({ id: o, label: o }))} onSelectionChange={(k) => onChange({ value: k === null ? "" : String(k) })}
        >
          {(item) => <Select.Item id={item.id} label={item.label} />}
        </Select>
      )}
      <Checkbox isSelected={notSure} onChange={(v) => onChange({ notSure: v })} label={t("intake.notSure")} />
      {notSure && (
        <Input aria-label={t("intake.notePlaceholder")} placeholder={t("intake.notePlaceholder")} value={answer?.note ?? ""} onChange={(v) => onChange({ note: v })} />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Input, Select, Skeleton, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import {
  answeredCount, firstIncompleteStep, isComplete, minutesLeft, missingRequired, questionsForStep, type Answers,
} from "@/lib/intake/logic";
import { STEPS, type Question } from "@/lib/intake/questions";

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

  // Debounced autosave every 3 s after the last change; also on tab hide so nothing is lost (FR-05).
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
      <div className="space-y-4" role="status" aria-label={t("intake.loading")}>
        <Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-28 w-full" /><Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const current = STEPS.find((s) => s.id === step) ?? STEPS[0];
  const qs = questionsForStep(step);
  const last = step === STEPS[STEPS.length - 1].id;
  const mins = minutesLeft(answers);
  const { done, total } = answeredCount(answers);

  async function go(delta: 1 | -1) {
    if (delta === 1 && missingRequired(step, answers).length > 0) { setShowMissing(true); return; }
    setShowMissing(false);
    await flush();
    if (delta === 1 && last) { setFinished(true); return; }
    setStep((s) => s + delta);
    window.scrollTo({ top: 0 });
  }

  if (finished) {
    return (
      <Card className="space-y-4 text-center" role="status">
        <h2 className="text-[22px] font-medium tracking-[-0.4px]">{t("intake.done.title")}</h2>
        <p className="text-ink-muted">{t("intake.done.body")}</p>
        <div><Button variant="secondary" onClick={() => { setFinished(false); setStep(1); }}>{t("intake.done.review")}</Button></div>
      </Card>
    );
  }

  const missingKeys = new Set(showMissing ? missingRequired(step, answers).map((q) => q.key) : []);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">
          <span>{t("intake.step", "en", { n: step, total: STEPS.length })}</span>
          <span aria-live="polite">{mins === 0 ? t("intake.allSet") : t("intake.timeLeft", "en", { min: mins })}</span>
        </div>
        <ol className="grid grid-cols-4 gap-2" aria-label={t("intake.title")}>
          {STEPS.map((s) => (
            <li key={s.id} aria-current={s.id === step ? "step" : undefined}>
              <button
                type="button" onClick={() => setStep(s.id)}
                className={cn("w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                  s.id === step ? "border-primary text-ink" : "border-hairline text-ink-subtle hover:bg-surface-1")}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div className="h-full bg-ink-subtle transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{current.title}</h2>
        <p className="text-ink-muted">{current.intro}</p>
      </div>

      <div className="space-y-6">
        {qs.map((q) => (
          <Field key={q.key} q={q} answer={answers[q.key]} invalid={missingKeys.has(q.key)} onChange={(p) => update(q.key, p)} />
        ))}
      </div>

      {showMissing && missingKeys.size > 0 && <p role="alert" className="text-sm text-ink-muted">{t("intake.missing")}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
        <span className="text-sm text-ink-subtle" role="status" aria-live="polite">
          {save === "saving" && t("intake.saving")}
          {save === "saved" && t("intake.saved")}
          {save === "error" && t("intake.saveError")}
        </span>
        <div className="flex gap-3">
          {step > 1 && <Button variant="secondary" onClick={() => go(-1)}>{t("intake.back")}</Button>}
          <Button onClick={() => go(1)}>{last ? t("intake.finish") : t("intake.next")}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ q, answer, invalid, onChange }: {
  q: Question; answer: Answers[string]; invalid: boolean; onChange: (p: { value?: string; notSure?: boolean; note?: string }) => void;
}) {
  const id = `q-${q.key}`;
  const notSure = answer?.notSure === true;
  const common = {
    id, disabled: notSure, value: answer?.value ?? "",
    "aria-invalid": invalid || undefined, "aria-describedby": `${id}-help`, "aria-required": q.required || undefined,
  } as const;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-base font-medium">{q.label}</label>
        <Badge className="shrink-0">{q.required ? t("intake.required") : t("intake.optional")}</Badge>
      </div>
      <div id={`${id}-help`} className="space-y-1 text-sm text-ink-subtle">
        {q.help && <p>{q.help}</p>}
        {q.example && <p>{t("intake.example", "en", { text: q.example })}</p>}
      </div>
      {q.type === "textarea" && <Textarea {...common} onChange={(e) => onChange({ value: e.target.value })} />}
      {q.type === "text" && <Input {...common} type="text" onChange={(e) => onChange({ value: e.target.value })} />}
      {q.type === "number" && <Input {...common} type="number" inputMode="numeric" min={0} onChange={(e) => onChange({ value: e.target.value })} />}
      {q.type === "select" && (
        <Select {...common} onChange={(e) => onChange({ value: e.target.value })}>
          <option value="">{t("intake.select")}</option>
          {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      )}
      <label className="flex min-h-10 items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={notSure} onChange={(e) => onChange({ notSure: e.target.checked })} className="size-4 accent-[var(--primary)]" />
        {t("intake.notSure")}
      </label>
      {notSure && (
        <Input type="text" aria-label={t("intake.notePlaceholder")} placeholder={t("intake.notePlaceholder")} value={answer?.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />
      )}
    </div>
  );
}


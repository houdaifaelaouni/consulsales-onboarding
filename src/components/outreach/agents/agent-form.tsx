"use client";

import { useState, useTransition } from "react";
import { saveAgentProfile } from "@/app/app/outreach/agents/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import { AGENT_LIMITS, validateAgent, type AgentProfile } from "@/lib/outreach/agent";
import { TIMEZONES } from "@/lib/outreach/settings";
import { cx } from "@/utils/cx";

function Area({ label, hint, value, max, onChange, onBlur }: {
  label: string; hint: string; value: string; max: number; onChange: (v: string) => void; onBlur: () => void;
}) {
  const over = value.length > max;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-secondary bg-primary p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold text-primary">{label}</h2>
        <p className="text-sm text-tertiary">{hint}</p>
      </div>
      <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        className="rounded-lg border border-secondary bg-secondary px-3 py-2 text-sm text-primary" />
      <p className={cx("text-xs", over ? "text-error-primary" : "text-tertiary")}>{t("outreach.ag.chars", "en", { n: value.length, max })}</p>
    </section>
  );
}

/**
 * The AI Super Agents knowledge base. Fields save on blur (and with the button), because this is reference material the
 * agent runtime will read — not a form that must be submitted in one go. Nothing is generated here.
 */
export function AgentForm({ initial, live }: { initial: AgentProfile; live: boolean }) {
  const [value, setValue] = useState<AgentProfile>(initial);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: AgentProfile) {
    const check = validateAgent(next);
    if (!check.ok) { setProblem(t("outreach.ag.tooLong", "en", { max: AGENT_LIMITS.positioning })); return; }
    setProblem(null);
    if (!live) { setNote(t("outreach.ag.demo")); return; }
    start(async () => {
      const r = await saveAgentProfile(check.value);
      setNote(r.ok ? t("outreach.ag.saved") : t("outreach.ag.error"));
    });
  }

  const set = (patch: Partial<AgentProfile>) => setValue((v) => ({ ...v, ...patch }));
  const commit = (patch: Partial<AgentProfile>) => { const next = { ...value, ...patch }; setValue(next); save(next); };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-2xl border border-secondary bg-primary p-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
          {t("outreach.ag.domain")}
          <input value={value.domain} onChange={(e) => set({ domain: e.target.value })} onBlur={() => save(value)}
            className="rounded-lg border border-secondary bg-secondary px-3 py-2 text-sm text-primary" />
        </label>
        <p className="text-xs text-tertiary">{t("outreach.ag.domainHint")}</p>
      </section>

      <Area label={t("outreach.ag.context")} hint={t("outreach.ag.contextHint")} value={value.context} max={AGENT_LIMITS.context}
        onChange={(v) => set({ context: v })} onBlur={() => save(value)} />
      <Area label={t("outreach.ag.icp")} hint={t("outreach.ag.icpHint")} value={value.icp} max={AGENT_LIMITS.icp}
        onChange={(v) => set({ icp: v })} onBlur={() => save(value)} />

      <section className="flex flex-col gap-3 rounded-2xl border border-secondary bg-primary p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold text-primary">{t("outreach.ag.identity")}</h2>
          <p className="text-sm text-tertiary">{t("outreach.ag.identityHint")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { key: "ai", label: "outreach.ag.identityAi", body: "outreach.ag.identityAiBody" },
            { key: "founder", label: "outreach.ag.identityFounder", body: "outreach.ag.identityFounderBody" },
          ] as const).map((choice) => (
            <label key={choice.key} className={cx("flex cursor-pointer flex-col gap-1 rounded-xl border p-4", value.identity === choice.key ? "border-brand bg-secondary" : "border-secondary")}>
              <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                <input type="radio" name="identity" checked={value.identity === choice.key} onChange={() => commit({ identity: choice.key })} />
                {t(choice.label)}
              </span>
              <span className="text-xs leading-5 text-tertiary">{t(choice.body)}</span>
            </label>
          ))}
        </div>
      </section>

      <Area label={t("outreach.ag.positioning")} hint={t("outreach.ag.positioningHint")} value={value.positioning} max={AGENT_LIMITS.positioning}
        onChange={(v) => set({ positioning: v })} onBlur={() => save(value)} />
      <Area label={t("outreach.ag.instructions")} hint={t("outreach.ag.instructionsHint", "en", { tag: "{custom_content_instructions}" })}
        value={value.instructions} max={AGENT_LIMITS.instructions} onChange={(v) => set({ instructions: v })} onBlur={() => save(value)} />
      <Area label={t("outreach.ag.notes")} hint={t("outreach.ag.notesHint", "en", { tag: "{user_notes}" })}
        value={value.notes} max={AGENT_LIMITS.notes} onChange={(v) => set({ notes: v })} onBlur={() => save(value)} />

      <section className="flex flex-col gap-2 rounded-2xl border border-secondary bg-primary p-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
          {t("outreach.ag.timezone")}
          <select value={value.timezone} onChange={(e) => commit({ timezone: e.target.value })}
            className="rounded-lg border border-secondary bg-secondary px-3 py-2 text-sm text-primary">
            {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <p className="text-xs text-tertiary">{t("outreach.ag.timezoneHint")}</p>
      </section>

      {problem && <p role="alert" className="text-sm text-error-primary">{problem}</p>}
      {note && <p role="status" className="text-sm text-secondary">{note}</p>}
      <div className="flex items-center gap-2">
        <Button color="secondary" isDisabled={pending} onPress={() => save(value)}>{t("outreach.ag.save")}</Button>
        {pending && <span className="text-sm text-tertiary">{t("outreach.ag.saving")}</span>}
      </div>
    </div>
  );
}

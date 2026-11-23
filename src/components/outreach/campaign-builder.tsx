"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { launchCampaign, saveCampaign } from "@/app/app/outreach/campaigns/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { t } from "@/lib/i18n";
import { daysToSend, LIMITS, PLACEHOLDERS, validateCampaign, type StepInput } from "@/lib/outreach/campaign";

const START: StepInput[] = [{ delayDays: 0, body: "" }, { delayDays: 1, body: "" }];

/** Write the connection request and the messages that follow it. Saving keeps a draft; launching enrols every approved lead. */
export function CampaignBuilder({ id, initialName, initialSteps, approvedLeads, perDay, canEdit }: { id: string | null; initialName: string; initialSteps: StepInput[] | null; approvedLeads: number; perDay: number; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<StepInput[]>(initialSteps ?? START);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const patch = (i: number, p: Partial<StepInput>) => setSteps(steps.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const messages = steps.length - 1;

  function run(launch: boolean) {
    setSaved(false);
    const v = validateCampaign(name, steps);
    if (!v.ok) { setError(v.field === "message" || v.field === "delay" ? `${v.field}:${v.step}` : v.field); return; }
    setError(null);
    start(async () => {
      const r = await saveCampaign(id, name, steps);
      if (!r.ok) { setError(r.reason); return; }
      if (launch) {
        const l = await launchCampaign(r.id);
        if (!l.ok) { setError(`launch_${l.reason}`); router.refresh(); return; }
      } else setSaved(true);
      router.push("/app/outreach/campaigns");
      router.refresh();
    });
  }

  const errKey = error?.includes(":") ? error.split(":")[0] : error;
  const errStep = error?.includes(":") ? Number(error.split(":")[1]) : null;

  return (
    <section aria-labelledby="cb-h" className="flex flex-col gap-5 rounded-xl bg-primary p-6 ring-1 ring-secondary">
      <h2 id="cb-h" className="text-md font-semibold text-primary">{t(id ? "outreach.camp.edit" : "outreach.camp.new")}</h2>
      <Input label={t("outreach.camp.name")} value={name} onChange={setName} isDisabled={!canEdit} />
      <p className="text-sm text-tertiary">{t("outreach.camp.placeholders", "en", { list: PLACEHOLDERS.map((p) => `{${p}}`).join(" ") })}</p>

      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={i} className="flex flex-col gap-2 rounded-lg bg-secondary p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-primary">{i === 0 ? t("outreach.camp.invite") : t("outreach.camp.messageN", "en", { n: i })}</h3>
              {i > 0 && (
                <div className="flex items-end gap-2">
                  <div className="w-36"><Input size="sm" label={t("outreach.camp.delay")} type="number" inputMode="numeric" value={String(s.delayDays)} onChange={(v) => patch(i, { delayDays: Number(v) })} isDisabled={!canEdit} /></div>
                  {i > 1 && canEdit && <Button size="sm" color="link-gray" onPress={() => setSteps(steps.filter((_, k) => k !== i))}>{t("outreach.camp.remove")}</Button>}
                </div>
              )}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
              <span className="sr-only">{i === 0 ? t("outreach.camp.invite") : t("outreach.camp.messageN", "en", { n: i })}</span>
              <textarea rows={i === 0 ? 3 : 4} value={s.body} disabled={!canEdit} onChange={(e) => patch(i, { body: e.target.value })} className="rounded-lg bg-primary px-3 py-2 text-md text-primary ring-1 ring-primary" />
            </label>
            <p className={`text-sm ${(i === 0 ? s.body.length > LIMITS.noteMax : s.body.length > LIMITS.messageMax) ? "text-error-primary" : "text-tertiary"}`}>
              {i === 0 ? t("outreach.camp.noteCount", "en", { n: s.body.length, max: LIMITS.noteMax }) : t("outreach.camp.messageCount", "en", { n: s.body.length, max: LIMITS.messageMax })}
            </p>
            {errStep === i && <p role="alert" className="text-sm text-error-primary">{t(`outreach.camp.error.${errKey}` as "outreach.camp.error.message")}</p>}
          </li>
        ))}
      </ol>
      {canEdit && messages < LIMITS.maxMessages && <div><Button size="sm" color="secondary" onPress={() => setSteps([...steps, { delayDays: 3, body: "" }])}>{t("outreach.camp.addMessage")}</Button></div>}

      <p className="text-sm text-tertiary">{t("outreach.camp.estimate", "en", { leads: approvedLeads, perDay, days: daysToSend(approvedLeads, perDay) })}</p>
      <p className="text-sm text-tertiary">{t("outreach.camp.stops")}</p>

      {error && errStep === null && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`outreach.camp.error.${errKey}` as "outreach.camp.error.failed")}</p>}
      {saved && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("outreach.camp.saved")}</p>}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button color="secondary" isDisabled={pending} onPress={() => run(false)}>{t("outreach.camp.saveDraft")}</Button>
          <Button isDisabled={pending || approvedLeads === 0} onPress={() => run(true)}>{t("outreach.camp.launch", "en", { n: approvedLeads })}</Button>
        </div>
      )}
      {approvedLeads === 0 && <p className="text-sm text-tertiary">{t("outreach.camp.noApproved")}</p>}
    </section>
  );
}

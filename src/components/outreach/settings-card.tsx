"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings, setPaused } from "@/app/app/outreach/actions";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { t } from "@/lib/i18n";
import { CAPS, TIMEZONES, validateSettings, type OutreachSettings, type SendingState } from "@/lib/outreach/settings";

const STATE_COLOR = { sending: "success", paused: "warning", no_account: "gray", needs_reconnect: "error", stopped_by_admin: "error" } as const;
const STATE_KEY = {
  sending: "outreach.state.sending", paused: "outreach.state.paused", no_account: "outreach.state.no_account", needs_reconnect: "outreach.state.needs_reconnect", stopped_by_admin: "outreach.state.stopped_by_admin",
} as const;

/** The client's own limits and the start/pause switch. The maximums are hard: the database refuses anything above them. */
export function SettingsCard({ initial, paused, state, adminStopReason, canEdit }: { initial: OutreachSettings; paused: boolean; state: SendingState; adminStopReason: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [invites, setInvites] = useState(String(initial.invitesPerDay));
  const [messages, setMessages] = useState(String(initial.messagesPerDay));
  const [workStart, setWorkStart] = useState(initial.workStart);
  const [workEnd, setWorkEnd] = useState(initial.workEnd);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [weekdaysOnly, setWeekdaysOnly] = useState(initial.weekdaysOnly);
  const [warmup, setWarmup] = useState(initial.warmup);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const draft = (): OutreachSettings => ({ invitesPerDay: Number(invites), messagesPerDay: Number(messages), workStart, workEnd, timezone, weekdaysOnly, warmup });

  function save() {
    setSaved(false);
    const v = validateSettings(draft());
    if (!v.ok) { setError(v.field); return; }
    setError(null);
    start(async () => {
      const r = await saveSettings(v.value);
      if (!r.ok) { setError(r.reason); return; }
      setSaved(true); router.refresh();
    });
  }
  function toggle() {
    setError(null); setSaved(false);
    start(async () => {
      const r = await setPaused(!paused);
      if (!r.ok) { setError(`pause_${r.reason}`); return; }
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="out-settings" className="flex flex-col gap-5 rounded-xl bg-primary p-6 ring-1 ring-secondary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="out-settings" className="text-md font-semibold text-primary">{t("outreach.settings.title")}</h2>
        <Badge size="md" color={STATE_COLOR[state]}>{t(STATE_KEY[state])}</Badge>
      </div>
      <p className="text-sm text-tertiary">{t("outreach.settings.subtitle")}</p>
      {state === "stopped_by_admin" && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t("outreach.adminStopped", "en", { reason: adminStopReason ?? "" })}</p>}

      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("outreach.settings.invites")} type="number" inputMode="numeric" value={invites} onChange={setInvites} isDisabled={!canEdit} hint={t("outreach.settings.max", "en", { max: CAPS.invitesPerDay })} />
          <Input label={t("outreach.settings.messages")} type="number" inputMode="numeric" value={messages} onChange={setMessages} isDisabled={!canEdit} hint={t("outreach.settings.max", "en", { max: CAPS.messagesPerDay })} />
          <Input label={t("outreach.settings.start")} type="time" value={workStart} onChange={setWorkStart} isDisabled={!canEdit} hint={t("outreach.settings.hoursHint", "en", { from: CAPS.earliest, to: CAPS.latest })} />
          <Input label={t("outreach.settings.end")} type="time" value={workEnd} onChange={setWorkEnd} isDisabled={!canEdit} />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
          {t("outreach.settings.timezone")}
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={!canEdit} className="rounded-lg bg-primary px-3 py-2 text-md text-primary ring-1 ring-primary">
            {TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm text-primary"><input type="checkbox" className="size-4" checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)} disabled={!canEdit} />{t("outreach.settings.weekdays")}</label>
        <label className="flex items-start gap-3 text-sm text-primary"><input type="checkbox" className="mt-0.5 size-4" checked={warmup} onChange={(e) => setWarmup(e.target.checked)} disabled={!canEdit} /><span>{t("outreach.settings.warmup")}<span className="block text-tertiary">{t("outreach.settings.warmupHint")}</span></span></label>

        {error && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`outreach.error.${error}` as "outreach.error.failed", "en", { max: error === "invitesPerDay" ? CAPS.invitesPerDay : CAPS.messagesPerDay })}</p>}
        {saved && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("outreach.settings.saved")}</p>}
        {canEdit && <div className="flex flex-wrap gap-2">
          <Button type="submit" isDisabled={pending}>{t("outreach.settings.save")}</Button>
          <Button color={paused ? "primary" : "secondary"} isDisabled={pending} onPress={toggle}>{t(paused ? "outreach.start" : "outreach.pause")}</Button>
        </div>}
      </form>
    </section>
  );
}

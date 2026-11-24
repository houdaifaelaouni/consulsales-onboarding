"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ChannelOption } from "@/components/outreach/platform-pills";
import { createCampaign } from "@/app/app/outreach/campaigns/actions";
import { t } from "@/lib/i18n";
import { CHANNELS, type Channel } from "@/lib/outreach/workspace";
import { cx } from "@/utils/cx";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-solid" : "bg-secondary ring-1 ring-secondary")}>
      <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow-xs transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

const OPTIONS = [
  { key: "engageBefore", label: "outreach.nc.engageBefore", body: "outreach.nc.engageBeforeBody" },
  { key: "engageAfter", label: "outreach.nc.engageAfter", body: "outreach.nc.engageAfterBody" },
  { key: "repeat", label: "outreach.nc.repeat", body: null },
  { key: "skipExisting", label: "outreach.nc.skip", body: null },
  { key: "warmupMode", label: "outreach.nc.warmup", body: "outreach.nc.warmupBody" },
] as const;

type OptionKey = (typeof OPTIONS)[number]["key"];

/**
 * The create dialog: pick a channel (only LinkedIn can send), name the campaign, choose the optional touches, then create
 * a draft and open its Build tab. The working hours come from the client's own limits, never from this dialog.
 */
export function NewCampaignDialog({ base, live, canEdit, hours, days, sessions }: {
  base: string; live: boolean; canEdit: boolean; hours: string; days: string; sessions: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("linkedin");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [on, setOn] = useState<Record<OptionKey, boolean>>({
    engageBefore: false, engageAfter: true, repeat: false, skipExisting: false, warmupMode: false,
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!canEdit) return null;

  function create() {
    const clean = name.trim();
    if (clean.length < 1) { setProblem(t("outreach.nc.error.name")); return; }
    setProblem(null);
    if (!live) { setProblem(t("outreach.nc.demo")); return; }
    start(async () => {
      const r = await createCampaign({
        name: clean, description, channel: "LINKEDIN",
        options: {
          engage_before: on.engageBefore, engage_after: on.engageAfter,
          contact_again_days: on.repeat ? 75 : null, skip_existing: on.skipExisting, warmup_mode: on.warmupMode,
        },
      });
      if (!r.ok) { setProblem(r.reason === "name" ? t("outreach.nc.error.name") : t("outreach.nc.error.failed")); return; }
      setOpen(false);
      router.push(`${base}/${r.id}/build`);
      router.refresh();
    });
  }

  return (
    <>
      <Button iconLeading={Plus} onPress={() => setOpen(true)}>{t("outreach.cl.new")}</Button>
      <ModalOverlay isOpen={open} onOpenChange={setOpen} isDismissable>
        <Modal className="w-full max-w-5xl">
          <Dialog className="flex max-h-[85vh] flex-col">
            <div className="border-b border-secondary px-6 py-5">
              <h2 className="text-lg font-semibold text-primary">{t("outreach.nc.title")}</h2>
              <p className="mt-1 text-sm text-tertiary">{t("outreach.nc.subtitle")}</p>
            </div>

            <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[1.15fr_1fr]">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-primary">{t("outreach.nc.channels")}</h3>
                  <p className="text-xs text-tertiary">{t("outreach.nc.channelsHint")}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHANNELS.map((c) => (
                    <button key={c.key} type="button" disabled={!c.available} aria-disabled={!c.available}
                      onClick={() => setChannel(c.key)} className="text-left disabled:cursor-not-allowed">
                      <ChannelOption channel={c.key} selected={channel === c.key} disabled={!c.available} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
                  {t("outreach.nc.name")}
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("outreach.nc.namePlaceholder")}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
                  {t("outreach.nc.description")}
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("outreach.nc.descriptionPlaceholder")}
                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary" />
                </label>
                <p className="rounded-xl bg-secondary p-3 text-xs leading-5 text-tertiary">{t("outreach.nc.summary")}</p>

                <ul className="flex flex-col divide-y divide-secondary rounded-xl border border-secondary">
                  {OPTIONS.map((option) => (
                    <li key={option.key} className="flex items-start justify-between gap-3 p-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-primary">{t(option.label)}</span>
                        {option.body && <span className="text-xs leading-5 text-tertiary">{t(option.body)}</span>}
                      </span>
                      <Switch checked={on[option.key]} label={t(option.label)} onChange={(next) => setOn((s) => ({ ...s, [option.key]: next }))} />
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2 rounded-xl border border-secondary p-4">
                  <h3 className="text-sm font-semibold text-primary">{t("outreach.nc.config")}</h3>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-tertiary">{t("outreach.nc.hours")}</dt><dd className="font-medium text-primary">{hours}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-tertiary">{t("outreach.nc.days")}</dt><dd className="font-medium text-primary">{days}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-tertiary">{t("outreach.nc.sessions")}</dt><dd className="font-medium text-primary">{sessions}</dd></div>
                  </dl>
                  <p className="text-xs leading-5 text-tertiary">{t("outreach.nc.limits")}</p>
                </div>
                {problem && <p role="alert" className="text-sm text-error-primary">{problem}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-secondary px-6 py-4">
              <Button color="secondary" onPress={() => setOpen(false)}>{t("outreach.nc.cancel")}</Button>
              <Button isDisabled={pending} onPress={create}>{pending ? t("outreach.nc.creating") : t("outreach.nc.create")}</Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, RefreshCcw02 } from "@untitledui/icons";
import { launchCampaign, saveCampaign } from "@/app/app/outreach/campaigns/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import { LIMITS, type StepInput } from "@/lib/outreach/campaign";
import { FLOW, edgePath, type FlowGraph, type FlowNode } from "@/lib/outreach/flow";
import { cx } from "@/utils/cx";

const TONE: Record<FlowNode["kind"], string> = {
  start: "border-brand",
  invite: "border-brand",
  message: "border-brand",
  agent: "border-secondary",
  booked: "border-success",
  confirm: "border-success",
};

/**
 * The sequence as the screenshot draws it: a dotted canvas, curved edges with their condition, and a card per step.
 * Clicking a step opens its text below. A draft can be saved or launched from here; once it runs the canvas is read-only.
 */
export function FlowCanvas({ graph, steps, campaignId, name, approvedLeads, canEdit, live }: {
  graph: FlowGraph; steps: StepInput[]; campaignId: string; name: string; approvedLeads: number; canEdit: boolean; live: boolean;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState(0.75);
  const [selected, setSelected] = useState<string | null>(steps.length > 1 ? "message-1" : "start");
  const [draft, setDraft] = useState<StepInput[]>(steps);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const node = graph.nodes.find((n) => n.id === selected) ?? graph.nodes[0];
  const step = node.step;
  const patch = (i: number, p: Partial<StepInput>) => setDraft((d) => d.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const editable = canEdit && live && step !== undefined;

  function save(launch: boolean) {
    if (step === undefined) return;
    start(async () => {
      const saved = await saveCampaign(campaignId, name, draft);
      if (!saved.ok) { setNote(t("outreach.fl.error")); return; }
      if (!launch) { setNote(t("outreach.fl.saved")); return; }
      const launched = await launchCampaign(campaignId);
      if (!launched.ok) { setNote(t("outreach.camp.error.launch_failed")); return; }
      router.push("/app/outreach/campaigns");
      router.refresh();
    });
  }

  const limits = step === 0 ? LIMITS.noteMax : LIMITS.messageMax;

  return (
    <section aria-labelledby="message-flow" className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="message-flow" className="text-lg font-semibold text-primary">{t("outreach.fl.title")}</h2>
          <p className="text-sm text-tertiary">{t("outreach.fl.subtitle")}</p>
        </div>
        {editable && (
          <Button size="sm" isDisabled={pending} onPress={() => save(false)}>{t("outreach.fl.save")}</Button>
        )}
      </div>

      <div className="relative overflow-auto rounded-xl border border-secondary bg-secondary" style={{ maxHeight: 560 }}>
        <div style={{ width: graph.width * zoom, height: graph.height * zoom }}>
          <div
            style={{ width: graph.width, height: graph.height, transform: `scale(${zoom})`, transformOrigin: "top left" }}
            className="relative [background-image:radial-gradient(var(--color-border-secondary)_1px,transparent_1px)] [background-size:16px_16px]"
          >
            <svg width={graph.width} height={graph.height} aria-hidden className="pointer-events-none absolute inset-0">
              {graph.edges.map((edge) => {
                const from = graph.nodes.find((n) => n.id === edge.from);
                const to = graph.nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <path key={edge.id} d={edgePath(from, to)} fill="none" stroke="var(--color-border-secondary)"
                    strokeWidth={1.5} strokeDasharray={edge.tone === "primary" ? "5 5" : undefined} />
                );
              })}
            </svg>

            {graph.edges.map((edge) => {
              const from = graph.nodes.find((n) => n.id === edge.from);
              const to = graph.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              return (
                <span key={`label-${edge.id}`} className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-secondary px-1 text-[10px] text-tertiary"
                  style={{ left: (from.x + to.x) / 2 + FLOW.nodeWidth / 2, top: (from.y + to.y) / 2 + FLOW.nodeHeight / 2 }}>
                  {t(edge.labelKey)}
                </span>
              );
            })}

            {graph.nodes.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}
                className={cx(
                  "absolute flex flex-col gap-1 overflow-hidden rounded-xl border bg-primary p-3 text-left shadow-xs transition",
                  TONE[item.kind], selected === item.id ? "ring-2 ring-brand" : "hover:ring-1 hover:ring-brand",
                )}
                style={{ left: item.x, top: item.y, width: FLOW.nodeWidth, height: FLOW.nodeHeight }}>
                <span className="line-clamp-1 text-xs font-semibold text-primary">{t(item.titleKey, "en", { n: (item.step ?? 0) })}</span>
                <span className="line-clamp-2 text-[11px] leading-4 text-tertiary">
                  {t(item.subtitleKey, "en", { d: item.delayDays ?? 0 })}
                </span>
                {item.kind === "agent" && <span className="mt-auto w-fit rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary">{t("outreach.fl.agent")}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="sticky bottom-3 left-3 flex w-fit flex-col gap-1 rounded-xl border border-secondary bg-primary p-1 shadow-md">
          <button type="button" aria-label={t("outreach.fl.zoomIn")} onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))))}
            className="grid size-7 place-items-center rounded-md text-secondary hover:bg-secondary"><Plus aria-hidden className="size-4" /></button>
          <button type="button" aria-label={t("outreach.fl.zoomOut")} onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
            className="grid size-7 place-items-center rounded-md text-secondary hover:bg-secondary"><Minus aria-hidden className="size-4" /></button>
          <button type="button" aria-label={t("outreach.fl.reset")} onClick={() => setZoom(0.75)}
            className="grid size-7 place-items-center rounded-md text-secondary hover:bg-secondary"><RefreshCcw02 aria-hidden className="size-4" /></button>
        </div>
      </div>

      {step === undefined ? (
        <p className="text-sm text-tertiary">{t("outreach.fl.select")}</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-secondary p-4">
          <h3 className="text-sm font-semibold text-primary">
            {t(step === 0 ? "outreach.fl.editInvite" : "outreach.fl.editStep", "en", { n: step })}
          </h3>
          {step > 0 && (
            <label className="flex w-48 flex-col gap-1.5 text-sm font-medium text-secondary">
              {t("outreach.camp.delay")}
              <input type="number" min={0} max={LIMITS.maxDelayDays} value={draft[step]?.delayDays ?? 0}
                disabled={!editable} onChange={(e) => patch(step, { delayDays: Number(e.target.value) })}
                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary" />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
            {t("outreach.fl.body")}
            <textarea rows={step === 0 ? 3 : 5} value={draft[step]?.body ?? ""} disabled={!editable}
              onChange={(e) => patch(step, { body: e.target.value })}
              className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary" />
          </label>
          <p className={cx("text-xs", (draft[step]?.body.length ?? 0) > limits ? "text-error-primary" : "text-tertiary")}>
            {t("outreach.fl.chars", "en", { n: draft[step]?.body.length ?? 0, max: limits })}
          </p>
        </div>
      )}

      {note && <p role="status" className="text-sm text-secondary">{note}</p>}
      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <Button color="secondary" isDisabled={pending} onPress={() => save(false)}>{t("outreach.fl.save")}</Button>
          <Button isDisabled={pending || approvedLeads === 0} onPress={() => save(true)}>{t("outreach.camp.launch", "en", { n: approvedLeads })}</Button>
          {approvedLeads === 0 && <p className="text-sm text-tertiary">{t("outreach.camp.noApproved")}</p>}
        </div>
      )}
    </section>
  );
}

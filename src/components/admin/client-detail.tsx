"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { formatMoney } from "@/lib/payments-ui/logic";
import { formatBytes } from "@/lib/access/logic";
import { dayOfJourney } from "@/lib/home";
import { t, tDynamic } from "@/lib/i18n";
import { computeFlags } from "@/lib/admin/logic";
import type { AdminClient } from "@/lib/admin/types";
import { FlagBadge } from "./flag-badge";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function ClientDetail({ client, now }: { client: AdminClient; now: string }) {
  const clock = new Date(now);
  const flags = computeFlags(client, clock);
  const [notes, setNotes] = useState(client.notes);
  const [draft, setDraft] = useState("");
  const events = [...client.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/demo/admin" className="inline-flex min-h-10 items-center text-sm text-ink-subtle hover:text-ink">← {t("admin.detail.back")}</Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{client.company}</h1>
          <Badge className="shrink-0">{t(`admin.stage.${client.stage}` as "admin.stage.intake")}</Badge>
        </div>
        <p className="text-ink-muted">{t(`admin.plan.${client.plan}` as "admin.plan.pro")} · {t("admin.day", "en", { day: dayOfJourney(client.startDate, clock) })} · {t("admin.detail.owner", "en", { name: client.owner })}</p>
      </div>

      <Section title={t("admin.detail.blockers")}>
        {flags.length === 0 ? <p className="text-ink-muted">{t("admin.detail.noBlockers")}</p> : <div className="flex flex-wrap gap-2">{flags.map((f) => <FlagBadge key={f.kind} flag={f} />)}</div>}
      </Section>

      <Section title={t("admin.detail.tasks")}>
        <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
          {client.tasks.map((task) => (
            <li key={task.id} className="flex min-h-12 items-center justify-between gap-3 bg-surface-1 px-4 py-3">
              <span>{tDynamic(`task.${task.type}`, "en", task.type)}</span>
              <Badge tone={task.status === "done" ? "success" : "neutral"}>{t(`home.status.${task.status}` as "home.status.todo")}</Badge>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("admin.detail.invoices")}>
        <ul className="space-y-2">
          {client.invoices.map((i) => (
            <li key={i.stage} className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface-1 px-4 py-3">
              <span>{t("admin.detail.invoiceStage", "en", { n: i.stage })} · {formatMoney(i.amountCents, "eur")}</span>
              <Badge tone={i.status === "paid" ? "success" : "neutral"}>{t(`payments.status.${i.status}` as "payments.status.due")}</Badge>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("admin.detail.files")}>
        {client.files.length === 0 ? <p className="text-ink-muted">{t("admin.detail.noFiles")}</p> : (
          <ul className="space-y-2">{client.files.map((f) => <li key={f.name} className="flex justify-between gap-3 rounded-lg border border-hairline bg-surface-1 px-4 py-3"><span className="min-w-0 truncate">{f.name}</span><span className="shrink-0 text-sm text-ink-subtle">{formatBytes(f.size)}</span></li>)}</ul>
        )}
      </Section>

      <Section title={t("admin.detail.timeline")}>
        <p className="text-sm text-ink-subtle">{t("admin.detail.eventsHint")}</p>
        <ol className="space-y-3 border-l border-hairline-strong pl-4">
          {events.map((e, i) => (
            <li key={i} className="space-y-0.5">
              <p>{e.action}</p>
              <p className="text-sm text-ink-subtle">{e.actor} · {fmt(e.at)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t("admin.detail.notes")}>
        {notes.length === 0 && <p className="text-ink-muted">{t("admin.detail.noNotes")}</p>}
        {notes.map((n, i) => <Card key={i} className="space-y-1 p-4"><p>{n.text}</p><p className="text-sm text-ink-subtle">{n.by} · {fmt(n.at)}</p></Card>)}
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setNotes((x) => [...x, { by: client.owner, at: clock.toISOString(), text: draft.trim() }]); setDraft(""); } }}>
          <Textarea aria-label={t("admin.detail.notePlaceholder")} placeholder={t("admin.detail.notePlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" disabled={!draft.trim()}>{t("admin.detail.addNote")}</Button>
        </form>
      </Section>
    </div>
  );
}

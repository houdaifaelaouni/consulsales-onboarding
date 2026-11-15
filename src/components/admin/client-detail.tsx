"use client";

import { useState } from "react";
import { ArrowLeft } from "@untitledui/icons";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatBytes } from "@/lib/access/logic";
import { computeFlags } from "@/lib/admin/logic";
import type { AdminClient, AdminTaskStatus } from "@/lib/admin/types";
import { dayOfJourney } from "@/lib/home";
import { t, tDynamic } from "@/lib/i18n";
import { formatMoney } from "@/lib/payments-ui/logic";
import { FlagBadge } from "./flag-badge";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const TASK_COLOR: Record<AdminTaskStatus, "success" | "brand" | "error" | "gray"> = { done: "success", in_progress: "brand", blocked: "error", todo: "gray" };
const INVOICE_COLOR = { paid: "success", due: "warning", overdue: "error", locked: "gray" } as const;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
      <h2 className="text-md font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function ClientDetail({ client, now, backHref = "/demo/admin" }: { client: AdminClient; now: string; backHref?: string }) {
  const clock = new Date(now);
  const flags = computeFlags(client, clock);
  const [notes, setNotes] = useState(client.notes);
  const [draft, setDraft] = useState("");
  const events = [...client.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4">
        <div><Button href={backHref} color="link-gray" size="sm" iconLeading={ArrowLeft}>{t("admin.detail.back")}</Button></div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-display-sm font-semibold text-primary">{client.company}</h1>
          <Badge size="md" color="brand">{t(`admin.stage.${client.stage}` as "admin.stage.intake")}</Badge>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={client.company}>
        <StatCard label={t("admin.detail.stat.stage")} value={t(`admin.stage.${client.stage}` as "admin.stage.intake")} hint={t(`admin.plan.${client.plan}` as "admin.plan.pro")} />
        <StatCard label={t("admin.detail.stat.day")} value={`${dayOfJourney(client.startDate, clock)} / 30`} progress={{ value: Math.min(dayOfJourney(client.startDate, clock), 30), max: 30 }} />
        <StatCard label={t("admin.detail.stat.owner")} value={client.owner} />
        <StatCard label={t("admin.detail.stat.blockers")} value={String(flags.length)} hint={flags.length === 0 ? t("admin.detail.noBlockers") : undefined} />
      </section>

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-2" role="status" aria-label={t("admin.detail.blockers")}>{flags.map((f) => <FlagBadge key={f.kind} flag={f} />)}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <TableCard.Root>
            <TableCard.Header title={t("admin.detail.tasks")} badge={String(client.tasks.length)} />
            <Table aria-label={t("admin.detail.tasks")} size="sm">
              <Table.Header>
                <Table.Head id="task" isRowHeader label={t("dash.col.task")} />
                <Table.Head id="status" label={t("dash.col.status")} />
              </Table.Header>
              <Table.Body>
                {client.tasks.map((task) => (
                  <Table.Row key={task.id} id={task.id}>
                    <Table.Cell className="font-medium text-primary">{tDynamic(`task.${task.type}`, "en", task.type)}</Table.Cell>
                    <Table.Cell><Badge size="sm" color={TASK_COLOR[task.status]}>{t(`home.status.${task.status}` as "home.status.todo")}</Badge></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </TableCard.Root>

          <TableCard.Root>
            <TableCard.Header title={t("admin.detail.invoices")} badge={String(client.invoices.length)} />
            <Table aria-label={t("admin.detail.invoices")} size="sm">
              <Table.Header>
                <Table.Head id="stage" isRowHeader label={t("admin.col.stage")} />
                <Table.Head id="amount" label={t("admin.detail.invoiceAmount")} />
                <Table.Head id="status" label={t("dash.col.status")} />
              </Table.Header>
              <Table.Body>
                {client.invoices.map((i) => (
                  <Table.Row key={i.stage} id={String(i.stage)}>
                    <Table.Cell className="font-medium text-primary">{t("admin.detail.invoiceStage", "en", { n: i.stage })}</Table.Cell>
                    <Table.Cell>{formatMoney(i.amountCents, "eur")}</Table.Cell>
                    <Table.Cell><Badge size="sm" color={INVOICE_COLOR[i.status]}>{t(`payments.status.${i.status}` as "payments.status.due")}</Badge></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </TableCard.Root>

          <Panel title={t("admin.detail.files")}>
            {client.files.length === 0 ? <p className="text-sm text-tertiary">{t("admin.detail.noFiles")}</p> : (
              <ul className="flex flex-col divide-y divide-secondary">
                {client.files.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-primary">{f.name}</span>
                    <span className="shrink-0 text-tertiary">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title={t("admin.detail.timeline")}>
            <p className="text-sm text-tertiary">{t("admin.detail.eventsHint")}</p>
            {events.length === 0 ? <p className="text-sm text-tertiary">{t("admin.detail.noEvents")}</p> : (
              <ol className="flex flex-col gap-4 border-l border-secondary pl-4">
                {events.map((e, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <p className="text-sm text-primary">{e.action}</p>
                    <p className="text-xs text-tertiary">{e.actor} · {fmt(e.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title={t("admin.detail.notes")}>
            {notes.length === 0 && <p className="text-sm text-tertiary">{t("admin.detail.noNotes")}</p>}
            {notes.map((n, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-lg bg-secondary p-3">
                <p className="text-sm text-primary">{n.text}</p>
                <p className="text-xs text-tertiary">{n.by} · {fmt(n.at)}</p>
              </div>
            ))}
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setNotes((x) => [...x, { by: client.owner, at: clock.toISOString(), text: draft.trim() }]); setDraft(""); } }}>
              <TextArea aria-label={t("admin.detail.notePlaceholder")} placeholder={t("admin.detail.notePlaceholder")} value={draft} onChange={setDraft} rows={3} />
              <div><Button type="submit" size="sm" isDisabled={!draft.trim()}>{t("admin.detail.addNote")}</Button></div>
            </form>
          </Panel>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Table, TableCard } from "@/components/application/table/table";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Select } from "@/components/base/select/select";
import { StatCard } from "@/components/dashboard/stat-card";
import { dayOfJourney } from "@/lib/home";
import { t } from "@/lib/i18n";
import { blockedCount, computeFlags, filterClients, groupByStage, sortForBoard, STAGE_ORDER, uniqueOwners } from "@/lib/admin/logic";
import type { AdminClient } from "@/lib/admin/types";
import { FlagBadge } from "./flag-badge";

export function AdminBoard({ clients, now, clientsBase = "/demo/admin" }: { clients: AdminClient[]; now: string; clientsBase?: string }) {
  const clock = useMemo(() => new Date(now), [now]);
  const [plan, setPlan] = useState("all");
  const [owner, setOwner] = useState("all");
  const [view, setView] = useState("board");

  const shown = useMemo(() => filterClients(clients, { plan, owner }), [clients, plan, owner]);
  const groups = useMemo(() => groupByStage(shown, clock), [shown, clock]);
  const sorted = useMemo(() => sortForBoard(shown, clock), [shown, clock]);
  const blocked = blockedCount(shown, clock);
  const active = shown.filter((c) => c.stage !== "live");
  const avgDay = active.length ? Math.round(active.reduce((n, c) => n + dayOfJourney(c.startDate, clock), 0) / active.length) : 0;

  const planItems = [{ id: "all", label: t("admin.filter.all") }, ...(["starter", "pro", "enterprise"] as const).map((p) => ({ id: p, label: t(`admin.plan.${p}` as "admin.plan.pro") }))];
  const ownerItems = [{ id: "all", label: t("admin.filter.all") }, ...uniqueOwners(clients).map((o) => ({ id: o, label: o }))];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("admin.title")}</h1>
        <p className="text-md text-tertiary">{t("admin.subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("admin.title")}>
        <StatCard label={t("admin.stat.active")} value={String(active.length)} hint={`${shown.length} ${t("admin.title").toLowerCase()}`} />
        <StatCard label={t("admin.stat.attention")} value={String(blocked)} hint={blocked > 0 ? t("admin.stat.attentionHint") : t("admin.allClear")} />
        <StatCard label={t("admin.stat.live")} value={String(shown.filter((c) => c.stage === "live").length)} hint={t("admin.stat.liveHint")} />
        <StatCard label={t("admin.stat.avgDay")} value={String(avgDay)} hint={t("admin.stat.avgDayHint")} />
      </section>

      <Tabs selectedKey={view} onSelectionChange={(k) => setView(String(k))}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Tabs.List type="button-border" size="sm" items={[{ id: "board", label: t("admin.view.board") }, { id: "table", label: t("admin.view.table") }]}>
            {(tab) => <Tabs.Item {...tab} />}
          </Tabs.List>
          <div className="flex gap-3">
            <Select size="sm" label={t("admin.filter.plan")} aria-label={t("admin.filter.plan")} className="w-36" items={planItems} selectedKey={plan} onSelectionChange={(k) => setPlan(String(k))}>
              {(item) => <Select.Item id={item.id} label={item.label} />}
            </Select>
            <Select size="sm" label={t("admin.filter.owner")} aria-label={t("admin.filter.owner")} className="w-36" items={ownerItems} selectedKey={owner} onSelectionChange={(k) => setOwner(String(k))}>
              {(item) => <Select.Item id={item.id} label={item.label} />}
            </Select>
          </div>
        </div>

        <Tabs.Panel id="board" className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {STAGE_ORDER.map((stage) => (
              <section key={stage} aria-labelledby={`col-${stage}`} className="flex flex-col gap-3">
                <h2 id={`col-${stage}`} className="flex items-center justify-between text-sm font-semibold text-secondary">
                  {t(`admin.stage.${stage}` as "admin.stage.intake")}
                  <Badge size="sm" color="gray">{groups[stage].length}</Badge>
                </h2>
                {groups[stage].length === 0 ? (
                  <p className="rounded-xl border border-dashed border-secondary px-4 py-6 text-center text-sm text-tertiary">{t("admin.empty")}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {groups[stage].map((c) => {
                      const flags = computeFlags(c, clock);
                      return (
                        <li key={c.id}>
                          <Link href={`${clientsBase}/${c.id}`} className="flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary transition hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-md font-semibold text-primary">{c.company}</h3>
                              <Badge size="sm" color="gray">{t(`admin.plan.${c.plan}` as "admin.plan.pro")}</Badge>
                            </div>
                            <p className="text-sm text-tertiary">{t("admin.day", "en", { day: Math.min(dayOfJourney(c.startDate, clock), 99) })} · {c.owner}</p>
                            {flags.length > 0 && <div className="flex flex-wrap gap-2">{flags.map((f) => <FlagBadge key={f.kind} flag={f} />)}</div>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="table" className="pt-6">
          <TableCard.Root>
            <TableCard.Header title={t("admin.title")} badge={String(sorted.length)} description={t("admin.subtitle")} />
            <Table aria-label={t("admin.title")} size="sm">
              <Table.Header>
                <Table.Head id="client" isRowHeader label={t("admin.col.client")} />
                <Table.Head id="plan" label={t("admin.col.plan")} className="max-sm:hidden" />
                <Table.Head id="stage" label={t("admin.col.stage")} className="max-md:hidden" />
                <Table.Head id="day" label={t("admin.col.day")} className="max-lg:hidden" />
                <Table.Head id="owner" label={t("admin.col.owner")} className="max-lg:hidden" />
                <Table.Head id="blockers" label={t("admin.col.blockers")} />
              </Table.Header>
              <Table.Body>
                {sorted.map((c) => {
                  const flags = computeFlags(c, clock);
                  return (
                    <Table.Row key={c.id} id={c.id} href={`${clientsBase}/${c.id}`}>
                      <Table.Cell className="font-medium text-primary">{c.company}</Table.Cell>
                      <Table.Cell className="max-sm:hidden">{t(`admin.plan.${c.plan}` as "admin.plan.pro")}</Table.Cell>
                      <Table.Cell className="max-md:hidden">{t(`admin.stage.${c.stage}` as "admin.stage.intake")}</Table.Cell>
                      <Table.Cell className="max-lg:hidden">{dayOfJourney(c.startDate, clock)}</Table.Cell>
                      <Table.Cell className="max-lg:hidden">{c.owner}</Table.Cell>
                      <Table.Cell>{flags.length ? <div className="flex flex-wrap gap-1.5">{flags.map((f) => <FlagBadge key={f.kind} flag={f} />)}</div> : <span className="text-quaternary">—</span>}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </TableCard.Root>
        </Tabs.Panel>
      </Tabs>
    </main>
  );
}

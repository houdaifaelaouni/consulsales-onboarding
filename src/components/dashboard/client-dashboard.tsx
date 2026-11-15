"use client";

import { ArrowRight } from "@untitledui/icons";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { LayerStack } from "@/components/layer-stack";
import { completedStages, dayOfJourney, groupByStage, nextTask, progress, STAGES, type HomeTask, type TaskStatus } from "@/lib/home";
import { t, tDynamic } from "@/lib/i18n";
import { taskHref as hrefFor } from "@/lib/dashboard/sample";
import { Art } from "@/components/illustrations/art";
import { JourneyMap } from "./journey-map";
import { StatCard } from "./stat-card";

const STATUS_COLOR: Record<TaskStatus, "success" | "brand" | "error" | "gray"> = { done: "success", in_progress: "brand", blocked: "error", todo: "gray" };
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "—");

export interface ClientDashboardProps {
  name: string;
  company: string;
  startDate: string;
  now: Date;
  tasks: HomeTask[];
  /** Where a task leads: the finished demo screens, or the live app's task pages. A plain value so a server page can pass it. */
  links: "demo" | "app";
  nextPayment?: { amount: string; due: string };
}

/** The client's overview: where they are, what is next, and the full checklist. Presentational only. */
export function ClientDashboard({ name, company, startDate, now, tasks, links, nextPayment }: ClientDashboardProps) {
  const taskHref = (type: string) => hrefFor(type, links === "demo" ? "/demo" : "/app");
  const day = Math.min(dayOfJourney(startDate, now), 30);
  const { done, total } = progress(tasks);
  const stages = completedStages(tasks);
  const next = nextTask(tasks);
  const groups = groupByStage(tasks);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-brand-secondary">{t("dash.dayOf", "en", { day })} · {company}</p>
          <h1 className="text-display-sm font-semibold text-primary">{t("dash.welcome", "en", { name })}</h1>
          <p className="text-md text-tertiary">{t("dash.subtitle")}</p>
        </div>
        <Art kind={next ? "welcome" : "review"} className="hidden h-24 w-auto sm:block" />
        {next && (
          <Button size="lg" href={taskHref(next.type)} iconTrailing={ArrowRight}>
            {t("dash.continue")}
          </Button>
        )}
      </header>

      <section aria-label={t("dash.journey")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.stat.day")} value={`${day} / 30`} progress={{ value: day, max: 30 }} hint={t("dash.stat.dayHint", "en", { left: Math.max(30 - day, 0) })} />
        <StatCard label={t("dash.stat.tasks")} value={`${done} / ${total}`} progress={{ value: done, max: Math.max(total, 1) }} hint={t("dash.stat.tasksHint", "en", { left: total - done })} />
        <StatCard label={t("dash.stat.stages")} value={`${stages} / 3`} progress={{ value: stages, max: 3 }} />
        {nextPayment ? <StatCard label={t("dash.stat.payment")} value={nextPayment.amount} hint={nextPayment.due} /> : null}
      </section>

      <JourneyMap tasks={tasks} />

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
          <h2 className="text-md font-semibold text-primary">{t("dash.journey")}</h2>
          <div className="flex items-center gap-6">
            <LayerStack completed={stages} />
            <ul className="flex flex-1 flex-col gap-3">
              {STAGES.map((s) => {
                const list = groups[s];
                const stageDone = list.filter((x) => x.status === "done").length;
                return (
                  <li key={s} className="flex flex-col">
                    <span className="text-sm font-medium text-primary">{t(`home.stage.${s}` as "home.stage.1")}</span>
                    <span className="text-xs text-tertiary">{list.length ? t("dash.journey.stageDone", "en", { done: stageDone, total: list.length }) : t("dash.journey.stageEmpty")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary lg:col-span-2">
          <div className="flex flex-col gap-2">
            <h2 className="text-md font-semibold text-primary">{t("dash.next")}</h2>
            {next ? (
              <>
                <p className="text-display-xs font-semibold text-primary">{tDynamic(`task.${next.type}`, "en", next.type)}</p>
                {next.dueAt && <p className="text-sm text-tertiary">{t("dash.next.due", "en", { date: fmtDate(next.dueAt) })}</p>}
              </>
            ) : (
              <p className="text-md text-tertiary">{t("dash.next.none")}</p>
            )}
          </div>
          {next && <div><Button href={taskHref(next.type)} color="secondary" iconTrailing={ArrowRight}>{t("dash.continue")}</Button></div>}
        </div>
      </section>

      <TableCard.Root>
        <TableCard.Header title={t("dash.checklist")} description={t("dash.checklist.desc")} badge={`${done}/${total}`} />
        <Table aria-label={t("dash.checklist")} size="sm">
          <Table.Header>
            <Table.Head id="task" isRowHeader label={t("dash.col.task")} />
            <Table.Head id="stage" label={t("dash.col.stage")} className="max-md:hidden" />
            <Table.Head id="due" label={t("dash.col.due")} className="max-sm:hidden" />
            <Table.Head id="status" label={t("dash.col.status")} />
          </Table.Header>
          <Table.Body>
            {STAGES.flatMap((s) => groups[s].map((task) => (
              <Table.Row key={task.id} id={task.id} href={taskHref(task.type)}>
                <Table.Cell className="font-medium text-primary">{tDynamic(`task.${task.type}`, "en", task.type)}</Table.Cell>
                <Table.Cell className="max-md:hidden">{t(`home.stage.${s}` as "home.stage.1")}</Table.Cell>
                <Table.Cell className="max-sm:hidden">{fmtDate(task.dueAt)}</Table.Cell>
                <Table.Cell>
                  <Badge size="sm" color={STATUS_COLOR[task.status]}>{t(`home.status.${task.status}` as "home.status.todo")}</Badge>
                </Table.Cell>
              </Table.Row>
            )))}
          </Table.Body>
        </Table>
      </TableCard.Root>
    </main>
  );
}

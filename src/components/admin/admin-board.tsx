"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, Select } from "@/components/ui";
import { dayOfJourney } from "@/lib/home";
import { t } from "@/lib/i18n";
import { blockedCount, computeFlags, filterClients, groupByStage, STAGE_ORDER, uniqueOwners } from "@/lib/admin/logic";
import type { AdminClient } from "@/lib/admin/types";
import { FlagBadge } from "./flag-badge";

export function AdminBoard({ clients, now }: { clients: AdminClient[]; now: string }) {
  const clock = useMemo(() => new Date(now), [now]);
  const [plan, setPlan] = useState("all");
  const [owner, setOwner] = useState("all");
  const shown = useMemo(() => filterClients(clients, { plan, owner }), [clients, plan, owner]);
  const groups = useMemo(() => groupByStage(shown, clock), [shown, clock]);
  const blocked = blockedCount(shown, clock);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("admin.title")}</h1>
        <p className="text-ink-muted">{t("admin.subtitle")}</p>
        <p className="text-[13px] font-medium tracking-[0.4px] uppercase" role="status" aria-live="polite">
          {blocked > 0 ? <span className="text-danger">{t("admin.blocked", "en", { n: blocked })}</span> : <span className="text-ink-subtle">{t("admin.allClear")}</span>}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="f-plan" className="text-sm text-ink-subtle">{t("admin.filter.plan")}</label>
        <Select id="f-plan" className="w-auto" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">{t("admin.filter.all")}</option>
          {(["starter", "pro", "enterprise"] as const).map((p) => <option key={p} value={p}>{t(`admin.plan.${p}` as "admin.plan.pro")}</option>)}
        </Select>
        <label htmlFor="f-owner" className="text-sm text-ink-subtle">{t("admin.filter.owner")}</label>
        <Select id="f-owner" className="w-auto" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="all">{t("admin.filter.all")}</option>
          {uniqueOwners(clients).map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {STAGE_ORDER.map((stage) => (
          <section key={stage} aria-labelledby={`col-${stage}`} className="space-y-3">
            <h2 id={`col-${stage}`} className="flex items-center justify-between text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">
              {t(`admin.stage.${stage}` as "admin.stage.intake")}
              <Badge>{groups[stage].length}</Badge>
            </h2>
            {groups[stage].length === 0 ? (
              <EmptyState title={t("admin.empty")} body="" />
            ) : (
              <ul className="space-y-3">
                {groups[stage].map((c) => {
                  const flags = computeFlags(c, clock);
                  return (
                    <li key={c.id}>
                      <Link href={`/demo/admin/${c.id}`} className="block">
                        <Card className="space-y-3 p-4 transition-colors hover:bg-surface-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-medium">{c.company}</h3>
                            <Badge>{t(`admin.plan.${c.plan}` as "admin.plan.pro")}</Badge>
                          </div>
                          <p className="text-sm text-ink-subtle">{t("admin.day", "en", { day: Math.min(dayOfJourney(c.startDate, clock), 99) })} · {c.owner}</p>
                          {flags.length > 0 && <div className="flex flex-wrap gap-2">{flags.map((f) => <FlagBadge key={f.kind} flag={f} />)}</div>}
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

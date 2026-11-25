"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, SearchLg } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { PlatformDot } from "@/components/outreach/platform-pills";
import { t } from "@/lib/i18n";
import { LEADS_PER_PAGE, splitName, type LeadRow, type LeadStatus } from "@/lib/outreach/workspace";
import { cx } from "@/utils/cx";

type ColumnKey = "first" | "last" | "email" | "phone" | "company" | "title" | "domain" | "location";

const COLUMNS: Array<{ key: ColumnKey; label: Parameters<typeof t>[0] }> = [
  { key: "first", label: "outreach.lt.first" },
  { key: "last", label: "outreach.lt.last" },
  { key: "email", label: "outreach.lt.email" },
  { key: "phone", label: "outreach.lt.phone" },
  { key: "company", label: "outreach.lt.company" },
  { key: "title", label: "outreach.lt.titleColumn" },
  { key: "domain", label: "outreach.lt.domain" },
  { key: "location", label: "outreach.lt.location" },
];

const STATUS_TONE: Record<LeadStatus, "gray" | "success" | "error"> = { new: "gray", approved: "success", rejected: "error" };
const STATUS_LABEL: Record<LeadStatus, Parameters<typeof t>[0]> = { new: "outreach.leads.f.new", approved: "outreach.leads.f.approved", rejected: "outreach.leads.f.rejected" };
const FILTERS: Array<LeadStatus | "all"> = ["all", "new", "approved", "rejected"];

/**
 * The campaign's lead table. Search and the column picker work on the rows on screen; the status filter and the paging
 * go back to the server, so a campaign with thousands of leads never loads all of them.
 */
export function LeadsTable({ rows, total, page, pages, status, base, id }: {
  rows: LeadRow[]; total: number; page: number; pages: number; status: LeadStatus | "all"; base: string; id: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<ColumnKey[]>([]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.fullName, r.email, r.company, r.title, r.domain, r.location].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const visible = (key: ColumnKey) => !hidden.includes(key);
  const href = (nextStatus: LeadStatus | "all", nextPage = 1) => `${base}/${id}/leads?status=${nextStatus}&page=${nextPage}`;

  function goStatus(next: string) {
    router.push(href(next as LeadStatus | "all"));
  }

  return (
    <section aria-labelledby="campaign-leads" className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
      <div className="flex flex-col gap-1">
        <h2 id="campaign-leads" className="text-lg font-semibold text-primary">{t("outreach.lt.title")}</h2>
        <p className="text-sm text-tertiary">{t("outreach.lt.subtitle", "en", { n: new Intl.NumberFormat("en-US").format(total) })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-tertiary">
          <span className="sr-only">{t("outreach.leads.filter")}</span>
          <select
            value={status}
            onChange={(e) => goStatus(e.target.value)}
            className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>{f === "all" ? t("outreach.lt.status.all") : t(STATUS_LABEL[f])}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2 text-sm text-tertiary">
          <span>{t("outreach.lt.count", "en", { n: new Intl.NumberFormat("en-US").format(total) })}</span>
          <Link href={href(status, Math.max(1, page - 1))} aria-disabled={page <= 1} aria-label={t("outreach.leads.prev")}
            className={cx("grid size-8 place-items-center rounded-lg border border-secondary", page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-secondary")}>
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
          <span className="tabular-nums">{t("outreach.lt.page", "en", { n: page, of: pages })}</span>
          <Link href={href(status, Math.min(pages, page + 1))} aria-disabled={page >= pages} aria-label={t("outreach.leads.next")}
            className={cx("grid size-8 place-items-center rounded-lg border border-secondary", page >= pages ? "pointer-events-none opacity-40" : "hover:bg-secondary")}>
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-48 flex-1 items-center">
          <SearchLg aria-hidden className="pointer-events-none absolute left-3 size-4 text-quaternary" />
          <span className="sr-only">{t("outreach.lt.search")}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("outreach.lt.search")}
            className="w-full rounded-lg border border-secondary bg-primary py-2 pl-9 pr-3 text-sm text-primary placeholder:text-quaternary" />
        </label>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary">
            {t("outreach.lt.columns")}
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-1 rounded-xl border border-secondary bg-primary p-2 shadow-lg">
            {COLUMNS.map((col) => (
              <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-secondary hover:bg-secondary">
                <input type="checkbox" checked={visible(col.key)} onChange={() => setHidden((h) => (h.includes(col.key) ? h.filter((k) => k !== col.key) : [...h, col.key]))} />
                {t(col.label)}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="overflow-x-auto rounded-xl border border-secondary">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-secondary">
            <tr className="text-xs font-medium uppercase tracking-wide text-tertiary">
              <th scope="col" className="px-3 py-2">#</th>
              {COLUMNS.filter((c) => visible(c.key)).map((c) => (
                <th key={c.key} scope="col" className={cx("px-3 py-2", (c.key === "phone" || c.key === "domain" || c.key === "location") && "hidden lg:table-cell")}>{t(c.label)}</th>
              ))}
              <th scope="col" className="px-3 py-2 text-right">{t("outreach.lt.status")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-tertiary">{t("outreach.lt.empty")}</td></tr>
            ) : shown.map((lead, i) => {
              const name = splitName(lead.fullName);
              return (
                <tr key={lead.id} className="border-t border-secondary">
                  <td className="px-3 py-3 text-tertiary">{new Intl.NumberFormat("en-US").format((page - 1) * LEADS_PER_PAGE + i + 1)}</td>
                  {visible("first") && (
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 font-medium text-primary">
                        <PlatformDot channel={lead.platform} />
                        {name.first || "—"}
                      </span>
                    </td>
                  )}
                  {visible("last") && <td className="px-3 py-3 text-secondary">{name.last || "—"}</td>}
                  {visible("email") && <td className="px-3 py-3 text-secondary">{lead.email ?? "—"}</td>}
                  {visible("phone") && <td className="hidden px-3 py-3 text-secondary lg:table-cell">{lead.phone ?? "—"}</td>}
                  {visible("company") && <td className="px-3 py-3 text-secondary">{lead.company ?? "—"}</td>}
                  {visible("title") && <td className="max-w-64 truncate px-3 py-3 text-secondary" title={lead.title ?? undefined}>{lead.title ?? "—"}</td>}
                  {visible("domain") && <td className="hidden px-3 py-3 text-secondary lg:table-cell">{lead.domain ?? "—"}</td>}
                  {visible("location") && <td className="hidden px-3 py-3 text-secondary lg:table-cell">{lead.location ?? "—"}</td>}
                  <td className="px-3 py-3 text-right"><Badge size="sm" color={STATUS_TONE[lead.status]}>{t(STATUS_LABEL[lead.status])}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-tertiary">{t("outreach.lt.perPage", "en", { n: LEADS_PER_PAGE })}</p>
    </section>
  );
}

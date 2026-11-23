import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/base/badges/badges";
import { StatCard } from "@/components/dashboard/stat-card";
import { ApproveAllButton, LeadRowActions } from "@/components/outreach/lead-actions";
import { LeadsUpload } from "@/components/outreach/leads-upload";
import { OutreachTabs } from "@/components/outreach/tabs";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { cx } from "@/utils/cx";

export const dynamic = "force-dynamic";
const PAGE = 50;
const FILTERS = ["all", "new", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_KEY = { all: "outreach.leads.f.all", new: "outreach.leads.f.new", approved: "outreach.leads.f.approved", rejected: "outreach.leads.f.rejected" } as const;
const COLOR = { new: "gray", approved: "success", rejected: "error" } as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;
  const canEdit = m?.[0]?.role === "client_owner";

  const count = async (status?: string) => {
    let q = supabase.from("outreach_lead").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
    if (status) q = q.eq("status", status);
    const { count: c } = await q;
    return c ?? 0;
  };
  let list = supabase.from("outreach_lead").select("id,full_name,title,company,status").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (filter !== "all") list = list.eq("status", filter);
  const [{ data: rows, error }, nNew, nApproved, nRejected] = await Promise.all([list, count("new"), count("approved"), count("rejected")]);
  if (error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const total = filter === "all" ? nNew + nApproved + nRejected : filter === "new" ? nNew : filter === "approved" ? nApproved : nRejected;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (f: Filter, p = 1) => `/app/outreach/leads?status=${f}&page=${p}`;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-sm font-semibold text-primary">{t("outreach.leads.title")}</h1>
          <p className="text-md text-tertiary">{t("outreach.leads.subtitle")}</p>
        </div>
        <OutreachTabs current="leads" />
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("outreach.leads.title")}>
        <StatCard label={t("outreach.leads.f.approved")} value={String(nApproved)} hint={t("outreach.leads.onlyApproved")} />
        <StatCard label={t("outreach.leads.f.new")} value={String(nNew)} />
        <StatCard label={t("outreach.leads.f.rejected")} value={String(nRejected)} />
      </section>

      <LeadsUpload canEdit={canEdit} />

      <section aria-labelledby="leads-list" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="leads-list" className="text-lg font-semibold text-primary">{t("outreach.leads.list")}</h2>
          <ApproveAllButton count={nNew} canEdit={canEdit} />
        </div>
        <nav aria-label={t("outreach.leads.filter")} className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link key={f} href={href(f)} aria-current={f === filter ? "true" : undefined}
              className={cx("rounded-lg px-3 py-1 text-sm ring-1", f === filter ? "bg-secondary font-semibold text-primary ring-brand" : "text-secondary ring-secondary")}>{t(FILTER_KEY[f])}</Link>
          ))}
        </nav>
        {(rows ?? []).length === 0 ? (
          <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary">{t(total === 0 && filter === "all" ? "outreach.leads.none" : "outreach.leads.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(rows ?? []).map((l) => (
              <li key={l.id as string} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary p-4 ring-1 ring-secondary">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-primary">{l.full_name as string}</span>
                  <span className="truncate text-sm text-tertiary">{[l.title, l.company].filter(Boolean).join(", ") || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" color={COLOR[l.status as keyof typeof COLOR]}>{t(FILTER_KEY[l.status as Exclude<Filter, "all">])}</Badge>
                  <LeadRowActions id={l.id as string} status={l.status as "new" | "approved" | "rejected"} canEdit={canEdit} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-2 text-sm text-secondary">
            {page > 1 ? <Link href={href(filter, page - 1)} className="underline">{t("outreach.leads.prev")}</Link> : <span />}
            <span>{t("outreach.leads.page", "en", { n: page, of: pages })}</span>
            {page < pages ? <Link href={href(filter, page + 1)} className="underline">{t("outreach.leads.next")}</Link> : <span />}
          </div>
        )}
      </section>
    </main>
  );
}

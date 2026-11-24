import { redirect } from "next/navigation";
import { LeadsTable } from "@/components/outreach/campaign/leads-table";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { LEADS_PER_PAGE, type Channel, type LeadRow, type LeadStatus } from "@/lib/outreach/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES: Array<LeadStatus | "all"> = ["all", "new", "approved", "rejected"];

interface EnrollmentRow {
  lead: {
    id: string; full_name: string; email: string | null; phone: string | null; company: string | null;
    title: string | null; company_domain: string | null; location: string | null; status: string; platform: string;
  } | null;
}

export default async function CampaignLeadsPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const status: LeadStatus | "all" = STATUSES.includes((sp.status ?? "all") as LeadStatus) ? ((sp.status ?? "all") as LeadStatus) : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  let query = supabase
    .from("outreach_enrollment")
    .select("lead:outreach_lead!inner(id,full_name,email,phone,company,title,company_domain,location,status,platform)", { count: "exact" })
    .eq("workspace_id", workspaceId).eq("campaign_id", id);
  if (status !== "all") query = query.eq("lead.status", status);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * LEADS_PER_PAGE, page * LEADS_PER_PAGE - 1);
  if (error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const rows: LeadRow[] = ((data ?? []) as unknown as EnrollmentRow[]).flatMap((row) => (row.lead ? [{
    id: row.lead.id, fullName: row.lead.full_name, email: row.lead.email, phone: row.lead.phone,
    company: row.lead.company, title: row.lead.title, domain: row.lead.company_domain, location: row.lead.location,
    status: row.lead.status as LeadStatus, platform: (row.lead.platform as Channel) ?? "linkedin",
  }] : []));

  const total = count ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / LEADS_PER_PAGE));

  return <LeadsTable rows={rows} total={total} page={Math.min(page, pages)} pages={pages} status={status} base="/app/outreach/campaigns" id={id} />;
}

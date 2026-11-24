import { LeadsTable } from "@/components/outreach/campaign/leads-table";
import { DEMO_LEADS } from "@/lib/outreach/sample";
import type { LeadStatus } from "@/lib/outreach/workspace";

export default async function DemoCampaignLeads({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const filter = (["all", "new", "approved", "rejected"] as const).includes((status ?? "all") as LeadStatus)
    ? ((status ?? "all") as LeadStatus | "all") : "all";
  const rows = filter === "all" ? DEMO_LEADS : DEMO_LEADS.filter((lead) => lead.status === filter);

  return (
    <LeadsTable rows={rows} total={rows.length} page={1} pages={1} status={filter} base="/demo/outreach/campaigns" id={id} />
  );
}

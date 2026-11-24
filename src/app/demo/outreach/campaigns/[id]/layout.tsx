import { notFound } from "next/navigation";
import { CampaignHeader } from "@/components/outreach/campaign/campaign-header";
import { DEMO_CAMPAIGNS } from "@/lib/outreach/sample";

export const metadata = { title: "Campaign demo" };

export default async function DemoCampaignLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === id);
  if (!campaign) notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <CampaignHeader
        id={campaign.id} name={campaign.name} status={campaign.status} base="/demo/outreach/campaigns"
        channelsHref="/demo/outreach" canEdit live={false}
      />
      {children}
    </main>
  );
}

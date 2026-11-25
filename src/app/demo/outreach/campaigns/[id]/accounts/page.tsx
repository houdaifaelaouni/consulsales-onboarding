import { CampaignAccounts } from "@/components/outreach/campaign/campaign-accounts";
import { DEMO_PROFILES } from "@/lib/outreach/sample";

export default async function DemoCampaignAccounts({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CampaignAccounts
      campaignId={id} profiles={DEMO_PROFILES} selected={[]} perDay={20} campaigns={1}
      live={false} canEdit={false} profilesHref="/demo/outreach"
    />
  );
}

import { FlowCanvas } from "@/components/outreach/campaign/flow-canvas";
import { buildFlow } from "@/lib/outreach/flow";
import { DEMO_CAMPAIGN_NAME, DEMO_STEPS } from "@/lib/outreach/sample";

export default function DemoCampaignBuild() {
  return (
    <FlowCanvas
      graph={buildFlow(DEMO_STEPS)} steps={DEMO_STEPS} campaignId="sample-campaign" name={DEMO_CAMPAIGN_NAME}
      approvedLeads={0} canEdit={false} live={false}
    />
  );
}

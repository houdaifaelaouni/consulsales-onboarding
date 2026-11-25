import { AnalyticsGrid } from "@/components/outreach/campaign/analytics-grid";
import { QueueStatus } from "@/components/outreach/campaign/queue-status";
import { queueStatus } from "@/lib/outreach/analytics";
import { DEMO_COUNTS, DEMO_QUEUE } from "@/lib/outreach/sample";

export default function DemoCampaignOverview() {
  return (
    <div className="flex flex-col gap-4">
      <AnalyticsGrid counts={DEMO_COUNTS} channel="linkedin" />
      <QueueStatus queue={queueStatus(DEMO_QUEUE)} live={false} />
    </div>
  );
}

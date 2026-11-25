import { TestMode } from "@/components/outreach/campaign/test-mode";
import { DEMO_STEPS } from "@/lib/outreach/sample";

export default function DemoCampaignTest() {
  return <TestMode steps={DEMO_STEPS} />;
}

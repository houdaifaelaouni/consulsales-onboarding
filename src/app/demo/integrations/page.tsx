import { IntegrationsBoard } from "@/components/integrations/integrations-board";
import { envStatus } from "@/lib/integrations/config";

// Public preview with made-up statuses. It must never read the real environment.
const SAMPLE = envStatus({
  NEXT_PUBLIC_APP_URL: "https://app.example.com", NEXT_PUBLIC_SUPABASE_URL: "https://sample.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sample",
  SUPABASE_SERVICE_ROLE_KEY: "sample", WHOP_ACCOUNT_ID: "biz_sample", RESEND_API_KEY: "sample", EMAIL_FROM: "ConsulSales <hello@example.com>", HUBSPOT_CLIENT_ID: "sample",
});

export default function DemoIntegrations() {
  return <IntegrationsBoard status={SAMPLE} appUrl="https://app.example.com" preview />;
}

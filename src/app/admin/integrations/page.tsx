import { IntegrationsBoard } from "@/components/integrations/integrations-board";
import { envStatus } from "@/lib/integrations/config";
import { hasVercelToken } from "@/lib/integrations/vercel";

// Read on every request so Re-check shows the live state. Only true/false flags reach the page, never values.
export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  // Until the public address is saved, show the address this deployment really has, so webhook addresses are copyable now.
  const live = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
  return <IntegrationsBoard status={envStatus(process.env)} appUrl={process.env.NEXT_PUBLIC_APP_URL || live} canSave={hasVercelToken(process.env)} />;
}

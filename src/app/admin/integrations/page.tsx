import { IntegrationsBoard } from "@/components/integrations/integrations-board";
import { envStatus } from "@/lib/integrations/config";

// Read on every request so Re-check shows the live state. Only true/false flags reach the page, never values.
export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return <IntegrationsBoard status={envStatus(process.env)} appUrl={process.env.NEXT_PUBLIC_APP_URL} />;
}

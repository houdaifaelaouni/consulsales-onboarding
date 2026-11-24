import { notFound, redirect } from "next/navigation";
import { CampaignHeader } from "@/components/outreach/campaign/campaign-header";
import type { CampaignStatus } from "@/lib/outreach/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CampaignLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) redirect("/app");

  const { data: campaign } = await supabase
    .from("outreach_campaign").select("id,name,status").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  if (!campaign) notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <CampaignHeader
        id={campaign.id as string} name={campaign.name as string} status={campaign.status as CampaignStatus}
        base="/app/outreach/campaigns" channelsHref="/app/outreach" addLeadsHref="/app/outreach/leads"
        canEdit={m?.[0]?.role === "client_owner"} live
      />
      {children}
    </main>
  );
}

import { redirect } from "next/navigation";
import { KickoffBooking } from "@/components/booking/kickoff-booking";
import { Notice } from "@/components/shell/notice";
import { getViewer } from "@/lib/auth/viewer";
import { resolveBookingLink } from "@/lib/booking/bazooka";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientBooking() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.from("membership").select("workspace_id").eq("user_id", viewer.id).limit(1);
  const workspaceId = data?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("booking.title")}</h1>
        <p className="text-md text-tertiary">{t("booking.live.subtitle")}</p>
      </header>
      <KickoffBooking link={resolveBookingLink(process.env.NEXT_PUBLIC_BAZOOKA_BOOKING_LINK)} workspaceId={workspaceId} name={viewer.name ?? ""} email={viewer.email} />
    </main>
  );
}

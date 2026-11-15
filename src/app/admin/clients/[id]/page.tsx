import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/admin/client-detail";
import { BillingControls } from "@/components/admin/billing-controls";
import { DeliveryPanel } from "@/components/review/delivery-panel";
import { billingRows } from "@/lib/admin/billing";
import { getViewer } from "@/lib/auth/viewer";
import { isPlanKey } from "@/lib/plans";
import { loadAdminClients } from "@/lib/admin/load";
import { loadDeliverables } from "@/lib/review/load";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A malformed id would make the query error; treat it as not found.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [client] = await loadAdminClients(id);
  if (!client) notFound();

  // Change notes live on the deliverable row, so they are read separately.
  const supabase = await createClient();
  const [items, rows, wsRes, invRes, admin] = await Promise.all([
    loadDeliverables(undefined, id),
    supabase.from("deliverable").select("id,change_note").eq("workspace_id", id),
    supabase.from("workspace").select("plan,stage_price_cents,trial_until").eq("id", id).single(),
    supabase.from("invoice").select("stage,paid_at,waived,charge_attempted_at,charge_error").eq("workspace_id", id),
    getViewer(),
  ]);
  const ws = wsRes.data;
  const isAdminViewer = admin?.isAdmin === true; // delivery leads see the page but not the money controls
  const changeNotes = Object.fromEntries((rows.data ?? []).filter((r) => r.change_note).map((r) => [r.id, r.change_note as string]));

  return (
    <>
      <ClientDetail client={client} now={new Date().toISOString()} backHref="/admin" />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-12 lg:px-8">
        {isAdminViewer && ws && isPlanKey(ws.plan) && (
          <BillingControls
            workspaceId={id} trialUntil={(ws.trial_until as string | null) ?? null}
            rows={billingRows(ws.plan, (ws.stage_price_cents as Array<number | null> | null) ?? null, invRes.data ?? [])}
          />
        )}
        <DeliveryPanel workspaceId={id} items={items} changeNotes={changeNotes} />
      </div>
    </>
  );
}

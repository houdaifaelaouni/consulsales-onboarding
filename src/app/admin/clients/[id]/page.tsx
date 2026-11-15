import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/admin/client-detail";
import { DeliveryPanel } from "@/components/review/delivery-panel";
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
  const [items, rows] = await Promise.all([
    loadDeliverables(undefined, id),
    supabase.from("deliverable").select("id,change_note").eq("workspace_id", id),
  ]);
  const changeNotes = Object.fromEntries((rows.data ?? []).filter((r) => r.change_note).map((r) => [r.id, r.change_note as string]));

  return (
    <>
      <ClientDetail client={client} now={new Date().toISOString()} backHref="/admin" />
      <div className="mx-auto max-w-7xl px-4 pb-12 lg:px-8"><DeliveryPanel workspaceId={id} items={items} changeNotes={changeNotes} /></div>
    </>
  );
}

import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/admin/client-detail";
import { loadAdminClients } from "@/lib/admin/load";

export const dynamic = "force-dynamic";

export default async function AdminClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A malformed id would make the query error; treat it as not found.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [client] = await loadAdminClients(id);
  if (!client) notFound();
  return <ClientDetail client={client} now={new Date().toISOString()} backHref="/admin" />;
}

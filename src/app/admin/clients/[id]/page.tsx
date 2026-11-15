import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/admin/client-detail";
import { PreviewNote } from "@/components/shell/preview-note";
import { ADMIN_NOW, findClient } from "@/lib/admin/sample";

export default async function AdminClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = findClient(id);
  if (!client) notFound();
  return (<><PreviewNote /><ClientDetail client={client} now={ADMIN_NOW} backHref="/admin" /></>);
}

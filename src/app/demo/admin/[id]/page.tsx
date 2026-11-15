import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/admin/client-detail";
import { ADMIN_NOW, SAMPLE_CLIENTS, findClient } from "@/lib/admin/sample";

export function generateStaticParams() {
  return SAMPLE_CLIENTS.map((c) => ({ id: c.id }));
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = findClient(id);
  if (!client) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <ClientDetail client={client} now={ADMIN_NOW} />
    </main>
  );
}

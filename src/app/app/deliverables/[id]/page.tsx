import { notFound } from "next/navigation";
import { DbDeliverable } from "@/components/review/db-deliverable";
import { getViewer } from "@/lib/auth/viewer";
import { loadDeliverables } from "@/lib/review/load";
import type { Role } from "@/lib/review/types";

export const dynamic = "force-dynamic";

export default async function ClientDeliverable({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [[d], viewer] = await Promise.all([loadDeliverables(id), getViewer()]);
  if (!d) notFound();
  // The database enforces who may decide; this only shapes the buttons.
  const role: Role = viewer?.roles.includes("client_owner") ? "client_owner" : viewer?.isAdmin ? "admin" : "delivery_lead";
  return <main className="mx-auto max-w-xl px-4 py-8 sm:py-12"><DbDeliverable deliverable={d} role={role} backHref="/app/deliverables" /></main>;
}

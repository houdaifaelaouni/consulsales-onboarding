import { notFound } from "next/navigation";
import { DeliverableReview } from "@/components/review/deliverable-review";
import { PreviewNote } from "@/components/shell/preview-note";
import { findSample } from "@/lib/review/sample";

export default async function ClientDeliverable({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = findSample(id);
  if (!d) notFound();
  return (<><PreviewNote /><main className="mx-auto max-w-xl px-4 py-8 sm:py-12"><DeliverableReview deliverable={d} backHref="/app/deliverables" /></main></>);
}

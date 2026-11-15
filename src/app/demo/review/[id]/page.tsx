import { notFound } from "next/navigation";
import { DeliverableReview } from "@/components/review/deliverable-review";
import { SAMPLE_DELIVERABLES, findSample } from "@/lib/review/sample";

export function generateStaticParams() {
  return SAMPLE_DELIVERABLES.map((d) => ({ id: d.id }));
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = findSample(id);
  if (!d) notFound();
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <DeliverableReview deliverable={d} />
    </main>
  );
}

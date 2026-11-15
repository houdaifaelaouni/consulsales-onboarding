import { DeliverableList } from "@/components/review/deliverable-list";
import { SAMPLE_DELIVERABLES } from "@/lib/review/sample";

export default function ReviewList() {
  return <DeliverableList items={SAMPLE_DELIVERABLES} base="/demo/review" />;
}

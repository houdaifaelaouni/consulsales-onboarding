import { DeliverableList } from "@/components/review/deliverable-list";
import { PreviewNote } from "@/components/shell/preview-note";
import { SAMPLE_DELIVERABLES } from "@/lib/review/sample";

// TODO(backend): list this workspace's deliverables through RLS.
export default function ClientDeliverables() {
  return (<><PreviewNote /><DeliverableList items={SAMPLE_DELIVERABLES} base="/app/deliverables" /></>);
}

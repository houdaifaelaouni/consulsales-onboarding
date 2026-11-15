"use client";

import { decideDeliverable } from "@/app/app/deliverables/actions";
import type { Deliverable, Role } from "@/lib/review/types";
import { DeliverableReview } from "./deliverable-review";

export function DbDeliverable({ deliverable, role, backHref }: { deliverable: Deliverable; role: Role; backHref: string }) {
  return (
    <DeliverableReview
      deliverable={deliverable} role={role} backHref={backHref}
      onDecide={async (decision, note, versionN) => {
        const r = await decideDeliverable(deliverable.id, decision, note ?? null, versionN ?? null);
        if (!r.ok && r.reason === "stale") return "stale";
        return r.ok;
      }}
    />
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import type { Deliverable, Role } from "@/lib/review/types";
import { DeliverableReview } from "./deliverable-review";

export function DbDeliverable({ deliverable, role, backHref }: { deliverable: Deliverable; role: Role; backHref: string }) {
  const supabase = createClient();
  return (
    <DeliverableReview
      deliverable={deliverable} role={role} backHref={backHref}
      onDecide={async (decision, note) => {
        const { error } = await supabase.rpc("deliverable_decide", { p_id: deliverable.id, p_decision: decision, p_note: note ?? null });
        return !error;
      }}
    />
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { stateToRow } from "@/lib/access/rows";
import type { AccessStates } from "@/lib/access/logic";
import { AccessBoard } from "./access-board";

export function DbAccess({ workspaceId, initial }: { workspaceId: string; initial: AccessStates }) {
  const supabase = createClient();
  return (
    <AccessBoard
      initial={initial}
      onChange={(id, state) => {
        // Best effort: a failed save leaves the on-screen state, and the next change retries.
        void supabase.from("access_item").upsert(stateToRow(workspaceId, id, state), { onConflict: "workspace_id,item_id" });
      }}
    />
  );
}

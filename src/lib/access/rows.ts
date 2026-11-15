import { ACCESS_ITEMS, type AccessStatus } from "./items";
import type { AccessStates } from "./logic";

export interface AccessRow { item_id: string; status: string; blocked_since: string | null; detail: string | null }

const STATUSES: AccessStatus[] = ["connected", "pending", "blocked"];
const KNOWN = new Set(ACCESS_ITEMS.map((i) => i.id));

export function rowsToStates(rows: ReadonlyArray<AccessRow>): AccessStates {
  const out: AccessStates = {};
  for (const r of rows) {
    if (!KNOWN.has(r.item_id) || !STATUSES.includes(r.status as AccessStatus)) continue;
    out[r.item_id] = {
      status: r.status as AccessStatus,
      ...(r.blocked_since ? { blockedSince: r.blocked_since } : {}),
      ...(r.detail ? { detail: r.detail } : {}),
    };
  }
  return out;
}

/** The row to save. blocked_since is left to the database so a client clock cannot move it. */
export function stateToRow(workspaceId: string, itemId: string, state: { status: AccessStatus; detail?: string }) {
  return { workspace_id: workspaceId, item_id: itemId, status: state.status, detail: state.detail ? state.detail.slice(0, 500) : null };
}

/** Oldest block start among rows, for the admin flag. */
export function oldestBlock(rows: ReadonlyArray<Pick<AccessRow, "status" | "blocked_since">>): string | undefined {
  return rows.filter((r) => r.status === "blocked" && r.blocked_since).map((r) => r.blocked_since as string).sort()[0];
}

import type { DeliverableStatus, Role } from "./types";

const TRANSITIONS: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ["in_review"],
  in_review: ["changes_requested", "approved"],
  changes_requested: ["in_review"],
  approved: [], // approved versions are immutable
};

export function canTransition(from: DeliverableStatus, to: DeliverableStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const isLocked = (s: DeliverableStatus): boolean => s === "approved";
export const canComment = (s: DeliverableStatus): boolean => s !== "approved" && s !== "draft";

/** Only the client owner approves. Admins can override in emergencies; that is always logged and visible. */
export function canApprove(s: DeliverableStatus, role: Role): { allowed: boolean; override: boolean } {
  if (s !== "in_review") return { allowed: false, override: false };
  if (role === "client_owner") return { allowed: true, override: false };
  if (role === "admin") return { allowed: true, override: true };
  return { allowed: false, override: false };
}

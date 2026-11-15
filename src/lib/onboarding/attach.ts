export type AttachPlan = "create" | "use" | "replace";

/**
 * What to do when a payment arrives for an email address.
 * - no account yet: create one
 * - a confirmed account: the person proved they own the address, so attach the workspace to it
 * - an unconfirmed account: nobody proved anything, so it is replaced, never trusted
 */
export function planAttach(existing: { confirmed: boolean } | null): AttachPlan {
  if (!existing) return "create";
  return existing.confirmed ? "use" : "replace";
}

import type { DeliverableKind, DeliverableStatus, Profile } from "./types";

export const KINDS: DeliverableKind[] = ["icp", "positioning", "profile", "dm_sequence", "post"];

/** Next version number: always one above the highest, so versions are never reused. */
export function nextVersionN(existing: number[]): number {
  return existing.length ? Math.max(...existing) + 1 : 1;
}

/** The team can add a version only before approval and while the client is not mid-review. */
export const canAddVersion = (s: DeliverableStatus): boolean => s === "draft" || s === "changes_requested";
export const canSend = (s: DeliverableStatus, versionCount: number): boolean => canAddVersion(s) && versionCount > 0;

export interface DraftInput { kind: DeliverableKind; title?: string; content: string; profile: Profile }

/** Returns an i18n key for the first problem, or null when the draft can be saved. */
export function validateDraft(d: DraftInput, needsTitle: boolean): "delivery.needTitle" | "delivery.needContent" | null {
  if (needsTitle && !d.title?.trim()) return "delivery.needTitle";
  const has = d.kind === "profile" ? Object.values(d.profile).some((v) => v.trim()) : !!d.content.trim();
  return has ? null : "delivery.needContent";
}

/** Profile versions keep their text in the structured profile; other kinds keep it in content. */
export function versionPayload(d: DraftInput): { content: string; profile: Profile | null } {
  return d.kind === "profile" ? { content: "", profile: d.profile } : { content: d.content.trim(), profile: null };
}

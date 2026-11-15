import type { Deliverable, DeliverableKind, DeliverableStatus, Version } from "./types";

export interface DeliverableRow {
  id: string; kind: string; title: string; status: string; unlocks: string | null;
  approved_by: string | null; approved_at: string | null; approved_version: number | null;
}
export interface VersionRow { deliverable_id: string; n: number; content: string; profile: unknown; created_by: string | null; created_at: string }

const KINDS: DeliverableKind[] = ["icp", "positioning", "profile", "dm_sequence", "post"];
const STATUSES: DeliverableStatus[] = ["draft", "in_review", "changes_requested", "approved"];

function toProfile(p: unknown): Version["profile"] {
  if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
  const o = p as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return { name: s("name"), headline: s("headline"), about: s("about"), banner: s("banner") };
}

/** Builds review screens' deliverables from rows. Comment threads have no table yet, so they start empty. */
export function toDeliverables(rows: DeliverableRow[], versions: VersionRow[], people: Map<string, string> = new Map()): Deliverable[] {
  return rows
    .filter((r) => KINDS.includes(r.kind as DeliverableKind) && STATUSES.includes(r.status as DeliverableStatus))
    .map((r) => {
      const vs: Version[] = versions.filter((v) => v.deliverable_id === r.id).sort((a, b) => a.n - b.n)
        .map((v) => ({ n: v.n, createdAt: v.created_at, createdBy: (v.created_by && people.get(v.created_by)) || "Delivery team", content: v.content, profile: toProfile(v.profile) }));
      return {
        id: r.id, kind: r.kind as DeliverableKind, title: r.title, status: r.status as DeliverableStatus,
        versions: vs, threads: [], ...(r.unlocks ? { unlocks: r.unlocks } : {}),
        ...(r.status === "approved" && r.approved_at && r.approved_version
          ? { approved: { by: (r.approved_by && people.get(r.approved_by)) || "Client", at: r.approved_at, versionN: r.approved_version } } : {}),
      };
    })
    // A deliverable with no version has nothing to show yet.
    .filter((d) => d.versions.length > 0);
}

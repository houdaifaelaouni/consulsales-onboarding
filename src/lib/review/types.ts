export type DeliverableKind = "icp" | "positioning" | "profile" | "dm_sequence" | "post";
export type DeliverableStatus = "draft" | "in_review" | "changes_requested" | "approved";
export type Role = "client_owner" | "delivery_lead" | "admin";

export interface Profile { name: string; headline: string; about: string; banner: string }

export interface Version {
  n: number;
  createdAt: string;
  createdBy: string;
  /** Text content for ICP, positioning, DM sequences and posts. */
  content: string;
  /** Structured content for LinkedIn profile deliverables. */
  profile?: Profile;
}

export interface Anchor { start: number; end: number; quote: string }

export interface Reply { id: string; author: string; body: string; at: string }
export interface Thread {
  id: string;
  versionN: number;
  anchor: Anchor;
  author: string;
  body: string;
  at: string;
  resolved: boolean;
  replies: Reply[];
}

export interface Deliverable {
  id: string;
  kind: DeliverableKind;
  title: string;
  status: DeliverableStatus;
  versions: Version[];
  threads: Thread[];
  approved?: { by: string; at: string; versionN: number };
  /** What approving this deliverable unlocks, shown in the approve dialog. */
  unlocks?: string;
}

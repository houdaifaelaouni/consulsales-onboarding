import { createHash, randomBytes } from "node:crypto";
import type { AccountStatus } from "./status";

/** Bump when the risk notice text changes: everyone must accept the new version before connecting. */
export const NOTICE_VERSION = "2026-11";
const ATTEMPT_MINUTES = 60;

/** Storage port, so the connect flow is testable without a database. */
export interface ConnectRepo {
  hasConsent(workspaceId: string, version: string): Promise<boolean>;
  saveAttempt(a: { tokenHash: string; workspaceId: string; createdBy: string; expiresAt: Date }): Promise<void>;
  /** Marks the attempt used and returns its workspace, or null if unknown, used or expired. Must be atomic. */
  takeAttempt(tokenHash: string, now: Date): Promise<{ workspaceId: string } | null>;
  upsertAccount(a: { workspaceId: string; unipileAccountId: string }): Promise<void>;
  /** Updates a known account only; unknown ids are ignored. */
  setStatus(unipileAccountId: string, status: AccountStatus): Promise<void>;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type StartResult = { ok: true; url: string } | { ok: false; reason: "consent_required" | "failed" };

/** Makes a connect link for a workspace whose owner accepted the current risk notice. */
export async function startConnect(
  repo: ConnectRepo,
  makeLink: (i: { name: string; expiresOn: Date }) => Promise<{ url: string }>,
  input: { workspaceId: string; userId: string; now?: Date },
): Promise<StartResult> {
  try {
    if (!(await repo.hasConsent(input.workspaceId, NOTICE_VERSION))) return { ok: false, reason: "consent_required" };
    const now = input.now ?? new Date();
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(now.getTime() + ATTEMPT_MINUTES * 60_000);
    await repo.saveAttempt({ tokenHash: hashToken(token), workspaceId: input.workspaceId, createdBy: input.userId, expiresAt });
    const link = await makeLink({ name: token, expiresOn: expiresAt });
    return { ok: true, url: link.url };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** Unipile says a LinkedIn account was connected. The single-use token tells us whose it is. Anything unknown is ignored. */
export async function completeConnect(repo: ConnectRepo, n: { accountId: string; token: string }, now = new Date()): Promise<"connected" | "ignored"> {
  const attempt = await repo.takeAttempt(hashToken(n.token), now);
  if (!attempt) return "ignored";
  await repo.upsertAccount({ workspaceId: attempt.workspaceId, unipileAccountId: n.accountId });
  return "connected";
}

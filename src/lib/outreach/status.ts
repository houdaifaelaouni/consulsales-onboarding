export type AccountStatus = "connecting" | "ok" | "credentials" | "error" | "deleted";

const STATUSES: AccountStatus[] = ["connecting", "ok", "credentials", "error", "deleted"];
export const isAccountStatus = (v: unknown): v is AccountStatus => typeof v === "string" && (STATUSES as string[]).includes(v);

/** Unipile's account status words, mapped to ours. Words we do not act on (for example SYNC_SUCCESS) map to null. */
export function mapStatus(message: unknown): AccountStatus | null {
  switch (typeof message === "string" ? message.toUpperCase() : "") {
    case "OK": case "CREATION_SUCCESS": case "RECONNECTED": return "ok";
    case "CONNECTING": return "connecting";
    case "CREDENTIALS": return "credentials";
    case "ERROR": case "STOPPED": return "error";
    case "DELETED": return "deleted";
    default: return null;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Unipile's account-status webhook: { AccountStatus: { account_id, account_type, message } }. */
export function parseStatusPayload(body: unknown): { accountId: string; status: AccountStatus } | null {
  const a = isObj(body) && isObj(body.AccountStatus) ? body.AccountStatus : null;
  const status = mapStatus(a?.message);
  return a && typeof a.account_id === "string" && a.account_id && status ? { accountId: a.account_id, status } : null;
}

/** The hosted-login notification: { status: "CREATION_SUCCESS" | "RECONNECTED", account_id, name }. Our single-use token comes back as name. */
export function parseNotify(body: unknown): { accountId: string; token: string } | null {
  if (!isObj(body) || (body.status !== "CREATION_SUCCESS" && body.status !== "RECONNECTED")) return null;
  const { account_id: accountId, name: token } = body;
  return typeof accountId === "string" && accountId && typeof token === "string" && token ? { accountId, token } : null;
}

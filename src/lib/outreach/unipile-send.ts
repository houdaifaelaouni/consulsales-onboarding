/** The only Unipile code that contacts people. Endpoints follow https://developer.unipile.com (v1). */
import { unipileBase, type UnipileConfig } from "./unipile";

const timeout = () => AbortSignal.timeout(20_000);

function config(cfg: UnipileConfig): { base: string; apiKey: string } {
  const base = unipileBase(cfg.dsn ?? process.env.UNIPILE_DSN);
  const apiKey = cfg.apiKey ?? process.env.UNIPILE_API_KEY;
  if (!base || !apiKey) throw new Error("Unipile is not configured (UNIPILE_DSN, UNIPILE_API_KEY)");
  return { base, apiKey };
}

const headers = (apiKey: string) => ({ "X-API-KEY": apiKey, Accept: "application/json" });

/**
 * LinkedIn's public address part ("ana-costa") becomes the Provider internal id the invite and chat calls need.
 * Unipile serves the profile at `/users/{identifier}` and, on some versions, `/users/{identifier}/profile`.
 */
export async function resolveProviderId(cfg: UnipileConfig, i: { accountId: string; linkedinKey: string }): Promise<string | null> {
  const { base, apiKey } = config(cfg);
  const key = encodeURIComponent(i.linkedinKey);
  let lastStatus = 0;
  for (const path of [`/api/v1/users/${key}`, `/api/v1/users/${key}/profile`]) {
    const url = new URL(`${base}${path}`);
    url.searchParams.set("account_id", i.accountId);
    const res = await (cfg.fetchImpl ?? fetch)(url, { headers: headers(apiKey), signal: timeout() });
    if (!res.ok) {
      lastStatus = res.status;
      continue;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const id = body.provider_id;
    if (typeof id === "string" && id) return id;
  }
  if (lastStatus && lastStatus !== 404) throw new Error(`Unipile profile lookup failed (${lastStatus})`);
  return null;
}

/** Sends the connection request, with the note only when there is one (LinkedIn refuses an empty message). */
export async function sendInvite(cfg: UnipileConfig, i: { accountId: string; providerId: string; note: string }): Promise<void> {
  const { base, apiKey } = config(cfg);
  const note = i.note.trim().slice(0, 300);
  const res = await (cfg.fetchImpl ?? fetch)(`${base}/api/v1/users/invite`, {
    method: "POST",
    headers: { ...headers(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: i.accountId, provider_id: i.providerId, ...(note ? { message: note } : {}) }),
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`Unipile invite failed (${res.status})`);
}

/** Sends a message; Unipile creates the 1-to-1 chat if it does not exist yet and returns its id. */
export async function sendMessage(cfg: UnipileConfig, i: { accountId: string; providerId: string; text: string }): Promise<{ chatId: string | null }> {
  const { base, apiKey } = config(cfg);
  const form = new FormData();
  form.set("account_id", i.accountId);
  form.set("attendees_ids", i.providerId);
  form.set("text", i.text);
  const res = await (cfg.fetchImpl ?? fetch)(`${base}/api/v1/chats`, {
    method: "POST",
    headers: headers(apiKey),
    body: form,
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`Unipile message failed (${res.status})`);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const chat = typeof body.chat === "object" && body.chat !== null ? (body.chat as Record<string, unknown>) : null;
  const id = body.chat_id ?? chat?.id;
  return { chatId: typeof id === "string" && id ? id : null };
}

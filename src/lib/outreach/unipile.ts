/** The only Unipile code that creates links. Endpoints and fields follow https://developer.unipile.com (hosted auth). */
export interface UnipileConfig { dsn?: string; apiKey?: string; fetchImpl?: typeof fetch }

/** "api1.unipile.com:13111" or "https://api1.unipile.com:13111/" becomes "https://api1.unipile.com:13111". Null when unset or not a host. */
export function unipileBase(dsn: string | undefined): string | null {
  const raw = (dsn ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return /^[a-z0-9.-]+(:\d{2,5})?$/i.test(raw) ? `https://${raw}` : null;
}

export interface HostedLinkInput { name: string; expiresOn: Date; successUrl: string; failureUrl: string; notifyUrl: string }

/** Asks Unipile for a one-time page where the client signs in to LinkedIn. We never see the password. */
export async function createHostedLink(cfg: UnipileConfig, input: HostedLinkInput): Promise<{ url: string }> {
  const base = unipileBase(cfg.dsn ?? process.env.UNIPILE_DSN);
  const apiKey = cfg.apiKey ?? process.env.UNIPILE_API_KEY;
  if (!base || !apiKey) throw new Error("Unipile is not configured (UNIPILE_DSN, UNIPILE_API_KEY)");
  const res = await (cfg.fetchImpl ?? fetch)(`${base}/api/v1/hosted/accounts/link`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      type: "create", providers: ["LINKEDIN"], expiresOn: input.expiresOn.toISOString(), api_url: base, name: input.name,
      success_redirect_url: input.successUrl, failure_redirect_url: input.failureUrl, notify_url: input.notifyUrl,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Unipile link failed (${res.status})`);
  const body = (await res.json()) as { url?: string };
  if (!body.url) throw new Error("Unipile returned no url");
  return { url: body.url };
}

/**
 * Every external key the app needs, in one place. The admin "Integrations" page renders this list and shows
 * only whether each variable is set. Values are never read into the page, sent to the browser or stored.
 */
export type VarKind = "public" | "config" | "secret";

export interface EnvVar {
  name: string;
  /** public = shipped to the browser, config = server-only but not sensitive, secret = never leaves the server. */
  kind: VarKind;
  required: boolean;
  purpose: string;
  /** Shape of the value, never a real one. */
  example: string;
  /** Needed to save keys from the admin page itself, so it must be added in Vercel by hand, once. */
  bootstrap?: boolean;
}

export interface Integration {
  id: string;
  title: string;
  purpose: string;
  /** Where the person gets the value. */
  getItFrom: string;
  /** What stops working when this is missing. */
  unlocks: string;
  vars: EnvVar[];
  /** Server path to register in the provider's dashboard, if any. */
  webhookPath?: string;
}

export const INTEGRATIONS: Integration[] = [
  {
    id: "app", title: "App", purpose: "The public address of this app.", getItFrom: "Your own domain, for example https://app.consulsales.com.",
    unlocks: "Magic links, email buttons, payment redirects and OAuth callbacks.",
    vars: [{ name: "NEXT_PUBLIC_APP_URL", kind: "public", required: true, purpose: "Base URL used in links and redirects.", example: "https://app.consulsales.com" }],
  },
  {
    id: "supabase", title: "Supabase", purpose: "Database, login and file storage.", getItFrom: "Supabase dashboard → Project Settings → API Keys.",
    unlocks: "Everything: login, client data, workspaces, the admin board.",
    vars: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", kind: "public", required: true, purpose: "Project address.", example: "https://xxxx.supabase.co" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", kind: "public", required: true, purpose: "Public browser key. Safe only because row-level security is on.", example: "eyJ…" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", kind: "secret", required: true, purpose: "Server-only key that bypasses row-level security. Creates workspaces from payments.", example: "eyJ…" },
    ],
  },
  {
    id: "whop", title: "Whop", purpose: "Checkout and stage payments.", getItFrom: "Whop dashboard → Developer → API keys and Webhooks.",
    unlocks: "Stage-1 checkout, automatic workspace creation, later stage invoices.", webhookPath: "/api/webhooks/whop",
    vars: [
      { name: "WHOP_API_KEY", kind: "secret", required: true, purpose: "Creates checkouts and invoices.", example: "apik_…" },
      { name: "WHOP_ACCOUNT_ID", kind: "config", required: true, purpose: "Your Whop business ID.", example: "biz_…" },
      { name: "WHOP_WEBHOOK_SECRET", kind: "secret", required: true, purpose: "Verifies that payment events really come from Whop.", example: "ws_…" },
    ],
  },
  {
    id: "resend", title: "Resend", purpose: "Transactional email.", getItFrom: "Resend dashboard → API Keys and Domains.",
    unlocks: "Invites, reminders, approval links and weekly digests in the client's language.",
    vars: [
      { name: "RESEND_API_KEY", kind: "secret", required: true, purpose: "Sending-only key, restricted to your domain.", example: "re_…" },
      { name: "EMAIL_FROM", kind: "config", required: true, purpose: "Sender shown to clients. The domain must be verified in Resend.", example: "ConsulSales <hello@mail.consulsales.com>" },
    ],
  },
  {
    id: "booking", title: "Kickoff booking", purpose: "Where kickoff and review calls are booked.", getItFrom: "Your booking tool (Cal.com or your current one).",
    unlocks: "Real kickoff slots instead of sample ones.",
    vars: [
      { name: "BOOKING_PROVIDER", kind: "config", required: false, purpose: "calcom, calendly or custom.", example: "calcom" },
      { name: "BOOKING_API_KEY", kind: "secret", required: false, purpose: "API key for the booking tool.", example: "cal_live_…" },
      { name: "BOOKING_FALLBACK_URL", kind: "config", required: false, purpose: "Page shown if the booking tool is down.", example: "https://cal.com/consulsales/kickoff" },
    ],
  },
  {
    id: "hubspot", title: "HubSpot", purpose: "Let clients connect their HubSpot with OAuth.", getItFrom: "HubSpot developer account → your app → Auth.",
    unlocks: "The “Connect HubSpot” button.",
    vars: [
      { name: "HUBSPOT_CLIENT_ID", kind: "config", required: false, purpose: "OAuth app ID.", example: "xxxxxxxx-xxxx-…" },
      { name: "HUBSPOT_CLIENT_SECRET", kind: "secret", required: false, purpose: "OAuth app secret.", example: "xxxxxxxx-xxxx-…" },
    ],
  },
  {
    id: "pipedrive", title: "Pipedrive", purpose: "Let clients connect their Pipedrive with OAuth.", getItFrom: "Pipedrive Developer Hub → your app → OAuth & access scopes.",
    unlocks: "The “Connect Pipedrive” button.",
    vars: [
      { name: "PIPEDRIVE_CLIENT_ID", kind: "config", required: false, purpose: "OAuth app ID.", example: "xxxxxxxx" },
      { name: "PIPEDRIVE_CLIENT_SECRET", kind: "secret", required: false, purpose: "OAuth app secret.", example: "xxxxxxxx" },
    ],
  },
  {
    id: "sentry", title: "Sentry", purpose: "Error tracking.", getItFrom: "Sentry → Project Settings → Client Keys and Auth Tokens.",
    unlocks: "Alerts when something breaks for a client.",
    vars: [
      { name: "NEXT_PUBLIC_SENTRY_DSN", kind: "public", required: false, purpose: "Where browser errors are sent.", example: "https://…@o0.ingest.sentry.io/0" },
      { name: "SENTRY_AUTH_TOKEN", kind: "secret", required: false, purpose: "Uploads source maps at build time.", example: "sntrys_…" },
    ],
  },
  {
    id: "vercel", title: "Saving keys from this page", purpose: "Lets the admin page store keys for you instead of you opening Vercel.",
    getItFrom: "Vercel → Account Settings → Tokens (create one scoped to your team). The team ID is in Team Settings → General.",
    unlocks: "The Save buttons on every key below. Add these two in Vercel by hand, once.",
    vars: [
      { name: "VERCEL_API_TOKEN", kind: "secret", required: false, purpose: "Token that may change this project's environment variables.", example: "a long token", bootstrap: true },
      { name: "VERCEL_TEAM_ID", kind: "config", required: false, purpose: "Your Vercel team.", example: "team_…", bootstrap: true },
    ],
  },
  {
    id: "cron", title: "Scheduled jobs", purpose: "Reminders and syncs that run on a timer.", getItFrom: "Make one yourself: a long random string (for example 32 random characters).",
    unlocks: "Reminder emails and the weekly digest. Stops strangers from calling the job URLs.",
    vars: [{ name: "CRON_SECRET", kind: "secret", required: true, purpose: "Shared secret that Vercel Cron sends with each job call.", example: "a long random string" }],
  },
];

export const ALL_VARS: EnvVar[] = INTEGRATIONS.flatMap((i) => i.vars);

/** Values people leave behind from templates. A placeholder counts as missing. */
const PLACEHOLDER = /^(\s*|your[_-].*|paste[_-].*|changeme.*|xxx+.*|todo.*|<.*>)$/i;

export function isSet(value: string | undefined): boolean {
  return typeof value === "string" && !PLACEHOLDER.test(value);
}

export type EnvStatus = Record<string, boolean>;

/** Reduces the real environment to set/missing flags. This is the only thing that ever leaves the server. */
export function envStatus(env: Record<string, string | undefined>): EnvStatus {
  return Object.fromEntries(ALL_VARS.map((v) => [v.name, isSet(env[v.name])]));
}

export type IntegrationState = "ready" | "partial" | "missing" | "optional";

export function integrationState(i: Integration, status: EnvStatus): { state: IntegrationState; missing: string[] } {
  const required = i.vars.filter((v) => v.required);
  const missing = i.vars.filter((v) => !status[v.name]).map((v) => v.name);
  if (required.length === 0) {
    const anySet = i.vars.some((v) => status[v.name]);
    return { state: anySet ? (missing.length ? "partial" : "ready") : "optional", missing };
  }
  const missingRequired = required.filter((v) => !status[v.name]);
  if (missingRequired.length === 0) return { state: "ready", missing };
  return { state: missingRequired.length === required.length ? "missing" : "partial", missing };
}

export function summarize(status: EnvStatus): { ready: number; total: number; requiredMissing: number } {
  const states = INTEGRATIONS.map((i) => integrationState(i, status).state);
  const requiredMissing = ALL_VARS.filter((v) => v.required && !status[v.name]).length;
  return { ready: states.filter((s) => s === "ready").length, total: INTEGRATIONS.length, requiredMissing };
}

/** The address to paste into a provider's webhook settings. */
export function webhookUrl(baseUrl: string | undefined, path: string): string {
  const base = isSet(baseUrl) ? (baseUrl as string).replace(/\/+$/, "") : "https://YOUR-DOMAIN";
  return `${base}${path}`;
}

import type { MessageKey } from "@/lib/i18n";

/** The channels the create dialog and the platform filter show. Only LinkedIn can really send (through Unipile). */
export type Channel = "linkedin" | "instagram" | "facebook" | "x" | "tiktok" | "reddit" | "threads" | "discord";

export interface ChannelInfo { key: Channel; label: MessageKey; body: MessageKey; available: boolean }

export const CHANNELS: ChannelInfo[] = [
  { key: "linkedin", label: "outreach.ch.linkedin", body: "outreach.nc.linkedinBody", available: true },
  { key: "instagram", label: "outreach.ch.instagram", body: "outreach.nc.instagramBody", available: false },
  { key: "facebook", label: "outreach.ch.facebook", body: "outreach.nc.facebookBody", available: false },
  { key: "x", label: "outreach.ch.x", body: "outreach.nc.xBody", available: false },
  { key: "reddit", label: "outreach.ch.reddit", body: "outreach.nc.redditBody", available: false },
  { key: "tiktok", label: "outreach.ch.tiktok", body: "outreach.nc.tiktokBody", available: false },
  { key: "threads", label: "outreach.ch.threads", body: "outreach.nc.threadsBody", available: false },
  { key: "discord", label: "outreach.ch.discord", body: "outreach.nc.discordBody", available: false },
];

export function channelInfo(key: Channel): ChannelInfo {
  return CHANNELS.find((c) => c.key === key) ?? CHANNELS[0];
}

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

/** One card in the campaigns list. Progress is finished leads over enrolled leads. */
export interface CampaignCard {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  channel: Channel;
  leads: number;
  progress: number;
  createdAt: string;
}

export type LeadStatus = "new" | "approved" | "rejected";

export interface LeadRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  domain: string | null;
  location: string | null;
  status: LeadStatus;
  platform: Channel;
}

export interface ProfileView { id: string; name: string; status: "ok" | "connecting" | "credentials" | "error"; campaigns: number }

/** "Sara Lopez" gives { first: "Sara", last: "Lopez" }. A one-word name has an empty last name. */
export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/** ISO timestamps become dd/mm/yyyy without depending on the server's locale or time zone. */
export function formatDate(iso: string | null | undefined): string {
  const m = (iso ?? "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export const LEADS_PER_PAGE = 50;

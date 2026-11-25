import type { MessageKey } from "@/lib/i18n";
import type { CampaignStatus } from "@/lib/outreach/workspace";

export const STATUS_LABEL: Record<CampaignStatus, MessageKey> = {
  draft: "outreach.camp.s.draft",
  active: "outreach.camp.s.active",
  paused: "outreach.camp.s.paused",
  completed: "outreach.camp.s.completed",
};

export const STATUS_TONE: Record<CampaignStatus, "gray" | "success" | "warning"> = {
  draft: "gray",
  active: "success",
  paused: "warning",
  completed: "gray",
};

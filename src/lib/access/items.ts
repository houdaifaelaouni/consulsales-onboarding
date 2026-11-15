/** Access checklist as content (FR-10). Edit this file to change what clients must provide. */
export type AccessStatus = "connected" | "pending" | "blocked";
export type AccessKind = "oauth" | "vault" | "link" | "files" | "confirm" | "choice";

export interface AccessItem {
  id: string;
  kind: AccessKind;
  title: string;
  why: string;
  /** Plain steps shown in the help panel. */
  steps: string[];
  /** Shown when blocked: who can fix it. */
  blockedHelp: string;
  /** Provider choices for OAuth and choice items. */
  providers?: string[];
  /** Field label and example for link items. */
  linkLabel?: string;
  linkPlaceholder?: string;
}

export const ACCESS_ITEMS: AccessItem[] = [
  {
    id: "linkedin", kind: "vault", title: "LinkedIn access",
    why: "So we can prepare and send messages from your profile, inside LinkedIn's own rules.",
    steps: ["Open LinkedIn, then Settings, then Sales Navigator or Delegated access.", "Add our delivery lead's email as a delegate or seat.", "Tick “Done” here. We confirm on our side."],
    blockedHelp: "Only the account owner can add a delegate. Ask them to follow the steps above.",
  },
  {
    id: "crm", kind: "oauth", title: "Your CRM", providers: ["HubSpot", "Pipedrive"],
    why: "So bookings and replies land in the tool your team already uses.",
    steps: ["Choose your CRM below.", "Sign in on the CRM's own page and approve access.", "You return here and see a green check with the account name."],
    blockedHelp: "You need admin rights in the CRM to approve. Ask your CRM admin to connect it.",
  },
  {
    id: "calendar", kind: "link", title: "Booking link",
    why: "The link we put in messages so interested people can book a call with you.",
    steps: ["Copy your booking page address (Cal.com, Calendly or similar).", "Paste it below and press Save."],
    blockedHelp: "Do not have one yet? Tell your delivery lead and we will set one up.",
  },
  {
    id: "brand", kind: "files", title: "Brand files",
    why: "Logo, case studies and proof points we can use in profiles and messages.",
    steps: ["Add your logo (PNG or SVG).", "Add case studies or wins as PDF or images.", "Files up to 200 MB each."],
    blockedHelp: "Files too big? Share a link in the note and we will fetch them.",
  },
];

export const MAX_FILE_BYTES = 200 * 1024 * 1024;
export const BLOCKED_ESCALATION_HOURS = 72;

/**
 * The real client checklist. Nothing here pretends to connect: until secure storage, CRM sign-in and file
 * upload exist, items collect what we can really receive (a link, a choice, a confirmation) and say so.
 */
export const LIVE_ACCESS_ITEMS: AccessItem[] = [
  {
    id: "linkedin", kind: "confirm", title: "LinkedIn access",
    why: "So we can prepare and send messages from your profile, inside LinkedIn's own rules.",
    steps: ["Open LinkedIn, then Settings, then Sales Navigator or Delegated access.", "Add our delivery lead's email as a delegate or seat.", "Press the button below. We confirm on our side."],
    blockedHelp: "Only the account owner can add a delegate. Ask them to follow the steps above.",
  },
  {
    id: "crm", kind: "choice", title: "Your CRM", providers: ["HubSpot", "Pipedrive", "Another CRM", "I do not use one"],
    why: "So bookings and replies land in the tool your team already uses.",
    steps: ["Tell us which CRM you use.", "We connect it together with you on your kickoff call. You never share a password."],
    blockedHelp: "You need admin rights in the CRM. Ask your CRM admin to join the kickoff call.",
  },
  {
    id: "calendar", kind: "link", title: "Booking link",
    why: "The link we put in messages so interested people can book a call with you.",
    steps: ["Copy your booking page address (Cal.com, Calendly or similar).", "Paste it below and press Save."],
    blockedHelp: "Do not have one yet? Tell your delivery lead and we will set one up.",
    linkLabel: "Booking page address", linkPlaceholder: "https://cal.com/you/30min",
  },
  {
    id: "brand", kind: "link", title: "Brand files",
    why: "Logo, case studies and proof points we can use in profiles and messages.",
    steps: ["Put your logo (PNG or SVG) and case studies in one shared folder.", "Paste the folder link below. Make sure anyone with the link can view it."],
    blockedHelp: "Cannot share a folder? Tell your delivery lead and we will collect the files on the kickoff call.",
    linkLabel: "Shared folder link", linkPlaceholder: "https://drive.google.com/drive/folders/…",
  },
];

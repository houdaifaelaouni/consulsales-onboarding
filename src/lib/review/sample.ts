import { createAnchor } from "./comments";
import type { Deliverable, Thread } from "./types";

const icpV1 = [
  "Ideal client profile", "",
  "Who we help", "B2B SaaS companies with 10 to 200 staff.", "",
  "Who buys", "Head of Marketing or VP Growth.", "",
  "Trigger moments", "- A new funding round", "- A new head of growth joins", "",
  "Who we avoid", "Agencies and consultancies.",
].join("\n");

const icpV2 = [
  "Ideal client profile", "",
  "Who we help", "B2B SaaS and fintech companies with 10 to 200 staff.", "",
  "Who buys", "Head of Marketing or VP Growth.", "",
  "Trigger moments", "- A new funding round", "- A new head of growth joins", "- A hiring push in sales", "",
  "Who we avoid", "Companies without a clear offer yet.",
].join("\n");

function threadOn(text: string, quote: string, t: Omit<Thread, "anchor">): Thread {
  const start = text.indexOf(quote);
  const anchor = createAnchor(text, start, start + quote.length);
  if (!anchor) throw new Error(`sample anchor not found: ${quote}`);
  return { ...t, anchor };
}

const postText = [
  "Most agencies lose clients before the first invoice.",
  "Not on price. On the first 30 days.",
  "Here is the checklist we use so nobody waits for an answer:",
  "1. One intake form, saved as you type.",
  "2. One next step, always visible.",
  "3. You approve before you pay.",
  "If your onboarding lives in six tools, this is for you.",
].join("\n");

export const SAMPLE_DELIVERABLES: Deliverable[] = [
  {
    id: "icp", kind: "icp", title: "Ideal client profile", status: "in_review",
    unlocks: "This unlocks your stage 2 invoice.",
    versions: [
      { n: 1, createdAt: "2026-11-10T10:00:00Z", createdBy: "Alex (delivery)", content: icpV1 },
      { n: 2, createdAt: "2026-11-12T15:30:00Z", createdBy: "Alex (delivery)", content: icpV2 },
    ],
    threads: [
      threadOn(icpV2, "fintech companies", {
        id: "t1", versionN: 2, author: "Sara Lopez", body: "Should we add fintech agencies too?", at: "2026-11-13T09:12:00Z", resolved: false,
        replies: [{ id: "r1", author: "Alex (delivery)", body: "Good call. I can add them as a second segment if you like.", at: "2026-11-13T10:02:00Z" }],
      }),
      threadOn(icpV2, "A hiring push in sales", {
        id: "t2", versionN: 2, author: "Sara Lopez", body: "This is our best trigger, love it.", at: "2026-11-13T09:14:00Z", resolved: true, replies: [],
      }),
    ],
  },
  {
    id: "profile", kind: "profile", title: "LinkedIn profile rewrite", status: "in_review",
    unlocks: "This is the last approval before your messages go live.",
    versions: [
      {
        n: 1, createdAt: "2026-11-09T10:00:00Z", createdBy: "Alex (delivery)", content: "",
        profile: {
          name: "Sara Lopez", banner: "Marketing consultant",
          headline: "Marketing consultant",
          about: "I help companies with marketing.\n10 years of experience.\nContact me for more.",
        },
      },
      {
        n: 2, createdAt: "2026-11-12T16:00:00Z", createdBy: "Alex (delivery)", content: "",
        profile: {
          name: "Sara Lopez", banner: "Outbound that books calls",
          headline: "I help B2B SaaS teams book 12+ qualified calls a month | Outbound for SaaS",
          about: [
            "Most SaaS teams know their buyers. Few reach them consistently.",
            "I run outbound for 10 to 200 person SaaS companies: the research, the messages and the follow-up.",
            "Typical result: 12 or more qualified calls in the first month.",
            "Based in Barcelona, working with teams across Europe.",
            "Book a 20 minute intro call below.",
          ].join("\n"),
        },
      },
    ],
    threads: [],
  },
  {
    id: "post", kind: "post", title: "Launch post: onboarding", status: "approved",
    approved: { by: "Sara Lopez", at: "2026-11-14T08:45:00Z", versionN: 1 },
    versions: [{ n: 1, createdAt: "2026-11-13T12:00:00Z", createdBy: "Alex (delivery)", content: postText }],
    threads: [],
  },
];

export const SAMPLE_CLIENT = { name: "Sara Lopez", headline: "Founder, Studio North" };

export function findSample(id: string): Deliverable | undefined {
  return SAMPLE_DELIVERABLES.find((d) => d.id === id);
}

/** Intake questions as content, not code: edit this file to change the questionnaire. */
export type QuestionType = "text" | "textarea" | "select" | "number";

export interface Question {
  key: string;
  step: 1 | 2 | 3 | 4;
  type: QuestionType;
  label: string;
  help?: string;
  example?: string;
  required: boolean;
  options?: string[];
  /** Rough minutes to answer, for the "time left" estimate. */
  minutes: number;
}

export const STEPS: Array<{ id: 1 | 2 | 3 | 4; title: string; intro: string }> = [
  { id: 1, title: "Company", intro: "A few basics so we understand what you sell and to whom." },
  { id: 2, title: "Clients", intro: "Tell us who you love working with, and who you do not." },
  { id: 3, title: "Voice", intro: "How you sound, so the messages feel like you." },
  { id: 4, title: "Goals", intro: "What a great first 90 days looks like." },
];

export const QUESTIONS: Question[] = [
  { key: "offer", step: 1, type: "textarea", required: true, minutes: 2, label: "What do you sell, in one or two sentences?", help: "Plain words, as you would say it on a call.", example: "We run paid-search for B2B SaaS companies with 10 to 200 staff." },
  { key: "team_size", step: 1, type: "select", required: true, minutes: 0.5, label: "How big is your team?", options: ["Just me", "2 to 5", "6 to 15", "16 to 30"] },
  { key: "mrr", step: 1, type: "select", required: true, minutes: 0.5, label: "Roughly how much monthly recurring revenue do you have?", help: "A range is fine. We never share it.", options: ["Under 10k", "10k to 30k", "30k to 60k", "60k to 100k", "Over 100k"] },
  { key: "website", step: 1, type: "text", required: false, minutes: 0.5, label: "Your website", example: "https://youragency.com" },

  { key: "best_clients", step: 2, type: "textarea", required: true, minutes: 3, label: "Describe your three best clients.", help: "Industry, size, what they bought, why it went well.", example: "A 40-person fintech, bought a 6-month retainer, great at giving fast feedback." },
  { key: "worst_client", step: 2, type: "textarea", required: true, minutes: 2, label: "Describe one client you would not take again.", help: "What went wrong? This helps us filter them out.", example: "A startup that wanted results in two weeks and changed scope every call." },
  { key: "dream_titles", step: 2, type: "text", required: false, minutes: 1, label: "Who is the buyer? Job titles that sign the deal.", example: "Head of Marketing, VP Growth" },

  { key: "tone", step: 3, type: "select", required: true, minutes: 0.5, label: "Which tone fits you best?", options: ["Direct and brief", "Warm and friendly", "Expert and formal", "Playful"] },
  { key: "voice_examples", step: 3, type: "textarea", required: false, minutes: 3, label: "Paste two or three messages or posts that sound like you.", help: "Anything real: an email, a LinkedIn post, a proposal intro.", example: "Quick one: I saw you are hiring a growth lead. We help teams like yours..." },
  { key: "never_say", step: 3, type: "text", required: false, minutes: 1, label: "Words or phrases you never want us to use", example: "synergy, game-changer" },

  { key: "deal_size", step: 4, type: "number", required: true, minutes: 0.5, label: "Average first-deal value in euros", example: "6000" },
  { key: "calls_target", step: 4, type: "number", required: true, minutes: 0.5, label: "How many booked calls per month would make you happy?", example: "12" },
  { key: "constraints", step: 4, type: "textarea", required: false, minutes: 1.5, label: "Anything we should know or avoid?", help: "Seasonal limits, markets you do not serve, internal rules.", example: "No outreach in the UK. We close for the summer in August." },
];

export const MAX_QUESTIONS_PER_STEP = 6;

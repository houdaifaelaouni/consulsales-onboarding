/** The founder's booking tool. Only these fixed addresses are ever loaded, never code pasted by anyone. */
export const BAZOOKA = {
  script: "https://www.mybazooka.com/embed/booking.js",
  origin: "https://app.mybazooka.com",
  namespace: "kickoff",
  /** "<account>/<event>". Override with NEXT_PUBLIC_BAZOOKA_BOOKING_LINK when the kickoff event differs. */
  defaultLink: "consulsales-mu47o1h1/spine-fit-call",
} as const;

/** A booking link is two URL-safe parts. Anything else (a URL, a script) is refused. */
export function isBookingLink(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}\/[a-z0-9][a-z0-9_-]{0,63}$/i.test(v);
}

export function resolveBookingLink(envValue: string | undefined): string {
  return isBookingLink(envValue) ? envValue : BAZOOKA.defaultLink;
}

/** The hosted booking page, shown if the embed cannot load. */
export const bookingPageUrl = (link: string): string => `${BAZOOKA.origin}/${link}`;

/** Look and prefill for the embed: dark to match the portal, lavender accent, and the client's own name and email. */
export function buildEmbedConfig(person: { name?: string; email?: string }) {
  const cfg: Record<string, unknown> = { theme: "dark", layout: "month", hideDetails: false, brandColor: "#5e6ad2", brandColorDark: "#5e6ad2" };
  if (person.name?.trim()) cfg.name = person.name.trim();
  if (person.email?.includes("@")) cfg.email = person.email.trim();
  return cfg;
}

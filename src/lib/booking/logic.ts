/** Kickoff booking logic. Pure and provider-neutral: Cal.com or any other tool just supplies the booked slots. */
export type BookingPlan = "starter" | "pro" | "enterprise";

/** Plan-specific call length in minutes (FR-04). */
export const KICKOFF_MINUTES: Record<BookingPlan, number> = { starter: 30, pro: 45, enterprise: 60 };

/** Team availability in UTC: Monday to Friday, 08:00 to 16:00 (that is 09:00 to 17:00 in Barcelona in winter). */
export const AVAILABILITY = { days: [1, 2, 3, 4, 5], startHour: 8, endHour: 16, stepMinutes: 30 } as const;
export const LEAD_HOURS = 12;
export const HORIZON_DAYS = 7;

const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** All bookable start times (ISO, UTC) in the next week, minus booked ones and anything too soon. */
export function generateSlots(now: Date, durationMin: number, booked: string[] = []): string[] {
  const taken = new Set(booked.map((b) => new Date(b).toISOString()));
  const earliest = now.getTime() + LEAD_HOURS * HOUR_MS;
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: string[] = [];
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const day = dayStart + d * DAY_MS;
    if (!(AVAILABILITY.days as readonly number[]).includes(new Date(day).getUTCDay())) continue;
    const open = day + AVAILABILITY.startHour * HOUR_MS;
    const close = day + AVAILABILITY.endHour * HOUR_MS;
    for (let s = open; s + durationMin * MIN_MS <= close; s += AVAILABILITY.stepMinutes * MIN_MS) {
      const iso = new Date(s).toISOString();
      if (s >= earliest && !taken.has(iso)) out.push(iso);
    }
  }
  return out;
}

export interface DayGroup { key: string; label: string; slots: Array<{ iso: string; label: string }> }

function parts(iso: string, tz: string, opts: Intl.DateTimeFormatOptions, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts }).format(new Date(iso));
}

/** Groups slots by calendar day in the reader's time zone, so a late UTC slot can land on the next local day. */
export function groupSlotsByDay(slots: string[], tz: string, locale = "en-GB"): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const iso of slots) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    const g = groups.get(key) ?? { key, label: parts(iso, tz, { weekday: "short", day: "numeric", month: "short" }, locale), slots: [] };
    g.slots.push({ iso, label: parts(iso, tz, { hour: "2-digit", minute: "2-digit", hour12: false }, locale) });
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function describeSlot(iso: string, tz: string, locale = "en-GB"): string {
  return parts(iso, tz, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }, locale);
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 characters, as RFC 5545 requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) { out.push(rest.slice(0, 75)); rest = ` ${rest.slice(75)}`; }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(e: { uid: string; title: string; startIso: string; durationMin: number; description?: string; url?: string; now?: Date }): string {
  const start = new Date(e.startIso);
  const end = new Date(start.getTime() + e.durationMin * MIN_MS);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ConsulSales//Onboarding//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${icsDate(e.now ?? new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

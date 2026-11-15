import { describe, expect, it } from "vitest";
import { buildIcs, describeSlot, generateSlots, groupSlotsByDay, KICKOFF_MINUTES, LEAD_HOURS } from "./logic";

// Sunday 15 Nov 2026, 12:00 UTC.
const now = new Date("2026-11-15T12:00:00Z");

describe("generateSlots", () => {
  it("only offers weekdays inside working hours, in 30 minute steps", () => {
    const slots = generateSlots(now, 30);
    for (const s of slots) {
      const d = new Date(s);
      expect([1, 2, 3, 4, 5]).toContain(d.getUTCDay());
      expect(d.getUTCHours()).toBeGreaterThanOrEqual(8);
      expect(d.getUTCHours() * 60 + d.getUTCMinutes()).toBeLessThanOrEqual(15 * 60 + 30);
    }
    expect(slots[0]).toBe("2026-11-16T08:00:00.000Z"); // Monday morning
  });
  it("never lets a call run past closing: longer calls have fewer, earlier last slots", () => {
    const last = (m: number) => generateSlots(now, m).filter((s) => s.startsWith("2026-11-16")).pop()!;
    expect(last(30)).toBe("2026-11-16T15:30:00.000Z");
    expect(last(45)).toBe("2026-11-16T15:00:00.000Z");
    expect(last(60)).toBe("2026-11-16T15:00:00.000Z");
    expect(KICKOFF_MINUTES).toEqual({ starter: 30, pro: 45, enterprise: 60 });
  });
  it("hides slots that are too soon and slots already booked", () => {
    const monday = new Date("2026-11-16T07:00:00Z"); // 1 hour before opening
    const slots = generateSlots(monday, 30);
    // At 07:00 on Monday, the 12 hour lead time pushes the first slot to the next morning, not Monday.
    expect(slots[0]).toBe("2026-11-17T08:00:00.000Z");
    expect(new Date(slots[0]).getTime()).toBeGreaterThanOrEqual(monday.getTime() + LEAD_HOURS * 3_600_000);
    const booked = generateSlots(now, 30).slice(0, 2);
    expect(generateSlots(now, 30, booked)).not.toContain(booked[0]);
    expect(generateSlots(now, 30, booked)).not.toContain(booked[1]);
  });
  it("looks ahead about a week", () => {
    const slots = generateSlots(now, 30);
    expect(slots.at(-1)!.slice(0, 10) <= "2026-11-22").toBe(true);
  });
});

describe("grouping by local day", () => {
  it("labels times in the reader's time zone", () => {
    const g = groupSlotsByDay(["2026-11-16T08:00:00.000Z"], "Europe/Madrid");
    expect(g[0].slots[0].label).toBe("09:00");
    expect(g[0].key).toBe("2026-11-16");
  });
  it("moves a late UTC slot to the next local day where the zone is far ahead", () => {
    const g = groupSlotsByDay(["2026-11-16T08:00:00.000Z", "2026-11-16T15:30:00.000Z"], "Pacific/Auckland");
    expect(g.map((x) => x.key)).toEqual(["2026-11-16", "2026-11-17"]);
  });
  it("describes a slot in words", () => {
    expect(describeSlot("2026-11-16T09:00:00.000Z", "Europe/Madrid")).toMatch(/Monday.*16.*November.*10:00/);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({
    uid: "kickoff-1@consulsales", title: "Kickoff, ConsulSales; call", startIso: "2026-11-16T09:00:00.000Z",
    durationMin: 45, description: "Line one\nLine two", url: "https://app.example.com", now: new Date("2026-11-15T12:00:00Z"),
  });
  it("is a valid calendar with UTC start and end", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261116T090000Z");
    expect(ics).toContain("DTEND:20261116T094500Z");
    expect(ics).toContain("DTSTAMP:20261115T120000Z");
  });
  it("escapes special characters and uses CRLF line ends", () => {
    expect(ics).toContain("SUMMARY:Kickoff\\, ConsulSales\; call");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });
  it("folds long lines at 75 characters", () => {
    const long = buildIcs({ uid: "u", title: "x".repeat(200), startIso: "2026-11-16T09:00:00.000Z", durationMin: 30 });
    expect(long.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(long.split("\r\n").filter((l) => l.startsWith(" ")).length).toBeGreaterThan(0);
  });
});

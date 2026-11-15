import { describe, expect, it } from "vitest";
import { checkFile, connectedCount, formatBytes, isValidBookingLink, needsAdminFlag, statusOf } from "./logic";

const now = new Date("2026-11-15T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe("admin flag", () => {
  it("raises after 72 hours blocked, not before", () => {
    expect(needsAdminFlag({ status: "blocked", blockedSince: hoursAgo(71) }, now)).toBe(false);
    expect(needsAdminFlag({ status: "blocked", blockedSince: hoursAgo(72) }, now)).toBe(true);
  });
  it("ignores items that are not blocked or have no start time", () => {
    expect(needsAdminFlag({ status: "pending", blockedSince: hoursAgo(100) }, now)).toBe(false);
    expect(needsAdminFlag({ status: "blocked" }, now)).toBe(false);
    expect(needsAdminFlag(undefined, now)).toBe(false);
  });
});

describe("status", () => {
  it("defaults to pending and counts connected", () => {
    const s = { crm: { status: "connected" as const }, linkedin: { status: "blocked" as const } };
    expect(statusOf(s, "calendar")).toBe("pending");
    expect(connectedCount(s, ["linkedin", "crm", "calendar", "brand"])).toEqual({ done: 1, total: 4 });
  });
});

describe("brand files", () => {
  it("accepts images and PDFs up to 200 MB", () => {
    expect(checkFile({ size: 1000, type: "image/png" })).toEqual({ ok: true });
    expect(checkFile({ size: 200 * 1024 * 1024, type: "application/pdf" })).toEqual({ ok: true });
  });
  it("rejects too big, empty and wrong types", () => {
    expect(checkFile({ size: 200 * 1024 * 1024 + 1, type: "image/png" })).toEqual({ ok: false, reason: "too_big" });
    expect(checkFile({ size: 0, type: "image/png" })).toEqual({ ok: false, reason: "empty" });
    expect(checkFile({ size: 10, type: "application/x-msdownload" })).toEqual({ ok: false, reason: "type" });
  });
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("booking link", () => {
  it("accepts web links only", () => {
    expect(isValidBookingLink("https://cal.com/sara/30min")).toBe(true);
    expect(isValidBookingLink(" https://calendly.com/x ")).toBe(true);
    expect(isValidBookingLink("javascript:alert(1)")).toBe(false);
    expect(isValidBookingLink("cal.com/sara")).toBe(false);
  });
});

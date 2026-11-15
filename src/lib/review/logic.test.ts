import { describe, expect, it } from "vitest";
import { createAnchor, reanchor, segmentText } from "./comments";
import { diffLines, diffStats } from "./diff";
import { truncateForPreview, versionText } from "./preview";
import { canApprove, canComment, canTransition, isLocked } from "./status";

describe("diffLines", () => {
  it("marks added and removed lines and keeps the rest", () => {
    const d = diffLines("a\nb\nc", "a\nB\nc\nd");
    expect(d).toEqual([
      { kind: "same", text: "a" }, { kind: "removed", text: "b" }, { kind: "added", text: "B" },
      { kind: "same", text: "c" }, { kind: "added", text: "d" },
    ]);
    expect(diffStats(d)).toEqual({ added: 2, removed: 1 });
  });
  it("reports no changes for identical text", () => {
    expect(diffStats(diffLines("x\ny", "x\ny"))).toEqual({ added: 0, removed: 0 });
  });
  it("handles an empty side", () => {
    expect(diffStats(diffLines("", "a\nb"))).toEqual({ added: 2, removed: 1 }); // "" counts as one empty line
  });
});

describe("truncateForPreview", () => {
  it("cuts after three lines", () => {
    expect(truncateForPreview("1\n2\n3\n4")).toEqual({ visible: "1\n2\n3", truncated: true });
  });
  it("leaves short text alone", () => {
    expect(truncateForPreview("short")).toEqual({ visible: "short", truncated: false });
  });
  it("cuts long text on a word boundary", () => {
    const r = truncateForPreview("word ".repeat(80).trim(), { maxChars: 20 });
    expect(r.truncated).toBe(true);
    expect(r.visible.length).toBeLessThanOrEqual(20);
    expect(r.visible.endsWith("word")).toBe(true);
  });
  it("flattens a profile into diffable text", () => {
    const t = versionText({ n: 1, createdAt: "", createdBy: "", content: "", profile: { name: "S", headline: "H", about: "A1\nA2", banner: "B" } });
    expect(t).toBe("Banner: B\nHeadline: H\n\nAbout:\nA1\nA2");
  });
});

describe("comment anchors", () => {
  const text = "We help SaaS teams book more calls. We help agencies too.";
  it("creates a trimmed anchor and rejects empty or oversized selections", () => {
    expect(createAnchor(text, 0, 8)).toEqual({ start: 0, end: 7, quote: "We help" });
    expect(createAnchor(text, 2, 2)).toBeNull();
    expect(createAnchor("   ", 0, 3)).toBeNull();
    expect(createAnchor("x".repeat(600), 0, 600)).toBeNull();
  });
  it("keeps an anchor when the text is unchanged", () => {
    const a = { start: 0, end: 7, quote: "We help" };
    expect(reanchor(text, a)).toEqual(a);
  });
  it("moves to the closest occurrence after an edit, or reports it gone", () => {
    const a = { start: 36, end: 43, quote: "We help" };
    const edited = "Intro line. " + text;
    expect(reanchor(edited, a)).toEqual({ start: 48, end: 55, quote: "We help" });
    expect(reanchor("completely different", a)).toBeNull();
  });
  it("segments text around highlights and skips overlaps", () => {
    const segs = segmentText("abcdef", [
      { id: "t1", anchor: { start: 1, end: 3, quote: "bc" } },
      { id: "t2", anchor: { start: 2, end: 4, quote: "cd" } },
    ]);
    expect(segs).toEqual([{ text: "a", threadId: null }, { text: "bc", threadId: "t1" }, { text: "def", threadId: null }]);
  });
});

describe("status rules", () => {
  it("only allows the documented transitions", () => {
    expect(canTransition("in_review", "approved")).toBe(true);
    expect(canTransition("draft", "approved")).toBe(false);
    expect(canTransition("approved", "in_review")).toBe(false);
    expect(canTransition("changes_requested", "in_review")).toBe(true);
  });
  it("locks approved deliverables and blocks comments on them", () => {
    expect(isLocked("approved")).toBe(true);
    expect(canComment("approved")).toBe(false);
    expect(canComment("in_review")).toBe(true);
    expect(canComment("draft")).toBe(false);
  });
  it("lets only the client owner approve, with an admin override flagged", () => {
    expect(canApprove("in_review", "client_owner")).toEqual({ allowed: true, override: false });
    expect(canApprove("in_review", "admin")).toEqual({ allowed: true, override: true });
    expect(canApprove("in_review", "delivery_lead")).toEqual({ allowed: false, override: false });
    expect(canApprove("approved", "client_owner")).toEqual({ allowed: false, override: false });
  });
});

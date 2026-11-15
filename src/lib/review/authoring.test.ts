import { describe, expect, it } from "vitest";
import { canAddVersion, canSend, nextVersionN, validateDraft, versionPayload } from "./authoring";

const empty = { name: "", headline: "", about: "", banner: "" };

describe("authoring", () => {
  it("numbers versions above the highest", () => {
    expect(nextVersionN([])).toBe(1);
    expect(nextVersionN([1, 3, 2])).toBe(4);
  });
  it("allows edits only in draft or after changes were requested", () => {
    expect([canAddVersion("draft"), canAddVersion("changes_requested"), canAddVersion("in_review"), canAddVersion("approved")]).toEqual([true, true, false, false]);
    expect(canSend("draft", 0)).toBe(false);
    expect(canSend("draft", 1)).toBe(true);
  });
  it("validates title and content, and profile fields for profile kind", () => {
    expect(validateDraft({ kind: "icp", title: " ", content: "x", profile: empty }, true)).toBe("delivery.needTitle");
    expect(validateDraft({ kind: "icp", title: "T", content: " ", profile: empty }, true)).toBe("delivery.needContent");
    expect(validateDraft({ kind: "icp", content: "x", profile: empty }, false)).toBeNull();
    expect(validateDraft({ kind: "profile", title: "T", content: "", profile: { ...empty, headline: "h" } }, true)).toBeNull();
  });
  it("puts profile text in the profile and everything else in content", () => {
    expect(versionPayload({ kind: "post", content: "  hi ", profile: empty })).toEqual({ content: "hi", profile: null });
    expect(versionPayload({ kind: "profile", content: "ignored", profile: empty })).toEqual({ content: "", profile: empty });
  });
});

import { describe, expect, it } from "vitest";
import { secretMatches } from "./secret";

describe("secretMatches", () => {
  it("accepts only the exact secret", () => {
    expect(secretMatches("s3cret", "s3cret")).toBe(true);
    expect(secretMatches("s3cre", "s3cret")).toBe(false);
    expect(secretMatches("S3CRET", "s3cret")).toBe(false);
  });
  it("accepts nothing when the secret is unset or the value is missing", () => {
    expect(secretMatches("anything", undefined)).toBe(false);
    expect(secretMatches("anything", "")).toBe(false);
    expect(secretMatches(null, "s3cret")).toBe(false);
    expect(secretMatches(undefined, "s3cret")).toBe(false);
  });
});

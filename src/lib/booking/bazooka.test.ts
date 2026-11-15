import { describe, expect, it } from "vitest";
import { bookingPageUrl, buildEmbedConfig, isBookingLink, resolveBookingLink, BAZOOKA } from "./bazooka";

describe("Bazooka booking", () => {
  it("accepts only an account/event link", () => {
    expect(isBookingLink("consulsales-mu47o1h1/spine-fit-call")).toBe(true);
    for (const bad of ["", "https://evil.test/x", "a/b/c", "a b/c", "<script>/x", undefined, 5]) expect(isBookingLink(bad), String(bad)).toBe(false);
  });
  it("falls back to the default link when the setting is missing or unsafe", () => {
    expect(resolveBookingLink(undefined)).toBe(BAZOOKA.defaultLink);
    expect(resolveBookingLink("https://evil.test/x")).toBe(BAZOOKA.defaultLink);
    expect(resolveBookingLink("acme/kickoff")).toBe("acme/kickoff");
  });
  it("prefills the person and keeps the portal look", () => {
    expect(buildEmbedConfig({ name: " Sara ", email: "sara@studio.com" })).toMatchObject({ theme: "dark", brandColor: "#5e6ad2", name: "Sara", email: "sara@studio.com" });
    const empty = buildEmbedConfig({ name: " ", email: "nope" });
    expect("name" in empty || "email" in empty).toBe(false);
  });
  it("builds the hosted page address for the fallback", () => {
    expect(bookingPageUrl("acme/kickoff")).toBe("https://app.mybazooka.com/acme/kickoff");
  });
});

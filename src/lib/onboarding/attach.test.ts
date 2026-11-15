import { describe, expect, it } from "vitest";
import { planAttach } from "./attach";

describe("planAttach", () => {
  it("creates an account when there is none", () => expect(planAttach(null)).toBe("create"));
  it("uses a confirmed account", () => expect(planAttach({ confirmed: true })).toBe("use"));
  it("replaces an unconfirmed one, so a stranger who signed up first cannot keep it", () => expect(planAttach({ confirmed: false })).toBe("replace"));
});

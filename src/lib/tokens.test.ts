import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("design tokens", () => {
  const theme = readFileSync("src/styles/theme.css", "utf8");
  const globals = readFileSync("src/styles/globals.css", "utf8");

  it("uses the ConsulSales lavender (#5e6ad2) as the brand colour", () => {
    expect(theme).toContain("--color-brand-600: rgb(94 106 210);");
  });
  it("defines a full brand scale, 50 to 950", () => {
    for (const n of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) expect(theme).toMatch(new RegExp(`--color-brand-${n}:\\s*rgb\\(`));
  });
  it("keeps the legacy tokens that unmigrated screens still use", () => {
    expect(globals).toContain("--canvas: #010102;");
    expect(globals).toContain("--accent: #5e6ad2;");
  });
});

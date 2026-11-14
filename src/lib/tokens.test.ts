import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("design tokens", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  it.each([
    ["canvas", "#010102"],
    ["primary", "#5e6ad2"],
    ["hairline", "#23252a"],
    ["ink", "#f7f8f8"],
  ])("defines --%s as %s", (name, hex) => {
    expect(css).toContain(`--${name}: ${hex};`);
  });
});

import { expect, test } from "@playwright/test";

test("UI kit shows every component", async ({ page }) => {
  await page.goto("/dev/kit");
  await expect(page.getByRole("heading", { name: "UI kit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("kit has no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dev/kit");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

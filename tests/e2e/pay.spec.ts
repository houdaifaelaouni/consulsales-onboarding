import { expect, test } from "@playwright/test";

test("pay screen: card picture, what you get, and a payment panel", async ({ page }) => {
  await page.goto("/demo/pay");
  await expect(page.getByRole("heading", { name: "Pay to open your workspace" })).toBeVisible();
  await expect(page.getByText("Step 1 of 3 · Foundation")).toBeVisible();
  await expect(page.getByRole("region", { name: "Payment" })).toBeVisible();
  await expect(page.getByText(/Next payment \(€750\)/)).toBeVisible();
});

test("pay screen: no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo/pay");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

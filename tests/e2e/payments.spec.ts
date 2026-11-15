import { expect, test } from "@playwright/test";

test("payments: locked stage, due stage, and paying updates the summary", async ({ page }) => {
  await page.goto("/demo/payments");
  await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
  await expect(page.getByText("Appears when: You approve your profile and first messages")).toBeVisible();
  await expect(page.getByText("Due in 4 days")).toBeVisible();

  await page.getByRole("button", { name: /Pay €900/ }).click();
  await expect(page.getByText(/Paid on/).first()).toBeVisible();
  await expect(page.getByText("Nothing to pay right now")).toBeVisible();
});

test("payments: no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo/payments");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

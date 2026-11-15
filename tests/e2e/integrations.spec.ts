import { expect, test } from "@playwright/test";

test("integrations: every key is listed with its status, and no secret value is ever shown", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/demo/integrations");
  await expect(page.getByRole("heading", { name: "Integrations and keys" })).toBeVisible();
  await expect(page.getByText("WHOP_API_KEY")).toBeVisible();
  await expect(page.getByText("SUPABASE_SERVICE_ROLE_KEY")).toBeVisible();
  await expect(page.getByText("RESEND_API_KEY")).toBeVisible();
  await expect(page.getByText("Needs setup").first()).toBeVisible();
  await expect(page.getByText("/api/webhooks/whop").first()).toBeVisible();
  // Sample "set" keys must not leak their sample values into the page.
  await expect(page.locator("body")).not.toContainText("sample.supabase.co");
});

test("the two sides are separate: signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/app/payments");
  await expect(page).toHaveURL(/\/login/);
});

test("integrations: no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo/integrations");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

import { expect, test } from "@playwright/test";

test("health page responds", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByText("ok")).toBeVisible();
});

test("home uses the dark canvas token", async ({ page }) => {
  await page.goto("/");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(1, 1, 2)");
});

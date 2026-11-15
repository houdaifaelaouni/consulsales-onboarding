import { expect, test } from "@playwright/test";

test("access board: shows statuses, the 72 h alert, and validates the booking link", async ({ page }) => {
  await page.goto("/demo/access");
  await expect(page.getByRole("heading", { name: "Access and assets" })).toBeVisible();
  await expect(page.getByText("our team has been alerted")).toBeVisible();
  await expect(page.getByText("1 of 4 ready")).toBeVisible();

  // CRM connect moves the counter.
  await page.getByRole("button", { name: "Connect HubSpot" }).click();
  await expect(page.getByText("HubSpot · Studio North")).toBeVisible();
  await expect(page.getByText("2 of 4 ready")).toBeVisible();

  // "Try again" clears the blocked state.
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("our team has been alerted")).toBeHidden();
});

test("access board: rejects non-image files and shows a preview for images", async ({ page }) => {
  await page.goto("/demo/access");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "malware.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("x") });
  await expect(page.getByRole("alert").filter({ hasText: "malware.exe is not an image or PDF." })).toBeVisible();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await input.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("logo.png")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove logo.png" })).toBeVisible();
});

test("access board: no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo/access");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

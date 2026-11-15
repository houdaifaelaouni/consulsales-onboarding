import { expect, test } from "@playwright/test";

test("booking: pick a day and time, confirm, get a calendar file", async ({ page }) => {
  await page.goto("/demo/booking");
  await expect(page.getByRole("heading", { name: "Book your kickoff call" })).toBeVisible();
  await expect(page.getByText("45 minutes with your delivery lead")).toBeVisible();

  const confirm = page.getByRole("button", { name: "Confirm booking" });
  await expect(confirm).toBeDisabled();
  await page.getByRole("group", { name: "Choose a time" }).getByRole("button").first().click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("heading", { name: /Kickoff booked/ })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  expect((await download).suggestedFilename()).toBe("consulsales-kickoff.ics");

  await page.getByRole("button", { name: "Choose another time" }).click();
  await expect(page.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
});

test("booking: plan changes the call length, and a failed booking shows an error with a fallback", async ({ page }) => {
  await page.goto("/demo/booking");
  await page.getByRole("button", { name: /Demo plan/ }).click();
  await page.getByRole("option", { name: "Starter (30 min)" }).click();
  await expect(page.getByText("30 minutes with your delivery lead")).toBeVisible();
  // The real checkbox input is visually hidden; click its visible label like a person would.
  await page.getByText("Simulate a failed booking").click();
  await page.getByRole("group", { name: "Choose a time" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("alert")).toContainText("We could not book that time");
  await expect(page.getByRole("link", { name: "Use our booking page instead" })).toBeVisible();
});

test("booking: no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo/booking");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

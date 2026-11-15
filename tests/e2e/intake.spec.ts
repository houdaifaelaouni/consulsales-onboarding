import { expect, test } from "@playwright/test";

async function pick(page: import("@playwright/test").Page, label: RegExp | string, option: string) {
  await page.getByRole("button", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

test("intake blocks Next until required answers, autosaves and resumes", async ({ page }) => {
  await page.goto("/demo/intake");
  await expect(page.getByRole("heading", { name: "Company" })).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/needs an answer/).first()).toBeVisible();

  await page.getByLabel(/What do you sell/).fill("We run paid search for SaaS.");
  await pick(page, /How big is your team/, "2 to 5");
  await pick(page, /monthly recurring revenue/, "10k to 30k");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  // Resume at the first unfinished step after a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
});

test("'not sure' satisfies a required question", async ({ page }) => {
  await page.goto("/demo/intake");
  await page.getByLabel(/What do you sell/).fill("x");
  await pick(page, /How big is your team/, "Just me");
  await pick(page, /monthly recurring revenue/, "Under 10k");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("checkbox", { name: "I am not sure" }).first().check();
  await page.getByRole("checkbox", { name: "I am not sure" }).nth(1).check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Voice" })).toBeVisible();
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo/intake");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

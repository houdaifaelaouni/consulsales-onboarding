import { expect, test } from "@playwright/test";

test("intake blocks Next until required answers, autosaves and resumes", async ({ page }) => {
  await page.goto("/demo/intake");
  await expect(page.getByRole("heading", { name: "Company" })).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.getByLabel("What do you sell, in one or two sentences?").fill("We run paid search for SaaS.");
  await page.getByLabel("How big is your team?").selectOption("2 to 5");
  await page.getByLabel("Roughly how much monthly recurring revenue do you have?").selectOption("10k to 30k");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();

  // Resume at the first unfinished step after a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
});

test("'not sure' satisfies a required question", async ({ page }) => {
  await page.goto("/demo/intake");
  await page.getByLabel("What do you sell, in one or two sentences?").fill("x");
  await page.getByLabel("How big is your team?").selectOption("Just me");
  await page.getByLabel("Roughly how much monthly recurring revenue do you have?").selectOption("Under 10k");
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

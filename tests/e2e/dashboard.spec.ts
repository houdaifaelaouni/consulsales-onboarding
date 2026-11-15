import { expect, test } from "@playwright/test";

test("overview: stats, next step and checklist table", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Welcome back, Sara" })).toBeVisible();
  await expect(page.getByText("Day 3 of 30 · Studio North")).toBeVisible();
  await expect(page.getByText("1 / 7")).toBeVisible();
  await expect(page.getByRole("grid", { name: "Checklist" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Complete the intake/ })).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).first().click();
  await expect(page).toHaveURL(/\/demo\/intake/);
});

test("sidebar: logo, active item, and navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/demo/payments");
  await expect(page.getByRole("img", { name: "ConsulSales" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Payments" }).first()).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Clients" }).first().click();
  await expect(page).toHaveURL(/\/demo\/admin/);
});

test("phone: menu button opens the navigation and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Expand navigation menu" }).click();
  await expect(page.getByRole("link", { name: "Deliverables" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

import { expect, test } from "@playwright/test";

test("admin board: blockers first, filters, and client detail", async ({ page }) => {
  await page.goto("/demo/admin");
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
  await expect(page.getByText("3 need attention")).toBeVisible();
  await expect(page.getByText("Access blocked 90h")).toBeVisible();
  await expect(page.getByText(/Invoice unpaid 9 days/)).toBeVisible();

  // Within a column, the blocked client sits above the clean one.
  const intake = page.getByRole("region", { name: /Intake/ });
  await expect(intake.getByRole("heading", { level: 3 }).first()).toHaveText("Arc Media");

  await page.getByLabel("Owner").selectOption("Mia");
  await expect(page.getByText("Studio North")).toHaveCount(0);

  await page.getByRole("link", { name: /Mono Agency/ }).click();
  await expect(page.getByRole("heading", { name: "Mono Agency" })).toBeVisible();
  await expect(page.getByText("Reminder sent: invoice overdue")).toBeVisible();
  await page.getByLabel("Add a note only your team can see").fill("Follow up Monday.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Follow up Monday.")).toBeVisible();
});

test("admin board: no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/demo/admin", "/demo/admin/mono-agency"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  }
});

import { expect, test } from "@playwright/test";

test("welcome flow: five steps, live summary, skip, booking and a final summary", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your first 30 days, mapped" })).toBeVisible();
  await expect(page.getByText(/You are here: Intake and access/)).toBeVisible();

  // Selecting a milestone shows what the client and the team each do.
  await page.getByRole("button", { name: /Ideal client approved/ }).click();
  await expect(page.getByText("Your stage 2 invoice appears only after you approve.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Goals: the estimate reacts to the numbers; an empty deal value blocks Continue.
  await expect(page.getByRole("heading", { name: "What would a great month look like?" })).toBeVisible();
  await expect(page.getByText(/About 2.4 new clients a month/)).toBeVisible();
  await page.getByRole("button", { name: "30%" }).click();
  await expect(page.getByText(/About 3.6 new clients a month/)).toBeVisible();
  await page.getByLabel("Average first-deal value (€)").fill("");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByLabel("Average first-deal value (€)").fill("5000");
  await page.getByRole("button", { name: "Continue" }).click();

  // Access: choose later, then skip the kickoff.
  await page.getByRole("radio", { name: /I will do this later/ }).check();
  await expect(page.getByText("Access: I will do this later.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();

  // Ready: lists what is still open and links to the dashboard.
  await expect(page.getByRole("heading", { name: "You are all set, Sara" })).toBeVisible();
  await expect(page.getByText("Share LinkedIn access")).toBeVisible();
  await expect(page.getByText("Book your kickoff call")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to my dashboard" })).toHaveAttribute("href", "/demo");
});

test("welcome flow: progress is saved and restored after a reload", async ({ page }) => {
  await page.goto("/welcome");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
});

test("welcome flow: books the kickoff and shows it on the last screen", async ({ page }) => {
  await page.goto("/welcome");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("group", { name: "Choose a time" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: /Kickoff booked/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Kickoff call booked:/)).toBeVisible();
});

test("welcome flow: no horizontal scroll at 375px on any step", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/welcome");
  for (let i = 0; i < 4; i++) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.getByRole("button", { name: "Continue" }).click();
  }
});

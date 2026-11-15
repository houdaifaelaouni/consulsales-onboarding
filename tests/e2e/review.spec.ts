import { expect, test } from "@playwright/test";

test("select text, comment, then approve and lock", async ({ page }) => {
  await page.goto("/demo/review/icp");
  await expect(page.getByRole("heading", { name: "Ideal client profile" }).first()).toBeVisible();
  await expect(page.getByText("Comments (2)")).toBeVisible();

  // Select a phrase inside the text block; the page picks the selection up once it has loaded, so retry until it does.
  await expect(async () => {
    await page.evaluate(() => {
      const root = document.querySelector("div.whitespace-pre-wrap")!;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const i = node.textContent!.indexOf("Head of Marketing");
        if (i >= 0) {
          const r = document.createRange();
          r.setStart(node, i); r.setEnd(node, i + "Head of Marketing".length);
          const s = document.getSelection()!; s.removeAllRanges(); s.addRange(r);
          return;
        }
      }
    });
    await expect(page.getByText("Comment on:")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByLabel("Write your comment").fill("Add Head of Sales too.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("Comments (3)")).toBeVisible();

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Yes, approve" }).click();
  await expect(page.getByText(/Approved by Sara Lopez/)).toBeVisible();
  await expect(page.getByText("Locked. Comments are closed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
});

test("versions tab shows a diff with added and removed lines", async ({ page }) => {
  await page.goto("/demo/review/icp");
  await page.getByRole("tab", { name: "Versions" }).click();
  await expect(page.getByText(/lines added, .* lines removed/)).toBeVisible();
});

test("request changes needs a note", async ({ page }) => {
  await page.goto("/demo/review/profile");
  await page.getByRole("button", { name: "Request changes" }).click();
  await expect(page.getByRole("button", { name: "Send request" })).toBeDisabled();
  await page.getByRole("textbox", { name: "What should change?" }).fill("Shorter headline please.");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("You asked for changes.")).toBeVisible();
});

test("profile preview shows old and new side by side and expands 'see more'", async ({ page }) => {
  await page.goto("/demo/review/profile");
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByText("Current profile")).toBeVisible();
  await expect(page.getByText("New profile")).toBeVisible();
  await page.getByRole("button", { name: "…see more" }).click();
  await expect(page.getByText("Book a 20 minute intro call below.")).toBeVisible();
});

test("approved deliverable is locked from the start", async ({ page }) => {
  await page.goto("/demo/review/post");
  await expect(page.getByText(/Approved by Sara Lopez/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Request changes" })).toHaveCount(0);
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/demo/review", "/demo/review/icp", "/demo/review/profile"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  }
});

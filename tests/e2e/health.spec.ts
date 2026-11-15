import { expect, test } from "@playwright/test";

test("health page responds", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByText("ok")).toBeVisible();
});

test("home uses the dark theme", async ({ page }) => {
  await page.goto("/");
  // Browsers may report the colour as rgb() or lab(); read it back as plain pixel values.
  const px = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d")!;
    c.fillStyle = getComputedStyle(document.body).backgroundColor;
    c.fillRect(0, 0, 1, 1);
    return Array.from(c.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });
  // Dark by default: the canvas is near black (the exact shade comes from the Untitled UI theme).
  px.forEach((v) => expect(v).toBeLessThan(24));
});

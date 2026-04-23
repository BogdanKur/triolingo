import { expect, test } from "@playwright/test";

test("smoke flow: login -> language -> assessment -> home", async ({ page }) => {
  await page.goto("/second.html");
  await page.getByRole("link", { name: /Continue with Google/i }).click();

  await page.waitForURL(/third\.html/);
  await page.getByRole("button", { name: /Английский/i }).click();
  await page.getByRole("button", { name: /^Start$/i }).click();

  await page.waitForURL(/fourth\.html/);
  const options = page.locator(".question-option");
  const count = await options.count();
  for (let i = 0; i < count; i += 4) {
    await options.nth(i).click();
  }
  await page.getByRole("button", { name: /^Start$/i }).click();

  await page.waitForURL(/fifth\.html/);
  await expect(page.locator(".home-title")).toBeVisible();
});

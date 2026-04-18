// tests/navigation.spec.js — Screen switching and nav visibility tests

import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("app loads with phase-idle on body", async ({ page }) => {
    await expect(page.locator("body")).toHaveClass(/phase-idle/);
  });

  test("#screen-activity is active by default", async ({ page }) => {
    await expect(page.locator("#screen-activity")).toHaveClass(/active/);
    await expect(page.locator("#screen-manage")).not.toHaveClass(/active/);
  });

  test("clicking nav-manage shows manage screen", async ({ page }) => {
    await page.click("#nav-manage");
    await expect(page.locator("#screen-manage")).toHaveClass(/active/);
    await expect(page.locator("#screen-activity")).not.toHaveClass(/active/);
  });

  test("clicking nav-practice switches back to activity screen", async ({ page }) => {
    await page.click("#nav-manage");
    await page.click("#nav-practice");
    await expect(page.locator("#screen-activity")).toHaveClass(/active/);
    await expect(page.locator("#screen-manage")).not.toHaveClass(/active/);
  });

  test("#main-nav is visible during phase-idle", async ({ page }) => {
    await expect(page.locator("#main-nav")).toBeVisible();
  });

  test("#main-nav is hidden during phase-active", async ({ page }) => {
    // Seed a word then start a session
    await page.evaluate(async () => {
      const { saveWord } = await import("/db.js");
      await saveWord({ word: "test", gramCat: "Verb", sentences: ["She (tests) the app."] });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.click("#start-btn");
    await expect(page.locator("body")).toHaveClass(/phase-active/);
    await expect(page.locator("#main-nav")).not.toBeVisible();
  });
});

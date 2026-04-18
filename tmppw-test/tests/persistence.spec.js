// tests/persistence.spec.js — localStorage session persistence tests

import { test, expect } from "@playwright/test";

async function seedWord(page, { word = "run", gramCat = "Verb", sentences = ["She (runs) every morning."] } = {}) {
  await page.evaluate(async ({ word, gramCat, sentences }) => {
    const { saveWord } = await import("/db.js");
    await saveWord({ word, gramCat, sentences });
  }, { word, gramCat, sentences });
}

test.describe("Session persistence across page reload", () => {
  test("placing a chip and reloading restores the session (chip still placed)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await seedWord(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Start a session
    await page.click("#start-btn");
    await expect(page.locator("body")).toHaveClass(/phase-active/);

    // Place a chip
    const chip = page.locator("#chip-area .chip:not([disabled])").first();
    await expect(chip).toBeEnabled();
    const chipText = (await chip.textContent()).trim();
    await chip.click();

    // Verify blank is filled
    await expect(page.locator(".blank-btn.filled")).toContainText(chipText);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Session should be restored — still in phase-active
    await expect(page.locator("body")).toHaveClass(/phase-active/);
    await expect(page.locator(".blank-btn.filled")).toContainText(chipText);
    await expect(page.locator(".chip.used")).not.toHaveCount(0);
  });

  test("reloading after Check Answers starts at phase-idle (graded state not saved)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await seedWord(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Start and complete a session
    await page.click("#start-btn");
    await expect(page.locator("body")).toHaveClass(/phase-active/);
    await page.locator("#chip-area .chip:not([disabled])").first().click();
    await expect(page.locator("#check-btn")).not.toBeDisabled();
    await page.locator("#check-btn").click();
    await expect(page.locator("body")).toHaveClass(/phase-graded/);

    // Reload — should return to idle
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toHaveClass(/phase-idle/);
  });

  test("back button during session clears localStorage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await seedWord(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.click("#start-btn");
    await expect(page.locator("body")).toHaveClass(/phase-active/);
    await page.locator("#chip-area .chip:not([disabled])").first().click();

    // Navigate back
    await page.click("#back-btn-active");
    await expect(page.locator("body")).toHaveClass(/phase-idle/);

    // Reload — should remain at idle (no saved session)
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toHaveClass(/phase-idle/);
  });

  test("session restored after reload has enabled check-btn if all blanks were filled", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await seedWord(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.click("#start-btn");
    await expect(page.locator("body")).toHaveClass(/phase-active/);

    // Fill the single blank (1 word → 1 blank)
    await page.locator("#chip-area .chip:not([disabled])").first().click();
    await expect(page.locator("#check-btn")).not.toBeDisabled();

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Session restored — check-btn should still be enabled (all blanks filled)
    await expect(page.locator("body")).toHaveClass(/phase-active/);
    await expect(page.locator("#check-btn")).not.toBeDisabled();
  });
});

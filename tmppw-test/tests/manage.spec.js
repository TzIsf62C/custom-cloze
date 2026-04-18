// tests/manage.spec.js — Word management screen tests

import { test, expect } from "@playwright/test";

// Helper: navigate to manage screen
async function goToManage(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.click("#nav-manage");
}

test.describe("Manage screen — empty DB", () => {
  test("shows 'No words saved yet' when DB is empty", async ({ page }) => {
    await goToManage(page);
    await expect(page.locator("#saved-words-list")).toContainText("No words saved yet");
  });

  test("Manual Entry tab is active by default", async ({ page }) => {
    await goToManage(page);
    await expect(page.locator("#panel-manual")).toHaveClass(/active/);
    await expect(page.locator("#panel-csv")).not.toHaveClass(/active/);
    await expect(page.locator("#panel-samples")).not.toHaveClass(/active/);
  });
});

test.describe("Manage screen — tab switching", () => {
  test.beforeEach(async ({ page }) => {
    await goToManage(page);
  });

  test("clicking CSV tab shows panel-csv", async ({ page }) => {
    await page.click("#tab-csv");
    await expect(page.locator("#panel-csv")).toHaveClass(/active/);
    await expect(page.locator("#panel-manual")).not.toHaveClass(/active/);
  });

  test("clicking Samples tab shows panel-samples", async ({ page }) => {
    await page.click("#tab-samples");
    await expect(page.locator("#panel-samples")).toHaveClass(/active/);
  });

  test("clicking back to Manual tab shows panel-manual", async ({ page }) => {
    await page.click("#tab-csv");
    await page.click("#tab-manual");
    await expect(page.locator("#panel-manual")).toHaveClass(/active/);
    await expect(page.locator("#panel-csv")).not.toHaveClass(/active/);
  });
});

test.describe("Manage screen — manual entry", () => {
  test.beforeEach(async ({ page }) => {
    await goToManage(page);
  });

  test("saving a valid word shows success message and word appears in list", async ({ page }) => {
    await page.fill("#word-input", "jump");
    await page.selectOption("#gramcat-select", "Verb");
    await page.fill(".sentence-input", "She (jumps) over the fence.");
    await page.click("#save-word-btn");

    await expect(page.locator("#save-status")).toContainText("jump");
    await expect(page.locator("#save-status")).not.toHaveClass("error");
    await expect(page.locator("#saved-words-list")).toContainText("jump");
    await expect(page.locator("#saved-words-list")).toContainText("Verb");
  });

  test("saving without a word shows error", async ({ page }) => {
    await page.fill(".sentence-input", "She (jumps) over the fence.");
    await page.click("#save-word-btn");
    await expect(page.locator("#save-status")).toHaveClass(/error/);
    await expect(page.locator("#save-status")).toContainText("word");
  });

  test("saving without any sentence shows error", async ({ page }) => {
    await page.fill("#word-input", "jump");
    // Leave sentence input blank
    await page.click("#save-word-btn");
    await expect(page.locator("#save-status")).toHaveClass(/error/);
    await expect(page.locator("#save-status")).toContainText("sentence");
  });

  test("custom category toggle reveals input and saves with custom category", async ({ page }) => {
    await page.check("#custom-cat-toggle");
    await expect(page.locator("#custom-cat-input")).toBeVisible();

    await page.fill("#word-input", "sprint");
    await page.fill("#custom-cat-input", "Athletics");
    await page.fill(".sentence-input", "He (sprints) to the finish line.");
    await page.click("#save-word-btn");

    await expect(page.locator("#saved-words-list")).toContainText("sprint");
    await expect(page.locator("#saved-words-list")).toContainText("Athletics");
  });

  test("adding a sentence row increases row count", async ({ page }) => {
    await expect(page.locator(".sentence-row")).toHaveCount(1);
    await page.click("#add-sentence-btn");
    await expect(page.locator(".sentence-row")).toHaveCount(2);
  });

  test("removing a row decreases row count", async ({ page }) => {
    await page.click("#add-sentence-btn");
    await expect(page.locator(".sentence-row")).toHaveCount(2);
    await page.locator(".remove-sentence-btn").first().click();
    await expect(page.locator(".sentence-row")).toHaveCount(1);
  });

  test("remove button is disabled when only one row remains", async ({ page }) => {
    await expect(page.locator(".remove-sentence-btn").first()).toBeDisabled();
  });

  test("remove button is enabled when two rows exist", async ({ page }) => {
    await page.click("#add-sentence-btn");
    const btns = page.locator(".remove-sentence-btn");
    await expect(btns.first()).not.toBeDisabled();
    await expect(btns.nth(1)).not.toBeDisabled();
  });
});

test.describe("Manage screen — delete word", () => {
  test("deleting a word removes it from the list", async ({ page }) => {
    await goToManage(page);

    // Save a word first
    await page.fill("#word-input", "fly");
    await page.fill(".sentence-input", "Birds (fly) south in winter.");
    await page.click("#save-word-btn");
    await expect(page.locator("#saved-words-list")).toContainText("fly");

    // Delete it
    await page.locator(".delete-word-btn").first().click();
    await expect(page.locator("#saved-words-list")).not.toContainText("fly");
    await expect(page.locator("#saved-words-list")).toContainText("No words saved yet");
  });
});

test.describe("Manage screen — db-updated event syncs cat-select", () => {
  test("saving a word updates #cat-select in the activity screen", async ({ page }) => {
    await goToManage(page);

    // Confirm cat-select is initially empty or doesn't have "Adverb" custom
    await page.fill("#word-input", "slowly");
    await page.selectOption("#gramcat-select", "Adverb");
    await page.fill(".sentence-input", "She (slowly) opened the door.");
    await page.click("#save-word-btn");

    // Switch to activity screen and check cat-select
    await page.click("#nav-practice");
    const opts = await page.locator("#cat-select option").allTextContents();
    expect(opts).toContain("Adverb");
  });
});

test.describe("Manage screen — CSV file upload", () => {
  test("uploading a CSV imports words and shows success count", async ({ page }) => {
    await goToManage(page);
    await page.click("#tab-csv");

    const csvContent = `word,category,sentences
bright,Adjective,The sun is very (bright) today.|She has a (bright) future ahead.
dark,Adjective,It was a (dark) and stormy night.|The room felt (dark) and cold.`;

    // Use DataTransfer to simulate file drop
    await page.locator("#csv-file-input").setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    // Wait for CSV status to update
    await expect(page.locator("#csv-status")).toContainText("Imported 2");
    await expect(page.locator("#saved-words-list")).toContainText("bright");
    await expect(page.locator("#saved-words-list")).toContainText("dark");
  });

  test("CSV rows without word or category are counted as errors", async ({ page }) => {
    await goToManage(page);
    await page.click("#tab-csv");

    const csvContent = `word,category,sentences
valid,Verb,She (validates) everything.
,Noun,Missing word field.
nocat,,Missing category field.`;

    await page.locator("#csv-file-input").setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    await expect(page.locator("#csv-status")).toContainText("Imported 1");
    await expect(page.locator("#csv-status")).toContainText("2 rows had errors");
  });
});

test.describe("Manage screen — samples", () => {
  test("English sample import button is visible before import", async ({ page }) => {
    await goToManage(page);
    await page.click("#tab-samples");
    await expect(page.locator("#sample-buttons")).toContainText("English");
  });

  test("importing English sample adds words to saved list", async ({ page }) => {
    await goToManage(page);
    await page.click("#tab-samples");

    // Wait for buttons to render
    await page.waitForSelector("#sample-buttons button");
    const importBtn = page.locator("#sample-buttons button[data-action='import']").first();
    await importBtn.click();

    // Words should now appear in the saved list
    await expect(page.locator("#saved-words-list .word-row").first()).toBeVisible();

    // Button should now show delete state
    await expect(page.locator("#sample-buttons button[data-action='delete']").first()).toBeVisible();
  });

  test("deleting a sample removes words", async ({ page }) => {
    await goToManage(page);
    await page.click("#tab-samples");
    await page.waitForSelector("#sample-buttons button");

    // Import first
    const importBtn = page.locator("#sample-buttons button[data-action='import']").first();
    await importBtn.click();
    await page.waitForSelector("#sample-buttons button[data-action='delete']");

    // Now delete
    const deleteBtn = page.locator("#sample-buttons button[data-action='delete']").first();
    await deleteBtn.click();

    // Button should revert to import state
    await expect(page.locator("#sample-buttons button[data-action='import']").first()).toBeVisible();
  });
});

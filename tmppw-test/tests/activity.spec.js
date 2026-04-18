// tests/activity.spec.js — Practice screen tests

import { test, expect } from "@playwright/test";

// Seed the database with a word via the module API
async function seedWord(page, { word = "run", gramCat = "Verb", sentences = ["She (runs) every morning."] } = {}) {
  await page.evaluate(async ({ word, gramCat, sentences }) => {
    const { saveWord } = await import("/db.js");
    await saveWord({ word, gramCat, sentences });
  }, { word, gramCat, sentences });
}

/**
 * Click #start-btn and wait for phase-active to be set.
 * startSession() is async, so the phase switch happens after an IndexedDB call.
 * Simply clicking and immediately calling count() would race — this helper waits.
 */
async function startSession(page) {
  await page.click("#start-btn");
  await expect(page.locator("body")).toHaveClass(/phase-active/);
}

/**
 * Fill all blank buttons by clicking available chips one by one.
 * Waits for each chip to become available before clicking.
 */
async function fillAllBlanks(page) {
  // Wait until at least one blank exists (rendering is complete)
  await expect(page.locator(".blank-btn").first()).toBeAttached();
  const blanksCount = await page.locator(".blank-btn").count();
  for (let i = 0; i < blanksCount; i++) {
    const chip = page.locator("#chip-area .chip:not([disabled])").first();
    await expect(chip).toBeEnabled();
    await chip.click();
  }
  await expect(page.locator("#check-btn")).not.toBeDisabled();
}

// Seed enough words to guarantee a full 5-word session + 2 distractors
async function seedManyWords(page) {
  await page.evaluate(async () => {
    const { saveWord } = await import("/db.js");
    const words = [
      { word: "walk",  gramCat: "Verb", sentences: ["She (walks) to school."] },
      { word: "speak", gramCat: "Verb", sentences: ["She (speaks) clearly."] },
      { word: "write", gramCat: "Verb", sentences: ["She (writes) articles."] },
      { word: "read",  gramCat: "Verb", sentences: ["She (reads) daily."] },
      { word: "think", gramCat: "Verb", sentences: ["She always (thinks) first."] },
      { word: "jump",  gramCat: "Verb", sentences: ["He (jumps) high."] },
    ];
    for (const w of words) await saveWord(w);
  });
}

test.describe("Activity screen — empty DB", () => {
  test("shows no-words-msg and hides cat-select and start-btn", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#no-words-msg")).toBeVisible();
    await expect(page.locator("#cat-select")).not.toBeVisible();
    await expect(page.locator("#start-btn")).not.toBeVisible();
  });
});

test.describe("Activity screen — with words", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await seedWord(page);
    // Reload so the category appears in #cat-select
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("#cat-select has options and start-btn is visible", async ({ page }) => {
    await expect(page.locator("#cat-select")).toBeVisible();
    await expect(page.locator("#start-btn")).toBeVisible();
    const opts = await page.locator("#cat-select option").allTextContents();
    expect(opts).toContain("Verb");
  });

  test("clicking Start Session switches to phase-active", async ({ page }) => {
    await startSession(page);
    // already asserted inside startSession()
  });

  test("sentence cards are rendered after starting a session", async ({ page }) => {
    await startSession(page);
    await expect(page.locator(".sentence-card")).toHaveCount(1);
  });

  test("chip buttons appear in #chip-area after starting", async ({ page }) => {
    await startSession(page);
    await expect(page.locator("#chip-area .chip")).not.toHaveCount(0);
  });

  test("#check-btn is disabled when session starts", async ({ page }) => {
    await startSession(page);
    await expect(page.locator("#check-btn")).toBeDisabled();
  });

  test("tapping a chip fills the blank", async ({ page }) => {
    await startSession(page);
    const chip = page.locator("#chip-area .chip").first();
    const chipText = await chip.textContent();
    await chip.click();

    const blank = page.locator(".blank-btn");
    await expect(blank).toHaveText(chipText.trim());
    await expect(blank).toHaveClass(/filled/);
  });

  test("chip gains 'used' class after being placed", async ({ page }) => {
    await startSession(page);
    const chip = page.locator("#chip-area .chip").first();
    await chip.click();
    await expect(chip).toHaveClass(/used/);
    await expect(chip).toBeDisabled();
  });

  test("tapping a filled blank unplaces the chip", async ({ page }) => {
    await startSession(page);
    const chip = page.locator("#chip-area .chip").first();
    await chip.click();

    // Tap the blank to unplace
    const blank = page.locator(".blank-btn");
    await blank.click();

    await expect(blank).toHaveText("_____");
    await expect(blank).not.toHaveClass(/filled/);
    await expect(chip).not.toHaveClass(/used/);
    await expect(chip).not.toBeDisabled();
  });

  test("#check-btn stays disabled until all blanks filled", async ({ page }) => {
    await startSession(page);
    await expect(page.locator("#check-btn")).toBeDisabled();
    // 1 word seeded by beforeEach → 1 blank → 1 chip
    await page.locator("#chip-area .chip").first().click();
    await expect(page.locator("#check-btn")).not.toBeDisabled();
  });

  test("check answers switches to phase-graded", async ({ page }) => {
    await startSession(page);
    await fillAllBlanks(page);
    await page.locator("#check-btn").click();
    await expect(page.locator("body")).toHaveClass(/phase-graded/);
  });

  test("#score-display is set after grading", async ({ page }) => {
    await startSession(page);
    await fillAllBlanks(page);
    await page.locator("#check-btn").click();
    await expect(page.locator("#score-display")).toContainText("Score:");
    await expect(page.locator("#score-display")).toContainText("/ 1");
  });

  test("graded blanks show correct or incorrect class", async ({ page }) => {
    await startSession(page);
    await fillAllBlanks(page);
    await page.locator("#check-btn").click();
    const blank = page.locator(".blank-btn.graded");
    const classes = await blank.getAttribute("class");
    expect(classes).toMatch(/correct|incorrect/);
  });

  test("incorrect blank reveals answer when clicked (deterministic)", async ({ page }) => {
    // Seed a second word so the bank has 2 correct chips.
    // We then read the session from localStorage to deliberately place the WRONG chip.
    await seedWord(page, { word: "fly", gramCat: "Verb", sentences: ["Birds (fly) south."] });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await startSession(page);

    // Read the session data saved to localStorage
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("customcloze_session"))
    );

    // Find the correct chip for the FIRST blank (sentenceIndex = blanks[0].sentenceIndex)
    const firstBlank  = session.blanks[0];
    const firstWord   = session.sessionWords[firstBlank.sentenceIndex];
    const correctText = firstWord.parts.find(p => p.type === "blank").answer;

    // Find a chip whose text differs — this is guaranteed wrong for blank 0
    const wrongChip = session.wordBank.find(c => c.text.toLowerCase() !== correctText.toLowerCase());

    if (!wrongChip) {
      // Only 1 chip in bank — nothing to compare; skip gracefully
      return;
    }

    // Click the wrong chip → it fills blank 0
    await page.locator(`[data-chip-id="${wrongChip.id}"]`).click();

    // Fill any remaining blanks with whatever chips are left
    const blanksCount = session.blanks.length;
    for (let i = 1; i < blanksCount; i++) {
      const available = page.locator("#chip-area .chip:not([disabled])");
      if (await available.count() > 0) await available.first().click();
    }

    await expect(page.locator("#check-btn")).not.toBeDisabled();
    await page.locator("#check-btn").click();

    // Blank 0 must be incorrect
    const incorrectBlank = page.locator(".blank-btn.incorrect").first();
    await expect(incorrectBlank).toBeVisible();

    // The reveal div starts hidden
    const reveal = page.locator(".correct-answer-reveal").first();
    await expect(reveal).not.toBeVisible();

    // Clicking the incorrect blank toggles the reveal
    await incorrectBlank.click();
    await expect(reveal).toBeVisible();
  });

  test("#back-btn-active resets to phase-idle", async ({ page }) => {
    await startSession(page);
    await page.click("#back-btn-active");
    await expect(page.locator("body")).toHaveClass(/phase-idle/);
  });

  test("#back-btn-graded resets to phase-idle", async ({ page }) => {
    await startSession(page);
    await fillAllBlanks(page);
    await page.locator("#check-btn").click();
    await page.click("#back-btn-graded");
    await expect(page.locator("body")).toHaveClass(/phase-idle/);
  });

  test("#next-btn starts a new session in the same category", async ({ page }) => {
    // Need enough words so the next session also has words available
    await seedManyWords(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await startSession(page);
    await fillAllBlanks(page);
    await page.locator("#check-btn").click();

    await page.click("#next-btn");
    // next-btn calls startSession which is async; wait for phase-active
    await expect(page.locator("body")).toHaveClass(/phase-active/);
    await expect(page.locator(".sentence-card")).not.toHaveCount(0);
  });
});

test.describe("Activity screen — correct answer grading", () => {
  test("correct answer gets correct class and score shows full marks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Seed one word with one known answer
    await page.evaluate(async () => {
      const { saveWord } = await import("/db.js");
      await saveWord({ word: "achieve", gramCat: "Verb", sentences: ["She (achieves) great things."] });
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.click("#start-btn");

    // The only chip should have text "achieves"
    const chip = page.locator("#chip-area .chip");
    await expect(chip).toHaveText("achieves");
    await chip.click();
    await page.locator("#check-btn").click();

    await expect(page.locator(".blank-btn.correct")).toHaveCount(1);
    await expect(page.locator("#score-display")).toHaveText("Score: 1 / 1");
  });
});

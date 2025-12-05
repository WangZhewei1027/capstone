import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d57b831-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the LCS app
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.string1 = page.locator('#string1');
    this.string2 = page.locator('#string2');
    this.findButton = page.locator('button[onclick="findLCS()"]');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillStrings(s1, s2) {
    await this.string1.fill(s1);
    await this.string2.fill(s2);
  }

  async clickFind() {
    await this.findButton.click();
  }

  async getResultText() {
    return (await this.result.innerText()).trim();
  }
}

test.describe('LCS Interactive Application - FSM Validation', () => {
  let consoleErrors = [];
  let pageErrors = [];
  let consoleListener;
  let pageErrorListener;

  test.beforeEach(async ({ page }) => {
    // Capture console "error" messages and page errors for each test.
    consoleErrors = [];
    pageErrors = [];

    consoleListener = (msg) => {
      // Only collect messages that are errors to observe runtime problems
      if (msg.type && msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };
    pageErrorListener = (err) => {
      pageErrors.push(err && err.message ? err.message : String(err));
    };

    page.on('console', consoleListener);
    page.on('pageerror', pageErrorListener);

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Assert that no uncaught console errors or page errors were emitted during the test.
    // The FSM/HTML provided has no deliberate runtime errors; tests will validate that.
    expect(consoleErrors, `Unexpected console.error messages: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toHaveLength(0);

    // Remove listeners to avoid cross-test pollution
    page.off('console', consoleListener);
    page.off('pageerror', pageErrorListener);
  });

  test('Initial Idle state renders expected elements (inputs, button, empty result)', async ({ page }) => {
    // Validate initial S0_Idle evidence: inputs and button exist and placeholders are correct
    const app = new LCSPage(page);

    // Inputs should be visible
    await expect(app.string1).toBeVisible();
    await expect(app.string2).toBeVisible();

    // Placeholders as described by FSM evidence
    expect(await app.string1.getAttribute('placeholder')).toBe('Enter first string');
    expect(await app.string2.getAttribute('placeholder')).toBe('Enter second string');

    // Button with onclick should be present
    await expect(app.findButton).toBeVisible();
    expect(await app.findButton.innerText()).toBe('Find LCS');

    // The result area should be present and initially empty
    await expect(app.result).toBeVisible();
    expect(await app.getResultText()).toBe('');
  });

  test('Transition: clicking Find LCS updates result (simple example)', async ({ page }) => {
    // This test validates the transition S0_Idle -> S1_ResultDisplayed using a simple example
    const app1 = new LCSPage(page);

    // Input strings where LCS is known: 'abcde' and 'ace' -> 'ace'
    await app.fillStrings('abcde', 'ace');
    await app.clickFind();

    // Verify that result.innerText updated to include the LCS
    const resultText = await app.getResultText();
    expect(resultText).toBe('Longest Common Subsequence: ace');
  });

  test('Edge case: both inputs empty results in empty LCS string (still displays result label)', async ({ page }) => {
    // Validate behavior for empty inputs (edge case)
    const app2 = new LCSPage(page);

    await app.fillStrings('', '');
    await app.clickFind();

    const resultText1 = await app.getResultText();
    // It should show the label with an empty subsequence after colon
    expect(resultText).toBe('Longest Common Subsequence: ');
  });

  test('Edge case: no common subsequence results in empty string (e.g., "abc" vs "def")', async ({ page }) => {
    // Validate behavior when there are no common characters
    const app3 = new LCSPage(page);

    await app.fillStrings('abc', 'def');
    await app.clickFind();

    const resultText2 = await app.getResultText();
    expect(resultText).toBe('Longest Common Subsequence: ');
  });

  test('Sequential transitions: multiple clicks update result correctly', async ({ page }) => {
    // Validate repeated transitions: first compute one LCS, then change inputs and compute another
    const app4 = new LCSPage(page);

    // First computation
    await app.fillStrings('abcdef', 'abf');
    await app.clickFind();
    expect(await app.getResultText()).toBe('Longest Common Subsequence: abf');

    // Second computation with different inputs
    await app.fillStrings('AGGTAB', 'GXTXAYB');
    await app.clickFind();
    // Known LCS for these examples is 'GTAB' (classic example)
    // The implementation should compute that; assert accordingly.
    expect(await app.getResultText()).toBe('Longest Common Subsequence: GTAB');
  });

  test('FSM entry action renderPage() is referenced by FSM but not present in implementation', async ({ page }) => {
    // The FSM mentions an entry action renderPage(), but the provided HTML/JS does not define it.
    // This test observes the global environment for the presence of renderPage and asserts the reality.
    const isRenderPageDefined = await page.evaluate(() => typeof window.renderPage !== 'undefined');
    // We expect it to be undefined because the HTML/JS doesn't define renderPage()
    expect(isRenderPageDefined).toBe(false);
  });

  test('The findLCS function exists on the page and is callable via button click (sanity)', async ({ page }) => {
    // Ensure the function exists and is attached to the button's onclick (sanity check)
    const app5 = new LCSPage(page);

    // Check that the function exists in the global scope
    const hasFindLCS = await page.evaluate(() => typeof window.findLCS === 'function');
    expect(hasFindLCS).toBe(true);

    // Call via UI for a sanity example and ensure no errors and correct result shown
    await app.fillStrings('xyz', 'xyz');
    await app.clickFind();
    expect(await app.getResultText()).toBe('Longest Common Subsequence: xyz');
  });
});
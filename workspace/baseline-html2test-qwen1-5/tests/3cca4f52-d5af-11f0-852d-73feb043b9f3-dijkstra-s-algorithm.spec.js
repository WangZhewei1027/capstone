import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca4f52-d5af-11f0-852d-73feb043b9f3.html';

test.describe('Dijkstra\'s Algorithm page (Application ID: 3cca4f52-d5af-11f0-852d-73feb043b9f3)', () => {
  // This suite verifies the static content, the absence of interactive controls,
  // the presence of the dijkstra.js script reference, and observes console/page errors
  // emitted during page load without modifying the page or environment.

  // Utility to navigate and capture console/page errors for each test.
  async function loadAndCapture(page) {
    const consoleErrors = [];
    const consoleWarnings = [];
    const consoleInfo = [];
    const pageErrors = [];

    // Capture console messages and page errors emitted during page load/execution.
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') consoleErrors.push(text);
      else if (type === 'warning') consoleWarnings.push(text);
      else consoleInfo.push({ type, text });
    });

    page.on('pageerror', err => {
      // pageerror receives an Error object for uncaught exceptions (ReferenceError, TypeError, SyntaxError, etc.)
      pageErrors.push(err && err.message ? String(err.message) : String(err));
    });

    // Navigate to the application and wait for load. Do not attempt to patch or modify runtime.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // give a small delay to allow any asynchronous scripts to emit errors/logs
    await page.waitForTimeout(250);

    return { consoleErrors, consoleWarnings, consoleInfo, pageErrors };
  }

  test('Initial page load shows expected static content and structure', async ({ page }) => {
    // Load the page and capture console/page errors but we focus on DOM assertions here.
    const captures = await loadAndCapture(page);

    // Verify the document title and main heading are present and correct.
    await expect(page).toHaveTitle(/Dijkstra/i);
    const h1 = await page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("Dijkstra's Algorithm");

    // Verify the informational paragraph exists and contains a mention of Dijkstra.
    const algorithmDiv = page.locator('.algorithm');
    await expect(algorithmDiv).toHaveCount(1);
    await expect(algorithmDiv).toContainText("Dijkstra's algorithm");

    // Verify the unordered list exists and has three items with expected (exact or partial) text.
    const listItems = algorithmDiv.locator('ul > li');
    await expect(listItems).toHaveCount(3);
    await expect(listItems.nth(0)).toContainText('Starting from node A');
    await expect(listItems.nth(1)).toContainText('Eltérally decrease');
    await expect(listItems.nth(2)).toContainText('Then return the weight');

    // Verify the script tag referencing dijkstra.js is present in the DOM as given.
    const scriptTag = await page.locator('script[src="dijkstra.js"]');
    await expect(scriptTag).toHaveCount(1);

    // Also assert we did not accidentally remove or modify the captured errors — these are recorded but not asserted here.
    // Comments: We intentionally do not modify the page or attempt to fix any runtime errors captured in `captures`.
  });

  test('There are no interactive controls (buttons, inputs, selects, forms) in the page', async ({ page }) => {
    // Load the page and capture console/page errors
    await loadAndCapture(page);

    // Query for common interactive elements and expect none to be present.
    const interactiveSelectors = 'button, input, select, textarea, form, [role="button"], [contenteditable]';
    const interactive = await page.locator(interactiveSelectors);
    // Expect zero matching interactive controls because the provided HTML contains only informational content.
    await expect(interactive).toHaveCount(0);
  });

  test('Observe console errors and page errors during load (do not patch runtime)', async ({ page }) => {
    // This test's purpose is to observe and assert that runtime errors or console error messages occur naturally.
    // We attach listeners and then assert that at least one pageerror or console error was emitted.

    const { consoleErrors, pageErrors, consoleWarnings, consoleInfo } = await loadAndCapture(page);

    // Diagnostics: attach a richer message in the assertion to make test failures easier to debug.
    // We expect at least one error (page error or console error) to occur during load. This follows the test
    // requirement to observe and assert that runtime issues (ReferenceError/SyntaxError/TypeError) happen naturally.
    const totalReportedErrors = (pageErrors ? pageErrors.length : 0) + (consoleErrors ? consoleErrors.length : 0);

    // Provide clear assertions and helpful failure messages.
    expect(totalReportedErrors, 
      `Expected at least one page error or console error during load. pageErrors=${JSON.stringify(pageErrors)}, consoleErrors=${JSON.stringify(consoleErrors)}, consoleWarnings=${JSON.stringify(consoleWarnings)}, consoleInfo=${JSON.stringify(consoleInfo)}`)
      .toBeGreaterThan(0);
  });

  test('Content remains visible and readable even if scripts fail', async ({ page }) => {
    // Ensure that even if the dijkstra.js script produces errors, the static content remains visible and accessible.

    const captures = await loadAndCapture(page);

    // The primary informative elements should be visible and not hidden by any script execution errors.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.algorithm')).toBeVisible();
    await expect(page.locator('.algorithm > p')).toBeVisible();

    // Verify that list items show the content text (defensive check).
    const items = page.locator('.algorithm ul li');
    await expect(items.nth(0)).toContainText('Starting from node A');
    await expect(items.nth(1)).toContainText('Eltérally decrease');
    await expect(items.nth(2)).toContainText('Then return the weight');

    // If there are any page errors captured, assert they are instances of Error-like messages (string length > 0).
    for (const errMsg of captures.pageErrors) {
      expect(errMsg.length).toBeGreaterThan(0);
    }

    for (const errMsg of captures.consoleErrors) {
      expect(errMsg.length).toBeGreaterThan(0);
    }
  });
});
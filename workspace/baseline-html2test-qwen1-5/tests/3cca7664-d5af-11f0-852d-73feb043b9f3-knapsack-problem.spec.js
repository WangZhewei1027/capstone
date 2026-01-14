import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca7664-d5af-11f0-852d-73feb043b9f3.html';

// Page object for the Knapsack app to encapsulate selectors and interactions
class KnapsackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.header = page.locator('h1');
    this.knapsackContainer = page.locator('#knapsack');
    this.displayButton = page.locator('button', { hasText: 'Display Knapsack' });
    // h2 / p that the app would create when successful
    this.generatedH2 = page.locator('h2').filter({ hasText: 'Total items:' }).first();
    this.anyH2 = page.locator('h2');
    this.anyP = page.locator('p');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async clickDisplayButton() {
    await this.displayButton.click();
  }
}

test.describe('Knapsack Problem - interactive app tests', () => {
  // Capture pageerrors and console messages for assertions across tests
  test.describe.configure({ mode: 'parallel' });

  test('Initial load: page structure and runtime error from on-ready display call', async ({ page }) => {
    // Purpose:
    // - Verify the basic DOM structure is present on load (header, container, button)
    // - Observe that displayKnapsack() is invoked on jQuery ready and causes a runtime error.
    // - Assert the runtime error is the expected TypeError caused by shadowing the function name with a local var.

    const knapsack = new KnapsackPage(page);

    // Prepare to capture the first uncaught page error that occurs during page initialization.
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Also capture console messages so we can assert there are no unexpected console.log outputs.
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the page (the page's jQuery ready will call displayKnapsack())
    await knapsack.goto();

    // Wait for the pageerror caused by displayKnapsack being called automatically on ready
    const error = await pageErrorPromise;
    // The application has a bug: inside displayKnapsack a local variable "knapsack" is declared and then used
    // on the right-hand-side, which causes "knapsack is not a function" TypeError at runtime.
    expect(error).toBeTruthy();
    expect(error.message).toMatch(/knapsack is not a function/);

    // Verify DOM structure: h1 exists and contains the expected title
    await expect(knapsack.header).toHaveText('Knapsack Problem');

    // Verify the #knapsack container exists and is empty (no unexpected content appended by app)
    await expect(knapsack.knapsackContainer).toBeVisible();
    const containerContent = await knapsack.knapsackContainer.innerHTML();
    expect(containerContent.trim()).toBe('');

    // The button should be visible and actionable
    await expect(knapsack.displayButton).toBeVisible();
    await expect(knapsack.displayButton).toHaveText('Display Knapsack');

    // Because the runtime error prevented displayKnapsack from completing, no "Total items" h2 or summary p should be appended.
    // There may be only the original H1 in the document.
    const h2Count = await knapsack.anyH2.count();
    const pCount = await knapsack.anyP.count();
    // No generated h2/p expected
    expect(h2Count).toBeLessThanOrEqual(0);
    expect(pCount).toBe(0);

    // Check console messages captured (no explicit console.log in the app)
    // We allow any console messages but assert there was no console.error other than the pageerror event.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    // If the runtime error was thrown as an uncaught exception, it is reported via pageerror; console.error may be absent.
    // We assert that console.error is not unexpectedly present (0 or 1 if environment prints uncaught).
    expect(consoleErrors.length).toBeLessThanOrEqual(1);
  });

  test('Click "Display Knapsack" button triggers the same TypeError and does not modify DOM', async ({ page }) => {
    // Purpose:
    // - Simulate user clicking the Display Knapsack button
    // - Assert that displayKnapsack() call from the button also produces the same runtime TypeError
    // - Assert that repeated attempts do not produce the expected "Total items" DOM entries due to the bug

    const knapsack = new KnapsackPage(page);

    // Attach pageerror handler before navigation to ensure we capture any errors
    const errors = [];
    page.on('pageerror', e => errors.push(e));

    // Go to the page. The page will already have triggered one pageerror via ready; we will assert additional ones below.
    await knapsack.goto();

    // Clear any prior errors captured during load so we can test click-specific error behavior
    // (We keep them in case we want to verify initial error occurred)
    errors.length = 0;

    // Click the button and wait for a new uncaught page error generated by the button-initiated displayKnapsack
    const [clickError] = await Promise.all([
      page.waitForEvent('pageerror'),
      knapsack.clickDisplayButton()
    ]);

    // Assert the error is the same TypeError about knapsack not being a function
    expect(clickError).toBeTruthy();
    expect(clickError.message).toMatch(/knapsack is not a function/);

    // Verify DOM still does not contain the expected "Total items" or summary paragraph because function failed before creating them
    const generatedH2s = await page.locator('h2').allTextContents();
    // None of the h2s should include "Total items:" as that text would be added after the knapsack function runs
    const foundTotalItems = generatedH2s.some(t => t.includes('Total items:'));
    expect(foundTotalItems).toBe(false);

    const pTexts = await page.locator('p').allTextContents();
    const foundSummary = pTexts.some(t => t.includes('You have'));
    expect(foundSummary).toBe(false);

    // Ensure at least one error was captured by our listener
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toMatch(/knapsack is not a function/);
  });

  test('Multiple clicks produce multiple uncaught errors (edge case) and app remains in broken state', async ({ page }) => {
    // Purpose:
    // - Validate behavior when a user repeatedly clicks the faulty control
    // - Ensure each click produces an uncaught TypeError and the DOM does not gain expected content

    const knapsack = new KnapsackPage(page);

    // Collect pageerrors
    const capturedErrors = [];
    page.on('pageerror', e => capturedErrors.push(e));

    // Open page
    await knapsack.goto();

    // Clear initial on-ready error if present so we can count only click-related errors
    capturedErrors.length = 0;

    // Perform multiple clicks and await the corresponding pageerror events
    const clicks = 3;
    for (let i = 0; i < clicks; i++) {
      // Wait for the pageerror triggered by the click. If for some reason no error appears, the test will timeout and fail.
      await Promise.all([
        page.waitForEvent('pageerror'),
        knapsack.clickDisplayButton()
      ]);
    }

    // Expect that we captured exactly 'clicks' number of errors
    expect(capturedErrors.length).toBeGreaterThanOrEqual(clicks);

    // All errors should report the same underlying issue
    for (const err of capturedErrors.slice(0, clicks)) {
      expect(err.message).toMatch(/knapsack is not a function/);
    }

    // Confirm DOM remains without the successful output elements
    const totalItemsFound = await page.locator('h2', { hasText: 'Total items:' }).count();
    expect(totalItemsFound).toBe(0);

    const summaryPFound = await page.locator('p', { hasText: 'You have' }).count();
    expect(summaryPFound).toBe(0);
  });

  test('Sanity check: the global function "knapsack" exists but calling displayKnapsack fails due to local shadowing', async ({ page }) => {
    // Purpose:
    // - Validate that the function declaration for knapsack exists on the window (function hoisted globally)
    // - Calling displayKnapsack will still fail (we assert an uncaught pageerror)
    const knapsack = new KnapsackPage(page);

    // Navigate to the page
    await knapsack.goto();

    // Check that window.knapsack refers to a function in the page context
    const isKnapsackFunction = await page.evaluate(() => typeof window.knapsack === 'function');
    expect(isKnapsackFunction).toBe(true);

    // Calling displayKnapsack from the page context should throw and generate a pageerror due to the bug.
    const pageErrorPromise = page.waitForEvent('pageerror');
    await page.evaluate(() => {
      // This will execute the same code path as clicking the button.
      // We don't catch the error here; we let it bubble to produce a pageerror event for Playwright to capture.
      // Note: intentionally not wrapping in try/catch to allow natural error propagation.
      window.displayKnapsack();
    });
    const err = await pageErrorPromise;
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/knapsack is not a function/);
  });
});
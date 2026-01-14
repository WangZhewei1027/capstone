import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7655f40-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Array Demonstration page
class ArrayDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.button = page.locator('#showArrayButton');
    this.output = page.locator('#output');
  }

  async clickShowArrayButton() {
    await this.button.click();
  }

  async getOutputInnerHTML() {
    return await this.output.evaluate((el) => el.innerHTML);
  }

  async getOutputText() {
    return await this.output.textContent();
  }
}

test.describe('Array Demonstration FSM and UI', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Attach listeners and navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect console messages (info, warn, error, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect unhandled errors from the page (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      // store the error object for later assertions
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
  });

  // Basic teardown - not strictly necessary but included for completeness
  test.afterEach(async ({ page }) => {
    // remove listeners to avoid cross-test pollution (Playwright auto-cleans between tests normally)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('Initial Idle state: button is present and output is empty; no runtime errors on load', async ({ page }) => {
    // This test validates the initial "Idle" FSM state:
    // - The button #showArrayButton should exist and be visible
    // - The output #output should be present and empty
    // - No page errors (ReferenceError, TypeError, etc.) should have occurred during page load
    const app = new ArrayDemoPage(page);

    await expect(app.button).toBeVisible();
    await expect(app.button).toHaveText('Show Array Operations');

    // The output div should be empty initially
    const outputHTML = await app.getOutputInnerHTML();
    const outputText = (await app.getOutputText()) || '';
    expect(outputHTML.trim()).toBe('');
    expect(outputText.trim()).toBe('');

    // Assert that no uncaught page errors happened on initial render
    expect(pageErrors.length).toBe(0);

    // Assert that there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking the button performs array operations and transitions to ArrayDisplayed state', async ({ page }) => {
    // This test validates the transition S0_Idle -> S1_ArrayDisplayed triggered by clicking #showArrayButton.
    // It checks:
    // - The output contains expected sections (Original Array, After adding, After removing, Index of Cherry, Sliced Array, Sorted Array)
    // - The values reflect the operations described in the FSM and HTML implementation
    // - No uncaught runtime errors occurred during the click and processing

    const app = new ArrayDemoPage(page);

    // Click the button to trigger the array operations
    await app.clickShowArrayButton();

    // Wait until the output contains the "Original Array" label (ensures script executed)
    await page.waitForSelector('#output:has-text("Original Array:")');

    const outputHTML = (await app.getOutputInnerHTML()).trim();

    // Build expected HTML exactly as the page script constructs it
    const original = '<strong>Original Array:</strong> Apple, Banana, Cherry, Date';
    const afterAdd = '<br/><strong>After adding Elderberry:</strong> Apple, Banana, Cherry, Date, Elderberry';
    const afterRemove = '<br/><strong>After removing the last item:</strong> Apple, Banana, Cherry, Date';
    const indexOfCherry = '<br/><strong>Index of Cherry:</strong> 2';
    const sliced = '<br/><strong>Sliced Array (index 1 to 3):</strong> Banana, Cherry';
    const sorted = '<br/><strong>Sorted Array:</strong> Apple, Banana, Cherry, Date';

    const expectedFull = original + afterAdd + afterRemove + indexOfCherry + sliced + sorted;

    // Verify the output's innerHTML matches expected string
    expect(outputHTML).toBe(expectedFull);

    // Additionally verify visible text contains important phrases for robustness
    const outputText = (await app.getOutputText()) || '';
    expect(outputText).toContain('Original Array: Apple, Banana, Cherry, Date');
    expect(outputText).toContain('After adding Elderberry: Apple, Banana, Cherry, Date, Elderberry');
    expect(outputText).toContain('After removing the last item: Apple, Banana, Cherry, Date');
    expect(outputText).toContain('Index of Cherry: 2');
    expect(outputText).toContain('Sliced Array (index 1 to 3): Banana, Cherry');
    expect(outputText).toContain('Sorted Array: Apple, Banana, Cherry, Date');

    // Ensure no runtime errors were captured during this interaction
    expect(pageErrors.length).toBe(0, `Expected no page errors, but found: ${pageErrors.map(e => e.message).join(' ; ')}`);

    // Ensure no console errors were emitted
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Multiple clicks produce consistent output and do not produce runtime errors (idempotency / robustness)', async ({ page }) => {
    // This test validates that repeated interactions (clicking the button multiple times)
    // either keep the output stable or produce the same expected result without uncaught exceptions.

    const app = new ArrayDemoPage(page);

    // Click once and capture output
    await app.clickShowArrayButton();
    await page.waitForSelector('#output:has-text("Original Array:")');
    const firstOutput = (await app.getOutputInnerHTML()).trim();

    // Click additional times rapidly and capture output after these clicks
    for (let i = 0; i < 3; i++) {
      await app.clickShowArrayButton();
    }

    // Wait briefly to allow any handlers to run
    await page.waitForTimeout(100);

    const subsequentOutput = (await app.getOutputInnerHTML()).trim();

    // The HTML produced by the handler is deterministic in the implementation,
    // so repeated clicks should produce the same exact content each time.
    expect(subsequentOutput).toBe(firstOutput);

    // Assert no runtime page errors occurred during repeated clicks
    expect(pageErrors.length).toBe(0);

    // Assert no console errors occurred
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Stress: rapid consecutive clicks should not crash the page or throw uncaught exceptions', async ({ page }) => {
    // Edge case: simulate very fast user interactions to ensure app remains stable.
    const app = new ArrayDemoPage(page);

    // Rapidly click the button multiple times
    await Promise.all(new Array(10).fill(0).map(() => app.button.click()));

    // Allow handlers to complete
    await page.waitForTimeout(200);

    // Ensure the output contains the expected anchor text and didn't produce uncaught errors
    const text = await app.getOutputText();
    expect(text).toContain('Original Array:');

    // No uncaught errors should have been captured
    expect(pageErrors.length).toBe(0);

    // No console errors emitted
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Verify that no unexpected onEnter/onExit functions (like renderPage) caused ReferenceError', async ({ page }) => {
    // The FSM metadata mentions an entry action renderPage(). The page's JS does NOT define renderPage.
    // This test asserts that loading the page did not cause a ReferenceError related to renderPage,
    // meaning the implementation did not attempt to call a missing function.
    // It collects pageErrors and asserts none mention 'renderPage'.

    // If there were any page errors, we fail the test; but specifically check messages for 'renderPage'
    const offending = pageErrors.filter((err) => {
      const msg = (err && err.message) ? err.message : String(err);
      return msg.includes('renderPage');
    });

    expect(offending.length).toBe(0, `No ReferenceError for missing renderPage should occur, found: ${offending.map(e => e.message).join(' ; ')}`);

    // Also assert
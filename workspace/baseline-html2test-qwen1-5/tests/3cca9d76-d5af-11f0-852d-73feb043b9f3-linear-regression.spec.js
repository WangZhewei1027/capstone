import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca9d76-d5af-11f0-852d-73feb043b9f3.html';

// Page Object Model for the Linear Regression page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.title = page.locator('h1');
    this.plot = page.locator('#plot');
  }

  // Navigate to the application page and wait for load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Helper to collect current DOM snapshot for debugging assertions
  async getDomSnapshot() {
    return await this.page.evaluate(() => document.documentElement.outerHTML);
  }

  // Query common interactive elements
  async queryInteractiveCounts() {
    return {
      buttons: await this.page.$$eval('button', els => els.length),
      inputs: await this.page.$$eval('input', els => els.length),
      forms: await this.page.$$eval('form', els => els.length),
      selects: await this.page.$$eval('select', els => els.length),
      textareas: await this.page.$$eval('textarea', els => els.length)
    };
  }
}

test.describe('Linear Regression - UI and runtime behavior', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages emitted by the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        try {
          consoleErrors.push(`${msg.text()}`);
        } catch {
          consoleErrors.push('console.error (unable to serialize message)');
        }
      }
    });

    // Capture unhandled page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', err => {
      // err is an Error; store its name and message
      pageErrors.push({ name: err.name, message: err.message, stack: err.stack || '' });
    });

    // Ensure navigation happens fresh per test
    const lrPage = new LinearRegressionPage(page);
    await lrPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Give a short pause to allow any late console/page errors to surface
    await page.waitForTimeout(100);
  });

  test('Initial page load shows title and plot container (default state)', async ({ page }) => {
    // Purpose: Verify the basic DOM elements are present on load
    const lrPage = new LinearRegressionPage(page);

    // The page should have the main title visible and matching the HTML
    await expect(lrPage.title).toBeVisible();
    await expect(lrPage.title).toHaveText('Linear Regression');

    // The plot container should exist and be visible (even if empty)
    await expect(lrPage.plot).toBeVisible();

    // The plot container should be the element with id="plot"
    const plotId = await lrPage.plot.evaluate(el => el.id);
    expect(plotId).toBe('plot');

    // Snapshot should contain basic structure (sanity check)
    const dom = await lrPage.getDomSnapshot();
    expect(dom).toContain('<div id="plot">');
    expect(dom).toContain('<h1>Linear Regression</h1>');
  });

  test('There are no interactive controls (buttons/inputs/forms/selects) by default', async ({ page }) => {
    // Purpose: Confirm the page has no standard interactive controls to manipulate
    const lrPage = new LinearRegressionPage(page);
    const counts = await lrPage.queryInteractiveCounts();

    // According to the provided HTML, there are no buttons/inputs/forms/selects/textarea
    expect(counts.buttons).toBe(0);
    expect(counts.inputs).toBe(0);
    expect(counts.forms).toBe(0);
    expect(counts.selects).toBe(0);
    expect(counts.textareas).toBe(0);
  });

  test('Application should not crash when attempting to find non-existent controls', async ({ page }) => {
    // Purpose: Ensure querying non-existent elements does not throw and returns null/empty
    // Attempt to locate common control types that are not present
    const button = await page.$('button#train');
    const input = await page.$('input#learning-rate');
    const form = await page.$('form#controls');

    // All should be null (not found)
    expect(button).toBeNull();
    expect(input).toBeNull();
    expect(form).toBeNull();
  });

  test('Observe runtime console and page errors (ReferenceError, SyntaxError, TypeError)', async ({ page }) => {
    // Purpose: Collect runtime errors and assert that at least one critical JS error occurred.
    // The test intentionally watches for ReferenceError, SyntaxError or TypeError according to the test instructions.

    // Allow some time for the script(s) to execute and emit errors if any
    await page.waitForTimeout(300);

    // Aggregate messages from both console errors and page errors into a single list of simplified strings
    const combinedMessages = [];

    // Add console error texts
    combinedMessages.push(...consoleErrors.map(t => String(t)));

    // Add pageErrors with name + message
    combinedMessages.push(...pageErrors.map(e => `${e.name}: ${e.message}`));

    // For debugging: attach the raw arrays to the test output when assertions fail
    // The assertion below is intentionally checking that at least one JS error of a common type occurred.
    const hasReferenceError = pageErrors.some(e => e.name === 'ReferenceError' || (e.message && e.message.includes('ReferenceError'))) ||
                              consoleErrors.some(m => /ReferenceError/.test(m));
    const hasTypeError = pageErrors.some(e => e.name === 'TypeError' || (e.message && e.message.includes('TypeError'))) ||
                         consoleErrors.some(m => /TypeError/.test(m));
    const hasSyntaxError = pageErrors.some(e => e.name === 'SyntaxError' || (e.message && e.message.includes('SyntaxError'))) ||
                           consoleErrors.some(m => /SyntaxError/.test(m));

    // Log the collected messages to the Playwright trace for easier debugging if present
    // (This does not modify the page or runtime environment.)
    // eslint-disable-next-line no-console
    console.log('Collected console errors:', consoleErrors);
    // eslint-disable-next-line no-console
    console.log('Collected page errors:', pageErrors);

    // According to the test instruction to "assert that these errors occur",
    // require that at least one of ReferenceError, TypeError, or SyntaxError appeared.
    const foundCriticalJsError = hasReferenceError || hasTypeError || hasSyntaxError;

    // If none were found, include diagnostic output in the failure message
    expect(foundCriticalJsError, `Expected at least one ReferenceError/TypeError/SyntaxError but none found. Collected messages: ${JSON.stringify(combinedMessages)}`).toBe(true);
  });

  test('If script.js fails to load, console should contain a failed resource load or error', async ({ page }) => {
    // Purpose: Detect failed resource loads (e.g., missing script.js) via console messages.
    // Note: "Failed to load resource" messages often show up in console as errors (type 'error').
    // Allow a short period for network errors or messages to appear
    await page.waitForTimeout(200);

    // Look for any console error that mentions 'Failed to load' or 'script.js'
    const failedResource = consoleErrors.some(msg => /Failed to load resource|script.js|404/.test(msg));
    const pageErrorMentionScript = pageErrors.some(e => e.message && /script\.js|script.js/i.test(e.message));

    // At least one indicator of a script loading problem should be present OR there should be a JS error already captured
    const indicatorPresent = failedResource || pageErrorMentionScript || consoleErrors.length > 0 || pageErrors.length > 0;

    expect(indicatorPresent).toBe(true);
  });

  test('Accessibility basics: heading level and landmark presence', async ({ page }) => {
    // Purpose: Validate minimal accessibility expectations: presence of a top-level H1 and a landmark-like container
    const lrPage = new LinearRegressionPage(page);

    // H1 exists and is accessible
    await expect(lrPage.title).toBeVisible();
    await expect(lrPage.title).toHaveText(/Linear Regression/);

    // #plot exists and has role attribute or can be treated as a region (even if not explicitly set)
    await expect(lrPage.plot).toBeVisible();

    // If role attribute exists, it should be a valid ARIA role; we don't inject roles, just assert when present it's non-empty
    const role = await lrPage.plot.getAttribute('role');
    if (role !== null) {
      expect(role.length).toBeGreaterThan(0);
    }
  });
});
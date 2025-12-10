import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f7432a-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object to encapsulate interactions and observations for the Sliding Window page
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.windowLocator = page.locator('#window');
    // Containers for captured console messages and uncaught page errors
    this.consoleMessages = [];
    this.pageErrors = [];

    // Register listeners to capture console output and page errors for assertions
    this.page.on('console', msg => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });
    this.page.on('pageerror', err => {
      // store the error object for later inspection
      this.pageErrors.push(err);
    });
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Get the raw text content of the #window element
  async getWindowText() {
    return await this.windowLocator.textContent();
  }

  // Get the inner HTML of the #window element
  async getWindowHTML() {
    return await this.windowLocator.innerHTML();
  }

  // Click the window (there are no interactive controls by design, but test clicking)
  async clickWindow() {
    await this.windowLocator.click();
  }

  // Return captured console messages
  getConsoleMessages() {
    return this.consoleMessages;
  }

  // Return captured uncaught page errors
  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Sliding Window App - 90f7432a-d5a1-11f0-80b9-e1f86cea383f', () => {
  // Setup a fresh page and page object for each test to isolate observations
  test.beforeEach(async ({ page }) => {
    // Nothing here; page object will attach listeners in its constructor when created in each test
  });

  // Test initial load and default state of the application
  test('Initial load: #window element exists and contains computed sliding window output', async ({ page }) => {
    // Purpose: verify the element is present and that the script populated it with the expected slices
    const app = new SlidingWindowPage(page);
    await app.goto();

    const content = await app.getWindowText();
    // The implementation builds a string containing slices like "1,2,3", "4,5,6", "7,8,9", "10"
    // Verify those expected slices appear in the output
    expect(content).not.toBeNull();
    expect(content).toContain('1,2,3');
    expect(content).toContain('4,5,6');
    expect(content).toContain('7,8,9');
    expect(content).toContain('10');

    // Check that there are multiple newline breaks indicating multiple lines were produced
    // textContent uses '\n' as line separators in this environment; ensure at least 4 lines exist
    const lines = content.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(4);

    // Also assert that the container is visible and has the defined dimensions via computed style
    const isVisible = await app.windowLocator.isVisible();
    expect(isVisible).toBe(true);

    // Basic sanity check on the innerHTML (it should at least be a string)
    const html = await app.getWindowHTML();
    expect(typeof html).toBe('string');
  });

  // Test that there are no standard interactive controls on the page (per implementation)
  test('Page has no interactive controls (buttons/inputs) and is non-interactive by default', async ({ page }) => {
    // Purpose: confirm the HTML contains no buttons, inputs, selects or forms since none are defined
    const app1 = new SlidingWindowPage(page);
    await app.goto();

    // Count common interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const selects = await page.locator('select').count();
    const forms = await page.locator('form').count();
    const textareas = await page.locator('textarea').count();

    expect(buttons).toBe(0);
    expect(inputs).toBe(0);
    expect(selects).toBe(0);
    expect(forms).toBe(0);
    expect(textareas).toBe(0);
  });

  // Test clicking the display area does not change content and does not produce errors
  test('Clicking the #window element does not alter content and does not cause runtime errors', async ({ page }) => {
    // Purpose: ensure that user interactions (clicks) are harmless given no event handlers are attached
    const app2 = new SlidingWindowPage(page);
    await app.goto();

    const before = await app.getWindowText();
    await app.clickWindow();
    const after = await app.getWindowText();

    // Content should remain the same after a click
    expect(after).toBe(before);

    // Verify no uncaught page errors were reported during interaction
    const errors = app.getPageErrors();
    expect(Array.isArray(errors)).toBeTruthy();
    expect(errors.length).toBe(0);

    // Verify no console error messages were emitted
    const consoleErrors = app.getConsoleMessages().filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Observe and assert about console logs and page errors on load
  test('Console and page error observation on load', async ({ page }) => {
    // Purpose: capture console messages and page errors produced during load and assert expected behavior
    const app3 = new SlidingWindowPage(page);

    // Navigate to the page which will run the included script
    await app.goto();

    const consoleMsgs = app.getConsoleMessages();
    const pageErrs = app.getPageErrors();

    // The page implementation is syntactically valid and is expected to run without uncaught exceptions.
    // Assert that no uncaught page errors occurred during load.
    expect(Array.isArray(pageErrs)).toBeTruthy();
    expect(pageErrs.length).toBe(0);

    // It's acceptable for console to contain informational logs or warnings; ensure there are no console 'error' type messages.
    const consoleErrorMsgs = consoleMsgs.filter(m => m.type === 'error');
    expect(consoleErrorMsgs.length).toBe(0);

    // Confirm that we observed console output collection by asserting the array exists
    expect(Array.isArray(consoleMsgs)).toBeTruthy();
  });

  // Edge case test: ensure the sliding window result is stable across multiple reloads (idempotence)
  test('Content is stable across reloads (idempotent script execution)', async ({ page }) => {
    // Purpose: reload the page and ensure the produced content is consistent
    const app4 = new SlidingWindowPage(page);
    await app.goto();

    const first = await app.getWindowText();

    // Reload and re-check
    await page.reload();
    // After reload, need to re-create page object to reattach listeners (listeners attached in constructor)
    const appAfterReload = new SlidingWindowPage(page);
    // Wait for the element to be visible again
    await appAfterReload.windowLocator.waitFor({ state: 'visible' });
    const second = await appAfterReload.getWindowText();

    expect(second).toBe(first);
    // Ensure the result contains expected slices
    expect(second).toContain('1,2,3');
    expect(second).toContain('10');
  });

  // Accessibility/lightweight check: #window should have a non-empty accessible name (text content)
  test('Accessibility: #window element exposes textual content for assistive technologies', async ({ page }) => {
    // Purpose: ensure that the content is available as textContent for screen readers (basic check)
    const app5 = new SlidingWindowPage(page);
    await app.goto();

    const text = await app.getWindowText();
    // The element should contain readable numeric data
    expect(text.trim().length).toBeGreaterThan(0);
    // It should include digits which are the core dataset
    expect(/[0-9]/.test(text)).toBe(true);
  });
});
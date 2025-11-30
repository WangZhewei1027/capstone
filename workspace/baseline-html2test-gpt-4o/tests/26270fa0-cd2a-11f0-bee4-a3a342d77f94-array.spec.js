import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/26270fa0-cd2a-11f0-bee4-a3a342d77f94.html';

class ArrayPage {
  /**
   * Page object for the JavaScript Array Example page.
   * Encapsulates selectors and common assertions for reuse.
   */
  constructor(page) {
    this.page = page;
    this.originalSelector = '#array-demo';
    this.sortedSelector = '#sorted-array';
    this.reversedSelector = '#reversed-array';
  }

  async goto() {
    // Navigate to the application URL and wait for network to be idle.
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
  }

  async originalText() {
    return this.page.textContent(this.originalSelector);
  }

  async sortedText() {
    return this.page.textContent(this.sortedSelector);
  }

  async reversedText() {
    return this.page.textContent(this.reversedSelector);
  }

  async elementIsVisible(selector) {
    const handle = await this.page.$(selector);
    if (!handle) return false;
    return handle.isVisible();
  }
}

test.describe('JavaScript Array Example - UI and Runtime checks', () => {
  // Containers for console and page errors captured during navigation.
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors before each test.
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect console events (log, warn, error, etc.)
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture unhandled exceptions in the page context.
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });
  });

  test('Initial load displays original, sorted, and reversed arrays correctly', async ({ page }) => {
    // Purpose: Verify the page renders the three array representations with expected text.
    const arrayPage = new ArrayPage(page);
    await arrayPage.goto();

    // Assert the three paragraph elements are visible on the page.
    expect(await page.isVisible('#array-demo')).toBeTruthy();
    expect(await page.isVisible('#sorted-array')).toBeTruthy();
    expect(await page.isVisible('#reversed-array')).toBeTruthy();

    // Verify the exact content of each element matches the expected string.
    const original = (await arrayPage.originalText())?.trim();
    const sorted = (await arrayPage.sortedText())?.trim();
    const reversed = (await arrayPage.reversedText())?.trim();

    // Expected values derived from the script in the HTML:
    // numbers = [5, 3, 8, 1, 9, 6]
    expect(original).toBe('Original Array: 5, 3, 8, 1, 9, 6');
    expect(sorted).toBe('Sorted Array: 1, 3, 5, 6, 8, 9');
    expect(reversed).toBe('Reversed Array: 6, 9, 1, 8, 3, 5');

    // Ensure sorted array content is different from original (sanity check).
    expect(sorted).not.toBe(original);
    // Ensure reversed is not equal to sorted.
    expect(reversed).not.toBe(sorted);
  });

  test('Page contains no interactive form controls (inputs, buttons, selects, textareas, forms)', async ({ page }) => {
    // Purpose: Confirm there are no interactive controls on the page as per the HTML.
    const arrayPage = new ArrayPage(page);
    await arrayPage.goto();

    // Query for common interactive elements and assert none are present.
    const inputs = await page.$$('input, button, select, textarea, form');
    expect(inputs.length).toBe(0);
  });

  test('Reload preserves content and does not emit runtime errors', async ({ page }) => {
    // Purpose: Ensure a reload keeps the displayed content stable and no runtime exceptions are thrown.
    const arrayPage = new ArrayPage(page);
    await arrayPage.goto();

    // Capture initial values
    const originalBefore = (await arrayPage.originalText())?.trim();
    const sortedBefore = (await arrayPage.sortedText())?.trim();
    const reversedBefore = (await arrayPage.reversedText())?.trim();

    // Reload the page and wait for network activity to finish
    await page.reload({ waitUntil: 'networkidle' });

    // Capture values after reload
    const originalAfter = (await arrayPage.originalText())?.trim();
    const sortedAfter = (await arrayPage.sortedText())?.trim();
    const reversedAfter = (await arrayPage.reversedText())?.trim();

    // Content should be identical before and after reload.
    expect(originalAfter).toBe(originalBefore);
    expect(sortedAfter).toBe(sortedBefore);
    expect(reversedAfter).toBe(reversedBefore);

    // Assert that no pageerror events were emitted during navigation or reload.
    // This verifies there were no uncaught runtime exceptions.
    expect(pageErrors.length).toBe(0);

    // Assert there were no console "error" messages during navigation or reload.
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility: key informational elements are present and have readable text', async ({ page }) => {
    // Purpose: Basic accessibility checks: the information is programmatically available.
    const arrayPage = new ArrayPage(page);
    await arrayPage.goto();

    // Ensure the elements have non-empty text content.
    const original = await arrayPage.originalText();
    const sorted = await arrayPage.sortedText();
    const reversed = await arrayPage.reversedText();

    expect(typeof original).toBe('string');
    expect(original.trim().length).toBeGreaterThan(0);

    expect(typeof sorted).toBe('string');
    expect(sorted.trim().length).toBeGreaterThan(0);

    expect(typeof reversed).toBe('string');
    expect(reversed.trim().length).toBeGreaterThan(0);
  });

  test('Console and page error observation - collect and assert none occurred on load', async ({ page }) => {
    // Purpose: Explicitly observe console messages and page errors during a fresh navigation.
    const arrayPage = new ArrayPage(page);
    await arrayPage.goto();

    // Wait briefly to give any async errors time to surface (if they would).
    await page.waitForTimeout(250);

    // Verify we captured console messages (logs may exist) but specifically assert no errors.
    // Collect all console messages for informational assertion.
    const allConsole = consoleMessages.map((m) => `${m.type}: ${m.text}`);
    // It's acceptable for console.log messages to exist (e.g., none in this page), but errors must not.
    expect(consoleErrors.length).toBe(0);

    // Ensure there were no uncaught page errors captured.
    expect(pageErrors.length).toBe(0);

    // Also assert that the page contains exactly three informational paragraphs we expect.
    const paragraphs = await page.$$('p');
    // The provided HTML includes three <p> elements; assert that.
    expect(paragraphs.length).toBe(3);
  });
});
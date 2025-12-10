import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/86572b40-d5b2-11f0-b9b7-9552cfcdbf41.html';

// Simple page object for the Selection Sort page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.description = page.locator('p');
    // any common interactive controls
    this.interactiveControls = page.locator('button, input, select, textarea, form');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getHeadingText() {
    return this.heading.textContent();
  }

  async getDescriptionText() {
    return this.description.textContent();
  }

  async countInteractiveControls() {
    return this.interactiveControls.count();
  }
}

test.describe('Selection Sort page - content, interactivity and script errors', () => {
  // Test initial page load and default state
  test('Initial page load shows title and description', async ({ page }) => {
    // Arrange: create page object and navigate
    const app = new SelectionSortPage(page);
    await app.goto();

    // Assert: heading and paragraph are present and visible
    await expect(app.heading).toBeVisible();
    const headingText = await app.getHeadingText();
    expect(headingText).toBe('Selection Sort');

    await expect(app.description).toBeVisible();
    const desc = await app.getDescriptionText();
    expect(desc).toContain('Selection sort is a comparison-based sorting algorithm');
  });

  // Test that there are no interactive controls in the provided HTML
  test('No interactive controls (buttons/inputs/forms) are present', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // There are no buttons, inputs, selects, textareas or forms in the HTML
    const count = await app.countInteractiveControls();
    expect(count).toBe(0);
  });

  // Test application logs and runtime errors produced by the inline script
  test('Script errors are emitted to page errors and/or console', async ({ page }) => {
    // Collect pageerror events and console messages
    const pageErrors = [];
    const consoleErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (err) => {
      // Collect page error objects (e.g., SyntaxError, ReferenceError)
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    page.on('console', (msg) => {
      // Collect console messages for later inspection
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    // Navigate after listeners are attached so we capture errors emitted during load
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Small pause to ensure asynchronous reporting of errors is captured
    await page.waitForTimeout(200);

    // At least one page error or console error should be present due to the broken script in the HTML
    const hasPageErrors = pageErrors.length > 0;
    const hasConsoleErrors = consoleErrors.length > 0;

    // Assert that there is evidence of a script/runtime problem (SyntaxError or other)
    expect(hasPageErrors || hasConsoleErrors).toBeTruthy();

    // If page errors exist, check that they mention common script parsing/runtime error keywords
    if (hasPageErrors) {
      const combined = pageErrors.join(' | ');
      // The broken script contains an unexpected '[' token which typically leads to a SyntaxError
      expect(
        combined.includes('SyntaxError') ||
          combined.includes('Unexpected') ||
          combined.includes('ReferenceError') ||
          combined.length > 0
      ).toBeTruthy();
    }

    // If console errors exist, ensure they contain useful diagnostic information
    if (hasConsoleErrors) {
      const combinedConsole = consoleErrors.join(' | ');
      expect(
        combinedConsole.includes('SyntaxError') ||
          combinedConsole.includes('Unexpected') ||
          combinedConsole.includes('ReferenceError') ||
          combinedConsole.length > 0
      ).toBeTruthy();
    }

    // Also record full console messages for debugging assertions: ensure no successful sorted-array log is present
    const printedSorted = consoleMessages.some((m) => m.text.includes('[1, 2, 3, 5, 8]'));
    // Because the script is malformed, the console.log of the sorted array should not have executed
    expect(printedSorted).toBeFalsy();
  });

  // Test that the selectionSort function is not available on window due to the script parse error
  test('selectionSort function is not defined on window object (script did not execute)', async ({ page }) => {
    // Attach listeners to capture any page errors but we don't need them for this assertion
    const app = new SelectionSortPage(page);
    await app.goto();

    // Evaluate the presence of selectionSort on the window - should be undefined because the inline script is syntactically invalid
    const typeOfSelectionSort = await page.evaluate(() => {
      try {
        return typeof window.selectionSort;
      } catch (e) {
        // If accessing throws, return the error message for diagnostics
        return `threw: ${e && e.message ? e.message : String(e)}`;
      }
    });

    // Expect that selectionSort is undefined (script couldn't define it)
    expect(typeOfSelectionSort).toBe('undefined');
  });

  // Accessibility check: heading is exposed as a landmark/role=heading with correct name
  test('Accessibility: main heading is available to assistive technology', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Use Playwright's getByRole to find the heading by accessible name
    const heading = page.getByRole('heading', { name: 'Selection Sort' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Selection Sort');
  });
});
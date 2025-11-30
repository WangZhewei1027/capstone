import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f49b-cd2f-11f0-a440-159d7b77af86.html';

// Page Object representing the Linear Search page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app page and wait for DOM content to be loaded
  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Locator for the numeric input
  input() {
    return this.page.locator('#searchInput');
  }

  // Locator for the Search button
  button() {
    return this.page.locator('button', { hasText: 'Search' });
  }

  // Locator for the result div
  result() {
    return this.page.locator('#result');
  }

  // Convenience method to perform a search by clicking the button
  async performSearch(value) {
    await this.input().fill(String(value));
    await this.button().click();
  }

  // Convenience method to simulate pressing Enter in the input field
  async pressEnterInInput(value) {
    await this.input().fill(String(value));
    await this.input().press('Enter');
  }

  // Get the text content of the result div
  async getResultText() {
    return (await this.result().textContent()) ?? '';
  }
}

test.describe('Linear Search Implementation - UI and Behavior', () => {
  // Arrays to collect console error messages and page errors for each test
  /** @type {string[]} */
  let consoleErrors;
  /** @type {Error[]} */
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages (e.g., console.error)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state of the app
  test('Initial load shows headings, input and button; result is empty', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Verify heading and descriptive text are visible
    await expect(page.locator('h1')).toHaveText('Linear Search Implementation');
    await expect(page.locator('p')).toContainText('Given an array of integers');

    // Input and button should be visible and enabled
    await expect(app.input()).toBeVisible();
    await expect(app.input()).toBeEnabled();
    await expect(app.button()).toBeVisible();
    await expect(app.button()).toBeEnabled();

    // The label should be associated with the input (accessibility)
    const label = page.locator('label[for="searchInput"]');
    await expect(label).toHaveText('Number to find:');

    // Result div should be present but empty on initial load
    await expect(app.result()).toBeVisible();
    await expect(app.getResultText()).toBe('');

    // Ensure no console errors or page errors occurred during load
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join('\n')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);
  });

  // Test successful searches for existing numbers in the array
  test.describe('Successful searches', () => {
    test('Search for the first element (3) displays index 0', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // Search for 3 which is at index 0 in the underlying array
      await app.performSearch(3);
      await expect(app.result()).toHaveText('Number found at index: 0');

      // No errors should have been emitted
      expect(consoleErrors.length, `Console errors: ${consoleErrors.join('\n')}`).toBe(0);
      expect(pageErrors.length, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);
    });

    test('Search for the last element (7) displays index 8', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // Search for 7 which is at index 8
      await app.performSearch(7);
      await expect(app.result()).toHaveText('Number found at index: 8');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Entering a floating value (3.9) uses parseInt -> finds index 0', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // parseInt('3.9') -> 3, which exists at index 0
      await app.performSearch('3.9');
      await expect(app.result()).toHaveText('Number found at index: 0');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  // Test unsuccessful searches and validation
  test.describe('Unsuccessful searches and validation', () => {
    test('Searching for a number not in the array displays "not found" message', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // 10 is not in the predefined array
      await app.performSearch(10);
      await expect(app.result()).toHaveText('Number not found in the array.');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Empty input shows validation message requesting a valid number', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // Clear any existing value and click "Search"
      await app.input().fill('');
      await app.button().click();

      await expect(app.result()).toHaveText('Please enter a valid number.');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Non-numeric input (e.g., "abc") results in validation message', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // Even though input type is number, setValue allows the text to be set and parseInt('abc') -> NaN
      await app.input().fill('abc');
      await app.button().click();

      await expect(app.result()).toHaveText('Please enter a valid number.');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  // Test that pressing Enter in the input does not implicitly submit (no form); only button triggers search
  test('Pressing Enter in the input does not trigger search (no form submission behavior)', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Ensure result empty initially
    await expect(app.getResultText()).resolves.toBe('');

    // Type a valid value but press Enter instead of clicking the button
    await app.pressEnterInInput(3);

    // Wait a short moment for any potential handlers (there should be none)
    await page.waitForTimeout(200);

    // Since the page has no form submission tied to Enter, result should remain unchanged
    await expect(app.getResultText()).resolves.toBe('');

    // Now click the button to confirm search works
    await app.performSearch(3);
    await expect(app.result()).toHaveText('Number found at index: 0');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // A final test to ensure that repeated interactions continue to behave correctly and DOM updates consistently
  test('Multiple sequential searches update the result div consistently', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // First search: found
    await app.performSearch(5);
    await expect(app.result()).toHaveText('Number found at index: 1');

    // Second search: not found
    await app.performSearch(42);
    await expect(app.result()).toHaveText('Number not found in the array.');

    // Third search: invalid input -> validation
    await app.input().fill('');
    await app.button().click();
    await expect(app.result()).toHaveText('Please enter a valid number.');

    // Fourth search: found again
    await app.performSearch(1);
    await expect(app.result()).toHaveText('Number found at index: 6');

    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});
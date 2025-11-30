import { test, expect } from '@playwright/test';

// Test file: 4c9ed501-cd2f-11f0-a735-f5f9b4634e99-binary-search.spec.js
// Tests for Binary Search Demo application served at:
// http://127.0.0.1:5500/workspace/html2test/html/4c9ed501-cd2f-11f0-a735-f5f9b4634e99.html

// Page Object for the Binary Search page to keep tests organized and readable
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.searchButton = page.locator('button', { hasText: 'Search' });
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/4c9ed501-cd2f-11f0-a735-f5f9b4634e99.html', { waitUntil: 'load' });
  }

  async enterArray(value) {
    await this.arrayInput.fill(value);
  }

  async enterTarget(value) {
    // Accept string or number
    await this.targetInput.fill(String(value));
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async getResultText() {
    return this.result.textContent();
  }
}

test.describe('Binary Search Demo - UI and behavior', () => {
  // Collect console messages and page errors to assert the app doesn't throw unexpected runtime errors.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen for console events and page errors. We do not modify the page environment;
    // we only observe what happens naturally and assert on it.
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // Save thrown errors (ReferenceError, SyntaxError, TypeError, etc.) if any occur
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // After each test assert that there were no uncaught page errors.
    // Tests are written to tolerate normal UI behavior; unexpected runtime errors should not happen.
    expect(pageErrors.length, `Expected no page errors, but found: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);

    // Also assert there were no console messages of type 'error'.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages, but found: ${consoleErrors.map(m => m.text).join(' | ')}`).toBe(0);
  });

  test('Initial page load shows inputs, placeholders and empty result', async ({ page }) => {
    // Purpose: Verify the page loads and initial UI state is correct.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Ensure inputs and button are visible
    await expect(bs.arrayInput).toBeVisible();
    await expect(bs.targetInput).toBeVisible();
    await expect(bs.searchButton).toBeVisible();

    // Check placeholders are present as in the HTML
    await expect(bs.arrayInput).toHaveAttribute('placeholder', 'e.g., 1, 2, 3, 4, 5');
    await expect(bs.targetInput).toHaveAttribute('placeholder', 'e.g., 3');

    // Result should start empty
    await expect(bs.result).toBeVisible();
    const initialResult = await bs.getResultText();
    expect(initialResult?.trim() ?? '').toBe('');
  });

  test('Searching a value present in the array returns correct index', async ({ page }) => {
    // Purpose: Verify a standard successful binary search scenario.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Enter a sorted array and a target that exists
    await bs.enterArray('1, 2, 3, 4, 5');
    await bs.enterTarget('3');
    await bs.clickSearch();

    // The app reports the found index. With 0-based indexing, 3 is at index 2.
    await expect(bs.result).toHaveText(/Target found at index:\s*2/);
  });

  test('Searching a value not present shows not-found message', async ({ page }) => {
    // Purpose: Verify the app correctly handles targets not in the array.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    await bs.enterArray('10,20,30,40,50');
    await bs.enterTarget('35');
    await bs.clickSearch();

    await expect(bs.result).toHaveText('Target not found in array.');
  });

  test('Invalid array input (non-numeric) displays validation message', async ({ page }) => {
    // Purpose: Provide invalid array input and assert the user-facing validation message appears.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Enter an array containing a non-numeric token
    await bs.enterArray('1, two, 3');
    await bs.enterTarget('2');
    await bs.clickSearch();

    await expect(bs.result).toHaveText('Invalid array input. Please enter numbers only.');
  });

  test('Edge case: empty array input (blank) treated as [0] and empty target treated as 0', async ({ page }) => {
    // Purpose: Observe how empty inputs are handled by the implementation and assert observed behavior.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Both inputs empty - per implementation Number('') === 0 and ''.split(',') => [''] => [0]
    await bs.enterArray(''); // blank
    await bs.enterTarget(''); // blank
    await bs.clickSearch();

    // Expect it to find 0 at index 0 (implementation detail of Number('') -> 0)
    await expect(bs.result).toHaveText(/Target found at index:\s*0/);
  });

  test('Single-element array search works for present and absent targets', async ({ page }) => {
    // Purpose: Validate behavior on minimal array sizes.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Present case
    await bs.enterArray('42');
    await bs.enterTarget('42');
    await bs.clickSearch();
    await expect(bs.result).toHaveText(/Target found at index:\s*0/);

    // Absent case
    await bs.enterArray('42');
    await bs.enterTarget('7');
    await bs.clickSearch();
    await expect(bs.result).toHaveText('Target not found in array.');
  });

  test('Whitespace and extra commas in array input are handled (numeric parsing and search)', async ({ page }) => {
    // Purpose: Ensure spaces around numbers do not break parsing and search still works.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Array has irregular spaces and extra comma
    await bs.enterArray('  1 ,  3,5, 7 ,');
    await bs.enterTarget('5');
    await bs.clickSearch();

    // Map(Number) on trailing empty segment yields 0, but since array contains 5 at index 2 we expect index 2
    await expect(bs.result).toHaveText(/Target found at index:\s*2/);
  });

  test('Negative numbers are searchable and return correct indices', async ({ page }) => {
    // Purpose: Confirm negative numbers parse correctly and binary search finds them.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    await bs.enterArray('-10, -5, 0, 5, 10');
    await bs.enterTarget('-5');
    await bs.clickSearch();

    await expect(bs.result).toHaveText(/Target found at index:\s*1/);
  });

  test('Observes console logs while performing actions (no unexpected console errors)', async ({ page }) => {
    // Purpose: Run through a few interactions and assert console emitted no error-level messages.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    await bs.enterArray('1,2,3,4');
    await bs.enterTarget('4');
    await bs.clickSearch();

    await bs.enterArray('a, b, c'); // invalid array input
    await bs.enterTarget('2');
    await bs.clickSearch();

    // The afterEach will assert there were no page errors and no console.error messages.
    // Here we also assert that there was at least one console message (info/debug) OR none,
    // but primarily ensure no error-level console entries were produced.
    const errorMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorMsgs.length).toBe(0);
  });
});
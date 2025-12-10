import { test, expect } from '@playwright/test';

// URL of the HTML application under test
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdba-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object to encapsulate interactions with the Linear Search demo
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#searchValue');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resultDiv = page.locator('#result');
    this.heading = page.locator('h1');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the search input (string or number)
  async fillInput(value) {
    // Use fill to replace any existing content
    await this.input.fill(String(value));
  }

  // Click the search button
  async clickSearch() {
    await this.searchButton.click();
  }

  // Get the result div's text content
  async getResultText() {
    return (await this.resultDiv.textContent()) ?? '';
  }

  // Returns whether result div is visible
  async isResultVisible() {
    return await this.resultDiv.isVisible();
  }
}

test.describe('Linear Search Demonstration - functional tests', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Setup a fresh page and listeners for each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect console events
    page.on('console', (msg) => {
      const type = msg.type(); // e.g., 'log', 'error'
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Collect uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // err is an Error object; store its message/stack
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page
    const lsPage = new LinearSearchPage(page);
    await lsPage.goto();
  });

  test.afterEach(async () => {
    // After each test we assert there were no uncaught page errors and no console errors.
    // This ensures the page ran without runtime exceptions.
    expect(pageErrors, 'Expected no uncaught page errors').toEqual([]);
    expect(consoleErrors, 'Expected no console.error messages').toEqual([]);
  });

  test('Initial page load shows expected UI elements and empty result', async ({ page }) => {
    // Purpose: Verify initial state of the page: heading, input, button and empty result
    const ls = new LinearSearchPage(page);

    // Heading should be present and have the correct text
    await expect(ls.heading).toBeVisible();
    await expect(ls.heading).toHaveText('Linear Search Demonstration');

    // Input should be visible, empty by default
    await expect(ls.input).toBeVisible();
    await expect(ls.input).toHaveValue('');

    // Search button should be visible and enabled
    await expect(ls.searchButton).toBeVisible();
    await expect(ls.searchButton).toBeEnabled();

    // Result div should exist and be empty initially
    await expect(ls.resultDiv).toBeVisible();
    const initialResult = await ls.getResultText();
    // The implementation leaves result empty, so expect empty string
    expect(initialResult.trim()).toBe('');
  });

  test('Search finds an existing number and displays correct index (middle element)', async ({ page }) => {
    // Purpose: Enter a value known to be in the array and assert the displayed index is correct
    const ls1 = new LinearSearchPage(page);

    await ls.fillInput('7'); // 7 exists at index 3 in the array
    await ls.clickSearch();

    // Verify result text updates to the expected success message
    const text1 = (await ls.getResultText()).trim();
    expect(text).toBe('Number 7 found at index 3.');
  });

  test('Search finds first and last elements correctly', async ({ page }) => {
    // Purpose: Verify boundary elements are found at correct indices
    const ls2 = new LinearSearchPage(page);

    // First element (1) -> index 0
    await ls.fillInput('1');
    await ls.clickSearch();
    expect((await ls.getResultText()).trim()).toBe('Number 1 found at index 0.');

    // Last element (19) -> index 9
    await ls.fillInput('19');
    await ls.clickSearch();
    expect((await ls.getResultText()).trim()).toBe('Number 19 found at index 9.');
  });

  test('Searching for a non-existent number shows "not found" message', async ({ page }) => {
    // Purpose: Ensure numbers not present in the array produce the expected "not found" message
    const ls3 = new LinearSearchPage(page);

    await ls.fillInput('8'); // 8 is not in the array
    await ls.clickSearch();
    const text2 = (await ls.getResultText()).trim();
    expect(text).toBe('Number 8 not found in the array.');
  });

  test('Empty input produces "Number NaN not found in the array." message', async ({ page }) => {
    // Purpose: Check edge-case behavior when the input is left empty (parseInt('') => NaN)
    const ls4 = new LinearSearchPage(page);

    // Clear input and click search
    await ls.fillInput(''); // empty string
    await ls.clickSearch();

    // The implementation uses parseInt on the empty string, resulting in NaN, and prints it
    const text3 = (await ls.getResultText()).trim();
    expect(text).toBe('Number NaN not found in the array.');
  });

  test('Decimal input (e.g., 7.9) is parsed with parseInt and may match integer entries', async ({ page }) => {
    // Purpose: Confirm that parseInt behavior is observable: "7.9" => 7, which is in the array
    const ls5 = new LinearSearchPage(page);

    await ls.fillInput('7.9');
    await ls.clickSearch();

    // parseInt('7.9') === 7, so it should find index 3
    const text4 = (await ls.getResultText()).trim();
    expect(text).toBe('Number 7 found at index 3.');
  });

  test('Negative numbers that are not in array return "not found"', async ({ page }) => {
    // Purpose: Verify negative numbers (e.g., -1) are handled and produce a not-found message
    const ls6 = new LinearSearchPage(page);

    await ls.fillInput('-1');
    await ls.clickSearch();

    const text5 = (await ls.getResultText()).trim();
    expect(text).toBe('Number -1 not found in the array.');
  });
});
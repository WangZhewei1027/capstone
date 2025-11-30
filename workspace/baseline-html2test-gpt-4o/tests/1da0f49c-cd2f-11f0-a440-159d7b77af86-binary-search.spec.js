import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f49c-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Binary Search Visualization page
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#search-number');
    this.searchButton = page.locator('button', { hasText: 'Search' });
    this.arrayContainer = page.locator('#array-container');
    this.elements = page.locator('.element');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the search input with a value (string or number)
  async enterValue(value) {
    await this.input.fill(String(value));
  }

  // Click the Search button and wait for the alert dialog, returning its message.
  // This performs the click and captures the single alert that the app shows.
  async clickSearchAndGetDialogMessage() {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.searchButton.click()
    ]);
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Get number of rendered array elements
  async getElementCount() {
    return await this.elements.count();
  }

  // Get text content for element at index
  async getElementText(index) {
    return await this.elements.nth(index).textContent();
  }

  // Get class attribute for element at index
  async getElementClassAttribute(index) {
    return await this.elements.nth(index).getAttribute('class');
  }

  // Return true if any element has the provided CSS class
  async anyElementHasClass(className) {
    const count = await this.getElementCount();
    for (let i = 0; i < count; i++) {
      const cls = await this.getElementClassAttribute(i);
      if (cls && cls.split(/\s+/).includes(className)) return true;
    }
    return false;
  }

  // Return the indices of elements that have a specific class
  async indicesWithClass(className) {
    const indices = [];
    const count = await this.getElementCount();
    for (let i = 0; i < count; i++) {
      const cls = await this.getElementClassAttribute(i);
      if (cls && cls.split(/\s+/).includes(className)) indices.push(i);
    }
    return indices;
  }
}

test.describe('Binary Search Visualization - end-to-end', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;
  // Handler references so we can remove them after each test
  let consoleListener;
  let pageErrorListener;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and collect error-level messages
    consoleListener = (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // Swallow potential unexpected console API issues
      }
    };
    pageErrorListener = (err) => {
      pageErrors.push(err);
    };

    page.on('console', consoleListener);
    page.on('pageerror', pageErrorListener);
  });

  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid cross-test leakage
    page.removeListener('console', consoleListener);
    page.removeListener('pageerror', pageErrorListener);

    // Assert that no uncaught page errors or console error messages occurred during the test.
    // If the application had runtime errors, these assertions will fail and surface them.
    expect(pageErrors, `Expected no page errors, but got: ${pageErrors.map(e => String(e)).join('; ')}`).toHaveLength(0);
    expect(consoleErrors, `Expected no console errors, but got: ${consoleErrors.map(e => e.text).join('; ')}`).toHaveLength(0);
  });

  test('Initial page load shows full array and no highlights', async ({ page }) => {
    // Purpose: Verify the app loads correctly and initial UI state is as expected.
    const app = new BinarySearchPage(page);
    await app.goto();

    // The array should be rendered with 13 elements (as per the sortedArray in the HTML)
    const count = await app.getElementCount();
    expect(count).toBe(13);

    // Verify each element contains the expected numeric text and no element has 'found' or 'not-found' class initially
    const expectedValues = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25].map(String);
    for (let i = 0; i < expectedValues.length; i++) {
      const text = (await app.getElementText(i)).trim();
      expect(text).toBe(expectedValues[i]);
      const cls = await app.getElementClassAttribute(i);
      // If no class attribute or it doesn't include these, it's fine for initial state
      if (cls) {
        expect(cls.split(/\s+/)).not.toContain('found');
        expect(cls.split(/\s+/)).not.toContain('not-found');
      }
    }

    // Input should be visible and of type number with placeholder
    await expect(page.locator('#search-number')).toBeVisible();
    const typeAttr = await page.locator('#search-number').getAttribute('type');
    expect(typeAttr).toBe('number');
    const placeholder = await page.locator('#search-number').getAttribute('placeholder');
    expect(placeholder).toBe('Enter number');
  });

  test('Searching for an existing number highlights the element and shows a found alert', async ({ page }) => {
    // Purpose: Validate successful search flow: highlighting and alert message for found number.
    const app = new BinarySearchPage(page);
    await app.goto();

    // Search for 13 which is present at index 6
    await app.enterValue(13);
    const alertMessage = await app.clickSearchAndGetDialogMessage();

    // The alert message should indicate found and report the right index
    expect(alertMessage).toBe('Number 13 found at index 6.');

    // After the search, the element at index 6 should have the 'found' class
    const foundIndices = await app.indicesWithClass('found');
    expect(foundIndices.length).toBeGreaterThanOrEqual(1);
    expect(foundIndices).toContain(6);

    // No element should have 'not-found' at the end of a successful search
    const notFoundIndices = await app.indicesWithClass('not-found');
    expect(notFoundIndices.length).toBe(0);
  });

  test('Searching for a missing number shows not-found alert and applies not-found highlight during search', async ({ page }) => {
    // Purpose: Ensure that searching for a number not in the array results in the correct alert and UI state.
    const app = new BinarySearchPage(page);
    await app.goto();

    // Search for 14 which is not present
    await app.enterValue(14);
    const alertMessage = await app.clickSearchAndGetDialogMessage();

    // The alert should indicate the number was not found
    expect(alertMessage).toBe('Number 14 not found in the array.');

    // There should be no 'found' highlight
    const foundIndices = await app.indicesWithClass('found');
    expect(foundIndices.length).toBe(0);

    // At least one element should have the 'not-found' class corresponding to the last mid during search
    const notFoundIndices = await app.indicesWithClass('not-found');
    expect(notFoundIndices.length).toBeGreaterThanOrEqual(1);
  });

  test('Clicking Search with invalid input (empty) shows validation alert', async ({ page }) => {
    // Purpose: Verify input validation and that a helpful alert appears for invalid input.
    const app = new BinarySearchPage(page);
    await app.goto();

    // Ensure input is empty
    await app.enterValue('');
    const alertMessage = await app.clickSearchAndGetDialogMessage();

    // The app should prompt the user to enter a valid number
    expect(alertMessage).toBe('Please enter a valid number');
  });

  test('Multiple successive searches maintain stable DOM and produce correct alerts', async ({ page }) => {
    // Purpose: Run a sequence of searches (found, not found, invalid) to verify repeated interactions work correctly.
    const app = new BinarySearchPage(page);
    await app.goto();

    // 1) Valid found search
    await app.enterValue(1);
    const msg1 = await app.clickSearchAndGetDialogMessage();
    expect(msg1).toBe('Number 1 found at index 0.');
    const foundAfterFirst = await app.indicesWithClass('found');
    expect(foundAfterFirst).toContain(0);

    // 2) Valid not-found search
    await app.enterValue(2);
    const msg2 = await app.clickSearchAndGetDialogMessage();
    expect(msg2).toBe('Number 2 not found in the array.');
    const foundAfterSecond = await app.indicesWithClass('found');
    // After a not-found search there should be no 'found' classes
    expect(foundAfterSecond.length).toBe(0);
    const notFoundAfterSecond = await app.indicesWithClass('not-found');
    expect(notFoundAfterSecond.length).toBeGreaterThanOrEqual(1);

    // 3) Invalid empty input
    await app.enterValue('');
    const msg3 = await app.clickSearchAndGetDialogMessage();
    expect(msg3).toBe('Please enter a valid number');
  });
});
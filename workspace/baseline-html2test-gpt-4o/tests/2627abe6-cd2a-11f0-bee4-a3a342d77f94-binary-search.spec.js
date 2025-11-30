import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe6-cd2a-11f0-bee4-a3a342d77f94.html';

/**
 * Page Object for the Binary Search Demonstration page.
 * Encapsulates interactions and collects console/page errors for assertions.
 */
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.pageErrors = [];

    // Collect console.error messages
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught page errors
    this.page.on('pageerror', (err) => {
      // err is an Error object, capture the message/stack
      this.pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Locators
    this.input = this.page.locator('#searchNumber');
    this.button = this.page.locator('button', { hasText: 'Search' });
    this.output = this.page.locator('#output');
    this.heading = this.page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getHeadingText() {
    return this.heading.textContent();
  }

  async getInputValue() {
    return this.input.inputValue();
  }

  async setInputValue(value) {
    // Use fill to set the value; accepts string or number
    await this.input.fill(String(value));
  }

  async clickSearch() {
    await this.button.click();
  }

  async getOutputText() {
    return this.output.textContent();
  }

  getConsoleErrors() {
    return this.consoleErrors;
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

test.describe('Binary Search Demonstration - UI and behavior tests', () => {
  // Test initial page load and default state
  test('Initial load: title, default input value and empty output are correct, no console/page errors', async ({ page }) => {
    // Purpose: Verify the page loads properly, UI elements exist and default values are set.
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // Verify heading
    await expect(bsPage.heading).toBeVisible();
    await expect(bsPage.heading).toHaveText('Binary Search Demonstration');

    // Verify input exists and default value is "0" (as per HTML)
    await expect(bsPage.input).toBeVisible();
    const inputValue = await bsPage.getInputValue();
    expect(inputValue).toBe('0');

    // Verify button exists and has label "Search"
    await expect(bsPage.button).toBeVisible();
    await expect(bsPage.button).toHaveText('Search');

    // Verify output is present but initially empty
    await expect(bsPage.output).toBeVisible();
    const initialOutput = await bsPage.getOutputText();
    // The HTML sets no initial content for #output
    expect(initialOutput).toBe('');

    // Assert no console.errors or page errors occurred during load
    expect(bsPage.getConsoleErrors().length).toBe(0);
    expect(bsPage.getPageErrors().length).toBe(0);
  });

  // Test searching for numbers that are present in the array
  test('Searches for numbers that exist in the array and shows correct index', async ({ page }) => {
    // Purpose: Validate that searching for existing values shows the correct index in the output.
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // Case: search for 1 (first element, index 0)
    await bsPage.setInputValue('1');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 1 found at index 0 in the sorted array.');

    // Case: search for 13 (middle element, index 6)
    await bsPage.setInputValue('13');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 13 found at index 6 in the sorted array.');

    // Case: search for 25 (last element, index 12)
    await bsPage.setInputValue('25');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 25 found at index 12 in the sorted array.');

    // Verify no console/page errors occurred during these interactions
    expect(bsPage.getConsoleErrors().length).toBe(0);
    expect(bsPage.getPageErrors().length).toBe(0);
  });

  // Test searching for numbers that are not present in the array (edge cases)
  test('Searches for numbers that do not exist and reports not found', async ({ page }) => {
    // Purpose: Ensure the UI correctly reports when a number is not found.
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // Search for 0 (not in the array)
    await bsPage.setInputValue('0');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 0 not found in the sorted array.');

    // Search for a number between array values (e.g., 2)
    await bsPage.setInputValue('2');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 2 not found in the sorted array.');

    // Search for an out-of-range large number
    await bsPage.setInputValue('999');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 999 not found in the sorted array.');

    // Search for a negative number
    await bsPage.setInputValue('-5');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number -5 not found in the sorted array.');

    // Verify no console/page errors during these edge-case interactions
    expect(bsPage.getConsoleErrors().length).toBe(0);
    expect(bsPage.getPageErrors().length).toBe(0);
  });

  // Test handling of non-integer input and empty input
  test('Handles decimal and empty inputs consistently with parseInt behavior', async ({ page }) => {
    // Purpose: Validate how the application handles decimal values and empty input (parseInt semantics).
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // Decimal input: "3.5" -> parseInt("3.5") === 3 => should find 3 at index 1
    await bsPage.setInputValue('3.5');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 3 found at index 1 in the sorted array.');

    // Decimal input that floors to non-existing integer: "2.9" -> parseInt => 2 (not in array)
    await bsPage.setInputValue('2.9');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 2 not found in the sorted array.');

    // Empty input -> parseInt('') => NaN => output should display "Number NaN not found..."
    await bsPage.setInputValue(''); // clear input
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number NaN not found in the sorted array.');

    // Verify no console/page errors triggered by these inputs
    expect(bsPage.getConsoleErrors().length).toBe(0);
    expect(bsPage.getPageErrors().length).toBe(0);
  });

  // Accessibility and visibility checks for interactive elements
  test('Interactive controls are visible and focusable (basic accessibility checks)', async ({ page }) => {
    // Purpose: Ensure controls are visible and can receive focus, improving accessibility.
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // Input should be visible and focusable
    await expect(bsPage.input).toBeVisible();
    await bsPage.input.focus();
    // After focusing, the input should be the active element
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(activeId).toBe('searchNumber');

    // Button should be visible and focusable
    await bsPage.button.focus();
    const activeTag = await page.evaluate(() => document.activeElement && document.activeElement.tagName.toLowerCase());
    expect(activeTag).toBe('button');

    // No console/page errors during accessibility interactions
    expect(bsPage.getConsoleErrors().length).toBe(0);
    expect(bsPage.getPageErrors().length).toBe(0);
  });

  // Combined scenario: multiple sequential searches maintain correct output updates
  test('Multiple sequential searches update output appropriately', async ({ page }) => {
    // Purpose: Confirm the output is replaced (not appended) on each search and remains accurate.
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // First search: 7 -> expected index 3
    await bsPage.setInputValue('7');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 7 found at index 3 in the sorted array.');

    // Second search: 8 -> not found
    await bsPage.setInputValue('8');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 8 not found in the sorted array.');

    // Third search: 15 -> index 7
    await bsPage.setInputValue('15');
    await bsPage.clickSearch();
    await expect(bsPage.output).toHaveText('Number 15 found at index 7 in the sorted array.');

    // Ensure no console/page errors during these sequential operations
    expect(bsPage.getConsoleErrors().length).toBe(0);
    expect(bsPage.getPageErrors().length).toBe(0);
  });
});
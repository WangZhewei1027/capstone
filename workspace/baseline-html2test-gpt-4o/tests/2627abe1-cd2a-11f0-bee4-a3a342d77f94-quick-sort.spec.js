import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe1-cd2a-11f0-bee4-a3a342d77f94.html';

// Page object for the Quick Sort demonstration page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    // There is a single button in the page; select the first button element
    this.sortButton = page.locator('button').first();
    this.result = page.locator('#result');
    this.header = page.locator('h1');
  }

  // Navigate to the application URL
  async open() {
    await this.page.goto(APP_URL);
  }

  // Fill the input field
  async enterInput(value) {
    await this.input.fill(value);
  }

  // Click the Sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Read the result text content
  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  // Read input placeholder text
  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  // Get header text
  async getHeaderText() {
    return (await this.header.textContent()) ?? '';
  }
}

test.describe('Quick Sort Demonstration - UI and behavior tests', () => {
  // Arrays to capture console errors and page errors during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize arrays fresh for each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages; we only store error-level console messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // If reading message fails, push simple record
        consoleErrors.push({ text: String(msg) });
      }
    });

    // Capture unhandled page errors (exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app. Listeners are attached before navigation to capture load-time issues.
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test assert that no uncaught exceptions (pageerror) occurred during the test
    expect(pageErrors, 'No runtime errors (pageerror) should be thrown during page interaction').toHaveLength(0);

    // Assert that no console.error messages were emitted
    expect(consoleErrors, 'No console.error messages should be emitted by the page').toHaveLength(0);
  });

  test('Page loads with expected elements and default state', async ({ page }) => {
    // Purpose: Verify that the page loads and core DOM elements are present with expected defaults.
    const qs = new QuickSortPage(page);

    // Ensure header displays the title
    await expect(qs.header).toBeVisible();
    const headerText = await qs.getHeaderText();
    expect(headerText).toContain('Quick Sort Demonstration');

    // Ensure input is visible and placeholder is correct
    await expect(qs.input).toBeVisible();
    const placeholder = await qs.getInputPlaceholder();
    expect(placeholder).toBe('e.g. 5,3,8,4,2');

    // Ensure sort button is visible and enabled
    await expect(qs.sortButton).toBeVisible();
    await expect(qs.sortButton).toBeEnabled();

    // Result area should be present and initially empty (no meaningful text)
    await expect(qs.result).toBeVisible();
    const initialResult = await qs.getResultText();
    // Could be empty string initially; ensure it does not contain an error message
    expect(initialResult).not.toContain('Please enter a valid list of numbers.');

    // Ensure the quickSort function exists on the page (do not modify it)
    const quickSortType = await page.evaluate(() => typeof quickSort);
    expect(quickSortType).toBe('function');
  });

  test('Sorts a simple list of numbers correctly', async ({ page }) => {
    // Purpose: Validate that valid numeric input is sorted and displayed.
    const qs = new QuickSortPage(page);

    // Enter a comma-separated list of numbers and perform sort
    await qs.enterInput('5,3,8,4,2');
    await qs.clickSort();

    // The page uses join(', ') when displaying the sorted numbers
    const resultText = await qs.getResultText();
    expect(resultText).toBe('Sorted Array: 2, 3, 4, 5, 8');
  });

  test('Handles empty input producing "Sorted Array: " (empty result)', async ({ page }) => {
    // Purpose: Validate behavior for empty input: should be handled and not throw.
    const qs = new QuickSortPage(page);

    // Clear input and click sort
    await qs.enterInput('');
    await qs.clickSort();

    // Expect exactly "Sorted Array: " (note trailing space per implementation)
    const resultText = await qs.getResultText();
    expect(resultText).toBe('Sorted Array: ');
  });

  test('Shows error message for invalid (non-numeric) input', async ({ page }) => {
    // Purpose: Ensure the application detects invalid list entries and displays the error message.
    const qs = new QuickSortPage(page);

    // Provide invalid data containing non-numeric token
    await qs.enterInput('1,2,foo,4');
    await qs.clickSort();

    const resultText = await qs.getResultText();
    expect(resultText).toBe('Please enter a valid list of numbers.');
  });

  test('Sorts numbers with spaces, negatives, and duplicates correctly', async ({ page }) => {
    // Purpose: Validate that trimming spaces, negative numbers, and duplicates are handled correctly.
    const qs = new QuickSortPage(page);

    // Input contains extra spaces, negative and duplicate values
    await qs.enterInput('  3, -1, 0, 3, 2 ');
    await qs.clickSort();

    const resultText = await qs.getResultText();
    // Sorted ascending: -1, 0, 2, 3, 3
    expect(resultText).toBe('Sorted Array: -1, 0, 2, 3, 3');
  });

  test('Updates result on subsequent sorts and responds to new inputs', async ({ page }) => {
    // Purpose: Ensure the UI updates correctly when sorting multiple times with different inputs.
    const qs = new QuickSortPage(page);

    // First sort
    await qs.enterInput('10,1');
    await qs.clickSort();
    expect(await qs.getResultText()).toBe('Sorted Array: 1, 10');

    // Change input and sort again
    await qs.enterInput('4,2,9');
    await qs.clickSort();
    expect(await qs.getResultText()).toBe('Sorted Array: 2, 4, 9');

    // Provide invalid input afterwards to ensure error overwrites previous result
    await qs.enterInput('a,b');
    await qs.clickSort();
    expect(await qs.getResultText()).toBe('Please enter a valid list of numbers.');
  });

  test('Accessibility and semantics: input has accessible placeholder and button is operable', async ({ page }) => {
    // Purpose: Small accessibility checks: input placeholder exists and the button is actionable via keyboard.
    const qs = new QuickSortPage(page);

    // Check placeholder exists
    const placeholder = await qs.getInputPlaceholder();
    expect(placeholder).toBeTruthy();

    // Focus input, fill, then press Enter (note: button is not a form submit, so pressing Enter in input may not trigger sorting)
    await qs.input.focus();
    await qs.enterInput('2,1');

    // Pressing Enter should not throw an error; we still call the button via keyboard (Space/Enter on button)
    // Move focus to button and press Space to activate it
    await qs.sortButton.focus();
    await page.keyboard.press('Space');

    // Validate the sort occurred after keyboard activation
    const resultText = await qs.getResultText();
    expect(resultText).toBe('Sorted Array: 1, 2');
  });
});
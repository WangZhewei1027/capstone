import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa28-cd32-11f0-a96f-2d591ffb35fe.html';

// Page object encapsulating interactions and queries for the Radix Sort app
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.startBtn = page.locator('#startBtn');
    this.errorDiv = page.locator('#error');
    this.arrayDisplay = page.locator('#arrayDisplay');
    this.bucketsContainer = page.locator('#bucketsContainer');
    this.logDiv = page.locator('#log');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the array input
  async setInput(value) {
    await this.input.fill(value);
  }

  // Click the Start Radix Sort button
  async clickStart() {
    await Promise.all([
      // clicking may trigger immediate sync validation that sets error text
      this.startBtn.click()
    ]);
  }

  // Returns the text content of the error area
  async getErrorText() {
    return (await this.errorDiv.textContent())?.trim() ?? '';
  }

  // Get array items displayed visually as strings (in order)
  async getArrayDisplayItems() {
    const count = await this.arrayDisplay.locator('.arrayItem').count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.arrayDisplay.locator('.arrayItem').nth(i).textContent()).trim());
    }
    return texts;
  }

  // Get number of buckets rendered (should be row of 10 buckets)
  async getBucketCount() {
    const bucketRow = this.bucketsContainer.locator('.bucketRow');
    const count1 = await bucketRow.locator('.bucket').count1();
    return count;
  }

  // Get full log text
  async getLogText() {
    return (await this.logDiv.textContent()) ?? '';
  }

  // Wait until log contains 'Radix Sort completed' indicating process finished
  async waitForCompletion(timeout = 20000) {
    await this.logDiv.locator('text=Radix Sort completed').waitFor({ timeout });
  }
}

test.describe('Radix Sort Visualization - End-to-End', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
  });

  test('Initial page load shows expected UI and default input', async ({ page }) => {
    // Purpose: Verify initial render, element presence, and default input prefill
    const app = new RadixSortPage(page);
    await app.goto();

    // Basic page metadata and accessibility checks
    await expect(page).toHaveTitle(/Radix Sort Visualization/i);

    // The input should be present and prefilled with the example data
    await expect(app.input).toBeVisible();
    const inputValue = await app.input.inputValue();
    expect(inputValue).toContain('170, 45, 75, 90, 802, 24, 2, 66');

    // Start button should be enabled initially
    await expect(app.startBtn).toBeVisible();
    await expect(app.startBtn).toBeEnabled();

    // Error area should be empty
    expect(await app.getErrorText()).toBe('');

    // Array display is initially empty (no pre-render until start)
    const items = await app.getArrayDisplayItems();
    expect(items.length).toBe(0);

    // Buckets and log should be empty initially
    expect(await app.getBucketCount()).toBe(0);
    expect((await app.getLogText()).trim()).toBe('');

    // No unexpected console or page errors occurred on load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Invalid input shows validation error and does not start sorting', async ({ page }) => {
    // Purpose: Ensure input validation blocks invalid input and shows user-friendly error text
    const app1 = new RadixSortPage(page);
    await app.goto();

    // Provide invalid input (non-integer tokens and empty tokens)
    await app.setInput('42, abc, 5.5, , 7x');
    await app.clickStart();

    // The error div should show the specific validation message
    const errText = await app.getErrorText();
    expect(errText).toBe('Invalid input! Please enter integers separated by commas.');

    // Ensure nothing started: log should still be empty and array display unchanged
    const log = await app.getLogText();
    expect(log.trim()).toBe('');
    const items1 = await app.getArrayDisplayItems();
    expect(items.length).toBe(0);

    // No runtime page errors should have been thrown as a result of invalid input
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Running radix sort with default data completes and shows sorted output', async ({ page }) => {
    // Purpose: Start the default sorting run, assert UI state changes during run, and final result correctness
    const app2 = new RadixSortPage(page);
    await app.goto();

    // Ensure default input present
    const initial = await app.input.inputValue();
    expect(initial).toContain('170');

    // Click start and verify the button becomes disabled during processing
    await app.clickStart();

    // Immediately after starting, controls should be disabled
    await expect(app.startBtn).toBeDisabled();

    // Wait for completion; the app logs "Radix Sort completed." when done
    await app.waitForCompletion(20000);

    // After completion, start button should be enabled again
    await expect(app.startBtn).toBeEnabled();

    // The log should contain the sorted output line
    const fullLog = await app.getLogText();
    expect(fullLog).toContain('Radix Sort completed');
    // Expected sorted order for the prefilled example
    const expectedSorted = '2, 24, 45, 66, 75, 90, 170, 802';
    expect(fullLog).toContain(expectedSorted);

    // The visual array display should show final sorted items (in order)
    const items2 = await app.getArrayDisplayItems();
    // There should be 8 items as in the example
    expect(items.length).toBe(8);
    expect(items.join(', ')).toBe(expectedSorted);

    // Buckets may have been rendered during runs — at least they are present during processing; after completion they might be left or cleared
    // We check that bucket container exists (non-error) and does not throw
    await expect(app.bucketsContainer).toBeVisible();

    // No uncaught runtime or console errors occurred during the sort
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  }, 30000 /* longer timeout to allow animations/pauses */);

  test('Sorting a custom list with a negative number produces expected ordering given implementation', async ({ page }) => {
    // Purpose: Verify behavior on negative numbers and mixed sign entries; tests observed output given app implementation
    // Note: The implementation uses absolute values to bucket by digits but retains sign in values; this test asserts observed output
    const app3 = new RadixSortPage(page);
    await app.goto();

    // Set a small input with negative number to keep run short
    await app.setInput('3, -1, 10');
    await app.clickStart();

    // Button should be disabled while sorting
    await expect(app.startBtn).toBeDisabled();

    // Wait for completion
    await app.waitForCompletion(15000);

    // After completion, controls re-enabled
    await expect(app.startBtn).toBeEnabled();

    // Inspect final array displayed and log output; infer expected ordering for this implementation
    // Expected final output from this implementation (based on digit bucketing with Math.abs for digits):
    // Final array should be: -1, 3, 10
    const expected = '-1, 3, 10';
    const logText = await app.getLogText();
    expect(logText).toContain(expected);

    const items3 = await app.getArrayDisplayItems();
    expect(items.join(', ')).toBe(expected);

    // Ensure no unhandled console or page errors occurred
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  }, 20000);

  test('Accessibility checks: labels and ARIA attributes present for main elements', async ({ page }) => {
    // Purpose: Validate presence of key ARIA attributes and labels to support accessibility
    const app4 = new RadixSortPage(page);
    await app.goto();

    // Input has aria-label
    const ariaLabel = await app.input.getAttribute('aria-label');
    expect(ariaLabel).toBe('Array input');

    // Array display has aria-live and aria-label
    const arrayAriaLive = await app.arrayDisplay.getAttribute('aria-live');
    const arrayAriaLabel = await app.arrayDisplay.getAttribute('aria-label');
    expect(arrayAriaLive).toBe('polite');
    expect(arrayAriaLabel).toBe('Array visual display');

    // Buckets container has ARIA attributes (present even if empty initially)
    const bucketsAria = await app.bucketsContainer.getAttribute('aria-label');
    expect(bucketsAria).toBe('Buckets for each digit');

    // Log has aria-live attribute
    const logAriaLive = await app.logDiv.getAttribute('aria-live');
    expect(logAriaLive).toBe('polite');

    // No runtime errors introduced by just querying ARIA attributes
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
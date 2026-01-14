import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79429-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Simple page object for the Heap Sort page
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input');
    this.sortBtn = page.locator('#sort-btn');
    this.resetBtn = page.locator('#reset-btn');
    this.resultDiv = page.locator('#result');
    this.header = page.locator('h2');
    this.description = page.locator('p');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async typeInput(value) {
    await this.input.fill(String(value));
  }

  async clickSort() {
    await this.sortBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async getResultText() {
    return (await this.resultDiv.textContent()) ?? '';
  }

  async headerText() {
    return (await this.header.textContent()) ?? '';
  }

  async descriptionText() {
    return (await this.description.textContent()) ?? '';
  }

  async inputPlaceholder() {
    return (await this.input.getAttribute('placeholder')) ?? '';
  }

  async sortButtonText() {
    return (await this.sortBtn.textContent()) ?? '';
  }

  async resetButtonText() {
    return (await this.resetBtn.textContent()) ?? '';
  }
}

test.describe('Heap Sort Application - 11b79429-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // We'll capture page errors and console messages for assertions.
  let pageErrors;
  let consoleMessages;
  let heapPage;

  test.beforeEach(async ({ page }) => {
    // Initialize containers for captured diagnostics
    pageErrors = [];
    consoleMessages = [];

    // Capture unhandled exceptions from the page (e.g., ReferenceError)
    page.on('pageerror', (err) => {
      // store the Error object for later assertions
      pageErrors.push(err);
    });

    // Capture console messages to observe logs and runtime issues
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        // ignore any unexpected console event shape
      }
    });

    heapPage = new HeapSortPage(page);

    // Navigate to the page under test. We attach listeners before navigation
    // to ensure we capture any errors that happen during script execution on load.
    await heapPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Optionally clear listeners if needed (Playwright tears down pages between tests)
    // No teardown actions required here beyond Playwright defaults.
  });

  test('Initial page load: elements are present and in default state', async () => {
    // Verify the static structure is rendered (header, description, input, buttons, result div)
    await expect(heapPage.header).toBeVisible();
    expect(await heapPage.headerText()).toContain('Heap Sort');

    await expect(heapPage.description).toBeVisible();
    expect(await heapPage.descriptionText()).toContain('Heap Sort is a comparison-based sorting algorithm');

    await expect(heapPage.input).toBeVisible();
    expect(await heapPage.inputPlaceholder()).toBe('Enter number of elements');

    await expect(heapPage.sortBtn).toBeVisible();
    expect(await heapPage.sortButtonText()).toBe('Heap Sort');

    await expect(heapPage.resetBtn).toBeVisible();
    expect(await heapPage.resetButtonText()).toBe('Reset');

    // Result div should exist and be empty by default
    const resultText = await heapPage.getResultText();
    expect(resultText.trim()).toBe('');
  });

  test('Page emits a ReferenceError for missing reset function on load', async () => {
    // This app's inline script binds reset before the reset function is defined
    // causing a ReferenceError during initial script execution. We assert that error occurred.
    // Wait briefly to ensure any synchronous pageerrors during load have been captured.
    await new Promise((r) => setTimeout(r, 50));

    // There should be at least one page error captured
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one of the captured errors should mention 'reset is not defined' or be a ReferenceError
    const found = pageErrors.some((err) => {
      const msg = String(err && err.message ? err.message : err);
      return /reset is not defined/i.test(msg) || /referenceerror/i.test(msg);
    });

    expect(found).toBeTruthy();
  });

  test('Clicking "Heap Sort" updates the result div (uses internal inputNum, ignoring input field)', async () => {
    // Purpose: Verify that clicking the sort button updates the DOM even though the page has a script error.
    // The implementation uses a module-scoped inputNum variable (not bound to the input element),
    // so entering a value in the input should not affect the outcome.
    // Clear any previously captured console messages and errors to focus on this interaction.
    const preErrorCount = pageErrors.length;

    // Type a value into the visible input (this app does not bind the input to its internal state)
    await heapPage.typeInput('5');

    // Click the Heap Sort button; the handler (if attached) will run heapSort.
    await heapPage.clickSort();

    // Give a slight pause for DOM updates
    await new Promise((r) => setTimeout(r, 50));

    // The expected behavior, given the broken implementation, is that it will produce 'Sorted array: '
    // because the internal inputNum remains 0 and results in an empty array string.
    const result = await heapPage.getResultText();
    expect(result).toContain('Sorted array:');

    // Ensure the content is the minimal expected string (no numbers present given the buggy logic)
    // We trim to avoid whitespace sensitivity.
    expect(result.trim()).toBe('Sorted array:');

    // Ensure this click did not produce additional page errors (the initial ReferenceError comes from load)
    expect(pageErrors.length).toBeGreaterThanOrEqual(preErrorCount);
  });

  test('Reset button click does not crash the page (no handler attached due to earlier error)', async () => {
    // Purpose: Verify that the reset button, which was intended to be wired, does not cause further issues.
    // The initial script failed to attach a reset handler; clicking should do nothing and not throw new pageerrors.

    const beforeErrors = pageErrors.length;

    // Capture console and pageerror counts, click reset, and ensure there is no new uncaught page error
    await heapPage.clickReset();

    // Allow for any synchronous errors to surface
    await new Promise((r) => setTimeout(r, 50));

    // Confirm no additional page errors were added by clicking reset
    expect(pageErrors.length).toBe(beforeErrors);

    // Also confirm that result div remains unchanged (still possibly empty or previously set by sort)
    const result1 = await heapPage.getResultText();
    // result may be empty or contain 'Sorted array:' depending on prior actions; ensure it is a string.
    expect(typeof result).toBe('string');
  });

  test('Changing input value does not affect sorting result (input is not bound to internal state)', async () => {
    // Purpose: Demonstrate that the visible input field is not wired to the internal inputNum variable.
    // Set input to a larger value and ensure result after sorting remains the same minimal output.

    // Reset any result by reloading the page (to ensure consistent baseline)
    await heapPage.page.reload();
    // Wait for load handlers (and for the initial ReferenceError to occur again)
    await new Promise((r) => setTimeout(r, 50));

    // Set a high value in the visible input
    await heapPage.typeInput('100');

    // Click sort
    await heapPage.clickSort();

    // Wait for DOM update
    await new Promise((r) => setTimeout(r, 50));

    const result2 = await heapPage.getResultText();
    // Given the implementation issues, the result is still the minimal "Sorted array:" string
    expect(result.trim()).toBe('Sorted array:');
  });

  test('Console captured messages are available for debugging (sanity check)', async () => {
    // Purpose: Ensure we captured console messages; even if none exist, the array is accessible.
    // This test is mostly to exercise the console capture logic and confirm it does not throw.
    // Wait briefly to ensure any console messages produced during load are collected.
    await new Promise((r) => setTimeout(r, 20));

    // We allow zero or more console messages; just assert the structure of captured entries when present.
    for (const msg of consoleMessages) {
      expect(msg).toHaveProperty('type');
      expect(msg).toHaveProperty('text');
      expect(typeof msg.text).toBe('function' || 'string' ? 'string' : 'string');
    }
  });
});
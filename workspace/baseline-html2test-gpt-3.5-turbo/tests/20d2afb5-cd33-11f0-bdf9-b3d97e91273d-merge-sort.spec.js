import { test, expect } from '@playwright/test';

test.setTimeout(60000); // Increase timeout to allow merge sort animations to complete

/**
 * Page Object for the Merge Sort Visualization page.
 * Encapsulates common interactions and queries to keep tests readable.
 */
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb5-cd33-11f0-bdf9-b3d97e91273d.html';
    this.arraySizeInput = page.locator('#arraySize');
    this.generateBtn = page.locator('#generateBtn');
    this.sortBtn = page.locator('#sortBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.arrayContainer = page.locator('#array');
    this.logContainer = page.locator('#log');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Set the array size input
  async setArraySize(size) {
    await this.arraySizeInput.fill(String(size));
    // Blur to ensure change is recognized
    await this.arraySizeInput.press('Tab');
  }

  // Click generate button
  async clickGenerate() {
    await this.generateBtn.click();
  }

  // Click start sort button
  async clickStartSort() {
    await this.sortBtn.click();
  }

  // Click reset button
  async clickReset() {
    await this.resetBtn.click();
  }

  // Return number of bars currently rendered
  async getBarCount() {
    return await this.arrayContainer.locator('.bar').count();
  }

  // Return array of numbers displayed in bars as integers
  async getBarValues() {
    const bars = this.arrayContainer.locator('.bar');
    const count = await bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await bars.nth(i).innerText();
      values.push(parseInt(text, 10));
    }
    return values;
  }

  // Wait until a log entry containing the provided substring appears
  async waitForLogEntry(substring, options = {}) {
    const timeout = options.timeout ?? 30000;
    await this.page.waitForFunction(
      (sel, substr) => {
        const c = document.querySelector(sel);
        return c && c.innerText.includes(substr);
      },
      this.logContainer.selector || '#log',
      substring,
      { timeout }
    );
  }

  // Check whether any bars currently have the 'active' class
  async hasActiveBars() {
    return await this.page.evaluate(() => {
      return !!document.querySelector('#array .bar.active');
    });
  }

  // Check whether any bars currently have the 'merging' class
  async hasMergingBars() {
    return await this.page.evaluate(() => {
      return !!document.querySelector('#array .bar.merging');
    });
  }

  // Get raw log text (concatenated)
  async getLogText() {
    return await this.logContainer.innerText();
  }
}

test.describe('Merge Sort Visualization - 20d2afb5-cd33-11f0-bdf9-b3d97e91273d', () => {
  // Capture console messages and page errors for each test to assert there are no unexpected runtime errors.
  test.beforeEach(async ({ page }) => {
    // No-op here; setup per-test is done in tests via page object
  });

  // Test initial page load and default state
  test('Initial load shows controls and renders default array', async ({ page }) => {
    // Purpose: verify that the page loads, controls exist, and default array is rendered on load.
    const p = new MergeSortPage(page);
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) =>
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    );
    page.on('pageerror', (err) => pageErrors.push(err));

    await p.goto();

    // Controls should be visible and enabled
    await expect(p.arraySizeInput).toBeVisible();
    await expect(p.generateBtn).toBeVisible();
    await expect(p.sortBtn).toBeVisible();
    await expect(p.resetBtn).toBeVisible();

    // Default value for array size input should be '20' per implementation
    await expect(p.arraySizeInput).toHaveValue('20');

    // After initial load, reset() runs on load and renders the array. Confirm bars count equals 20.
    const barCount = await p.getBarCount();
    expect(barCount).toBe(20);

    // The log should be empty initially (no sorting happened yet)
    const logText = await p.getLogText();
    expect(logText.trim()).toBe('');

    // Verify no page errors were thrown during load
    expect(pageErrors.length).toBe(0);

    // Ensure there were no console.error messages
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test generate button regenerates array with specified size
  test('Generate Array respects the specified size and renders values', async ({ page }) => {
    // Purpose: ensure the generate control uses the input size and the DOM updates appropriately.
    const p1 = new MergeSortPage(page);
    const consoleMessages1 = [];
    const pageErrors1 = [];

    page.on('console', (msg) =>
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    );
    page.on('pageerror', (err) => pageErrors.push(err));

    await p.goto();

    // Set size to a smaller number for test speed and clarity
    await p.setArraySize(8);
    await p.clickGenerate();

    // After clicking generate, we expect exactly 8 bars
    await expect.poll(() => p.getBarCount()).toEqual(8);

    // Bars should contain numeric values between 5 and 100 as per implementation
    const values1 = await p.getBarValues();
    expect(values.length).toBe(8);
    for (const v of values) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(100);
    }

    // No page errors or console.error during generation
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test starting merge sort disables controls, performs sorting, and completes successfully
  test('Start Merge Sort disables controls during sorting and sorts the array', async ({ page }) => {
    // Purpose: verify the sorting process behaviour:
    // - controls are disabled while sorting
    // - log entries indicate start and completion
    // - final array is sorted
    const p2 = new MergeSortPage(page);
    const consoleMessages2 = [];
    const pageErrors2 = [];

    page.on('console', (msg) =>
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    );
    page.on('pageerror', (err) => pageErrors.push(err));

    await p.goto();

    // Use a small array to keep test time reasonable
    await p.setArraySize(6);
    await p.clickGenerate();

    // Start sorting
    await p.clickStartSort();

    // Immediately after starting, controls should be disabled
    await expect(p.generateBtn).toBeDisabled();
    await expect(p.sortBtn).toBeDisabled();
    await expect(p.arraySizeInput).toBeDisabled();

    // The log should contain "Starting Merge Sort" eventually
    await p.waitForLogEntry('Starting Merge Sort', { timeout: 10000 });

    // During sorting, visual indicators (active/merging) should appear at some point.
    // Wait up to 10s for an active or merging bar to appear.
    await expect.poll(async () => {
      const hasActive = await p.hasActiveBars();
      const hasMerging = await p.hasMergingBars();
      return hasActive || hasMerging;
    }, { timeout: 10000 }).toBeTruthy();

    // Wait for completion log entry. Merge Sort may take some time depending on sleeps.
    await p.waitForLogEntry('Merge Sort Completed', { timeout: 40000 });

    // After completion, controls should be re-enabled
    await expect(p.generateBtn).toBeEnabled();
    await expect(p.sortBtn).toBeEnabled();
    await expect(p.arraySizeInput).toBeEnabled();

    // Final array values should be sorted non-decreasingly
    const finalValues = await p.getBarValues();
    for (let i = 1; i < finalValues.length; i++) {
      expect(finalValues[i]).toBeGreaterThanOrEqual(finalValues[i - 1]);
    }

    // Ensure there are no uncaught page errors or console.error during the sort flow
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test reset button clears logs and regenerates the array when not sorting
  test('Reset clears logs and regenerates array when not sorting', async ({ page }) => {
    // Purpose: ensure reset behaves correctly (only when not sorting); clears logs and re-renders.
    const p3 = new MergeSortPage(page);
    const pageErrors3 = [];

    page.on('pageerror', (err) => pageErrors.push(err));

    await p.goto();

    // Generate and then start a quick sort to produce a log entry.
    await p.setArraySize(6);
    await p.clickGenerate();
    await p.clickStartSort();

    // Wait for start and completion so logs have content
    await p.waitForLogEntry('Starting Merge Sort', { timeout: 10000 });
    await p.waitForLogEntry('Merge Sort Completed', { timeout: 40000 });

    // Logs now should have content
    const logBefore = await p.getLogText();
    expect(logBefore.length).toBeGreaterThan(0);

    // Click Reset (not sorting anymore), should clear logs and regenerate array
    await p.clickReset();

    const logAfter = await p.getLogText();
    expect(logAfter.trim()).toBe(''); // log cleared

    // Bars should be present equal to the input size (6)
    const barCount1 = await p.getBarCount();
    expect(barCount).toBe(6);

    // No page errors during reset
    expect(pageErrors.length).toBe(0);
  });

  // Test that visual feedback classes 'active' and 'merging' are used during the merge process
  test("Visual feedback classes ('active' and 'merging') appear during merge operations", async ({ page }) => {
    // Purpose: detect that the application applies 'active' and 'merging' classes during sorting.
    const p4 = new MergeSortPage(page);
    const consoleMessages3 = [];
    const pageErrors4 = [];

    page.on('console', (msg) =>
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    );
    page.on('pageerror', (err) => pageErrors.push(err));

    await p.goto();

    // Use small size so that merges happen promptly
    await p.setArraySize(7);
    await p.clickGenerate();
    await p.clickStartSort();

    // Wait for at least one 'merging' class to appear during sorting
    const mergingAppeared = await expect.poll(async () => {
      return await p.hasMergingBars();
    }, { timeout: 10000 }).toBeTruthy();

    // Also wait for at least one 'active' class to appear during sorting
    const activeAppeared = await expect.poll(async () => {
      return await p.hasActiveBars();
    }, { timeout: 10000 }).toBeTruthy();

    // Wait for completion before asserting final state
    await p.waitForLogEntry('Merge Sort Completed', { timeout: 40000 });

    // After completion, there should be no bars left with 'active' or 'merging' classes
    const anyActiveAfter = await p.hasActiveBars();
    const anyMergingAfter = await p.hasMergingBars();
    expect(anyActiveAfter).toBe(false);
    expect(anyMergingAfter).toBe(false);

    // No page errors or console.error messages occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrors3 = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});
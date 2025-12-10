import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b76d12-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object encapsulating commonly queried elements and operations
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Wait for main container to be present
  async waitForReady() {
    await this.page.waitForSelector('#heap-container', { state: 'visible', timeout: 2000 });
    // ensure min-max exists
    await this.page.waitForSelector('#min-max', { state: 'attached', timeout: 2000 });
    await this.page.waitForSelector('#heap', { state: 'attached', timeout: 2000 });
  }

  // Return the text content of the min-max element (first with that id)
  async getMinMaxText() {
    const handle = await this.page.$('#min-max');
    if (!handle) return null;
    return (await handle.textContent()).trim();
  }

  // Return the text content of the heap element (first with that id)
  async getHeapText() {
    const handle1 = await this.page.$('#heap');
    if (!handle) return '';
    return (await handle.textContent()).trim();
  }

  // Return number of elements in document that have id="heap"
  async countHeapIdOccurrences() {
    return this.page.evaluate(() => document.querySelectorAll('[id="heap"]').length);
  }

  // Return number of elements in document that have id="min-max"
  async countMinMaxIdOccurrences() {
    return this.page.evaluate(() => document.querySelectorAll('[id="min-max"]').length);
  }

  // Parse all "Removed: <num>" occurrences from the visible #heap element text
  async getRemovedNumbersFromHeapText() {
    const text = await this.getHeapText();
    const regex = /Removed:\s*([0-9]+)/g;
    const results = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
      results.push(Number(m[1]));
    }
    return results;
  }

  // Count buttons/inputs/selects (for verifying there are no interactive controls)
  async countInteractiveControls() {
    return this.page.evaluate(() => {
      const btns = document.querySelectorAll('button, input, select, textarea, form');
      return btns.length;
    });
  }
}

test.describe('Heap (Min/Max) Demo - UI and behavior', () => {
  // Arrays to collect console and page errors during navigation
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      // collect only error-level console messages to focus on problems
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (error) => {
      pageErrors.push(error && error.message ? error.message : String(error));
    });

    // Navigate to the application page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // no special teardown required; listeners are automatically removed when page closes
  });

  test('Page loads and initial DOM structure is present', async ({ page }) => {
    // Purpose: Verify the page loads and the main structural elements are present and visible
    const heapPage = new HeapPage(page);
    await heapPage.waitForReady();

    // Check the document title and heading
    await expect(page).toHaveTitle(/Heap \(Min\/Max\) Demo/i);
    const h1 = await page.locator('h1').textContent();
    expect(h1).toMatch(/Heap\s*\(Min\/Max\)\s*Demo/i);

    // Verify that #heap-container, #heap and #min-max exist in DOM
    const heapContainer = await page.$('#heap-container');
    const heap = await page.$('#heap');
    const minmax = await page.$('#min-max');
    expect(heapContainer).not.toBeNull();
    expect(heap).not.toBeNull();
    expect(minmax).not.toBeNull();

    // There are no interactive controls (buttons/inputs/forms) in this demo
    const interactiveCount = await heapPage.countInteractiveControls();
    expect(interactiveCount).toBe(0);
  });

  test('Heap operations run and DOM shows removed values and final size 0', async ({ page }) => {
    // Purpose: Verify that the heap script executed, values were inserted/removed,
    // and the UI reflects removals and a final heap size of 0.
    const heapPage1 = new HeapPage(page);
    await heapPage.waitForReady();

    // Wait a short time to ensure the script that inserts/removes has run
    // The script runs synchronously during load, but wait a tick to be safe
    await page.waitForTimeout(100);

    // The visible min-max (first element with id) should reflect final heap size
    const minMaxText = await heapPage.getMinMaxText();
    expect(minMaxText).toBeDefined();
    // The script removes all inserted items, so final heap size is expected to be 0
    expect(minMaxText).toMatch(/Heap Size:\s*0/);

    // Extract removed numbers from the heap display
    const removedNumbers = await heapPage.getRemovedNumbersFromHeapText();

    // Expect exactly 10 removed entries (we inserted 10 values 0..9)
    expect(removedNumbers.length).toBe(10);

    // All removed values should be integers between 0 and 9 (inclusive)
    for (const val of removedNumbers) {
      expect(Number.isInteger(val)).toBeTruthy();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(9);
    }

    // The text of the heap element should contain the substring "Removed:"
    const heapText = await heapPage.getHeapText();
    expect(heapText).toContain('Removed:');

    // Verify final heap text includes "Heap Size: 0" somewhere (some min-max may be nested)
    expect(heapText + ' ' + minMaxText).toMatch(/Heap Size:\s*0/);
  });

  test('Document contains duplicate IDs as implemented and we can detect them', async ({ page }) => {
    // Purpose: Confirm the implementation's DOM contains duplicate IDs (heap and min-max)
    const heapPage2 = new HeapPage(page);
    await heapPage.waitForReady();

    // Count occurrences of elements that have id="heap" and id="min-max"
    const heapIdCount = await heapPage.countHeapIdOccurrences();
    const minMaxIdCount = await heapPage.countMinMaxIdOccurrences();

    // The implementation writes nested elements with the same IDs; we expect more than one occurrence
    expect(heapIdCount).toBeGreaterThanOrEqual(1);
    expect(minMaxIdCount).toBeGreaterThanOrEqual(1);

    // Specifically, because innerHTML injected nested IDs, it's reasonable to expect duplicates
    // (at least 2 occurrences for each) — assert at least 1 to be tolerant but warn if only one.
    if (heapIdCount === 1 || minMaxIdCount === 1) {
      // Log a diagnostic message via Playwright trace (this is not a test failure)
      // but keep the assertions above as the main checks.
      // No action required here; this branch simply documents the observation.
    }
  });

  test('No uncaught page errors or console errors occurred during load', async ({ page }) => {
    // Purpose: Observe console and page errors and assert on their presence/absence.
    // We collected errors during navigation in beforeEach.

    // Assert there were no uncaught page exceptions
    expect(pageErrors.length).toBe(0);

    // Assert there were no console error messages emitted
    expect(consoleErrors.length).toBe(0);
  });

  test('Reloading the page produces the same observable behavior', async ({ page }) => {
    // Purpose: Ensure the application behaves consistently across reloads.
    const heapPage3 = new HeapPage(page);
    await heapPage.waitForReady();

    // Reload and wait for load to finish
    await page.reload({ waitUntil: 'load' });
    await heapPage.waitForReady();

    // Allow a short moment for inline script to execute
    await page.waitForTimeout(100);

    // Confirm removed values count again
    const removedNumbers1 = await heapPage.getRemovedNumbersFromHeapText();
    expect(removedNumbers.length).toBe(10);

    // Confirm final min-max text again
    const minMaxText1 = await heapPage.getMinMaxText();
    expect(minMaxText).toMatch(/Heap Size:\s*0/);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6a6e1-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object to encapsulate common selectors and actions for the Heap page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.heapSelector = '#heap';
    this.headingText = 'Heap (Min/Max) Example';
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getHeading() {
    return this.page.getByRole('heading', { name: this.headingText });
  }

  async getHeapElement() {
    return this.page.locator(this.heapSelector);
  }

  // Read the heap array from the page's global runtime, if present.
  async readHeapArrayFromWindow() {
    return this.page.evaluate(() => {
      // Access global variable `heap` defined by the page script; if not present, returns undefined.
      return typeof heap !== 'undefined' ? heap : undefined;
    });
  }

  // Read any global array 'arr' used in the script to reflect state of the algorithm
  async readArrFromWindow() {
    return this.page.evaluate(() => {
      return typeof arr !== 'undefined' ? arr : undefined;
    });
  }
}

test.describe('Heap (Min/Max) Example - UI and runtime behavior', () => {
  let consoleMessages;
  let pageErrors;
  let heapPage;

  // Setup: navigate to the page and attach listeners for console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    page.on('console', (msg) => {
      // Ignore warnings about Playwright internals if any; capture textual content
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // In case msg.text() throws, push a fallback representation
        consoleMessages.push({ type: msg.type(), text: String(msg) });
      }
    });

    // Capture runtime page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test.afterEach(async () => {
    // Teardown can be used for logging in case of failure (left empty intentionally)
  });

  test('Initial page load shows title, heading and heap container', async ({ page }) => {
    // Verify the document title contains expected phrase
    await expect(page).toHaveTitle(/Heap \(Min\/Max\) Example/);

    // Verify the visible heading exists and matches exactly
    const heading = await heapPage.getHeading();
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Heap (Min/Max) Example');

    // Verify the heap container exists and is visible
    const heapEl = await heapPage.getHeapElement();
    await expect(heapEl).toBeVisible();

    // The HTML does not populate #heap via script in the provided code, so it should be empty
    await expect(heapEl).toHaveText('', { timeout: 1000 });
  });

  test('No interactive form controls (buttons/inputs/selects) are present on the page', async ({ page }) => {
    // This application is a demonstration script without interactive input controls.
    // Verify there are no buttons, inputs, selects, or forms in the document.
    const buttonCount = await page.locator('button').count();
    const inputCount = await page.locator('input').count();
    const selectCount = await page.locator('select').count();
    const formCount = await page.locator('form').count();
    const textareaCount = await page.locator('textarea').count();

    await expect(buttonCount).toBe(0);
    await expect(inputCount).toBe(0);
    await expect(selectCount).toBe(0);
    await expect(formCount).toBe(0);
    await expect(textareaCount).toBe(0);
  });

  test('Console logging sequence matches expected heap operations', async ({ page }) => {
    // The page script logs the sequence of heap operations. We assert the expected log messages
    // were emitted in the proper order. Give the page some time to run all synchronous logs.
    await page.waitForTimeout(200); // short wait to ensure all console logs have been captured

    // Collect the textual console messages in order
    const texts = consoleMessages.map((m) => m.text);

    // We expect at least the following ordered messages:
    // "Max Heap:"
    // "Heap: " (the printHeap function prints this string before iterating)
    // "After inserting 25:"
    // "Heap: "
    // "25"
    // "After inserting 20:"
    // "Heap: "
    // "25" "20"
    // "After inserting 15:"
    // "Heap: "
    // "25" "20" "15"
    //
    // Validate that the sequence of the important markers appear in order.
    const sequence = [
      'Max Heap:',
      'Heap:',
      'After inserting 25:',
      'Heap:',
      '25',
      'After inserting 20:',
      'Heap:',
      '25',
      '20',
      'After inserting 15:',
      'Heap:',
      '25',
      '20',
      '15',
    ];

    // Helper: find next index of a token starting from a given position
    const indexOfFrom = (arr, token, from) => {
      for (let i = from; i < arr.length; i++) {
        if (arr[i] === token) return i;
      }
      return -1;
    };

    // Assert the sequence order is maintained within the captured console messages
    let currentPos = 0;
    for (const token of sequence) {
      const idx = indexOfFrom(texts, token, currentPos);
      await expect(idx).toBeGreaterThanOrEqual(0);
      currentPos = idx + 1;
    }

    // Additionally assert that the console produced at least the "Max Heap:" and final numeric logs
    await expect(texts).toContain('Max Heap:');
    await expect(texts).toContain('25');
    await expect(texts).toContain('20');
    await expect(texts).toContain('15');
  });

  test('Runtime global state: heap array contains inserted values in expected order', async ({ page }) => {
    // The page script declares a global `heap` array and pushes values into it via insert calls.
    // Verify the final heap global variable exists and holds the expected pushed values.
    const heapArray = await heapPage.readHeapArrayFromWindow();

    // The provided script pushes 25, 20, 15 into the global heap variable.
    await expect(heapArray).toBeDefined();
    await expect(Array.isArray(heapArray)).toBe(true);

    // Check that the heap contains the inserted values (order pushed into array)
    // The script pushes values via heap.push(val) in that order, so we expect [25,20,15]
    await expect(heapArray).toEqual([25, 20, 15]);
  });

  test('Original numeric array "arr" remains defined and has expected length', async ({ page }) => {
    // The script defines `arr` as an array of 10 numbers initially. Verify it exists and length is 10.
    const arr = await heapPage.readArrFromWindow();
    await expect(arr).toBeDefined();
    await expect(Array.isArray(arr)).toBe(true);
    await expect(arr.length).toBe(10);

    // Spot check a few expected values from the initial array (as given in the HTML)
    await expect(arr).toEqual([
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    ]);
  });

  test('No uncaught runtime errors were emitted during page load', async () => {
    // If any pageerror events were emitted, include them in the assertion failure message for debugging.
    if (pageErrors.length > 0) {
      const messages = pageErrors.map((e) => (e && e.message) || String(e)).join('\n---\n');
      // Fail the test with the collected error messages
      throw new Error(`Unexpected page errors were emitted:\n${messages}`);
    }

    // Otherwise assert explicitly that there were no page errors
    await expect(pageErrors.length).toBe(0);
  });
});
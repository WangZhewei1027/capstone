import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb6-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object Model for the Quick Sort Visualization page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = '#arrayContainer';
    this.arrayElementsSelector = '.arrayElement';
    this.startButtonSelector = 'button:has-text("Start Quick Sort")';
    this.generateButtonSelector = 'button:has-text("Generate New Array")';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for initial array elements to render
    await this.page.waitForSelector(this.arrayElementsSelector);
  }

  // Return array of numeric values shown in the DOM
  async getDisplayedValues() {
    return await this.page.$$eval(this.arrayElementsSelector, els =>
      els.map(el => parseInt(el.innerText || '', 10))
    );
  }

  // Return array of height styles (pixel values as numbers)
  async getDisplayedHeights() {
    return await this.page.$$eval(this.arrayElementsSelector, els =>
      els.map(el => {
        const height = window.getComputedStyle(el).height;
        return parseFloat(height); // px value
      })
    );
  }

  async clickStart() {
    await this.page.click(this.startButtonSelector);
  }

  async clickGenerate() {
    await this.page.click(this.generateButtonSelector);
    // wait for the DOM to be repopulated
    await this.page.waitForSelector(this.arrayElementsSelector);
  }

  // Checks whether displayed values are non-decreasing (sorted ascending)
  async isDisplayedSorted() {
    const vals = await this.getDisplayedValues();
    for (let i = 1; i < vals.length; i++) {
      if (vals[i - 1] > vals[i]) return false;
    }
    return true;
  }

  async getElementCount() {
    return await this.page.$$eval(this.arrayElementsSelector, els => els.length);
  }
}

test.describe('Quick Sort Visualization - 0888fdb6-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // arrays to capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages; record only error-level messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Capture uncaught exceptions in the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Test initial page load and default state
  test('Initial load shows array container with 10 elements and controls visible', async ({ page }) => {
    const qs = new QuickSortPage(page);
    // Navigate to the app
    await qs.goto();

    // Verify both control buttons are visible and enabled
    const startVisible = await page.isVisible(qs.startButtonSelector);
    const generateVisible = await page.isVisible(qs.generateButtonSelector);
    expect(startVisible).toBe(true);
    expect(generateVisible).toBe(true);

    // The array container should exist and contain 10 elements by implementation
    const count = await qs.getElementCount();
    expect(count).toBe(10);

    // Each element should display a numeric value between 1 and 100
    const values = await qs.getDisplayedValues();
    expect(values.length).toBe(10);
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }

    // Heights should correspond to value * 3 (as used in the implementation)
    const heights = await qs.getDisplayedHeights();
    for (let i = 0; i < values.length; i++) {
      // Allow a small floating point tolerance
      expect(Math.abs(heights[i] - values[i] * 3)).toBeLessThanOrEqual(1);
    }

    // No console errors or page errors should have occurred during initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test the "Generate New Array" button regenerates values and updates the DOM
  test('Clicking "Generate New Array" produces a new set of values and updates heights', async ({ page }) => {
    const qs1 = new QuickSortPage(page);
    await qs.goto();

    // Capture initial state
    const initialValues = await qs.getDisplayedValues();
    const initialHeights = await qs.getDisplayedHeights();

    // Click the generate button and wait for update
    await qs.clickGenerate();

    // After generating a new array, there must still be 10 elements
    const newCount = await qs.getElementCount();
    expect(newCount).toBe(10);

    const newValues = await qs.getDisplayedValues();
    const newHeights = await qs.getDisplayedHeights();

    // Values should be numeric and in the valid range
    for (const v of newValues) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }

    // Heights should reflect values * 3
    for (let i = 0; i < newValues.length; i++) {
      expect(Math.abs(newHeights[i] - newValues[i] * 3)).toBeLessThanOrEqual(1);
    }

    // It's possible (though unlikely) to get the identical array again; assert that either the content or ordering was re-rendered
    const arraysAreIdentical = initialValues.every((v, i) => v === newValues[i]);
    // Either the array changed, or at minimum the DOM was updated (we can check innerHTML differs)
    const initialHTML = await page.evaluate(sel => document.querySelector(sel).innerHTML, qs.arrayContainer);
    // Generate operation should replace innerHTML; wait a moment to let DOM settle
    await page.waitForTimeout(50);
    const afterHTML = await page.evaluate(sel => document.querySelector(sel).innerHTML, qs.arrayContainer);

    // Accept either that values changed OR that the DOM was re-rendered (HTML changed)
    expect(arraysAreIdentical === false || initialHTML !== afterHTML).toBe(true);

    // No console errors or page errors should have occurred during generate
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test sorting workflow: clicking "Start Quick Sort" eventually results in a sorted array
  test('Clicking "Start Quick Sort" sorts the displayed array ascending', async ({ page }) => {
    // Sorting may take some time because implementation sleeps 200ms per swap.
    // Increase this test timeout to allow the algorithm to complete on slower machines.
    test.setTimeout(120_000); // 2 minutes

    const qs2 = new QuickSortPage(page);
    await qs.goto();

    const beforeValues = await qs.getDisplayedValues();

    // Ensure array is not already sorted; if it is, re-generate to exercise sorting
    const isAlreadySorted = beforeValues.every((v, i, arr) => i === 0 || arr[i - 1] <= v);
    if (isAlreadySorted) {
      // If already sorted, click generate to create an unsorted example
      await qs.clickGenerate();
    }

    // Start the sorting process
    await qs.clickStart();

    // Poll until the displayed array becomes sorted (non-decreasing)
    await expect.poll(async () => {
      return await qs.isDisplayedSorted();
    }, { timeout: 90_000, interval: 500 }).toBe(true);

    // Confirm final state: 10 elements and sorted ascending
    const finalValues = await qs.getDisplayedValues();
    expect(finalValues.length).toBe(10);
    for (let i = 1; i < finalValues.length; i++) {
      expect(finalValues[i - 1] <= finalValues[i]).toBe(true);
    }

    // No console errors or page errors should have occurred during sorting
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test multiple generate and start interactions in sequence to ensure UI remains responsive
  test('UI remains responsive across multiple generate and sort cycles', async ({ page }) => {
    test.setTimeout(90_000); // allow extra time

    const qs3 = new QuickSortPage(page);
    await qs.goto();

    // Perform a few cycles of generate -> start sort, but limit waiting for full sort to short duration
    // We'll verify that the DOM updates start and controls remain visible/enabled.
    for (let cycle = 0; cycle < 3; cycle++) {
      // Generate a new array
      await qs.clickGenerate();

      // Ensure elements exist
      const count1 = await qs.getElementCount();
      expect(count).toBe(10);

      // Start sorting
      await qs.clickStart();

      // After starting, within a short time we expect some DOM updates to have occurred
      // (displayArray is called on swaps). Wait a small window and check that at least one element's innerText exists.
      await page.waitForTimeout(300);

      const vals1 = await qs.getDisplayedValues();
      expect(vals.length).toBe(10);

      // Controls should remain visible and enabled
      expect(await page.isVisible(qs.startButtonSelector)).toBe(true);
      expect(await page.isVisible(qs.generateButtonSelector)).toBe(true);
    }

    // Finally, ensure no console or page errors were emitted during cycles
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: ensure that array elements contain textual content (numbers) and heights update after a single manual DOM re-render via Generate
  test('Array elements always show text and heights are present after regenerating', async ({ page }) => {
    const qs4 = new QuickSortPage(page);
    await qs.goto();

    // Regenerate a few times and ensure each element has text and a computed height
    for (let i = 0; i < 5; i++) {
      await qs.clickGenerate();
      const values1 = await qs.getDisplayedValues();
      const heights1 = await qs.getDisplayedHeights();

      expect(values.length).toBe(10);
      expect(heights.length).toBe(10);

      for (let j = 0; j < 10; j++) {
        expect(Number.isFinite(values[j])).toBe(true);
        // Height should be positive
        expect(heights[j]).toBeGreaterThan(0);
      }
    }

    // No console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});
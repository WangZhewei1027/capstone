import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4e-mini/html/7e8acca1-d59e-11f0-89ab-2f71529652ac.html';
// Note: the workspace path in the instructions uses "baseline-html2test-gpt-4o-mini".
// The environment where tests run may differ; update APP_URL if necessary.
// The filename requirement for the test runner is handled outside this file.

class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
  }

  async initConsoleListeners() {
    // Capture console messages and page errors for later assertions
    this.page.on('console', msg => {
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    this.page.on('pageerror', error => {
      this.pageErrors.push(error);
    });
  }

  async goto(url = APP_URL) {
    await this.page.goto(url);
  }

  async getGenerateButton() {
    return this.page.locator('button', { hasText: 'Generate Random Array' });
  }

  async getSortButton() {
    return this.page.locator('button', { hasText: 'Sort' });
  }

  async clickGenerate() {
    await (await this.getGenerateButton()).click();
  }

  async clickSort() {
    await (await this.getSortButton()).click();
  }

  async countBars() {
    return this.page.locator('#arrayContainer .bar').count();
  }

  // Returns array of heights in number (px without 'px')
  async getBarHeights() {
    const bars = this.page.locator('#arrayContainer .bar');
    const count = await bars.count();
    const heights = [];
    for (let i = 0; i < count; i++) {
      const el = bars.nth(i);
      const heightStr = await el.evaluate(node => node.style.height || window.getComputedStyle(node).height);
      // heightStr like "64px"
      const numeric = parseFloat(heightStr.replace('px', '').trim());
      heights.push(numeric);
    }
    return heights;
  }

  // Helper to check if array is non-decreasing
  isSortedNonDecreasing(arr) {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }

  // Poll until the bars become sorted, or timeout (ms)
  async waitForSorted(timeout = 30000, pollInterval = 300) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const heights1 = await this.getBarHeights();
      if (heights.length > 0 && this.isSortedNonDecreasing(heights)) {
        return heights;
      }
      await this.page.waitForTimeout(pollInterval);
    }
    // Final attempt and return what we have
    return await this.getBarHeights();
  }
}

test.describe('Quick Sort Visualization - End-to-End', () => {
  // Group related tests and reuse page object
  test.describe.configure({ mode: 'serial' });

  test('Initial page load - UI elements and default state', async ({ page }) => {
    // Create page object and attach console listeners
    const app = new QuickSortPage(page);
    await app.initConsoleListeners();

    // Navigate to the application page
    await app.goto();

    // Verify page title exists and contains expected text
    await expect(page.locator('h1')).toHaveText(/Quick Sort Visualization/i);

    // Verify both buttons are present, visible and enabled
    const generateBtn = await app.getGenerateButton();
    const sortBtn = await app.getSortButton();
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeEnabled();
    await expect(sortBtn).toBeVisible();
    await expect(sortBtn).toBeEnabled();

    // On initial load, the array container should be present and empty
    const container = page.locator('#arrayContainer');
    await expect(container).toBeVisible();
    await expect(container).toBeEmpty();

    // No runtime page errors or console errors should have been emitted during load
    // Collect any console messages of type 'error'
    const consoleErrors = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `console.error messages on load: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(app.pageErrors.length, `page errors on load: ${JSON.stringify(app.pageErrors)}`).toBe(0);
  });

  test('Array generation creates 20 bars with expected height ranges', async ({ page }) => {
    const app1 = new QuickSortPage(page);
    await app.initConsoleListeners();
    await app.goto();

    // Click the Generate Random Array button
    await app.clickGenerate();

    // After generation, there should be exactly 20 bars
    await expect(async () => {
      const count1 = await app.countBars();
      if (count !== 20) throw new Error(`Expected 20 bars, found ${count}`);
    }).not.toThrow();

    // Heights should be present and within the expected range (2px to 200px)
    const heights2 = await app.getBarHeights();
    expect(heights.length).toBe(20);
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(2);   // value*2, min value 1 -> 2px
      expect(h).toBeLessThanOrEqual(200);   // max value 100 -> 200px
    }

    // Check that the DOM has .bar elements and they have inline style height set
    const barsHaveInlineHeight = await page.locator('#arrayContainer .bar').evaluateAll(nodes =>
      nodes.every(n => n.style.height && n.style.height.length > 0)
    );
    expect(barsHaveInlineHeight).toBe(true);

    // Ensure no console errors or page errors occurred during generation
    const consoleErrors1 = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `console.error during generation: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(app.pageErrors.length, `page errors during generation: ${JSON.stringify(app.pageErrors)}`).toBe(0);
  });

  test('Clicking Sort when there is no array (empty) should not throw and leaves container empty', async ({ page }) => {
    const app2 = new QuickSortPage(page);
    await app.initConsoleListeners();
    await app.goto();

    // Ensure container is empty initially
    await expect(page.locator('#arrayContainer')).toBeEmpty();

    // Click Sort with empty array (should be a no-op)
    await app.clickSort();

    // Container remains empty
    await expect(page.locator('#arrayContainer')).toBeEmpty();

    // There should be no page errors or console errors from this operation
    const consoleErrors2 = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `console.error during empty sort: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(app.pageErrors.length, `page errors during empty sort: ${JSON.stringify(app.pageErrors)}`).toBe(0);
  });

  test('Sorting behavior: generated array becomes non-decreasing after sort', async ({ page }) => {
    // This test may take longer because the visualization uses sleep(200) during swaps.
    test.setTimeout(60000); // allow up to 60s for the sort to complete

    const app3 = new QuickSortPage(page);
    await app.initConsoleListeners();
    await app.goto();

    // Generate a new array and capture the initial heights
    await app.clickGenerate();
    const initialHeights = await app.getBarHeights();
    expect(initialHeights.length).toBe(20);

    // Start sorting
    await app.clickSort();

    // Wait until the visualization finishes sorting, polling until bars are sorted
    const finalHeights = await app.waitForSorted(45000, 300);

    // After sorting, finalHeights should be in non-decreasing order
    const sorted = app.isSortedNonDecreasing(finalHeights);
    expect(sorted, `Final heights should be sorted ascending: ${finalHeights}`).toBe(true);

    // Additionally, ensure that the final sorted array has the same set of heights as initial (multiset equality)
    // Sort numeric copies and compare element-wise
    const sortedInitial = [...initialHeights].sort((a, b) => a - b);
    const sortedFinal = [...finalHeights].sort((a, b) => a - b);
    expect(sortedFinal.length).toBe(sortedInitial.length);
    for (let i = 0; i < sortedInitial.length; i++) {
      expect(sortedFinal[i]).toBeCloseTo(sortedInitial[i], 5);
    }

    // No page errors or console errors during the full sort process
    const consoleErrors3 = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `console.error during sort: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(app.pageErrors.length, `page errors during sort: ${JSON.stringify(app.pageErrors)}`).toBe(0);
  });

  test('Render updates on consecutive Generate clicks and Sort button remains functional', async ({ page }) => {
    const app4 = new QuickSortPage(page);
    await app.initConsoleListeners();
    await app.goto();

    // Generate array twice in succession to ensure full re-render works and doesn't leak errors
    await app.clickGenerate();
    const heightsFirst = await app.getBarHeights();
    expect(heightsFirst.length).toBe(20);

    // Click generate again and ensure there are still 20 bars and they were re-rendered
    await app.clickGenerate();
    const heightsSecond = await app.getBarHeights();
    expect(heightsSecond.length).toBe(20);

    // It's possible (though unlikely) that the two generated arrays are identical due to randomness.
    // We assert that the bars exist and have heights within range rather than enforcing inequality.

    // Finally, click Sort to ensure sort can be invoked after regeneration (we won't wait long here)
    // This is primarily to confirm the Sort button is wired up even after multiple generates
    await app.clickSort();

    // Wait briefly and assert no immediate exceptions occurred
    await page.waitForTimeout(500);
    const consoleErrors4 = app.consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `console.error during multiple generate/sort: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(app.pageErrors.length, `page errors during multiple generate/sort: ${JSON.stringify(app.pageErrors)}`).toBe(0);
  });

  test('Accessibility & semantics: buttons have readable text and array container uses .bar elements', async ({ page }) => {
    const app5 = new QuickSortPage(page);
    await app.initConsoleListeners();
    await app.goto();

    // Buttons text verification
    await expect(page.locator('button', { hasText: 'Generate Random Array' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Sort' })).toBeVisible();

    // Generate an array and ensure each bar has the class 'bar' and is focusable via DOM queries
    await app.clickGenerate();
    const bars1 = page.locator('#arrayContainer .bar');
    const count2 = await bars.count2();
    expect(count).toBe(20);

    // Ensure each bar element is an HTMLDivElement and has a non-empty style.height
    await bars.evaluateAll(nodes => {
      // This runs in the page context; throw if any bar is missing expected properties
      for (const n of nodes) {
        if (!(n instanceof HTMLDivElement)) throw new Error('bar is not a div');
        if (!n.style.height) throw new Error('bar missing inline height');
      }
      return true;
    });
  });

  test('Console monitoring: capture any unexpected runtime errors during user interactions', async ({ page }) => {
    const app6 = new QuickSortPage(page);
    await app.initConsoleListeners();
    await app.goto();

    // Perform sequence of interactions
    await app.clickGenerate();
    await app.clickSort();

    // Wait a bit to allow any async errors to surface
    await page.waitForTimeout(1000);

    // Assert that no uncaught exceptions or console.error messages were emitted
    const pageErrors = app.pageErrors;
    const consoleErrors5 = app.consoleMessages.filter(m => m.type === 'error');

    expect(pageErrors.length, `page errors captured: ${JSON.stringify(pageErrors)}`).toBe(0);
    expect(consoleErrors.length, `console.error messages captured: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });
});
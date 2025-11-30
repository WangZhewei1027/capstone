import { test, expect } from '@playwright/test';

// Test file for Bubble Sort Visualization
// Application URL:
// http://127.0.0.1:5500/workspace/html2test/html/262784d7-cd2a-11f0-bee4-a3a342d77f94.html

// Page object for the Bubble Sort page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/262784d7-cd2a-11f0-bee4-a3a342d77f94.html';
    this.arrayLocator = page.locator('#arrayContainer .arrayElement');
    this.startButton = page.locator('button', { hasText: 'Start Bubble Sort' });
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Return array of numbers shown in the UI
  async getArrayValues() {
    const count = await this.arrayLocator.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await this.arrayLocator.nth(i).innerText();
      values.push(Number(text.trim()));
    }
    return values;
  }

  // Return indices that currently have the 'highlight' class
  async getHighlightedIndices() {
    const count = await this.arrayLocator.count();
    const highlighted = [];
    for (let i = 0; i < count; i++) {
      const classAttr = await this.arrayLocator.nth(i).getAttribute('class');
      if (classAttr && classAttr.split(/\s+/).includes('highlight')) highlighted.push(i);
    }
    return highlighted;
  }

  async clickStart() {
    await this.startButton.click();
  }

  // Wait until the displayed array equals expected (array of numbers)
  async waitForArray(expectedArray, timeout = 30000) {
    await this.page.waitForFunction(
      (expected) => {
        const nodes = document.querySelectorAll('#arrayContainer .arrayElement');
        if (!nodes || nodes.length !== expected.length) return false;
        for (let i = 0; i < expected.length; i++) {
          const text = nodes[i].innerText.trim();
          if (Number(text) !== expected[i]) return false;
        }
        return true;
      },
      expectedArray,
      { timeout }
    );
  }

  // Wait until the array is sorted ascending
  async waitUntilSorted(timeout = 40000) {
    await this.page.waitForFunction(
      () => {
        const nodes = document.querySelectorAll('#arrayContainer .arrayElement');
        const values = Array.from(nodes).map(n => Number(n.innerText.trim()));
        for (let i = 1; i < values.length; i++) {
          if (values[i - 1] > values[i]) return false;
        }
        return true;
      },
      null,
      { timeout }
    );
  }
}

test.describe('Bubble Sort Visualization - UI and behavior', () => {
  // Increase default timeout for tests that wait for animations/async operations
  test.use({ actionTimeout: 10000 });

  test('Initial load shows header, array elements and Start button', async ({ page }) => {
    // Purpose: Verify the initial static state of the page after load.
    const bubble = new BubbleSortPage(page);
    // Collect console and page errors during this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    await bubble.goto();

    // Header should be present
    await expect(bubble.header).toHaveText('Bubble Sort Visualization');

    // There should be 6 array elements with expected initial values [5,3,8,4,2,7]
    const values = await bubble.getArrayValues();
    expect(values).toEqual([5, 3, 8, 4, 2, 7]);

    // Start button exists and is visible
    await expect(bubble.startButton).toBeVisible();

    // No console errors or uncaught page errors on initial load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Clicking Start highlights first pair immediately and swaps them after ~500ms', async ({ page }) => {
    // Purpose: Verify interactive behavior for the first comparison step
    // Allow longer time for this test because the app uses timers
    test.setTimeout(45000);

    const bubble = new BubbleSortPage(page);

    // Capture console and page errors during this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    await bubble.goto();

    // Ensure starting array is the expected initial state
    expect(await bubble.getArrayValues()).toEqual([5, 3, 8, 4, 2, 7]);

    // Click the Start button to begin the visualization
    await bubble.clickStart();

    // Immediately after clicking start, the first comparison should highlight indices 0 and 1.
    // Give the page a microtick to perform DOM updates
    await page.waitForTimeout(10);
    const highlightedImmediately = await bubble.getHighlightedIndices();
    expect(highlightedImmediately).toEqual([0, 1]);

    // After approximately 500ms the comparison completes, swap occurs (since 5 > 3),
    // highlight is removed and the displayed array shows [3,5,8,4,2,7].
    await page.waitForTimeout(600); // wait for the first sleep(500) + small buffer
    const highlightedAfterDelay = await bubble.getHighlightedIndices();
    // Highlights should have been removed after the swap
    expect(highlightedAfterDelay).toEqual([]);

    // Check that the first pair have been swapped in the DOM
    const valuesAfterFirstSwap = await bubble.getArrayValues();
    expect(valuesAfterFirstSwap).toEqual([3, 5, 8, 4, 2, 7]);

    // No console errors or page errors so far
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    // Let the rest of the sort continue and wait until fully sorted to avoid interfering with other tests
    await bubble.waitUntilSorted(40000);
    const finalValues = await bubble.getArrayValues();
    expect(finalValues).toEqual([2, 3, 4, 5, 7, 8]);

    // Final sanity check: still no console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Full bubble sort completes and results in ascending order without runtime errors', async ({ page }) => {
    // Purpose: Run the full visualization and confirm final sorted state and absence of runtime errors.
    // This test waits for the full sorting animation to complete.
    test.setTimeout(60000);

    const bubble = new BubbleSortPage(page);

    // Collect console and page errors across the sorting run
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    await bubble.goto();

    // Start sorting
    await bubble.clickStart();

    // Wait until the UI reports a sorted array (ascending)
    await bubble.waitUntilSorted(45000);

    // Verify final ordering
    const final = await bubble.getArrayValues();
    expect(final).toEqual([2, 3, 4, 5, 7, 8]);

    // There should be no console errors and no uncaught page errors during the process
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Clicking Start multiple times does not cause unhandled exceptions and ends sorted', async ({ page }) => {
    // Purpose: Exercise an edge case where the user clicks Start multiple times.
    // Ensure no uncaught exceptions occur and the array ends up sorted.
    test.setTimeout(60000);

    const bubble = new BubbleSortPage(page);

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    await bubble.goto();

    // Click start twice quickly to trigger two sort runs concurrently
    await bubble.clickStart();
    await page.waitForTimeout(50); // small gap
    await bubble.clickStart();

    // Wait until sorted
    await bubble.waitUntilSorted(45000);

    const final = await bubble.getArrayValues();
    // Regardless of concurrent runs, final DOM should be sorted ascending
    expect(final).toEqual([2, 3, 4, 5, 7, 8]);

    // Ensure no uncaught exceptions or console errors occurred
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca0-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Merge Sort Visualization page
class MergeSortPage {
  constructor(page) {
    this.page = page;
  }

  // Wait until the array bars are rendered
  async waitForBars() {
    await this.page.waitForSelector('#array-container .bar');
  }

  // Return Locator for the Start Merge Sort button
  startButton() {
    return this.page.locator('button', { hasText: 'Start Merge Sort' });
  }

  // Return Locator for the Generate Random Array button
  generateButton() {
    return this.page.locator('button', { hasText: 'Generate Random Array' });
  }

  // Click the Generate Random Array button
  async clickGenerate() {
    await this.generateButton().click();
    await this.waitForBars();
  }

  // Click the Start Merge Sort button
  async clickStart() {
    await this.startButton().click();
    // Wait a short while for animations and re-render
    await this.page.waitForTimeout(600);
    await this.waitForBars();
  }

  // Get numeric heights (in px) of all bars as numbers
  async getBarHeights() {
    await this.waitForBars();
    const bars = await this.page.$$eval('#array-container .bar', nodes =>
      nodes.map(n => {
        // getComputedStyle to handle transitions
        const height = window.getComputedStyle(n).height;
        return parseFloat(height);
      })
    );
    return bars;
  }

  // Count bars
  async getBarCount() {
    const count = await this.page.$$eval('#array-container .bar', nodes => nodes.length);
    return count;
  }

  // Return whether the two arrays are equal (shallow)
  static arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Check if array is sorted non-decreasing
  static isSortedNonDecreasing(arr) {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }
}

// Group related tests for clarity
test.describe('Merge Sort Visualization - End-to-End', () => {
  // Arrays to collect console errors and page errors during each test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Collect page-level errors (unhandled exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Small pause to ensure any late console/page errors are captured
    await page.waitForTimeout(50);
    // You could log captured errors during debugging; we assert on them in tests.
  });

  test('Initial page load shows title and renders initial random array', async ({ page }) => {
    // Purpose: Verify the page loads, title is correct, and initial array is rendered.
    const app = new MergeSortPage(page);

    // Title should include application name
    await expect(page).toHaveTitle(/Merge Sort Visualization/i);

    // Ensure the header is present
    const header = page.locator('h1', { hasText: 'Merge Sort Visualization' });
    await expect(header).toBeVisible();

    // Wait for initial bars to render (script calls generateRandomArray on load)
    await app.waitForBars();

    // There should be 20 bars by default (generateRandomArray creates length: 20)
    const count1 = await app.getBarCount();
    expect(count).toBe(20);

    // Heights should be positive numbers (scaled by 3px per value)
    const heights = await app.getBarHeights();
    expect(heights.length).toBe(20);
    for (const h of heights) {
      expect(typeof h).toBe('number');
      expect(h).toBeGreaterThan(0);
    }

    // Assert that no console errors or page errors occurred up to this point
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Generate Random Array updates the DOM with a new array', async ({ page }) => {
    // Purpose: Clicking "Generate Random Array" should update bar heights (i.e., randomize the array)
    const app1 = new MergeSortPage(page);

    // Ensure initial bars present
    await app.waitForBars();
    const initialHeights = await app.getBarHeights();

    // Click generate and get new heights
    await app.clickGenerate();
    const newHeights = await app.getBarHeights();

    // There should still be 20 bars
    expect(newHeights.length).toBe(20);

    // It's possible (but unlikely) that the generated array matches previous.
    // To make test robust, check that at least either arrays differ or after a second generation they differ.
    if (MergeSortPage.arraysEqual(initialHeights, newHeights)) {
      // Try generating again to reduce flakiness
      await app.clickGenerate();
      const anotherHeights = await app.getBarHeights();
      // Now expect a change (very likely)
      expect(MergeSortPage.arraysEqual(initialHeights, anotherHeights)).toBe(false);
    } else {
      expect(MergeSortPage.arraysEqual(initialHeights, newHeights)).toBe(false);
    }

    // Ensure no runtime errors emitted during generation
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Start Merge Sort sorts the array (visual bars heights become non-decreasing)', async ({ page }) => {
    // Purpose: Clicking "Start Merge Sort" sorts the underlying array and re-renders the bars in ascending order.
    const app2 = new MergeSortPage(page);

    // Ensure bars present and capture unsorted heights
    await app.waitForBars();
    const beforeHeights = await app.getBarHeights();

    // Click start to perform merge sort
    await app.clickStart();

    // Capture heights after sorting
    const afterHeights = await app.getBarHeights();

    // Ensure same number of bars
    expect(afterHeights.length).toBe(beforeHeights.length);

    // Heights should now be non-decreasing (sorted ascending)
    const sorted = MergeSortPage.isSortedNonDecreasing(afterHeights);
    expect(sorted).toBe(true);

    // The sorted array should be a permutation of the original values (multiset equality).
    // We'll sort both lists and compare.
    const beforeSorted = [...beforeHeights].sort((a, b) => a - b);
    const afterSorted = [...afterHeights].sort((a, b) => a - b);
    expect(MergeSortPage.arraysEqual(beforeSorted, afterSorted)).toBe(true);

    // Ensure no runtime errors during sorting
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Start Merge Sort on an already sorted array keeps it sorted', async ({ page }) => {
    // Purpose: If the array is already sorted, running the algorithm again should maintain sorted order.
    const app3 = new MergeSortPage(page);

    // Ensure bars present
    await app.waitForBars();

    // First sort to ensure sorted state
    await app.clickStart();
    const firstSorted = await app.getBarHeights();
    expect(MergeSortPage.isSortedNonDecreasing(firstSorted)).toBe(true);

    // Click start again
    await app.clickStart();
    const secondSorted = await app.getBarHeights();

    // Should remain sorted and bar values should be identical (stable state)
    expect(MergeSortPage.isSortedNonDecreasing(secondSorted)).toBe(true);
    expect(MergeSortPage.arraysEqual(firstSorted, secondSorted)).toBe(true);

    // No runtime errors expected
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Control buttons are visible, enabled, and accessible', async ({ page }) => {
    // Purpose: Verify interactive elements are visible, enabled, and keyboard focusable.
    const app4 = new MergeSortPage(page);

    // Buttons should be visible and enabled
    await expect(app.startButton()).toBeVisible();
    await expect(app.startButton()).toBeEnabled();
    await expect(app.generateButton()).toBeVisible();
    await expect(app.generateButton()).toBeEnabled();

    // Test keyboard accessibility: focus and activate via keyboard (Enter key)
    await app.generateButton().focus();
    await page.keyboard.press('Enter');
    await app.waitForBars();
    // If no errors thrown and bars are present, keyboard activation worked
    const countAfterKeyboard = await app.getBarCount();
    expect(countAfterKeyboard).toBe(20);

    // Ensure no console or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Monitor console and page errors across multiple interactions (should be none)', async ({ page }) => {
    // Purpose: Run a sequence of user interactions and assert no unhandled runtime errors occur.
    const app5 = new MergeSortPage(page);

    // Sequence: Generate -> Start -> Generate -> Start (repeat)
    for (let i = 0; i < 3; i++) {
      await app.clickGenerate();
      await app.clickStart();
    }

    // Small wait to catch any asynchronous exceptions
    await page.waitForTimeout(200);

    // Assert no console errors or page errors were captured during interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});
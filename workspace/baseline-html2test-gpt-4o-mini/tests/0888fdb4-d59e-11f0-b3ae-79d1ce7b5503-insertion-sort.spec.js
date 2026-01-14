import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb4-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Insertion Sort Visualization page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#arrayContainer';
    this.barSelector = '.array .bar';
    this.sortButtonSelector = '#sortButton';
  }

  // Navigate to the page and wait for the main elements to be present
  async goto() {
    await this.page.goto(URL);
    await this.page.waitForSelector(this.arraySelector);
    await this.page.waitForSelector(this.sortButtonSelector);
  }

  // Click the "Sort Array" button
  async clickSort() {
    await this.page.click(this.sortButtonSelector);
  }

  // Return number of bars currently rendered
  async getBarCount() {
    return await this.page.$$eval(this.barSelector, els => els.length);
  }

  // Return arrays of bar heights (in px as numbers) and classNames
  async getBarsInfo() {
    return await this.page.$$eval(this.barSelector, els =>
      els.map(el => {
        const height = window.getComputedStyle(el).height;
        return {
          height,
          className: el.className
        };
      })
    );
  }

  // Return plain heights as numbers (without 'px')
  async getBarHeightsNumbers() {
    const infos = await this.getBarsInfo();
    return infos.map(i => parseFloat(i.height));
  }

  // Return number of bars that have a CSS class substring
  async countBarsWithClassSubstring(substring) {
    const infos1 = await this.getBarsInfo();
    return infos.filter(i => i.className.includes(substring)).length;
  }

  // Return whether the sort button is visible and enabled
  async isSortButtonVisible() {
    const el = await this.page.$(this.sortButtonSelector);
    if (!el) return false;
    return await el.isVisible();
  }
}

test.describe('Insertion Sort Visualization (0888fdb4-d59e-11f0-b3ae-79d1ce7b5503)', () => {
  // Collect any page errors and console.error messages for assertions
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // Capture runtime errors (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });

    page.on('console', msg => {
      // Capture console errors for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
  });

  // Test initial load and default state of the visualization
  test('Initial page load shows five bars with expected heights and no sorted/current classes', async ({ page }) => {
    const app = new InsertionSortPage(page);
    // Navigate to the app page
    await app.goto();

    // Ensure the sort button is visible
    expect(await app.isSortButtonVisible()).toBe(true);

    // There should be exactly 5 bars initially
    const count = await app.getBarCount();
    expect(count).toBe(5);

    // Verify the initial heights correspond to the array [5,3,8,4,2] scaled by 30
    // Expected heights in px: [150, 90, 240, 120, 60]
    const heights = await app.getBarHeightsNumbers();
    // Map to rounded numbers to avoid minor computed-style differences
    const rounded = heights.map(h => Math.round(h));
    expect(rounded).toEqual([150, 90, 240, 120, 60]);

    // Verify no bar has 'sorted' or 'current' classes initially
    const sortedCount = await app.countBarsWithClassSubstring('sorted');
    const currentCount = await app.countBarsWithClassSubstring('current');
    expect(sortedCount).toBe(0);
    expect(currentCount).toBe(0);

    // Ensure no page runtime errors or console errors occurred during initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test that clicking the sort button starts the sorting and that classes and heights update over time
  test('Clicking "Sort Array" progresses sorting: sorted classes appear and final array is sorted', async ({ page }) => {
    const app1 = new InsertionSortPage(page);
    await app.goto();

    // Click the sort button to start sorting
    await app.clickSort();

    // Immediately after clicking, drawArray() is called and the array should be reset to original heights
    let immediateHeights = await app.getBarHeightsNumbers();
    const immediateRounded = immediateHeights.map(h => Math.round(h));
    expect(immediateRounded).toEqual([150, 90, 240, 120, 60]);

    // After ~600ms the first insertion step should have run (setTimeout( insertionSort, 500 ))
    await page.waitForTimeout(650);
    // Now sortedIndex should be at least 1, so at least one bar should have 'sorted' class
    const sortedAfterFirstStep = await app.countBarsWithClassSubstring('sorted');
    expect(sortedAfterFirstStep).toBeGreaterThanOrEqual(1);

    // Wait for the sorting to complete. For 5 elements, there will be a few steps.
    // We allow up to 4 seconds to be safe (5 steps * 500ms = 2.5s plus some slack)
    await page.waitForTimeout(3500);

    // After sorting finishes, there should be no 'current' bars and all bars should be 'sorted' (sortedIndex >= array.length)
    const finalCurrent = await app.countBarsWithClassSubstring('current');
    // The implementation sets currentIndex = -1 at the end, so there should be 0 'current' bars
    expect(finalCurrent).toBe(0);

    // Check that all bars are marked as 'sorted' (sortedIndex >= array.length implies index < sortedIndex true)
    const finalSorted = await app.countBarsWithClassSubstring('sorted');
    // Some implementations might not mark all as 'sorted' depending on how classes are applied, but we expect all 5
    expect(finalSorted).toBe(5);

    // Verify final heights correspond to the fully sorted array [2,3,4,5,8] scaled by 30 -> [60,90,120,150,240]
    const finalHeights = await app.getBarHeightsNumbers();
    const finalRounded = finalHeights.map(h => Math.round(h));
    expect(finalRounded).toEqual([60, 90, 120, 150, 240]);

    // Ensure no runtime page errors or console errors occurred during the sorting process
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test that clicking the sort button while a sort is in progress resets the array and restarts
  test('Clicking "Sort Array" during an active sort resets the array and restarts sorting', async ({ page }) => {
    const app2 = new InsertionSortPage(page);
    await app.goto();

    // Start sorting
    await app.clickSort();

    // Wait for the first step to occur
    await page.waitForTimeout(700);
    // There should be at least one 'sorted' bar now
    const sortedCountDuring = await app.countBarsWithClassSubstring('sorted');
    expect(sortedCountDuring).toBeGreaterThanOrEqual(1);

    // Click the sort button again to reset
    await app.clickSort();

    // Immediately after clicking again, the array is reset and drawArray() is called synchronously
    const resetHeights = await app.getBarHeightsNumbers();
    const resetRounded = resetHeights.map(h => Math.round(h));
    // Expect original heights restored
    expect(resetRounded).toEqual([150, 90, 240, 120, 60]);

    // Right after reset, there should be no 'sorted' bars (sortedIndex set to 0)
    const sortedAfterReset = await app.countBarsWithClassSubstring('sorted');
    expect(sortedAfterReset).toBe(0);

    // Wait until sorting completes again to ensure restart happened properly
    await page.waitForTimeout(3500);

    // After completion, verify final sorted order
    const finalHeights1 = await app.getBarHeightsNumbers();
    const finalRounded1 = finalHeights.map(h => Math.round(h));
    expect(finalRounded).toEqual([60, 90, 120, 150, 240]);

    // Assert no page runtime errors or console errors occurred during reset and re-sort
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge-case test: ensure the sort button is functional multiple times in quick succession
  test('Rapidly clicking "Sort Array" multiple times does not produce runtime errors and results in a sorted array', async ({ page }) => {
    const app3 = new InsertionSortPage(page);
    await app.goto();

    // Rapidly click the button three times
    await app.clickSort();
    await page.waitForTimeout(100);
    await app.clickSort();
    await page.waitForTimeout(100);
    await app.clickSort();

    // Give enough time for the final sort to complete
    await page.waitForTimeout(4000);

    // Verify final sorted heights
    const heights1 = await app.getBarHeightsNumbers();
    const rounded1 = heights.map(h => Math.round(h));
    expect(rounded).toEqual([60, 90, 120, 150, 240]);

    // Ensure no runtime page errors or console errors occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});
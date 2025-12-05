import { test, expect } from '@playwright/test';

// Page object for the Merge Sort visualization page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = page.locator('#arrayContainer');
    this.blocks = page.locator('#arrayContainer .block');
    this.startButton = page.locator('button', { hasText: 'Start Merge Sort' });
    this.url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7a022-d1d5-11f0-b49a-6f458b3a25ef.html';
  }

  async goto() {
    await this.page.goto(this.url);
    // Wait for the initial display to be rendered
    await expect(this.arrayContainer).toBeVisible();
  }

  async getBlockCount() {
    return await this.blocks.count();
  }

  // Returns array of block text contents as strings, in DOM order
  async getBlockValues() {
    const count = await this.getBlockCount();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.blocks.nth(i).innerText());
    }
    return values;
  }

  // Returns array of inline style heights (e.g. "190px") in DOM order
  async getBlockHeights() {
    const count1 = await this.getBlockCount();
    const heights = [];
    for (let i = 0; i < count; i++) {
      heights.push(await this.blocks.nth(i).evaluate(node => node.style.height));
    }
    return heights;
  }

  async clickStart() {
    await this.startButton.click();
  }

  async isStartButtonVisible() {
    return await this.startButton.isVisible();
  }
}

test.describe('Merge Sort Visualization - Application ID 39b7a022-d1d5-11f0-b49a-6f458b3a25ef', () => {
  let pageErrors = [];
  let consoleMessages = [];
  let consoleHandler;
  let pageErrorHandler;

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture console messages and page errors for assertions
    consoleHandler = msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    };
    pageErrorHandler = err => {
      // err is an Error object
      pageErrors.push(String(err && err.message ? err.message : err));
    };

    page.on('console', consoleHandler);
    page.on('pageerror', pageErrorHandler);
  });

  // Remove event listeners after each test to avoid cross-test pollution
  test.afterEach(async ({ page }) => {
    if (consoleHandler) page.off('console', consoleHandler);
    if (pageErrorHandler) page.off('pageerror', pageErrorHandler);
  });

  // Test initial load and default UI state
  test('Initial page load displays the original array blocks and start button', async ({ page }) => {
    const mergePage = new MergeSortPage(page);
    await mergePage.goto();

    // Verify the start button is visible and has correct label
    await expect(mergePage.startButton).toBeVisible();
    await expect(mergePage.startButton).toHaveText('Start Merge Sort');

    // Verify the initial number of blocks matches the expected array length (7)
    const blockCount = await mergePage.getBlockCount();
    expect(blockCount).toBe(7);

    // Verify the displayed values are in the initial unsorted order
    const values1 = await mergePage.getBlockValues();
    expect(values).toEqual(['38', '27', '43', '3', '9', '82', '10']);

    // Verify each block has inline style height equal to value * 5 + 'px'
    const heights1 = await mergePage.getBlockHeights();
    const expectedHeights = ['190px', '135px', '215px', '15px', '45px', '410px', '50px'];
    expect(heights).toEqual(expectedHeights);

    // Assert that there were no page-level runtime errors and no console errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking the start button sorts the array and updates the DOM
  test('Clicking "Start Merge Sort" sorts the array and updates the DOM order and heights', async ({ page }) => {
    const mergePage1 = new MergeSortPage(page);
    await mergePage.goto();

    // Click start to trigger sorting
    await mergePage.clickStart();

    // After sorting, verify the block texts are in ascending order
    // Expected sorted array: [3,9,10,27,38,43,82]
    const sortedValues = await mergePage.getBlockValues();
    expect(sortedValues).toEqual(['3', '9', '10', '27', '38', '43', '82']);

    // Verify heights correspond to the sorted values
    const sortedHeights = await mergePage.getBlockHeights();
    const expectedSortedHeights = ['15px', '45px', '50px', '135px', '190px', '215px', '410px'];
    expect(sortedHeights).toEqual(expectedSortedHeights);

    // Verify the count of blocks didn't change
    const countAfter = await mergePage.getBlockCount();
    expect(countAfter).toBe(7);

    // No runtime errors in console or page errors should have occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test the merge and mergeSort functions exist and behave correctly when invoked programmatically
  test('Programmatic validation of merge and mergeSort functions via page.evaluate', async ({ page }) => {
    const mergePage2 = new MergeSortPage(page);
    await mergePage.goto();

    // Call merge with two sorted arrays
    const mergeResult = await page.evaluate(() => {
      // merge is defined in the page's global scope
      return merge([1, 4, 6], [2, 3, 5]);
    });
    expect(mergeResult).toEqual([1, 2, 3, 4, 5, 6]);

    // Call mergeSort on various edge cases and a small random array
    const emptyResult = await page.evaluate(() => mergeSort([]));
    expect(emptyResult).toEqual([]);

    const singleResult = await page.evaluate(() => mergeSort([5]));
    expect(singleResult).toEqual([5]);

    const smallResult = await page.evaluate(() => mergeSort([2, 1, 3]));
    expect(smallResult).toEqual([1, 2, 3]);

    // Call mergeSort on the page's original array and compare to expected sorted array
    const sortedFromGlobal = await page.evaluate(() => mergeSort([38, 27, 43, 3, 9, 82, 10]));
    expect(sortedFromGlobal).toEqual([3, 9, 10, 27, 38, 43, 82]);

    // Ensure invoking these functions did not cause any JS runtime errors in the page
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test clicking the button multiple times is idempotent and stable; also check UI stays consistent
  test('Clicking start multiple times remains stable and does not introduce errors', async ({ page }) => {
    const mergePage3 = new MergeSortPage(page);
    await mergePage.goto();

    // Click start multiple times
    await mergePage.clickStart();
    await mergePage.clickStart();
    await mergePage.clickStart();

    // Result should still be sorted ascending once operation is completed
    const valuesAfterClicks = await mergePage.getBlockValues();
    expect(valuesAfterClicks).toEqual(['3', '9', '10', '27', '38', '43', '82']);

    // Ensure there are still 7 blocks and heights remain consistent
    const heights2 = await mergePage.getBlockHeights();
    expect(heights).toEqual(['15px', '45px', '50px', '135px', '190px', '215px', '410px']);
    expect(await mergePage.getBlockCount()).toBe(7);

    // Confirm no runtime console errors or page errors occurred during repeated clicks
    expect(pageErrors.length).toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility and visibility checks
  test('Accessibility and visibility checks for key interactive elements', async ({ page }) => {
    const mergePage4 = new MergeSortPage(page);
    await mergePage.goto();

    // The heading should be present and contain "Merge Sort"
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Merge Sort/i);

    // The array container should be visible and contain children equal to block count
    await expect(mergePage.arrayContainer).toBeVisible();
    const count2 = await mergePage.getBlockCount();
    expect(count).toBeGreaterThan(0);
    const childrenCount = await page.evaluate(() => document.getElementById('arrayContainer').children.length);
    expect(childrenCount).toBe(count);

    // Start button should be enabled (not disabled)
    await expect(mergePage.startButton).toBeEnabled();

    // Ensure no page errors or console errors were emitted on load
    expect(pageErrors.length).toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});
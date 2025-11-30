import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f497-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Quick Sort Visualization page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array';
    this.sortButtonSelector = 'button';
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return array of bar elements handles
  async getBarElements() {
    return await this.page.$$(this.arraySelector + ' .bar');
  }

  // Return array of numeric values shown in the bars (as numbers)
  async getBarValues() {
    const bars = await this.getBarElements();
    const values = [];
    for (const bar of bars) {
      const text = await bar.innerText();
      values.push(Number(text.trim()));
    }
    return values;
  }

  // Return array of inline heights (e.g., "150px")
  async getBarHeights() {
    const bars = await this.getBarElements();
    const heights = [];
    for (const bar of bars) {
      // read inline style first (the implementation sets style.height)
      const style = await bar.getAttribute('style');
      if (style && /height\s*:\s*[^;]+/.test(style)) {
        // extract height value from style attribute
        const m = style.match(/height\s*:\s*([^;]+)/);
        heights.push(m ? m[1].trim() : '');
      } else {
        // fallback to computed style
        const h = await this.page.evaluate(el => getComputedStyle(el).height, bar);
        heights.push(h);
      }
    }
    return heights;
  }

  // Click the Sort Array button
  async clickSort() {
    await this.page.click(this.sortButtonSelector);
  }

  // Wait for the "Sorting Completed!" alert dialog, accept it and return the message
  async waitForSortingCompletedDialog(timeout = 30000) {
    const dialog = await this.page.waitForEvent('dialog', { timeout });
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Wait until bars display the expected sequence of values (polling)
  async waitForBarValues(expectedValues, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const current = await this.getBarValues();
      // check deep equality
      if (current.length === expectedValues.length && current.every((v, i) => v === expectedValues[i])) {
        return;
      }
      await this.page.waitForTimeout(200); // small delay before retry
    }
    throw new Error('Timed out waiting for bar values: ' + expectedValues.join(', '));
  }
}

test.describe('Quick Sort Visualization - End-to-end tests', () => {
  // Collect console errors and page errors during each test
  test.beforeEach(async ({ page }) => {
    // Nothing needed here; listeners are attached per-test below where used
  });

  // Test initial page load and default state
  test('Initial load: page renders header, bars and Sort button with correct default values', async ({ page }) => {
    // purpose: verify the app loads and initial DOM elements are present with expected content
    const consoleErrors = [];
    const pageErrors = [];

    // capture console errors and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const quickPage = new QuickSortPage(page);
    await quickPage.goto();

    // Verify title text exists
    await expect(page.locator('h1')).toHaveText('Quick Sort Visualization');

    // Verify array container exists
    const arrayContainer = page.locator('#array');
    await expect(arrayContainer).toBeVisible();

    // Verify there are exactly 8 bars as per the implementation's array
    const bars = await quickPage.getBarElements();
    expect(bars.length).toBe(8);

    // Verify the displayed numbers correspond to the initial array [5,3,8,4,2,7,1,10]
    const values = await quickPage.getBarValues();
    expect(values).toEqual([5, 3, 8, 4, 2, 7, 1, 10]);

    // Verify each bar has inline height equal to value * 30 + 'px'
    const heights = await quickPage.getBarHeights();
    const expectedHeights = [5, 3, 8, 4, 2, 7, 1, 10].map(v => `${v * 30}px`);
    expect(heights).toEqual(expectedHeights);

    // Verify a button exists and is visible with the expected label
    const button = page.locator('button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Sort Array');

    // Assert that no console errors or page errors occurred during initial load
    expect(consoleErrors, `Console errors were logged: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(pageErrors, `Page errors were thrown: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  // Test clicking Sort button triggers sorting and final sorted state is reached
  test('Clicking "Sort Array" sorts the bars and shows completion alert', async ({ page }) => {
    // purpose: validate user interaction (click), visual updates, and final sorted result + dialog
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const quickPage = new QuickSortPage(page);
    await quickPage.goto();

    // Click the Sort button to start visualization
    await quickPage.clickSort();

    // Wait for the "Sorting Completed!" alert dialog and assert its message
    const dialogMessage = await quickPage.waitForSortingCompletedDialog(30000);
    expect(dialogMessage).toBe('Sorting Completed!');

    // After completion, verify final values are sorted ascending
    const finalValues = await quickPage.getBarValues();
    expect(finalValues).toEqual([1, 2, 3, 4, 5, 7, 8, 10]);

    // Verify final heights correspond to sorted values * 30px
    const finalHeights = await quickPage.getBarHeights();
    const expectedFinalHeights = finalValues.map(v => `${v * 30}px`);
    expect(finalHeights).toEqual(expectedFinalHeights);

    // Assert that no console errors or page errors occurred during the sort process
    expect(consoleErrors, `Console errors during sorting: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(pageErrors, `Page errors during sorting: ${pageErrors.join(' | ')}`).toEqual([]);
  }, { timeout: 60000 }); // allow more time due to intentional sleeps in the implementation

  // Test clicking Sort again after completion (idempotency / repeated interactions)
  test('Clicking "Sort Array" multiple times handles repeated interactions and still completes', async ({ page }) => {
    // purpose: ensure repeated user interactions don't crash the page and that the sorting completes
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const quickPage = new QuickSortPage(page);
    await quickPage.goto();

    // Click sort once
    await quickPage.clickSort();

    // Shortly after starting, click the button again to simulate rapid user interaction
    // This will enqueue another sort; the implementation uses the same array reference and async calls.
    await page.waitForTimeout(100); // small pause to let first click initiate
    await quickPage.clickSort();

    // Wait for the dialog that indicates at least one run completed
    const dialogMessage = await quickPage.waitForSortingCompletedDialog(60000);
    expect(dialogMessage).toBe('Sorting Completed!');

    // After completion, verify the array is sorted
    const finalValues = await quickPage.getBarValues();
    expect(finalValues).toEqual([1, 2, 3, 4, 5, 7, 8, 10]);

    // Assert no console or page errors occurred
    expect(consoleErrors, `Console errors on repeated interaction: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(pageErrors, `Page errors on repeated interaction: ${pageErrors.join(' | ')}`).toEqual([]);
  }, { timeout: 90000 });

  // Test observing runtime errors: capture any pageerror events if they happen
  test('Observe page errors and console errors during load and interaction (report if any occur)', async ({ page }) => {
    // purpose: explicitly record any runtime errors (ReferenceError, SyntaxError, TypeError, etc.)
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err.stack || err.message);
    });

    const quickPage = new QuickSortPage(page);
    await quickPage.goto();

    // Interact: click sort and accept dialog when it appears
    let dialogSeen = false;
    page.on('dialog', async dialog => {
      dialogSeen = true;
      await dialog.accept();
    });

    await quickPage.clickSort();

    // Wait for either the dialog or a reasonable time to allow potential errors to surface
    try {
      await quickPage.waitForSortingCompletedDialog(30000);
    } catch (err) {
      // If dialog didn't appear, let the test proceed to check errors
    }

    // Provide assertions: we expect no uncaught page errors or console.error calls.
    // If any exist, fail the test and include the collected messages to help debugging.
    expect(pageErrors, `Unexpected page errors occurred: ${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors occurred: ${consoleErrors.join('\n')}`).toEqual([]);

    // Ensure the dialog was observed at least once (if sorting completed)
    // It's acceptable if dialog wasn't seen because test timed out; in that case sorting might not have completed within timeout
    // We'll assert that either the dialog was seen or there were page errors that explain the failure
    if (!dialogSeen) {
      // No dialog observed; ensure there were errors explaining the missing dialog, otherwise warn by failing
      expect(pageErrors.length + consoleErrors.length, 'Neither completion dialog was seen nor errors were logged').toBeGreaterThan(0);
    }
  }, { timeout: 60000 });
});
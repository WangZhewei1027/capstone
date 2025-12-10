import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56a6c1-d1d8-11f0-bbda-359f3f96b638.html';

// Page object for the Bubble Sort visualization page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sortButton = '#sort-button';
    this.barSelector = '#array-container .bar';
    this.arrayContainer = '#array-container';
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async goto() {
    // Reset error collectors for fresh navigation
    this.consoleErrors = [];
    this.pageErrors = [];

    // Attach listeners to capture console errors and uncaught page errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(err.message);
    });

    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getBarCount() {
    return await this.page.$$eval(this.barSelector, (els) => els.length);
  }

  async getBarHeights() {
    return await this.page.$$eval(this.barSelector, (els) =>
      els.map((el) => {
        // return the computed height as a number in px
        const style = getComputedStyle(el);
        return parseFloat(style.height);
      })
    );
  }

  async clickSort() {
    await this.page.click(this.sortButton);
  }

  async waitForAnyBarToTurnRed(timeout = 5000) {
    // Wait until at least one bar has computed background-color of red (rgb(255, 0, 0))
    return await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#array-container .bar'));
      return bars.some((b) => {
        const bg = getComputedStyle(b).backgroundColor;
        return bg.includes('255, 0, 0'); // red
      });
    }, null, { timeout });
  }

  async waitForAlert(timeout = 120000) {
    // Wait for the alert dialog to appear and return its message. Accept the dialog.
    const dialog = await this.page.waitForEvent('dialog', { timeout });
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  async collectConsoleAndPageErrors() {
    // Return snapshots of collected errors
    return {
      consoleErrors: this.consoleErrors.slice(),
      pageErrors: this.pageErrors.slice(),
    };
  }
}

test.describe('Bubble Sort Visualization - FSM states and transitions', () => {
  // Increase default timeout for tests that may wait for the full sorting completion
  test.setTimeout(2 * 60 * 1000); // 2 minutes

  // Test S0: Idle state - initial drawArray() should have executed on page load
  test('S0_Idle: Initial load draws the array (20 bars) and no uncaught errors', async ({ page }) => {
    const bsPage = new BubbleSortPage(page);

    // Navigate to the app
    await bsPage.goto();

    // Verify array container exists
    await expect(page.locator('#array-container')).toBeVisible();

    // Verify drawArray created 20 bars (per implementation: length: 20)
    const count = await bsPage.getBarCount();
    expect(count).toBe(20);

    // Verify each bar has a computed height > 0 (visual bars drawn)
    const heights = await bsPage.getBarHeights();
    expect(heights.length).toBe(20);
    for (const h of heights) {
      expect(h).toBeGreaterThan(0);
    }

    // Verify the sort button is present and enabled
    const sortButton = page.locator('#sort-button');
    await expect(sortButton).toBeVisible();
    await expect(sortButton).toBeEnabled();

    // Check that no console errors or uncaught page errors occurred during initial load
    const errors = await bsPage.collectConsoleAndPageErrors();
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  // Test transition S0 -> S1: clicking the sort button begins sorting
  test('S0 -> S1 transition: Clicking sort starts bubbleSort (observe bars turn red)', async ({ page }) => {
    const bsPage1 = new BubbleSortPage(page);
    await bsPage.goto();

    // Click the sort button to trigger bubbleSort
    await bsPage.clickSort();

    // Within a short time, at least one pair under comparison should be highlighted red.
    // This validates that bubbleSort() started (entry action for S1_Sorting).
    await bsPage.waitForAnyBarToTurnRed(10000); // 10s to be generous for first steps

    // Confirm that some bars are red now
    const anyRed = await page.evaluate(() => {
      const bars1 = Array.from(document.querySelectorAll('#array-container .bar'));
      return bars.some((b) => getComputedStyle(b).backgroundColor.includes('255, 0, 0'));
    });
    expect(anyRed).toBe(true);

    // Capture console/page errors that may have occurred during early sorting
    const errors1 = await bsPage.collectConsoleAndPageErrors();
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  // Test transition S1 -> S2: sorting completes and alert is shown
  test('S1 -> S2 transition: Sorting completes and "Sorting complete!" alert is shown', async ({ page }) => {
    // This test waits for the full sorting process to finish and the alert dialog to appear.
    // The bubbleSort implementation uses many 300ms delays; for 20 elements this can take up to ~57s.
    test.setTimeout(2 * 60 * 1000); // ensure enough time for this test

    const bsPage2 = new BubbleSortPage(page);
    await bsPage.goto();

    // Prepare to capture any dialogs (alerts). We'll wait for one alert indicating completion.
    // Click to start sorting
    await bsPage.clickSort();

    // Wait for the alert dialog and verify its message
    const alertMessage = await bsPage.waitForAlert(120000); // wait up to 120s
    expect(alertMessage).toBe('Sorting complete!');

    // After alert, ensure there are no uncaught console/page errors
    const errors2 = await bsPage.collectConsoleAndPageErrors();
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);

    // As an extra check after completion, verify that the bars are present and appear sorted.
    // We'll inspect the computed heights and assert they are non-decreasing.
    const heights1 = await bsPage.getBarHeights();
    // heights should be non-decreasing (from left to right) if the sort truly completed
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    }
  });

  // Edge case tests: clicking multiple times while sorting
  test('Edge case: Clicking the sort button multiple times while sorting should not crash the page', async ({ page }) => {
    test.setTimeout(2 * 60 * 1000); // ensure enough time for this test

    const bsPage3 = new BubbleSortPage(page);
    await bsPage.goto();

    // Collect dialog messages seen
    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    // Click twice in quick succession to attempt concurrent sorts
    await bsPage.clickSort();
    // small pause and click again
    await page.waitForTimeout(50);
    await bsPage.clickSort();

    // Wait for at least one alert (sorting completes for at least one run)
    // Use a generous timeout since concurrent runs may lengthen overall runtime
    const firstAlert = await page.waitForEvent('dialog', { timeout: 120000 }).then(async (d) => {
      const msg = d.message();
      await d.accept();
      return msg;
    }).catch(() => null);

    // If an alert was observed, it should be the expected message
    if (firstAlert !== null) {
      expect(firstAlert).toBe('Sorting complete!');
    } else {
      // If no alert was observed in the timeframe, fail the test to indicate unusual behavior
      throw new Error('Expected at least one "Sorting complete!" alert after multiple clicks, but none appeared within timeout.');
    }

    // Ensure no uncaught console/page errors occurred during concurrent operations
    const errors3 = await bsPage.collectConsoleAndPageErrors();
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  // Observability test: ensure that no unexpected runtime errors (ReferenceError/SyntaxError/TypeError) were thrown during normal usage
  test('Observability: No unexpected runtime errors emitted to console or as page errors during typical flows', async ({ page }) => {
    const bsPage4 = new BubbleSortPage(page);
    await bsPage.goto();

    // Perform a short flow: click sort, wait briefly for animation to start, then reload.
    await bsPage.clickSort();
    await bsPage.waitForAnyBarToTurnRed(10000).catch(() => {
      // If red not observed quickly, continue to capture whatever errors may exist
    });

    // Reload the page to simulate another lifecycle and capture possible errors on load/unload
    await page.reload({ waitUntil: 'load' });

    // Collect any errors that were captured by listeners
    const errors4 = await bsPage.collectConsoleAndPageErrors();

    // Explicitly assert that there are no console errors or page errors like ReferenceError/TypeError/SyntaxError
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
});
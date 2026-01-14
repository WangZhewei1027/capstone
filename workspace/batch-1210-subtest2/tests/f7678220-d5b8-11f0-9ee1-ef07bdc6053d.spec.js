import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7678220-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Increase default timeout because the visualization uses timeouts during sorting
test.setTimeout(2 * 60 * 1000); // 2 minutes

// Page object encapsulating interactions and common checks for the visualization
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Click the sort button
  async clickSort() {
    await this.page.click('#sortButton');
  }

  // Get all bars as element handles
  async getBars() {
    return await this.page.$$('#array .bar');
  }

  // Get numeric heights (in px -> number) of bars in DOM order
  async getBarHeights() {
    const heights = await this.page.$$eval('#array .bar', (bars) =>
      bars.map((b) => {
        const h = getComputedStyle(b).height;
        return parseFloat(h);
      })
    );
    return heights;
  }

  // Get computed background colors of bars as strings (e.g., 'rgb(52, 152, 219)')
  async getBarColors() {
    return await this.page.$$eval('#array .bar', (bars) =>
      bars.map((b) => getComputedStyle(b).backgroundColor)
    );
  }

  // Wait until any bar becomes red (visual indication of sorting work)
  async waitForSortingStart(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#array .bar'));
      return bars.some((b) => getComputedStyle(b).backgroundColor.includes('255, 0, 0'));
    }, null, { timeout });
  }

  // Wait until no bar is red (likely indicates sorting finished)
  async waitForNoRed(timeout = 60000) {
    await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#array .bar'));
      return bars.every((b) => !getComputedStyle(b).backgroundColor.includes('255, 0, 0'));
    }, null, { timeout });
  }

  // Wait until at least one bar becomes green (visual placement)
  async waitForAnyGreen(timeout = 10000) {
    await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#array .bar'));
      return bars.some((b) => getComputedStyle(b).backgroundColor.includes('0, 128, 0'));
    }, null, { timeout });
  }

  // Assert that heights are non-decreasing (sorted ascending)
  async assertHeightsAreSorted() {
    const heights = await this.getBarHeights();
    for (let i = 0; i < heights.length - 1; i++) {
      expect(heights[i]).toBeLessThanOrEqual(heights[i + 1]);
    }
  }

  // Assert number of bars equals expected
  async assertBarCount(expectedCount) {
    const bars = await this.getBars();
    expect(bars.length).toBe(expectedCount);
  }
}

test.describe('Insertion Sort Visualization - FSM states and transitions', () => {
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset capture arrays
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors for each test
    page.on('console', (msg) => {
      // store message type and text for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // nothing special to teardown beyond Playwright's automatic cleanup
  });

  test('Initial Idle state: drawArray() is invoked and initial DOM is correct', async ({ page }) => {
    // This test validates the S0_Idle state: drawArray() on load creates the visual bars
    const app = new InsertionSortPage(page);

    // The FSM's entry action for Idle state is drawArray(); we verify DOM reflects that
    // Ensure there are 10 bars (arraySize in implementation)
    await app.assertBarCount(10);

    // Ensure each bar has a numeric height > 0 and the .bar class exists
    const heights = await app.getBarHeights();
    for (const h of heights) {
      expect(typeof h).toBe('number');
      expect(h).toBeGreaterThan(0);
    }

    // Ensure no runtime page errors happened during initial draw
    expect(pageErrors.length).toBe(0);
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });

  test('Transition S0_Idle -> S1_Sorting: Clicking sort button triggers insertionSort and visually sorts the array', async ({ page }) => {
    // This test validates the SortArrayClick event and S1_Sorting state
    const app = new InsertionSortPage(page);

    // Capture initial heights to ensure change occurs
    const initialHeights = await app.getBarHeights();

    // Click the sort button to trigger insertionSort()
    await app.clickSort();

    // Wait for sorting to start (red highlight) - evidence of insertionSort running
    await app.waitForSortingStart(10000);

    // While sorting is in progress, there should be at least one red bar (visual feedback)
    const duringColors = await app.getBarColors();
    const anyRedDuring = duringColors.some((c) => c.includes('255, 0, 0'));
    expect(anyRedDuring).toBeTruthy();

    // Also check that green placements occur at some point during sorting
    await app.waitForAnyGreen(20000);

    // Wait for sorting to finish: no red bars remain
    await app.waitForNoRed(60000);

    // After sorting completes, heights should be non-decreasing
    await app.assertHeightsAreSorted();

    // Ensure at least one bar's height changed from initial (array was mutated by sort)
    const finalHeights = await app.getBarHeights();
    const changed = finalHeights.some((h, idx) => h !== initialHeights[idx]);
    expect(changed).toBeTruthy();

    // Verify no page errors and no console.error occurred during the transition
    expect(pageErrors.length).toBe(0);
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });

  test('Edge case: Clicking the Sort button multiple times rapidly does not crash and results in a sorted array', async ({ page }) => {
    // This test simulates a user clicking the sort button multiple times (possible race)
    const app = new InsertionSortPage(page);

    // Click twice rapidly
    await app.clickSort();
    // short delay then second click to attempt concurrent runs (handler awaits but can be invoked again)
    await page.waitForTimeout(50);
    await app.clickSort();

    // Sorting should start
    await app.waitForSortingStart(10000);

    // Wait until no red bars remain (sorting finished)
    await app.waitForNoRed(60000);

    // Final array must be sorted
    await app.assertHeightsAreSorted();

    // Bars count preserved
    await app.assertBarCount(10);

    // No unhandled page errors or console errors from rapid clicks
    expect(pageErrors.length).toBe(0);
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });

  test('Visual feedback during sorting: red highlights during comparisons and green on placement', async ({ page }) => {
    // This test ensures the UI provides expected visual feedback while in S1_Sorting
    const app = new InsertionSortPage(page);

    // Start sorting
    await app.clickSort();

    // Verify red highlight appears (indicates comparisons)
    await app.waitForSortingStart(10000);
    const colorsDuring = await app.getBarColors();
    expect(colorsDuring.some((c) => c.includes('255, 0, 0'))).toBeTruthy();

    // Verify green placements occur at least once
    await app.waitForAnyGreen(20000);
    const colorsLater = await app.getBarColors();
    expect(colorsLater.some((c) => c.includes('0, 128, 0') || c.includes('0,128,0'))).toBeTruthy();

    // Finally wait for sorting to finish
    await app.waitForNoRed(60000);

    // No runtime errors occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });

  test('Error observation: Ensure there are no unexpected runtime exceptions on load and during operations', async ({ page }) => {
    // This test explicitly asserts observation of console and page errors as required:
    // - We load the page (S0_Idle)
    // - We click the sort button (transition to S1_Sorting)
    // - We assert whether any JS runtime errors happened (none expected)

    const app = new InsertionSortPage(page);

    // No errors so far
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter((m) => m.type === 'error').length).toBe(0);

    // Trigger sorting
    await app.clickSort();

    // Give some time for sorting operations to run and potentially surface errors
    await app.waitForFunction(() => true, null, { timeout: 500 }); // small synchronization point

    // Wait for sorting to start and then finish to ensure any delayed errors surface
    await app.waitForSortingStart(10000);
    await app.waitForNoRed(60000);

    // Final assertion: no page errors, no console.error lines emitted
    expect(pageErrors.length).toBe(0);
    const consoleErrs = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrs.length).toBe(0);
  });
});
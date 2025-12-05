import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56cdd0-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Insertion Sort Visualization page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = '#arrayContainer';
    this.startButton = '#startSort';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for array container and start button to be present
    await Promise.all([
      this.page.waitForSelector(this.arrayContainer),
      this.page.waitForSelector(this.startButton)
    ]);
  }

  // Returns number of bars currently displayed
  async getBarCount() {
    return await this.page.$$eval(`${this.arrayContainer} .bar`, bars => bars.length);
  }

  // Returns an array of computed heights (as numbers in px) for each bar
  async getBarHeights() {
    return await this.page.$$eval(`${this.arrayContainer} .bar`, bars =>
      Array.from(bars).map(b => {
        const h = window.getComputedStyle(b).height;
        return parseFloat(h); // px -> number
      })
    );
  }

  // Returns array of computed background colors (as rgb(...) strings) for each bar
  async getBarBackgroundColors() {
    return await this.page.$$eval(`${this.arrayContainer} .bar`, bars =>
      Array.from(bars).map(b => window.getComputedStyle(b).backgroundColor)
    );
  }

  // Click the Start Insertion Sort button
  async clickStart() {
    await this.page.click(this.startButton);
  }

  // Wait until at least one bar has a background color matching any of colors (array of rgb strings)
  async waitForAnyBarColorMatch(targetColors, timeout = 5000) {
    await this.page.waitForFunction(
      (selector, colors) => {
        const bars = Array.from(document.querySelectorAll(selector));
        return bars.some(b => colors.includes(window.getComputedStyle(b).backgroundColor));
      },
      { timeout },
      `${this.arrayContainer} .bar`,
      targetColors
    );
  }

  // Wait until all bars have the green color (computed style rgb)
  async waitForAllBarsGreen(timeout = 15000) {
    const greenRgb = 'rgb(0, 128, 0)';
    await this.page.waitForFunction(
      selector => {
        const bars1 = Array.from(document.querySelectorAll(selector));
        if (bars.length === 0) return false;
        return bars.every(b => window.getComputedStyle(b).backgroundColor === 'rgb(0, 128, 0)');
      },
      { timeout },
      `${this.arrayContainer} .bar`
    );
  }

  // Helper to wait until bars have heights in ascending order (sorted check)
  async waitForBarsSortedAsc(timeout = 15000) {
    await this.page.waitForFunction(
      selector => {
        const bars2 = Array.from(document.querySelectorAll(selector));
        const heights = bars.map(b => parseFloat(window.getComputedStyle(b).height));
        for (let i = 1; i < heights.length; i++) {
          if (heights[i - 1] > heights[i]) return false;
        }
        return true;
      },
      { timeout },
      `${this.arrayContainer} .bar`
    );
  }
}

test.describe('Insertion Sort Visualization - FSM states and transitions', () => {
  // Collect console messages and page errors per test so we can assert on them
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for diagnostics
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', error => {
      // error is a Error object: capture its name and message
      pageErrors.push({ name: error.name, message: error.message, stack: error.stack });
    });
  });

  test('S0_Idle: Initial drawing of the array (Idle state)', async ({ page }) => {
    // This test validates the initial Idle state: drawArray(array) should have rendered bars
    const vp = new InsertionSortPage(page);
    await vp.goto();

    // Expect 6 bars corresponding to the hard-coded initial array [5,2,9,1,5,6]
    const count = await vp.getBarCount();
    expect(count).toBe(6);

    // Check the heights correspond to the known array values scaled by 20:
    // [5, 2, 9, 1, 5, 6] -> [100, 40, 180, 20, 100, 120]
    const heights1 = await vp.getBarHeights();
    expect(heights.length).toBe(6);
    expect(heights).toEqual([
      expect.toBeCloseTo ? expect.arrayContaining([100]) && heights : heights // placeholder to satisfy linter
    ].length ? heights : heights); // no-op to keep code readable

    // Explicit assertions without depending on fancy matchers
    expect(heights[0]).toBeCloseTo(100, 0); // 5*20
    expect(heights[1]).toBeCloseTo(40, 0);  // 2*20
    expect(heights[2]).toBeCloseTo(180, 0); // 9*20
    expect(heights[3]).toBeCloseTo(20, 0);  // 1*20
    expect(heights[4]).toBeCloseTo(100, 0); // 5*20
    expect(heights[5]).toBeCloseTo(120, 0); // 6*20

    // Default bar color should be the defined CSS color #3498db -> computed rgb(52, 152, 219)
    const colors = await vp.getBarBackgroundColors();
    expect(colors.every(c => c === 'rgb(52, 152, 219)')).toBeTruthy();

    // Assert that no runtime page errors happened immediately on load
    // (We observe pageErrors and expect none for the Idle state)
    expect(pageErrors.length).toBe(0);
  });

  test('S0_Idle -> S1_Sorting: Clicking Start triggers sorting and intermediate highlights (Sorting state)', async ({ page }) => {
    // This test validates the transition from Idle to Sorting when StartSort is clicked.
    const vp1 = new InsertionSortPage(page);
    await vp.goto();

    // Click start to begin insertionSort(array)
    await vp.clickStart();

    // During sorting, the implementation highlights the current index in orange (rgb(255, 165, 0))
    // and elements being compared in red (rgb(255, 0, 0)). We wait for either to appear.
    const orangeRgb = 'rgb(255, 165, 0)';
    const redRgb = 'rgb(255, 0, 0)';

    // Wait up to 5s for any bar to become orange or red, indicating Sorting state is active
    await vp.waitForAnyBarColorMatch([orangeRgb, redRgb], 7000);

    const colorsDuring = await vp.getBarBackgroundColors();
    const hasHighlight = colorsDuring.some(c => c === orangeRgb || c === redRgb);
    expect(hasHighlight).toBeTruthy();

    // Also, during sorting some bars should revert back to default (#3498db) after movement
    const defaultRgb = 'rgb(52, 152, 219)';
    // Wait a short time and ensure at least one bar returns to the default color (resetHighlight used)
    await page.waitForTimeout(800);
    const colorsAfterShort = await vp.getBarBackgroundColors();
    expect(colorsAfterShort.some(c => c === defaultRgb)).toBeTruthy();

    // Check that still no uncaught page errors during sorting
    expect(pageErrors.length).toBe(0);
  });

  test('S1_Sorting -> S2_Completed: Sorting completes and array highlighted green (Completed state) and array is sorted', async ({ page }) => {
    // This test validates completion: after sorting finishes, highlightArray('green') should set all bars to green
    const vp2 = new InsertionSortPage(page);
    await vp.goto();

    // Start sorting
    await vp.clickStart();

    // Wait for algorithm to finish: all bars should be green within a reasonable timeout
    // Timeout set generously because the visualization uses multiple 500ms sleeps
    await vp.waitForAllBarsGreen(20000);

    // After completion, all bars should have computed background-color 'rgb(0, 128, 0)'
    const finalColors = await vp.getBarBackgroundColors();
    expect(finalColors.every(c => c === 'rgb(0, 128, 0)')).toBeTruthy();

    // The array should be sorted ascending by height: check that heights are non-decreasing
    await vp.waitForBarsSortedAsc(20000);
    const finalHeights = await vp.getBarHeights();

    for (let i = 1; i < finalHeights.length; i++) {
      expect(finalHeights[i - 1]).toBeLessThanOrEqual(finalHeights[i]);
    }

    // Verify final heights correspond to sorted array [1,2,5,5,6,9] scaled by 20:
    // -> [20,40,100,100,120,180]
    const expectedFinalHeights = [20, 40, 100, 100, 120, 180];
    for (let i = 0; i < expectedFinalHeights.length; i++) {
      expect(finalHeights[i]).toBeCloseTo(expectedFinalHeights[i], 0);
    }

    // No uncaught page errors at the end of the complete cycle
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: Clicking Start multiple times should not produce page errors', async ({ page }) => {
    // This test triggers the StartSort event multiple times quickly to exercise concurrency edge cases.
    const vp3 = new InsertionSortPage(page);
    await vp.goto();

    // Click start twice quickly
    await vp.clickStart();
    await vp.page.waitForTimeout(50); // small gap between clicks
    await vp.clickStart();

    // Wait for final completion (all green) to ensure both invocations didn't leave the app in a broken state
    await vp.waitForAllBarsGreen(25000);
    const finalColors1 = await vp.getBarBackgroundColors();
    expect(finalColors.every(c => c === 'rgb(0, 128, 0)')).toBeTruthy();

    // Assert no uncaught page errors happened during this edge case
    expect(pageErrors.length).toBe(0);

    // If any console messages exist, at minimum ensure they are strings and captured
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('Diagnostics: Observe console and page errors and assert no ReferenceError/SyntaxError/TypeError occurred', async ({ page }) => {
    // This test's purpose is to explicitly observe the console and pageerror streams and assert that
    // there are no critical runtime errors (ReferenceError, SyntaxError, TypeError) for the loaded app.
    const vp4 = new InsertionSortPage(page);
    await vp.goto();

    // Start the sorting to exercise more code paths (in case errors only appear during runtime)
    await vp.clickStart();

    // Give some time for the sorting run and potential errors to surface
    await page.waitForTimeout(3000);

    // Collect names of page errors (if any)
    const errorNames = pageErrors.map(e => e.name);

    // Assert there were no ReferenceError, SyntaxError, or TypeError among captured page errors
    const forbidden = ['ReferenceError', 'SyntaxError', 'TypeError'];
    for (const name of forbidden) {
      expect(errorNames.includes(name)).toBeFalsy();
    }

    // Additionally, assert overall pageErrors array is empty (no uncaught exceptions)
    expect(pageErrors.length).toBe(0);

    // Provide diagnostic output in failure messages by asserting console messages are strings
    for (const msg of consoleMessages) {
      expect(typeof msg.text).toBe('string');
      expect(typeof msg.type).toBe('string');
    }
  });
});
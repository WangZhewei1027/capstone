import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56a6c2-d1d8-11f0-bbda-359f3f96b638.html';

// Simple Page Object for the Selection Sort Visualization page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.containerSelector = '#array-container';
    this.startButtonSelector = "button[onclick='startSorting()']";
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getStartButton() {
    return this.page.locator(this.startButtonSelector);
  }

  async clickStart() {
    await this.page.click(this.startButtonSelector);
  }

  async getBars() {
    return this.page.locator(`${this.containerSelector} .array-bar`);
  }

  // Returns an array of heights in pixels (as numbers) for each bar
  async getBarHeights() {
    const bars = await this.getBars().elementHandles();
    const heights = [];
    for (const bar of bars) {
      const height = await bar.evaluate((el) => {
        // read computed style height which will be like '320px'
        return window.getComputedStyle(el).height;
      });
      heights.push(parseFloat(height.replace('px', '')));
    }
    return heights;
  }

  async getBarCount() {
    return this.getBars().count();
  }

  // Helper to wait until a predicate on the bars is true or timeout
  async waitForBarHeights(predicate, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const heights1 = await this.getBarHeights();
      if (predicate(heights)) return heights;
      await this.page.waitForTimeout(100);
    }
    throw new Error('Timeout waiting for bar heights predicate');
  }
}

test.describe('Selection Sort Visualization - FSM compliance and runtime checks', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let page;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context to isolate console/page errors per test
    const context = await browser.newContext();
    page = await context.newPage();

    // Collect uncaught page errors (exceptions)
    pageErrors = [];
    page.on('pageerror', (err) => {
      // err is an Error object from the page context
      pageErrors.push(err);
    });

    // Collect console messages (to detect console.error and other logs)
    consoleErrors = [];
    page.on('console', (msg) => {
      const type = msg.type(); // e.g., 'log', 'error'
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push({ type, text });
      } else {
        // store other console logs as well for debugging if needed
      }
    });
  });

  test.afterEach(async () => {
    // Clear listeners implicitly by closing the page's context when page is closed by Playwright's fixture
  });

  test('S0_Idle state on page load: Start button present and no initial array bars (verify FSM entry action observation)', async () => {
    // This test validates the Idle state (S0_Idle).
    // FSM says createArrayBars(array) is an entry action for Idle.
    // Implementation does NOT call createArrayBars on load (it does it when Start Sorting is clicked).
    // We assert the actual behavior: button exists and array-container initially has zero bars.
    const ssPage = new SelectionSortPage(page);
    await ssPage.goto();

    // Verify Start Sorting button exists and has correct onclick attribute
    const startButton = await ssPage.getStartButton();
    await expect(startButton).toBeVisible();
    const onclick = await startButton.getAttribute('onclick');
    // The implementation includes an inline onclick handler "startSorting()"
    await expect(onclick).toBe('startSorting()');

    // Verify that on initial load, there are no array bars in the container
    // This confirms the implementation difference from the FSM entry_actions which listed createArrayBars(array).
    const barCount = await ssPage.getBarCount();
    expect(barCount).toBe(0);

    // Assert there are no uncaught page errors at load
    expect(pageErrors.length).toBe(0);

    // Assert there are no console.error messages indicative of ReferenceError/SyntaxError/TypeError
    const fatalConsoleErrors = consoleErrors.filter(e =>
      /ReferenceError|SyntaxError|TypeError/i.test(e.text)
    );
    expect(fatalConsoleErrors.length).toBe(0);
  });

  test('StartSorting event transitions to Sorting (S1_Sorting): bars are created and visualization updates', async () => {
    // This test validates the transition from S0_Idle to S1_Sorting when the Start Sorting button is clicked.
    // It checks that createArrayBars(array) is called by startSorting(), that bars appear,
    // and that subsequent swaps performed by selectionSort() update the DOM visibly.
    const ssPage1 = new SelectionSortPage(page);
    await ssPage.goto();

    // Click the Start Sorting button to trigger the transition
    await ssPage.clickStart();

    // Immediately after click, createArrayBars(array) is called in startSorting(), so bars should exist now
    // Wait for up to 1 second for the initial bars to appear
    await ssPage.waitForBarHeights((heights) => heights.length === 5, 1000);

    // Validate there are 5 bars representing the 5 elements of the array
    const barCountPostClick = await ssPage.getBarCount();
    expect(barCountPostClick).toBe(5);

    // Validate heights correspond to the initial array [64,25,12,22,11] scaled by 5
    const initialHeights = await ssPage.getBarHeights();
    // Convert expected heights to numbers for comparison
    const expectedInitial = [64, 25, 12, 22, 11].map(v => v * 5);
    expect(initialHeights).toEqual(expectedInitial);

    // Now, selectionSort() runs asynchronously. The algorithm will swap elements and call createArrayBars(arr) after swaps.
    // The first swap will place 11 at index 0 -> first bar height should eventually be 11*5 = 55px.
    const heightsAfterSwap = await ssPage.waitForBarHeights(
      (heights) => heights.length === 5 && Math.abs(heights[0] - 11 * 5) < 0.5,
      5000 // allow enough time for async swaps with 500ms delays in the implementation
    );

    // Confirm the first bar height reflects the first swap (11 moved to front)
    expect(Math.round(heightsAfterSwap[0])).toBe(11 * 5);

    // Also ensure there were no uncaught page errors during the sorting process
    expect(pageErrors.length).toBe(0);

    // Confirm console did not log ReferenceError/SyntaxError/TypeError during operations
    const fatalConsoleErrors1 = consoleErrors.filter(e =>
      /ReferenceError|SyntaxError|TypeError/i.test(e.text)
    );
    expect(fatalConsoleErrors.length).toBe(0);
  });

  test('Repeated StartSorting clicks do not cause uncaught exceptions (edge case)', async () => {
    // Edge case: clicking the Start Sorting button multiple times rapidly.
    // We verify that multiple invocations do not raise uncaught page errors or fatal console errors.
    const ssPage2 = new SelectionSortPage(page);
    await ssPage.goto();

    // Click start multiple times quickly
    await ssPage.clickStart();
    await ssPage.page.waitForTimeout(50);
    await ssPage.clickStart();
    await ssPage.page.waitForTimeout(50);
    await ssPage.clickStart();

    // Wait for the visualization to proceed and for any potential errors to surface
    await ssPage.page.waitForTimeout(1500);

    // There should still be bars present
    const barCount1 = await ssPage.getBarCount();
    expect(barCount).toBeGreaterThanOrEqual(1);

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);

    // Ensure console error messages do not indicate ReferenceError/SyntaxError/TypeError
    const fatalConsoleErrors2 = consoleErrors.filter(e =>
      /ReferenceError|SyntaxError|TypeError/i.test(e.text)
    );
    expect(fatalConsoleErrors.length).toBe(0);
  });

  test('Verify DOM evidence and attributes match FSM components (button and container)', async () => {
    // This test explicitly validates that the detected FSM components exist in the DOM as described.
    const ssPage3 = new SelectionSortPage(page);
    await ssPage.goto();

    // Button component
    const startButton1 = await ssPage.getStartButton();
    await expect(startButton).toHaveText('Start Sorting');

    // Container component exists
    const container = page.locator('#array-container');
    await expect(container).toBeVisible();

    // Verify that the button's inline onclick handler matches the FSM evidence
    const onclick1 = await startButton.getAttribute('onclick1');
    expect(onclick).toBe('startSorting()');

    // No page errors or fatal console errors at this point
    expect(pageErrors.length).toBe(0);
    const fatalConsoleErrors3 = consoleErrors.filter(e =>
      /ReferenceError|SyntaxError|TypeError/i.test(e.text)
    );
    expect(fatalConsoleErrors.length).toBe(0);
  });

  test('Observe console messages and page errors; report if any ReferenceError/SyntaxError/TypeError occur', async () => {
    // This test's purpose is to capture any unexpected runtime errors that might surface
    // during normal usage of the app. We will click Start to exercise the logic and then
    // assert that there are no fatal JS errors (ReferenceError/SyntaxError/TypeError).
    const ssPage4 = new SelectionSortPage(page);
    await ssPage.goto();

    // Perform an action to exercise the code
    await ssPage.clickStart();

    // Allow time for asynchronous behavior and any errors to be emitted
    await ssPage.page.waitForTimeout(1200);

    // Collect any page errors and console errors of interest
    // Assert that there were no uncaught page exceptions
    expect(pageErrors.length).toBe(0);

    // Assert that console errors do not indicate the common fatal error types
    const fatalConsoleErrors4 = consoleErrors.filter(e =>
      /ReferenceError|SyntaxError|TypeError/i.test(e.text)
    );

    // If any of these errors are present, fail the test with details
    expect(fatalConsoleErrors.length).toBe(0);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8b193-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object Model for the Merge Sort Visualization page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Returns the Start Merge Sort button element handle
  get startButton() {
    return this.page.getByRole('button', { name: 'Start Merge Sort' });
  }

  // Returns the number of bars currently rendered
  async getBarCount() {
    return this.page.evaluate(() => document.querySelectorAll('#array .bar').length);
  }

  // Returns an array of the inline style.height values for every bar, in DOM order
  async getBarHeights() {
    return this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('#array .bar')).map(bar => bar.style.height);
    });
  }

  // Click the start button to begin visualization
  async clickStart() {
    await this.startButton.click();
  }

  // Wait until the bar heights match the expected heights array (array of strings like '15px')
  async waitForBarHeights(expectedHeights, options = {}) {
    await this.page.waitForFunction(
      (expected) => {
        const bars = Array.from(document.querySelectorAll('#array .bar'));
        if (bars.length !== expected.length) return false;
        return bars.every((bar, i) => bar.style.height === expected[i]);
      },
      expectedHeights,
      options
    );
  }
}

test.describe('Divide and Conquer: Merge Sort Visualization (Application ID: 39b8b193-...)', () => {
  // Arrays to capture console error messages and uncaught page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages of type 'error' and uncaught page errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert there were no uncaught page errors or console errors.
    // This ensures we observe and assert on any runtime issues that happen naturally.
    expect(pageErrors, 'No uncaught page errors should have occurred').toEqual([]);
    expect(consoleErrors, 'No console.error messages should have been emitted').toEqual([]);
  });

  test('Initial page load renders the expected UI elements and default array bars', async ({ page }) => {
    // Purpose: Verify initial DOM and default state on page load.
    const model = new MergeSortPage(page);

    // The title should be visible and descriptive
    await expect(page.locator('h1')).toHaveText(/Divide and Conquer: Merge Sort Visualization/);

    // The Start button should be visible and accessible by role
    await expect(model.startButton).toBeVisible();
    await expect(model.startButton).toHaveText('Start Merge Sort');

    // The initial array should be drawn as .bar elements; expected 7 items (from the HTML script)
    const count = await model.getBarCount();
    expect(count).toBe(7);

    // Verify first and a few representative bar heights match the expected scaled values
    // The original array: [38, 27, 43, 3, 9, 82, 10] and scale is value*5 + 'px'
    const expectedHeights = ['190px', '135px', '215px', '15px', '45px', '410px', '50px'];
    const barHeights = await model.getBarHeights();
    expect(barHeights).toEqual(expectedHeights);
  });

  test('Clicking Start triggers animated visualization and finishes with a sorted array in the DOM', async ({ page }) => {
    // Purpose: Validate interactive behavior: clicking the Start button runs the animation
    // and final DOM reflects the sorted array.
    const model1 = new MergeSortPage(page);

    // Compute expected sorted array heights based on known input array in the page script.
    // Known sorted order: [3,9,10,27,38,43,82] scaled by *5
    const sortedValues = [3, 9, 10, 27, 38, 43, 82];
    const expectedFinalHeights = sortedValues.map(v => `${v * 5}px`);

    // Click the Start button to start the visualization animation.
    await model.clickStart();

    // During animation, the first bar should update relatively quickly to the smallest sorted element (3 -> 15px).
    // Wait for that intermediate state (first bar equals '15px') with a reasonable timeout.
    await page.waitForFunction(() => {
      const firstBar = document.querySelector('#array .bar');
      return firstBar && firstBar.style.height === '15px';
    }, {}, { timeout: 2000 });

    // Wait until the visualization completes and the final sorted heights are rendered.
    // mergeSortWithAnimation uses a timed interval; waitForBarHeights should resolve when final state is present.
    await model.waitForBarHeights(expectedFinalHeights, { timeout: 5000 });

    // Verify final DOM bar heights equal the expected sorted heights
    const finalHeights = await model.getBarHeights();
    expect(finalHeights).toEqual(expectedFinalHeights);
  });

  test('Start button is idempotent: subsequent clicks re-run visualization and produce the same sorted result', async ({ page }) => {
    // Purpose: Ensure repeated interactions behave consistently.
    const model2 = new MergeSortPage(page);

    // Expected final heights (sorted)
    const expectedFinalHeights1 = [3, 9, 10, 27, 38, 43, 82].map(v => `${v * 5}px`);

    // First run
    await model.clickStart();
    await model.waitForBarHeights(expectedFinalHeights, { timeout: 5000 });

    // Confirm final state after first run
    let heightsAfterFirst = await model.getBarHeights();
    expect(heightsAfterFirst).toEqual(expectedFinalHeights);

    // Click again to re-run visualization; the UI should still end up in the same sorted state
    await model.clickStart();
    await model.waitForBarHeights(expectedFinalHeights, { timeout: 5000 });

    let heightsAfterSecond = await model.getBarHeights();
    expect(heightsAfterSecond).toEqual(expectedFinalHeights);
  });

  test('Internal algorithm functions are accessible and handle edge cases (mergeSort and merge)', async ({ page }) => {
    // Purpose: Verify that the page exposes mergeSort and merge functions and they behave on edge cases.
    // This uses page.evaluate to call functions that are defined on the page's global scope.
    // We do not modify or patch any functions; we only call them as-is.

    // Call mergeSort([]) expecting an empty array result
    const emptyResult = await page.evaluate(() => {
      // Call the mergeSort function defined by the page script
      // If mergeSort is not defined, this will produce a ReferenceError in the page context,
      // which will be reported as a pageerror and cause the afterEach assertion to fail.
      return typeof mergeSort === 'function' ? mergeSort([]) : null;
    });
    expect(emptyResult).toEqual([]);

    // Test merge function with two small sorted arrays
    const merged = await page.evaluate(() => {
      return typeof merge === 'function' ? merge([1, 3, 5], [2, 4]) : null;
    });
    expect(merged).toEqual([1, 2, 3, 4, 5]);
  });

  test('Accessibility: Start button is discoverable by role and labeled correctly', async ({ page }) => {
    // Purpose: Basic accessibility check - ensure the interactive control is accessible via ARIA role and name
    const model3 = new MergeSortPage(page);

    // The button should be focusable and have the accessible name "Start Merge Sort"
    const button = model.startButton;
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Focus the button to ensure it receives keyboard focus
    await button.focus();
    const activeTagName = await page.evaluate(() => document.activeElement.tagName.toLowerCase());
    expect(activeTagName).toBe('button');
  });
});
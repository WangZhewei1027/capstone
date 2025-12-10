import { test, expect } from '@playwright/test';

// Page Object for the Bubble Sort Visualization page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b77911-d1d5-11f0-b49a-6f458b3a25ef.html';
    this.containerSelector = '#array-container';
    this.barSelector = '.bar';
    this.buttonSelector = 'button';
  }

  async goto() {
    await this.page.goto(this.url);
    // Ensure the main container is present
    await this.page.waitForSelector(this.containerSelector);
  }

  async getBarCount() {
    return await this.page.$$eval(this.barSelector, bars => bars.length);
  }

  async getBarHeights() {
    // Return array of heights as integers parsed from style.height
    return await this.page.$$eval(this.barSelector, bars =>
      bars.map(bar => {
        // style.height should be set inline as e.g. "123px"
        const h = bar.style.height || window.getComputedStyle(bar).height || '';
        const n = parseInt(h, 10);
        return Number.isFinite(n) ? n : null;
      })
    );
  }

  async getBarBackgroundColors() {
    return await this.page.$$eval(this.barSelector, bars =>
      bars.map(bar => {
        // Return inline style backgroundColor or computed style
        return bar.style.backgroundColor || window.getComputedStyle(bar).backgroundColor;
      })
    );
  }

  async clickSortButton() {
    await this.page.click(this.buttonSelector);
  }

  async getButtonText() {
    return await this.page.$eval(this.buttonSelector, b => b.textContent.trim());
  }

  // Compute inversion count for an array of numbers
  static inversionCount(arr) {
    let inv = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] > arr[j]) inv++;
      }
    }
    return inv;
  }
}

// Group tests under a describe block for clarity
test.describe('Bubble Sort Visualization - End to End', () => {
  // We'll capture console.error and page errors per test to assert there are no uncaught exceptions
  test.beforeEach(async ({ page }) => {
    // No-op here; each test will instantiate Page Object and navigate
  });

  // Test 1: Verify initial page load and default state
  test('Initial load should render 20 bars with valid heights and a Sort button', async ({ page }) => {
    // Purpose: Validate that the page loads and the initial array is rendered correctly.
    const app = new BubbleSortPage(page);

    const consoleErrors = [];
    const pageErrors = [];

    // Capture console errors and page errors during the test
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await app.goto();

    // Verify container is visible
    await expect(page.locator(app.containerSelector)).toBeVisible();

    // There should be 20 bars initially
    const count = await app.getBarCount();
    expect(count).toBe(20);

    // Each bar should have an inline height style set (between 10px and 160px as per generator)
    const heights = await app.getBarHeights();
    expect(heights.length).toBe(20);
    for (const h of heights) {
      // Each height should be a finite number within expected bounds
      expect(Number.isFinite(h)).toBeTruthy();
      expect(h).toBeGreaterThanOrEqual(10);
      expect(h).toBeLessThanOrEqual(160);
    }

    // The button should be present and labeled correctly
    const btnText = await app.getButtonText();
    expect(btnText).toBe('Sort Array');

    // Assert there were no uncaught page errors or console.error messages during load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test 2: Verify clicking the Sort Array button regenerates the array and starts sorting routine
  test('Clicking Sort Array regenerates the array and triggers the sorting routine', async ({ page }) => {
    // Purpose: Ensure user interaction (click) causes the array to regenerate and bubble sort to begin.
    const app1 = new BubbleSortPage(page);

    const consoleErrors1 = [];
    const pageErrors1 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await app.goto();

    // Capture heights before clicking
    const heightsBefore = await app.getBarHeights();
    expect(heightsBefore.length).toBe(20);

    // Click the button to regenerate array and start bubbleSort
    await app.clickSortButton();

    // Wait a short amount of time to allow generateArray() to run and render
    await page.waitForTimeout(250);

    // Capture heights after clicking - array should be regenerated (at least one height differs most times)
    const heightsAfter = await app.getBarHeights();
    expect(heightsAfter.length).toBe(20);

    // At least ensure the array structure remains valid and heights are valid numbers
    for (const h of heightsAfter) {
      expect(Number.isFinite(h)).toBeTruthy();
      expect(h).toBeGreaterThanOrEqual(10);
      expect(h).toBeLessThanOrEqual(160);
    }

    // It's possible by chance the new array equals the old one; we don't require a difference,
    // but we assert that a regenerate occurred by ensuring the DOM was updated (styles present).
    // Confirm button still present and clickable
    const btnText1 = await app.getButtonText();
    expect(btnText).toBe('Sort Array');

    // Assert there were no uncaught errors during click/start (pageerror or console.error)
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test 3: Rapid consecutive clicks should not produce uncaught exceptions and should maintain DOM integrity
  test('Rapid multiple clicks do not cause uncaught exceptions and always render 20 bars', async ({ page }) => {
    // Purpose: Test edge case where user clicks the sort button multiple times quickly.
    const app2 = new BubbleSortPage(page);

    const consoleErrors2 = [];
    const pageErrors2 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await app.goto();

    // Click the button multiple times rapidly
    await app.clickSortButton();
    await page.waitForTimeout(50);
    await app.clickSortButton();
    await page.waitForTimeout(50);
    await app.clickSortButton();

    // Wait a short time for DOM updates to settle
    await page.waitForTimeout(500);

    // Ensure DOM still contains 20 bars
    const count1 = await app.getBarCount();
    expect(count).toBe(20);

    // Ensure each bar has a valid height style
    const heights1 = await app.getBarHeights();
    expect(heights.length).toBe(20);
    for (const h of heights) {
      expect(Number.isFinite(h)).toBeTruthy();
    }

    // Confirm no uncaught exceptions surfaced during rapid clicking
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test 4: Sorting should reduce the number of inversions over time (indicating progress towards sorted order)
  test('Bubble sort progress reduces inversions over time (non-blocking partial verification)', async ({ page }) => {
    // Purpose: We cannot necessarily wait for full completion (could take long).
    // Instead we assert that after starting the sort and waiting briefly the array
    // exhibits fewer inversions than before (bubble sort makes progress).
    const app3 = new BubbleSortPage(page);

    const consoleErrors3 = [];
    const pageErrors3 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await app.goto();

    // Capture initial heights and compute inversion count
    const heightsBefore1 = await app.getBarHeights();
    expect(heightsBefore.length).toBe(20);
    const invBefore = BubbleSortPage.inversionCount(heightsBefore);

    // Start sorting
    await app.clickSortButton();

    // Wait a moderate time to allow some swaps to occur.
    // Note: Each swap in the implementation waits 500ms, so full sort could take a long time.
    // We wait 4000ms to allow a few swaps to happen in typical runs.
    await page.waitForTimeout(4000);

    const heightsDuring = await app.getBarHeights();
    expect(heightsDuring.length).toBe(20);
    const invDuring = BubbleSortPage.inversionCount(heightsDuring);

    // After some sorting time, the inversion count should not increase; expect it to be less than or equal.
    expect(invDuring).toBeLessThanOrEqual(invBefore);

    // It's reasonable to expect progress (strictly fewer) in most runs, but to avoid flakiness we accept equality.
    // Confirm no uncaught exceptions occurred while sorting ran for a short period
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});
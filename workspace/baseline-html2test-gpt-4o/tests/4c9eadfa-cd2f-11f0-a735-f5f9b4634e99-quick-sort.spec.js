import { test, expect } from '@playwright/test';

// Page object for the Quick Sort visualization page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = page.locator('#array');
    this.startButton = page.locator('#startSorting');
    this.barLocator = this.arrayContainer.locator('.bar');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/4c9eadfa-cd2f-11f0-a735-f5f9b4634e99.html', { waitUntil: 'domcontentloaded' });
  }

  // Return all bar elements as a locator
  bars() {
    return this.barLocator;
  }

  // Return the visible text values of all bars as numbers in order
  async getBarValues() {
    const count = await this.barLocator.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await this.barLocator.nth(i).textContent();
      values.push(Number(text?.trim()));
    }
    return values;
  }

  // Return the computed inline height style of each bar (string, e.g., "100px")
  async getBarHeights() {
    const count = await this.barLocator.count();
    const heights = [];
    for (let i = 0; i < count; i++) {
      const height = await this.barLocator.nth(i).evaluate((el) => el.style.height);
      heights.push(height);
    }
    return heights;
  }

  // Click the Start Sorting button
  async clickStart() {
    await this.startButton.click();
  }

  // Check if quickSort function exists on the page
  async quickSortExists() {
    return await this.page.evaluate(() => typeof quickSort === 'function');
  }

  // Check if partition function exists on the page
  async partitionExists() {
    return await this.page.evaluate(() => typeof partition === 'function');
  }
}

test.describe('Quick Sort Visualization - 4c9eadfa-cd2f-11f0-a735-f5f9b4634e99', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Capture console messages and page errors for each test so we can assert on them
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // store the error for later assertions
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // store console messages including warnings and errors
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Test the initial page state and default rendered array
  test('Initial load shows expected unsorted array bars and Start Sorting button', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.goto();

    // The Start Sorting button should be visible and enabled
    await expect(qs.startButton).toBeVisible();
    await expect(qs.startButton).toBeEnabled();

    // There should be 7 bars rendered initially with the expected values
    const values = await qs.getBarValues();
    // The initial array in the HTML is [20, 15, 10, 60, 5, 30, 40]
    expect(values).toEqual([20, 15, 10, 60, 5, 30, 40]);

    // Each bar should have the CSS class 'bar' and a height equal to value*5 px
    const heights = await qs.getBarHeights();
    const expectedHeights = values.map((v) => `${v * 5}px`);
    expect(heights).toEqual(expectedHeights);

    // Ensure all bars are present in the DOM and visible
    const count = await qs.bars().count();
    expect(count).toBe(7);

    // Ensure there are no unexpected page errors on initial load
    expect(pageErrors.length).toBe(0);

    // Ensure no console.error messages were emitted during load
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test that clicking the Start Sorting button sorts the array correctly
  test('Clicking Start Sorting sorts the array in ascending order and updates DOM', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.goto();

    // Sanity: quickSort and partition functions should exist
    const quickSortFnExists = await qs.quickSortExists();
    const partitionFnExists = await qs.partitionExists();
    expect(quickSortFnExists).toBe(true);
    expect(partitionFnExists).toBe(true);

    // Click the start button to sort
    await qs.clickStart();

    // After clicking, the bars' text content should reflect a sorted ascending array
    const sortedValues = await qs.getBarValues();
    // The sorted result of [20,15,10,60,5,30,40] is [5,10,15,20,30,40,60]
    expect(sortedValues).toEqual([5, 10, 15, 20, 30, 40, 60]);

    // Heights should also update to the sorted values (value*5 px)
    const heightsAfter = await qs.getBarHeights();
    const expectedHeightsAfter = sortedValues.map((v) => `${v * 5}px`);
    expect(heightsAfter).toEqual(expectedHeightsAfter);

    // Clicking the button again should not introduce errors and should keep the array sorted
    await qs.clickStart();
    const valuesAfterSecondClick = await qs.getBarValues();
    expect(valuesAfterSecondClick).toEqual([5, 10, 15, 20, 30, 40, 60]);

    // No runtime page errors should have occurred during interactions
    expect(pageErrors.length).toBe(0);

    // No console.error messages during interactions
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test visual and accessibility properties of the controls and bars
  test('Visual feedback and accessibility: bars have expected classes and button accessible name', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.goto();

    // Bars should have the 'bar' class
    const count = await qs.bars().count();
    for (let i = 0; i < count; i++) {
      const className = await qs.bars().nth(i).getAttribute('class');
      expect(className).toContain('bar');
    }

    // The start button should have accessible name 'Start Sorting' (text content)
    const buttonText = await qs.startButton.textContent();
    expect(buttonText?.trim()).toBe('Start Sorting');

    // The button should be reachable and clickable (no exception when clicking)
    await qs.clickStart();

    // No page errors or console errors observed
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test resilience: multiple interactions should not introduce runtime exceptions
  test('Multiple interactions do not produce runtime exceptions', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.goto();

    // Perform multiple clicks in sequence, simulating repeated user interactions
    for (let i = 0; i < 5; i++) {
      await qs.clickStart();
    }

    // Verify array remains sorted after repeated clicks
    const values = await qs.getBarValues();
    expect(values).toEqual([5, 10, 15, 20, 30, 40, 60]);

    // Assert that there were no uncaught exceptions during the repeated interactions
    expect(pageErrors.length).toBe(0);

    // Assert there were no console.error messages
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Final check: inspect collected console messages and page errors (if any), provide detailed assertion output
  test('No unexpected console errors or page exceptions were emitted during the test suite run', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.goto();

    // Trigger a couple of interactions
    await qs.clickStart();

    // Ensure collected arrays reflect no errors
    expect(pageErrors.length).toBe(0);

    // If there are console messages, none should be of type 'error'
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // For debugging clarity, assert that if there are console messages they are simple informational logs
    const nonErrorConsole = consoleMessages.filter((m) => m.type !== 'error');
    // It's acceptable for this app to have no console logs; if there are logs, ensure they are not errors
    expect(nonErrorConsole.length).toBeGreaterThanOrEqual(0);
  });
});
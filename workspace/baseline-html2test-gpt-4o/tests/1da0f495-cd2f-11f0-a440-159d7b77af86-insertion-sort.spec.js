import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f495-cd2f-11f0-a440-159d7b77af86.html';

// Helper page object for the Insertion Sort visualization
class InsertionSortPage {
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array';
    this.barSelector = '.bar';
    this.sortButtonSelector = 'button:has-text("Sort Array")';
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the array container exists
    await this.page.waitForSelector(this.arraySelector);
  }

  // Return text content of all bars as array of strings
  async getBarValues() {
    return await this.page.$$eval(this.barSelector, bars => bars.map(b => b.innerText.trim()));
  }

  // Return heights (CSS height value) of all bars (like "100px")
  async getBarHeights() {
    return await this.page.$$eval(this.barSelector, bars => bars.map(b => b.style.height));
  }

  // Click the Sort Array button
  async clickSort() {
    const btn = await this.page.waitForSelector(this.sortButtonSelector);
    await btn.click();
  }

  // Wait until the bar values match the expected array (strings), or timeout
  async waitForBarValues(expectedValues, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const values = await this.getBarValues();
      if (values.length === expectedValues.length) {
        let allMatch = true;
        for (let i = 0; i < values.length; i++) {
          if (values[i] !== expectedValues[i]) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) return true;
      }
      await this.page.waitForTimeout(150);
    }
    throw new Error(`Timed out waiting for bar values to equal ${JSON.stringify(expectedValues)}`);
  }

  // Capture snapshots of the bar values at regular intervals until finalMatch or timeout
  async captureProgressSnapshots(finalMatch, intervalMs = 300, timeout = 8000) {
    const snapshots = [];
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const values = await this.getBarValues();
      snapshots.push(values);
      if (values.length === finalMatch.length) {
        let allMatch = true;
        for (let i = 0; i < values.length; i++) {
          if (values[i] !== finalMatch[i]) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) break;
      }
      await this.page.waitForTimeout(intervalMs);
    }
    return snapshots;
  }
}

test.describe('Insertion Sort Visualization - UI and behavior', () => {
  // Collect console messages and page errors for each test to assert no runtime errors occurred.
  test.beforeEach(async ({ page }) => {
    // No-op placeholder; actual setup done in tests using page object.
  });

  test('Initial page load displays the correct number of bars with correct values and heights', async ({ page }) => {
    // Purpose: Verify initial DOM matches the array defined in the app.
    const app = new InsertionSortPage(page);

    // Listen for console messages and page errors (we'll assert none occur later in the test)
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await app.goto();

    // Verify sort button is present and enabled
    const sortButton = await page.waitForSelector(app.sortButtonSelector);
    expect(sortButton).toBeTruthy();
    expect(await sortButton.isDisabled()).toBeFalsy();

    // Initial array expected from the HTML: [5, 2, 9, 1, 5, 6]
    const expectedInitial = ['5', '2', '9', '1', '5', '6'];

    // Verify number of bars and their values
    const values = await app.getBarValues();
    expect(values).toEqual(expectedInitial);

    // Verify heights correlate with value * 20px
    const heights = await app.getBarHeights();
    const expectedHeights = expectedInitial.map(v => `${Number(v) * 20}px`);
    expect(heights).toEqual(expectedHeights);

    // Assert that no page errors were emitted
    expect(pageErrors).toEqual([]);
    // Assert that there are no console errors indicating runtime exceptions
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(consoleErrorMsgs).toEqual([]);
  });

  test('Clicking "Sort Array" sorts the array to ascending order and updates DOM heights accordingly', async ({ page }) => {
    // Purpose: Ensure clicking the sort button triggers the sorting algorithm and results in sorted DOM.
    const app = new InsertionSortPage(page);

    // Track console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await app.goto();

    // Click the sort button to start the visualization. This will run asynchronous steps with delays.
    await app.clickSort();

    // Wait for final sorted state: [1,2,5,5,6,9]
    const expectedFinal = ['1', '2', '5', '5', '6', '9'];
    await app.waitForBarValues(expectedFinal, 12000); // allow enough time for animation

    // After sorting, verify the DOM shows values in ascending order
    const finalValues = await app.getBarValues();
    expect(finalValues).toEqual(expectedFinal);

    // Verify heights updated to correspond to sorted values
    const finalHeights = await app.getBarHeights();
    const expectedFinalHeights = expectedFinal.map(v => `${Number(v) * 20}px`);
    expect(finalHeights).toEqual(expectedFinalHeights);

    // Assert there were no uncaught page errors (ReferenceError, TypeError, etc.)
    expect(pageErrors).toEqual([]);
    // Assert no console.error messages were emitted
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(consoleErrorMsgs).toEqual([]);
  });

  test('Sorting progresses stepwise (intermediate visual states are produced)', async ({ page }) => {
    // Purpose: Capture snapshots during sorting and assert that intermediate states exist between initial and final.
    const app = new InsertionSortPage(page);

    // Track console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await app.goto();

    // Capture initial state
    const initial = await app.getBarValues();
    expect(initial).toEqual(['5', '2', '9', '1', '5', '6']);

    // Start sorting
    await app.clickSort();

    // Capture snapshots while sorting until final state observed
    const expectedFinal = ['1', '2', '5', '5', '6', '9'];
    const snapshots = await app.captureProgressSnapshots(expectedFinal, 250, 10000);

    // There should be at least one snapshot (initial) and the final snapshot should equal expectedFinal (or be included)
    expect(snapshots.length).toBeGreaterThanOrEqual(1);

    // Find whether initial and final distinct snapshots exist in captured sequence
    const hasInitial = snapshots.some(s => JSON.stringify(s) === JSON.stringify(initial));
    const hasFinal = snapshots.some(s => JSON.stringify(s) === JSON.stringify(expectedFinal));
    expect(hasInitial).toBeTruthy();
    expect(hasFinal).toBeTruthy();

    // Ensure at least one intermediate different state exists (i.e., not all snapshots identical)
    const allSame = snapshots.every(s => JSON.stringify(s) === JSON.stringify(initial));
    expect(allSame).toBeFalsy();

    // Assert there were no uncaught page errors
    expect(pageErrors).toEqual([]);
    // Assert no console.error messages were emitted
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(consoleErrorMsgs).toEqual([]);
  });

  test('Clicking the sort button multiple times does not cause uncaught errors and results remain sorted', async ({ page }) => {
    // Purpose: Validate the app handles repeated interactions (clicking sort multiple times) gracefully.
    const app = new InsertionSortPage(page);

    // Track console messages and page errors across interactions
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await app.goto();

    // Click sort first time
    await app.clickSort();
    const expectedFinal = ['1', '2', '5', '5', '6', '9'];
    await app.waitForBarValues(expectedFinal, 12000);

    // Click sort again while already sorted
    await app.clickSort();
    // Since array is already sorted, final state should remain sorted after the animation runs
    await app.waitForBarValues(expectedFinal, 8000);

    // Verify final state remains sorted
    const valuesAfterSecond = await app.getBarValues();
    expect(valuesAfterSecond).toEqual(expectedFinal);

    // No uncaught page errors should have occurred
    expect(pageErrors).toEqual([]);
    // No console.error messages should have been emitted
    const consoleErrorMsgs = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    expect(consoleErrorMsgs).toEqual([]);
  });
});
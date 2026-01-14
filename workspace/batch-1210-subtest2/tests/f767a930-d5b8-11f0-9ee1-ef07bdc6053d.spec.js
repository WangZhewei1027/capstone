import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767a930-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Heap Sort Visualization app
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.button = page.locator('button[onclick="heapSortDemo()"]');
    this.container = page.locator('#arrayContainer');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  async fillInput(value) {
    await this.input.fill('');
    if (value !== '') {
      await this.input.fill(value);
    }
  }

  async clickSort() {
    // Use the visible button click
    await this.button.click();
  }

  // Return array of numeric heights (px)
  async getBarHeightsPx() {
    return await this.page.$$eval('#arrayContainer .bar', bars =>
      bars.map(b => {
        const h = window.getComputedStyle(b).height;
        return parseFloat(h);
      })
    );
  }

  // Return array of numeric values (derived by dividing px height by 5 per implementation)
  async getBarValuesDerived() {
    const heights = await this.getBarHeightsPx();
    return heights.map(h => Math.round(h / 5));
  }

  async getBarCount() {
    return await this.page.locator('#arrayContainer .bar').count();
  }

  async isContainerEmpty() {
    const count = await this.getBarCount();
    return count === 0;
  }
}

test.describe('Heap Sort Visualization FSM and UI behavior', () => {
  // We'll collect console errors and page errors to assert none (ReferenceError/SyntaxError/TypeError)
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // After each test we assert there are no severe runtime errors captured.
    // We specifically look for ReferenceError, SyntaxError, TypeError occurrences.
    const errorTexts = consoleErrors.map(e => e.text).concat(pageErrors.map(e => String(e)));
    const foundCritical = errorTexts.filter(t =>
      t.includes('ReferenceError') || t.includes('SyntaxError') || t.includes('TypeError')
    );
    // Assert none of those fatal JS errors occurred during the test.
    expect(foundCritical, `Unexpected JS errors in console/pageerror: ${JSON.stringify(errorTexts, null, 2)}`).toEqual([]);
  });

  test('Initial Idle state: page renders input, button and empty array container', async ({ page }) => {
    // Validate initial render (S0_Idle entry action: renderPage())
    const app = new HeapSortPage(page);
    await app.goto();

    // Input should be visible with correct placeholder
    await expect(app.input).toBeVisible();
    await expect(app.input).toHaveAttribute('placeholder', 'Enter numbers separated by commas');

    // Sort button should be visible with correct text
    await expect(app.button).toBeVisible();
    await expect(app.button).toHaveText('Sort with Heap Sort');

    // Array container should initially be empty (no bars)
    expect(await app.isContainerEmpty()).toBeTruthy();
  });

  test('Valid input triggers visualization and final sorted result (S0 -> S1 -> S2 -> S3)', async ({ page }) => {
    // This test validates:
    // - Entering valid comma-separated numbers and clicking Sort triggers the visualization.
    // - Final array is sorted (heapSort completed).
    // - drawArray was used to visualize results (bars exist).
    const app = new HeapSortPage(page);
    await app.goto();

    // Provide input
    const inputNumbers = [5, 3, 8, 1];
    await app.fillInput(inputNumbers.join(','));

    // Click sort and wait for the DOM to show bars
    await Promise.all([
      // Perform click
      app.clickSort(),
      // Wait for at least one bar to appear (should be final sorted result after synchronous heapSort)
      page.waitForSelector('#arrayContainer .bar', { state: 'attached' })
    ]);

    // Check bar count equals input length
    const barCount = await app.getBarCount();
    expect(barCount).toBe(inputNumbers.length);

    // The algorithm implemented produces a sorted array in ascending order.
    // Derived values should be sorted ascending: [1,3,5,8]
    const derivedValues = await app.getBarValuesDerived();
    const expectedSorted = [...inputNumbers].sort((a, b) => a - b);
    expect(derivedValues).toEqual(expectedSorted);

    // Check bars have 'bar' class and non-zero heights
    const heightsPx = await app.getBarHeightsPx();
    for (const h of heightsPx) {
      expect(h).toBeGreaterThan(0);
    }
  });

  test('Empty input shows validation alert and stays in Idle (S1 -> S0 via InputValidationFailed)', async ({ page }) => {
    // This test validates that clicking Sort with empty input triggers the expected alert
    // and does not render any bars (remains idle).
    const app = new HeapSortPage(page);
    await app.goto();

    // Ensure input empty
    await app.fillInput('');

    // Listen for dialog once and assert text
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickSort()
    ]);

    expect(dialog.message()).toBe('Please enter numbers separated by commas.');
    await dialog.dismiss();

    // Ensure container remains empty after dismissing alert
    expect(await app.isContainerEmpty()).toBeTruthy();
  });

  test('Invalid numeric input shows invalid input alert and no visualization (S1 -> S0 via InputValidationFailed)', async ({ page }) => {
    // This test validates that invalid inputs (no valid numbers) trigger the 'Invalid input' alert.
    const app = new HeapSortPage(page);
    await app.goto();

    // Fill with non-numeric tokens
    await app.fillInput('foo,bar, ,baz');

    // Wait for dialog and assert message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickSort()
    ]);

    expect(dialog.message()).toBe('Invalid input. Please enter valid numbers.');
    await dialog.dismiss();

    // Ensure container remains empty
    expect(await app.isContainerEmpty()).toBeTruthy();
  });

  test('Visualization reflects numeric magnitudes via bar heights and preserves the number of elements', async ({ page }) => {
    // This test ensures that bar heights are proportional to the numeric values (height = value * 5 px)
    const app = new HeapSortPage(page);
    await app.goto();

    const numbers = [2, 10, 4];
    await app.fillInput(numbers.join(','));

    await Promise.all([
      app.clickSort(),
      page.waitForSelector('#arrayContainer .bar', { state: 'attached' })
    ]);

    // Derived values should match sorted array (ascending)
    const derived = await app.getBarValuesDerived();

    // The final derived values are sorted ascending
    expect(derived).toEqual([...numbers].sort((a, b) => a - b));

    // Validate height formula: each bar height px divided by 5 equals integer value
    const heightsPx = await app.getBarHeightsPx();
    heightsPx.forEach((h, idx) => {
      const expectedValue = derived[idx];
      // allow small floating rounding tolerance
      expect(Math.abs(h / 5 - expectedValue)).toBeLessThan(0.5);
    });
  });

  test('No unexpected ReferenceError, SyntaxError, or TypeError in console/pageerror during typical interactions', async ({ page }) => {
    // This test explicitly runs a sequence of interactions to make sure no fatal JS errors appear
    const app = new HeapSortPage(page);
    await app.goto();

    // Perform multiple interactions: valid sort, invalid input, empty input
    // 1) valid sort
    await app.fillInput('7,2,9');
    await Promise.all([app.clickSort(), page.waitForSelector('#arrayContainer .bar')]);

    // 2) invalid input
    await app.fillInput('a,b,c');
    const invalidDialog = await Promise.all([page.waitForEvent('dialog'), app.clickSort()]);
    // invalidDialog is the dialog object in an array; use destructuring
    expect((invalidDialog[0]).message()).toBe('Invalid input. Please enter valid numbers.');
    await (invalidDialog[0]).dismiss();

    // 3) empty input
    await app.fillInput('');
    const emptyDialog = await Promise.all([page.waitForEvent('dialog'), app.clickSort()]);
    expect((emptyDialog[0]).message()).toBe('Please enter numbers separated by commas.');
    await (emptyDialog[0]).dismiss();

    // After interactions, the afterEach hook will assert absence of ReferenceError/SyntaxError/TypeError.
    // We add a soft assertion here that we captured zero pageErrors so far (will be re-checked in afterEach).
    expect(pageErrors.length).toBeLessThan(1); // soft check; actual strict check happens in afterEach
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f498-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Heap Sort app
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.sortButton = page.locator('button', { hasText: 'Sort' });
    this.container = page.locator('#array-container');
    this.elementSelector = '.array-element';
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input with the provided string
  async enterInput(value) {
    await this.input.fill(value);
  }

  // Click the Sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Get array element texts as array of strings
  async getArrayElementsText() {
    const elements = await this.page.locator(this.elementSelector).all();
    const texts = [];
    for (const el of elements) {
      texts.push((await el.innerText()).trim());
    }
    return texts;
  }

  // Count of array elements
  async getArrayElementsCount() {
    return await this.page.locator(this.elementSelector).count();
  }
}

test.describe('Heap Sort Visualization App - Comprehensive Tests', () => {
  // Capture console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Nothing to setup globally here; individual tests will create Page Object and navigate
  });

  // Test: initial load and default state
  test('Initial page load shows correct static elements and empty array container', async ({ page }) => {
    // Purpose: Verify static content and that no array elements are present initially
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Verify the page title and header text are present
    await expect(page).toHaveTitle(/Heap Sort Visualization/);
    await expect(page.locator('h1')).toHaveText('Heap Sort Visualization');

    // Verify input and button exist and are visible
    await expect(heapPage.input).toBeVisible();
    await expect(heapPage.sortButton).toBeVisible();
    await expect(heapPage.sortButton).toHaveText('Sort');

    // Verify that no array elements are present initially
    const initialCount = await heapPage.getArrayElementsCount();
    expect(initialCount).toBe(0);

    // Assert that there were no runtime page errors or console error messages on load
    expect(pageErrors.length, `No page errors should occur on initial load. Errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `No console.error messages should appear on initial load. Errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  // Test: sorting a normal numeric array results in ascending order
  test('Sorting numeric array displays sorted elements in ascending order', async ({ page }) => {
    // Purpose: Ensure that entering a numeric list and clicking Sort shows a sorted ascending array
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Enter a sample unsorted list and click Sort
    await heapPage.enterInput('3,1,4,2');
    await heapPage.clickSort();

    // Wait for array elements to be rendered
    await page.waitForSelector(heapPage.elementSelector);

    // Verify that container now has 4 elements and they are sorted ascending
    const texts = await heapPage.getArrayElementsText();
    expect(texts).toEqual(['1', '2', '3', '4']);

    // Ensure no runtime errors happened during this interaction
    expect(pageErrors.length, `No page errors should occur during numeric sort. Errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `No console.error messages should appear during numeric sort. Errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  // Test: sorting with spaces and duplicate values
  test('Sorting handles spaces and duplicate values correctly', async ({ page }) => {
    // Purpose: Validate parsing (including whitespace) and correct ordering with duplicates
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Input contains spaces and duplicates
    await heapPage.enterInput('5, 1,5, 3');
    await heapPage.clickSort();

    await page.waitForSelector(heapPage.elementSelector);

    // Expected sorted ascending with duplicates preserved: 1,3,5,5
    const texts = await heapPage.getArrayElementsText();
    expect(texts).toEqual(['1', '3', '5', '5']);

    // Ensure no runtime errors
    expect(pageErrors.length, `No page errors should occur during duplicate/special-space sort. Errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `No console.error messages should appear during duplicate/special-space sort. Errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  // Test: empty input edge case
  test('Empty input results in a single element (0) due to Number("") === 0', async ({ page }) => {
    // Purpose: Validate behavior for empty input string (edge case of parsing)
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Empty input
    await heapPage.enterInput('');
    await heapPage.clickSort();

    await page.waitForSelector(heapPage.elementSelector);

    // The implementation splits '' into [''] and Number('') === 0, so expect a single '0'
    const texts = await heapPage.getArrayElementsText();
    expect(texts).toEqual(['0']);
    expect(await heapPage.getArrayElementsCount()).toBe(1);

    // No runtime errors should have occurred
    expect(pageErrors.length, `No page errors should occur for empty input. Errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `No console.error messages should appear for empty input. Errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  // Test: invalid non-numeric input produces NaN entries visible in the DOM
  test('Non-numeric input displays "NaN" for invalid values and does not crash', async ({ page }) => {
    // Purpose: Ensure that invalid numbers (e.g., "a") produce NaN text nodes and do not cause runtime errors
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Provide non-numeric input
    await heapPage.enterInput('a,b');
    await heapPage.clickSort();

    await page.waitForSelector(heapPage.elementSelector);

    // Expect two elements showing 'NaN' (Number('a') === NaN -> innerText becomes 'NaN')
    const texts = await heapPage.getArrayElementsText();
    expect(texts).toEqual(['NaN', 'NaN']);
    expect(await heapPage.getArrayElementsCount()).toBe(2);

    // Ensure the page did not throw runtime errors
    expect(pageErrors.length, `No page errors should occur for non-numeric input. Errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `No console.error messages should appear for non-numeric input. Errors: ${consoleErrors.join('; ')}`).toBe(0);
  });

  // Test: multiple sequential interactions don't cause errors and update DOM accordingly
  test('Multiple sequential sorts update DOM correctly and remain stable', async ({ page }) => {
    // Purpose: Ensure repeated user interactions work and the app remains stable without throwing errors
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // First sort
    await heapPage.enterInput('10,2,8');
    await heapPage.clickSort();
    await page.waitForSelector(heapPage.elementSelector);
    expect(await heapPage.getArrayElementsText()).toEqual(['2', '8', '10']);

    // Second sort with different data
    await heapPage.enterInput('7,7,1,9');
    await heapPage.clickSort();
    await page.waitForSelector(heapPage.elementSelector);
    expect(await heapPage.getArrayElementsText()).toEqual(['1', '7', '7', '9']);

    // Third sort: single element
    await heapPage.enterInput('42');
    await heapPage.clickSort();
    await page.waitForSelector(heapPage.elementSelector);
    expect(await heapPage.getArrayElementsText()).toEqual(['42']);

    // No runtime errors should have occurred during these repeated interactions
    expect(pageErrors.length, `No page errors should occur during sequential interactions. Errors: ${pageErrors.join('; ')}`).toBe(0);
    expect(consoleErrors.length, `No console.error messages should appear during sequential interactions. Errors: ${consoleErrors.join('; ')}`).toBe(0);
  });
});
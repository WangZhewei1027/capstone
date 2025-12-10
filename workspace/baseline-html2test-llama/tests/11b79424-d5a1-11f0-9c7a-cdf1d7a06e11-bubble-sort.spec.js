import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79424-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object model for the Bubble Sort page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numberInput = page.locator('#number');
    this.sortButton = page.locator('#sort-btn');
    this.clearButton = page.locator('#clear-btn');
    this.output = page.locator('#output');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Set the value of the input element. Use page.evaluate to ensure we can set non-numeric strings
  async setInputValue(value) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('number');
      // Directly set the value property to support JSON-like strings even though input type=number
      el.value = v;
    }, value);
  }

  // Click the Sort button (user interaction)
  async clickSort() {
    await this.sortButton.click();
  }

  // Click the Clear button (user interaction)
  async clickClear() {
    await this.clearButton.click();
  }

  // Get the raw HTML content of the output container
  async getOutputInnerHTML() {
    return await this.page.evaluate(() => document.getElementById('output').innerHTML);
  }

  // Get the textContent of the output (newline separated)
  async getOutputText() {
    return await this.page.evaluate(() => document.getElementById('output').innerText);
  }

  // Read the global 'array' variable from the page (used to validate internal state)
  async getGlobalArray() {
    return await this.page.evaluate(() => window.array);
  }
}

test.describe('Bubble Sort App - End-to-End Tests', () => {
  // Collect uncaught page errors for each test to allow assertions about runtime exceptions
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', (err) => {
      // Capture the error object for assertions in tests
      pageErrors.push(err);
    });
    // Navigate to the application before each test
    const app = new BubbleSortPage(page);
    await app.goto();
  });

  test('Initial load: page structure and default state', async ({ page }) => {
    // Purpose: Verify initial DOM elements, visibility and default empty output
    const app1 = new BubbleSortPage(page);

    // Title and header
    await expect(page).toHaveTitle(/Bubble Sort/);
    const header = page.locator('h1');
    await expect(header).toHaveText('Bubble Sort');

    // Input and buttons visible
    await expect(app.numberInput).toBeVisible();
    await expect(app.sortButton).toBeVisible();
    await expect(app.clearButton).toBeVisible();

    // Buttons have expected labels
    await expect(app.sortButton).toHaveText('Sort');
    await expect(app.clearButton).toHaveText('Clear');

    // Output is present and initially empty
    await expect(app.output).toBeVisible();
    const initialOutput = await app.getOutputInnerHTML();
    expect(initialOutput).toBe('', 'Expected initial output container to be empty');

    // Wait a short time to ensure no runtime errors happen on load
    await page.waitForTimeout(100);
    expect(pageErrors.length).toBe(0, `No page errors expected on initial load, but found: ${pageErrors.map(e => e.message).join(' | ')}`);
  });

  test('Clicking Sort with empty input produces a SyntaxError from JSON.parse', async ({ page }) => {
    // Purpose: Validate behavior and error handling when input is empty (invalid JSON)
    const app2 = new BubbleSortPage(page);

    // Ensure input is empty
    await app.setInputValue('');

    // Clicking Sort should cause a runtime exception due to JSON.parse('')
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      app.clickSort()
    ]);

    // The error should be a SyntaxError related to JSON parsing
    expect(error).toBeDefined();
    const msg = error.message || '';
    expect(msg.toLowerCase()).toContain('syntaxerror') || expect(msg.toLowerCase()).toContain('unexpected end');
    // Output should remain empty after the failed attempt
    const out = await app.getOutputInnerHTML();
    expect(out).toBe('', 'Output should remain empty when sorting fails due to invalid input');
  });

  test('Clicking Sort with numeric input (e.g., 123) leads to TypeError when code expects an array', async ({ page }) => {
    // Purpose: Verify the app throws a runtime error when JSON parses to a primitive (number),
    // which later leads to array.forEach is not a function
    const app3 = new BubbleSortPage(page);

    // Set input to a numeric JSON (this will parse 123)
    await app.setInputValue('123');

    // Trigger the sort and capture the uncaught exception
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      app.clickSort()
    ]);

    expect(error).toBeDefined();
    const msg1 = error.message || '';
    // The implementation tries to call array.forEach on what becomes a number -> TypeError
    expect(msg.toLowerCase()).toContain('typeerror') || expect(msg.toLowerCase()).toContain('not a function');

    // Inspect global array variable to confirm that the handler attempted to assign the parsed value
    const globalArray = await app.getGlobalArray();
    // Because parsed JSON is the number 123, the global array should now be that number (or at least non-array)
    expect(typeof globalArray === 'number' || Array.isArray(globalArray) === false).toBeTruthy();
  });

  test('Clicking Sort with a valid JSON array sorts the array and updates DOM', async ({ page }) => {
    // Purpose: Validate successful flow for correct input (JSON array string)
    const app4 = new BubbleSortPage(page);

    // Provide a JSON string representing an array; using evaluate to set value regardless of input type
    await app.setInputValue('[3,1,2]');

    // Click Sort - this should not throw an uncaught pageerror
    await app.clickSort();

    // Wait briefly for DOM updates
    await page.waitForTimeout(100);

    // There should be no page errors recorded for this operation
    expect(pageErrors.length).toBe(0, `No runtime errors expected when sorting a valid array, errors: ${pageErrors.map(e => e.message).join(' | ')}`);

    // The output element should contain the sorted values in ascending order, each followed by <br>
    const outputHTML = await app.getOutputInnerHTML();
    expect(outputHTML).toBe('1<br>2<br>3<br>', 'Output HTML should contain sorted elements each followed by <br>');

    // Also verify the visible text content (line breaks)
    const outputText = await app.getOutputText();
    // The innerText will typically show new lines between items
    expect(outputText.replace(/\r/g, '')).toBe('1\n2\n3');

    // Verify internal global array reflects the sorted array
    const globalArray1 = await app.getGlobalArray();
    expect(Array.isArray(globalArray)).toBe(true);
    expect(globalArray).toEqual([1, 2, 3]);
  });

  test('Clear button empties the output and resets internal array state', async ({ page }) => {
    // Purpose: Confirm clear button behavior after a successful sort
    const app5 = new BubbleSortPage(page);

    // First perform a valid sort
    await app.setInputValue('[5,4,6]');
    await app.clickSort();
    await page.waitForTimeout(100);

    // Ensure output was populated
    let outputBeforeClear = await app.getOutputInnerHTML();
    expect(outputBeforeClear).toBeTruthy();

    // Click Clear and verify output is cleared
    await app.clickClear();
    await page.waitForTimeout(50);
    const outputAfterClear = await app.getOutputInnerHTML();
    expect(outputAfterClear).toBe('', 'After clicking Clear, the output container should be empty');

    // Verify that the global array was reset to an empty array
    const globalArrayAfterClear = await app.getGlobalArray();
    expect(Array.isArray(globalArrayAfterClear)).toBe(true);
    expect(globalArrayAfterClear).toEqual([]);
  });
});
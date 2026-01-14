import { test, expect } from '@playwright/test';

// Page object model for the Counting Sort page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.sortButton = page.locator('#sortButton');
    this.result = page.locator('#result');
    this.canvas = page.locator('#sortCanvas');
    this.title = page.locator('h1');
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async enterArray(text) {
    await this.input.fill(text);
  }

  async clickSort() {
    await this.sortButton.click();
  }

  // Retrieve canvas as a data URL (PNG)
  async getCanvasDataUrl() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('sortCanvas');
      // toDataURL should work on a same-origin canvas
      return canvas.toDataURL();
    });
  }

  async getResultText() {
    return await this.result.textContent();
  }
}

test.describe('Counting Sort Visualization - 0888fdb8-d59e-11f0-b3ae-79d1ce7b5503', () => {
  const url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb8-d59e-11f0-b3ae-79d1ce7b5503.html';
  let pageObject;

  test.beforeEach(async ({ page }) => {
    // Navigate to the page before each test
    pageObject = new CountingSortPage(page);
    await pageObject.goto(url);
  });

  test.afterEach(async ({ page }) => {
    // Ensure no leftover dialogs or handlers remain
    // (No explicit teardown required beyond navigation in beforeEach)
    await page.close();
  });

  test('Initial page load shows title, input, button, empty result and canvas present', async ({ page }) => {
    // Verify page title text and presence of interactive elements
    await expect(pageObject.title).toHaveText('Counting Sort Visualization');

    // Input field should be visible and contain placeholder
    await expect(pageObject.input).toBeVisible();
    await expect(pageObject.input).toHaveAttribute('placeholder', 'e.g., 4,2,2,8,3,3,1');

    // Sort button should be visible and enabled
    await expect(pageObject.sortButton).toBeVisible();
    await expect(pageObject.sortButton).toBeEnabled();

    // Result container should exist and be empty initially
    await expect(pageObject.result).toBeVisible();
    const initialResult = await pageObject.getResultText();
    expect(initialResult).toBe('', 'Result area should be empty on initial load');

    // Canvas should be present with expected dimensions and be accessible
    await expect(pageObject.canvas).toBeVisible();
    const canvasWidth = await page.evaluate(() => document.getElementById('sortCanvas').width);
    const canvasHeight = await page.evaluate(() => document.getElementById('sortCanvas').height);
    expect(canvasWidth).toBeGreaterThan(0);
    expect(canvasHeight).toBeGreaterThan(0);
  });

  test('Sorts valid input and updates result text and canvas visuals', async ({ page }) => {
    // This test verifies a normal user flow: entering valid numbers, clicking Sort,
    // checking the sorted result text and that the canvas visual changes after the 3s delay.

    // Prepare to capture console errors and ensure none occur for this valid scenario
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Enter valid input and click sort
    await pageObject.enterArray('4,2,2,8,3,3,1');
    // Capture the canvas state before clicking (initial blank)
    const beforeClickDataUrl = await pageObject.getCanvasDataUrl();

    await pageObject.clickSort();

    // Immediately after click, the algorithm updates #result synchronously in countingSort
    await expect.poll(async () => await pageObject.getResultText(), {
      timeout: 2000,
      message: 'Waiting for result text to be set by countingSort'
    }).toEqual('1, 2, 2, 3, 3, 4, 8');

    const resultText = await pageObject.getResultText();
    expect(resultText).toBe('1, 2, 2, 3, 3, 4, 8');

    // Capture canvas after immediate drawing of count arrays (they draw synchronously)
    const afterCountDrawDataUrl = await pageObject.getCanvasDataUrl();
    expect(afterCountDrawDataUrl).toBeTruthy();
    // The canvas should have changed from its blank state (before click)
    expect(afterCountDrawDataUrl).not.toBe(beforeClickDataUrl);

    // Wait for the delayed drawSortedArray (3000 ms in implementation) and then confirm canvas changed
    await page.waitForTimeout(3500); // wait slightly longer than 3000 ms timeout in app
    const afterSortedDrawDataUrl = await pageObject.getCanvasDataUrl();
    expect(afterSortedDrawDataUrl).toBeTruthy();

    // After the delayed draw, the canvas should be different from the earlier count-draw
    expect(afterSortedDrawDataUrl).not.toBe(afterCountDrawDataUrl);

    // Ensure no pageerrors occurred for this valid input scenario
    expect(pageErrors.length).toBe(0);
  });

  test('Empty input behavior: clicking Sort with empty input produces a result', async ({ page }) => {
    // This test checks the behavior when the user clicks Sort with an empty input.
    // Based on the application code, empty string splits to [''], Number('') === 0,
    // so we expect the result to become "0".

    await pageObject.enterArray('');
    await pageObject.clickSort();

    // The result should be set synchronously; assert expected behavior
    await expect.poll(async () => await pageObject.getResultText(), {
      timeout: 2000,
      message: 'Waiting for result to appear for empty input'
    }).toEqual('0');

    const resultText1 = await pageObject.getResultText();
    expect(resultText).toBe('0');
  });

  test('Invalid input (non-numeric) triggers a runtime page error', async ({ page }) => {
    // This test ensures that invalid input like "a,b" is passed through the existing code
    // and that any runtime error that occurs is surfaced as a page 'pageerror' event.
    // Per requirements, we must observe and assert that such errors can occur naturally.

    // Set up a promise to capture the first page error
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      (async () => {
        // Enter invalid, non-numeric input and trigger sort
        await pageObject.enterArray('a,b');
        await pageObject.clickSort();
      })()
    ]);

    // The error should be an Error object with a message; assert that we received it.
    expect(error).toBeTruthy();
    expect(typeof error.message).toBe('string');
    expect(error.message.length).toBeGreaterThan(0);

    // The exact error type may vary by runtime/environment (RangeError/TypeError/etc.)
    // Assert that the error name is a non-empty string.
    expect(typeof error.name).toBe('string');
    expect(error.name.length).toBeGreaterThan(0);
  });

  test('Interactive elements accessibility: label is associated with input', async ({ page }) => {
    // Confirm that the label for the input has a for attribute pointing to the input id
    // and that we can focus the input by clicking the label (basic accessibility check).

    // Find the label element text
    const label = page.locator('label[for="arrayInput"]');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('Enter array elements (comma separated):');

    // Click the label and ensure the input receives focus
    await label.click();
    const hasFocus = await page.evaluate(() => document.activeElement.id === 'arrayInput');
    expect(hasFocus).toBe(true);
  });
});
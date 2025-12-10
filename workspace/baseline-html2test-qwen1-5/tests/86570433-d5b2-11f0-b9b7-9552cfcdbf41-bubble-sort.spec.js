import { test, expect } from '@playwright/test';

// Page Object for the Bubble Sort page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.header = page.locator('h1');
    this.description = page.locator('p');
    this.resultDiv = page.locator('#bubbleSort');
  }

  // Navigate to the page URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/86570433-d5b2-11f0-b9b7-9552cfcdbf41.html');
  }

  // Get the visible text content of the result div
  async getResultText() {
    return (await this.resultDiv.textContent())?.trim() ?? '';
  }

  // Call the bubbleSort function on the page with a provided array and return the value
  async callBubbleSort(inputArray) {
    // The array will be structured-cloned into the page context
    return await this.page.evaluate((arr) => {
      // bubbleSort is expected to be defined on the page
      return bubbleSort(arr);
    }, inputArray);
  }
}

test.describe('Bubble Sort application tests', () => {
  // Shared variables to collect console and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Set up a fresh page and event listeners before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and mark error-level messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text() });
      }
    });

    // Capture page errors (uncaught exceptions in the page)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Page loads and displays the sorted array by default', async ({ page }) => {
    const app = new BubbleSortPage(page);
    // Navigate to the page as-is (do not modify or patch)
    await app.goto();

    // Verify header text is present and visible
    await expect(app.header).toBeVisible();
    await expect(app.header).toHaveText('Bubble Sort');

    // Verify description paragraph exists
    await expect(app.description).toBeVisible();
    await expect(app.description).toContainText('Bubble sort is an algorithm');

    // Verify the result div shows the expected sorted array content
    const result = await app.getResultText();
    expect(result).toBe('Sorted array: 1,2,3,4,5,6');

    // Verify that there are no console errors or page errors emitted during load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that there are no interactive controls (buttons/inputs/forms) on the page
  test('No interactive controls are present on the page', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Count common interactive elements
    const buttonCount = await page.locator('button').count();
    const inputCount = await page.locator('input').count();
    const formCount = await page.locator('form').count();
    const selectCount = await page.locator('select').count();
    const textareaCount = await page.locator('textarea').count();

    // This HTML contains no interactive controls, assert counts are zero
    expect(buttonCount).toBe(0);
    expect(inputCount).toBe(0);
    expect(formCount).toBe(0);
    expect(selectCount).toBe(0);
    expect(textareaCount).toBe(0);
  });

  // Test the bubbleSort function for a variety of valid inputs and ensure correct behavior
  test('bubbleSort function sorts arrays and mutates arrays in-place as expected', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Simple ascending test
    const sorted123 = await app.callBubbleSort([3, 2, 1]);
    expect(sorted123).toEqual([1, 2, 3]);

    // Single element and empty array edge cases
    const sortedSingle = await app.callBubbleSort([42]);
    expect(sortedSingle).toEqual([42]);
    const sortedEmpty = await app.callBubbleSort([]);
    expect(sortedEmpty).toEqual([]);

    // Test stable behavior with duplicates and negative numbers
    const input = [0, -1, 5, 5, 3];
    const result = await app.callBubbleSort(input);
    expect(result).toEqual([-1, 0, 3, 5, 5]);

    // Verify that bubbleSort sorts in-place by passing a reference and observing mutation
    // We return both the mutated original and the returned value from page context
    const mutated = await page.evaluate(() => {
      const arr = [2, 1];
      const ret = bubbleSort(arr); // sorts in place
      return { arr, ret };
    });
    expect(mutated.arr).toEqual([1, 2]);
    expect(mutated.ret).toEqual([1, 2]);
    // The returned array should be strictly equal to the original reference when compared structurally
    expect(mutated.ret).toEqual(mutated.arr);
  });

  // Test explicit handling of invalid input - calling bubbleSort with null should throw a TypeError
  test('Calling bubbleSort with a non-array (null) throws a TypeError in page context', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Execute bubbleSort(null) inside the page and capture the thrown error details without letting the test crash
    const errorInfo = await page.evaluate(() => {
      try {
        bubbleSort(null);
        return { threw: false };
      } catch (e) {
        // Return the error details to the test runner for assertions
        return { threw: true, name: e && e.name, message: e && e.message };
      }
    });

    // Expect that the function threw an error and that it is a TypeError (or similar) due to accessing length
    expect(errorInfo.threw).toBe(true);
    // Some environments report different message text; assert the presence of TypeError name
    expect(errorInfo.name).toBeDefined();
    expect(errorInfo.name).toMatch(/TypeError/i);
  });

  // This test intentionally triggers an unhandled page error (via setTimeout) to ensure the pageerror event fires.
  // We let the runtime surface the error naturally and assert that Playwright observes it.
  test('An asynchronous invalid call triggers a pageerror event (uncaught exception)', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();

    // Wait for a pageerror event that will be caused by a thrown exception in setTimeout
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Schedule an asynchronous call that will throw (uncaught) in the page context
    // This should result in a pageerror being emitted and captured by the listener
    await page.evaluate(() => {
      // Use setTimeout so the exception is uncaught and surfaces as a pageerror
      setTimeout(() => {
        // This will throw because bubbleSort expects an array (it tries to read .length)
        bubbleSort(null);
      }, 0);
    });

    // Await the captured pageerror and assert its details
    const caughtError = await pageErrorPromise;
    expect(caughtError).toBeTruthy();
    // The message should indicate an inability to read 'length' from null or similar
    expect(String(caughtError.message).toLowerCase()).toContain('length');
    // Ensure at least one page error was recorded by our earlier listener setup
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });
});
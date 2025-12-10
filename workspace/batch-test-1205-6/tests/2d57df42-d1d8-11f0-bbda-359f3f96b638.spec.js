import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d57df42-d1d8-11f0-bbda-359f3f96b638.html';

/*
  Page object model for the Divide and Conquer Visualization app.
  Encapsulates common interactions and queries to keep tests readable.
*/
class DivideAndConquerPage {
  constructor(page) {
    this.page = page;
    this.dataContainer = page.locator('#data');
    this.dataItems = page.locator('#data .data-item');
    this.sortButton = page.locator('button[onclick="sortArray()"]');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getDataItemTexts() {
    return await this.dataItems.allTextContents();
  }

  async getDataItemCount() {
    return await this.dataItems.count();
  }

  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  async clickSortButton() {
    await this.sortButton.click();
  }

  // Utility to wait until result text is non-empty (used after sorting)
  async waitForResultText(timeout = 2000) {
    await this.page.waitForFunction(() => {
      const el = document.getElementById('result');
      return el && el.innerText.trim().length > 0;
    }, null, { timeout });
  }
}

test.describe('Divide and Conquer Visualization - FSM tests', () => {
  // Collect console messages and page errors for each test to validate runtime errors
  let consoleMessages;
  let pageErrors;
  let dacPage;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Attach listeners before navigation so we capture errors during script execution
    page.on('console', (msg) => {
      // capture type and text for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // capture the error object for assertions
      pageErrors.push(err);
    });

    // Create page object and navigate to the app
    dacPage = new DivideAndConquerPage(page);
    await dacPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Ensure page is closed between tests (fixture usually handles this, but explicit is fine)
    try {
      await page.close();
    } catch (e) {
      // ignore
    }
  });

  test('Initial state S0_Idle: page shows initial data and no result text', async () => {
    // This test validates the "Idle" state entry action displayData(data)
    // Verify number of displayed items, their order, and that result area is empty.

    // Expected initial data from the application source
    const expectedInitial = ['9','7','5','11','12','2','14','3','10','6','4','1','8'];

    const itemCount = await dacPage.getDataItemCount();
    expect(itemCount).toBe(expectedInitial.length);

    const texts = await dacPage.getDataItemTexts();
    // The displayData function uses innerText per element; compare arrays
    expect(texts).toEqual(expectedInitial);

    const resultText = await dacPage.getResultText();
    // Before any sorting, result div should be empty
    expect(resultText.trim()).toBe('');

    // Ensure no runtime errors (ReferenceError/SyntaxError/TypeError) were emitted during load
    // We assert that no page errors occurred during initial load.
    expect(pageErrors.length).toBe(0);
    // Ensure console did not log error-level messages
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Transition S0_Idle -> S1_Sorted: clicking Sort Numbers sorts the data and updates result', async () => {
    // This test validates the transition triggered by SortButtonClick event.
    // It asserts that mergeSort executes, displayData(sortedData) runs, and result div is set.

    // Precondition: initial state displayed
    const beforeTexts = await dacPage.getDataItemTexts();
    expect(beforeTexts[0]).toBe('9'); // sanity check

    // Click the Sort Numbers button
    await dacPage.clickSortButton();

    // Wait for result text to appear (entry action of S1_Sorted sets result)
    await dacPage.waitForResultText();

    // Expected sorted output derived from the application's data array
    const expectedSorted = ['1','2','3','4','5','6','7','8','9','10','11','12','14'];

    // Verify that data container now shows sorted numbers in ascending order
    const afterTexts = await dacPage.getDataItemTexts();
    expect(afterTexts).toEqual(expectedSorted);

    // Verify result div text exactly matches the formatted sorted array (join with ', ')
    const resultText1 = await dacPage.getResultText();
    expect(resultText.trim()).toBe(`Sorted Array: [${expectedSorted.join(', ')}]`);

    // No page errors should have been thrown during the sorting transition
    expect(pageErrors.length).toBe(0);
    // And no console-level errors either
    const errorConsoleMessages1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Idempotency and repeated interactions: multiple clicks preserve sorted output', async () => {
    // Validate clicking the sort button multiple times does not break state or DOM structure.

    // Click first time
    await dacPage.clickSortButton();
    await dacPage.waitForResultText();

    const firstResult = await dacPage.getResultText();
    const firstData = await dacPage.getDataItemTexts();

    // Click a second time
    await dacPage.clickSortButton();
    // Wait a small moment for any re-render if it happens
    await dacPage.page.waitForTimeout(200);

    const secondResult = await dacPage.getResultText();
    const secondData = await dacPage.getDataItemTexts();

    // The result text and data order should remain identical after the second click
    expect(secondResult).toBe(firstResult);
    expect(secondData).toEqual(firstData);

    // Confirm no errors were produced by repeated interaction
    expect(pageErrors.length).toBe(0);
  });

  test('mergeSort function - edge cases and small inputs behave correctly', async () => {
    // Validate the underlying mergeSort function for edge cases via page.evaluate
    // This ensures mergeSort works for empty, single-element, and small arrays.

    // Empty array should return empty
    const emptyResult = await dacPage.page.evaluate(() => {
      // Accessing mergeSort defined on the page
      return mergeSort([]);
    });
    expect(emptyResult).toEqual([]);

    // Single element array should return that element
    const singleResult = await dacPage.page.evaluate(() => mergeSort([42]));
    expect(singleResult).toEqual([42]);

    // Small unsorted arrays
    const smallResult = await dacPage.page.evaluate(() => mergeSort([3, 1, 2]));
    expect(smallResult).toEqual([1,2,3]);

    // Already sorted input should be preserved
    const sortedPreserve = await dacPage.page.evaluate(() => mergeSort([1,2,3,4]));
    expect(sortedPreserve).toEqual([1,2,3,4]);

    // Confirm no runtime errors occurred while invoking mergeSort directly
    expect(pageErrors.length).toBe(0);
  });

  test('Runtime monitoring: capture console and page errors during full scenario', async () => {
    // This test gathers and asserts on console messages and page errors
    // during a sequence of interactions to ensure there are no unexpected runtime exceptions.

    // Start fresh interactions
    await dacPage.clickSortButton();
    await dacPage.waitForResultText();

    // Interact a couple more times
    await dacPage.clickSortButton();
    await dacPage.page.waitForTimeout(100);

    // Check collected console messages and page errors
    // We expect the app to not throw ReferenceError, SyntaxError, or TypeError during normal operation.
    const errorPageErrors = pageErrors.filter(err => {
      const name = err && err.name ? err.name : '';
      return name === 'ReferenceError' || name === 'SyntaxError' || name === 'TypeError';
    });

    // Assert that none of these critical error types were observed
    expect(errorPageErrors.length).toBe(0);

    // Also ensure console.error was not emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // For debugging and traceability, assert that console captured at least the expected level of messages (info/debug may be zero)
    // We do not require any console.info messages; just ensure no errors.
    expect(consoleMessages.every(m => typeof m.text === 'string')).toBeTruthy();
  });
});
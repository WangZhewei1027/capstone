import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad3c6a0-d59a-11f0-891d-f361d22ca68a.html';

/**
 * Page Object for the Insertion Sort page.
 * Encapsulates common interactions and selectors.
 */
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sizeInput = page.locator('#array-size');
    this.arrayTextarea = page.locator('#array');
    this.sortButton = page.locator('#sort-button');
    this.resultDiv = page.locator('#result');
    this.form = page.locator('#insertion-sort-form');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setSize(value) {
    await this.sizeInput.fill(String(value));
  }

  async setArray(value) {
    // Fill the textarea with the provided string (commas separated).
    await this.arrayTextarea.fill(value);
  }

  async clickSort() {
    await this.sortButton.click();
  }

  async getResultText() {
    return (await this.resultDiv.textContent())?.trim() ?? '';
  }

  async getHeadingText() {
    return (await this.heading.textContent())?.trim() ?? '';
  }

  async formExists() {
    return await this.form.count() > 0;
  }
}

test.describe('Insertion Sort FSM and UI tests (Application ID: 8ad3c6a0-d59a-11f0-891d-f361d22ca68a)', () => {
  /** Arrays to collect runtime diagnostics per test */
  let consoleErrors;
  let pageErrors;
  let insertionPage;

  // Attach listeners and load page before each test case.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console.error messages
    page.on('console', (msg) => {
      // Record any console messages with severity 'error'
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location ? msg.location() : undefined,
          });
        }
      } catch (e) {
        // Ensure not to throw from the handler
        consoleErrors.push({ text: 'Failed to read console message', error: String(e) });
      }
    });

    // Collect unhandled exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    insertionPage = new InsertionSortPage(page);
    await insertionPage.goto();
  });

  // After each test ensure there were no unexpected page/runtime errors.
  test.afterEach(async () => {
    // Assert that runtime did not produce unexpected console errors or page errors.
    // If there are errors, the individual tests will fail here to surface runtime issues.
    expect(consoleErrors, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(pageErrors, `Expected no page errors, found: ${JSON.stringify(pageErrors, null, 2)}`).toHaveLength(0);
  });

  test('S0_Idle: Idle state renders correctly with form and heading', async () => {
    // Validate that the initial (Idle) state is rendered with the expected elements.
    // This corresponds to FSM state S0_Idle, entry action renderPage() (not present in JS, but initial DOM is rendered).
    const heading = await insertionPage.getHeadingText();
    expect(heading).toBe('Insertion Sort');

    // Form should exist and include expected controls
    const formExists = await insertionPage.formExists();
    expect(formExists).toBeTruthy();

    // Inputs and button should be visible / present
    await expect(insertionPage.sizeInput).toBeVisible();
    await expect(insertionPage.arrayTextarea).toBeVisible();
    await expect(insertionPage.sortButton).toBeVisible();

    // Result area should be present and initially empty
    const initialResult = await insertionPage.getResultText();
    expect(initialResult).toBe('');
  });

  test('S1_Sorting: Clicking sort button with numeric array triggers sortForm and updates #result (transition)', async () => {
    // This test validates the SortButtonClick event and transition from S0_Idle -> S1_Sorting.
    // We provide a typical numeric array and click "Sort the Array".
    // Note: Implementation contains a bug where insertionSort returns the sequence of keys
    // (same order as input) rather than the final sorted array. The test asserts observed behavior.
    await insertionPage.setSize(4);
    await insertionPage.setArray('3,1,4,2');

    // Click the sort button to trigger the attached event handler.
    await insertionPage.clickSort();

    // Wait for result text to be populated (it should change synchronously, but wait for safety)
    await expect(insertionPage.resultDiv).toHaveText(/Sorted array:/);

    const resultText = await insertionPage.getResultText();
    // According to the actual page implementation, insertionSort returns the pushed keys in iteration order,
    // which yields the original input order "3, 1, 4, 2". We assert the real behavior observed.
    expect(resultText).toBe('Sorted array: 3, 1, 4, 2');
  });

  test('Edge case: Empty array input (textarea blank) produces NaN in result', async () => {
    // This test validates the behavior when the array textarea is empty.
    // The code maps empty string to [NaN] and insertionSort will produce 'NaN' in the result.
    await insertionPage.setSize(1); // size is irrelevant to implementation but provided
    await insertionPage.setArray(''); // empty textarea

    await insertionPage.clickSort();

    await expect(insertionPage.resultDiv).toHaveText(/Sorted array:/);

    const resultText = await insertionPage.getResultText();
    // map(Number) on [''] yields [NaN], join produces 'NaN'
    expect(resultText).toBe('Sorted array: NaN');
  });

  test('Edge case: Size mismatch (size smaller than provided elements) should be ignored by implementation', async () => {
    // The page's implementation ignores the declared size and uses the textarea contents directly.
    // Provide size=2 but 3 elements in the textarea; verify output reflects the textarea values.
    await insertionPage.setSize(2);
    await insertionPage.setArray('5,4,3');

    await insertionPage.clickSort();

    await expect(insertionPage.resultDiv).toHaveText(/Sorted array:/);

    const resultText = await insertionPage.getResultText();
    // As above, the function pushes keys in encountered order -> original order appears
    expect(resultText).toBe('Sorted array: 5, 4, 3');
  });

  test('Edge case: Non-numeric entries produce NaN values in output', async () => {
    // Provide non-numeric entries; Number('a') => NaN. The output should show NaN values separated by commas.
    await insertionPage.setArray('a,b,c');

    await insertionPage.clickSort();

    await expect(insertionPage.resultDiv).toHaveText(/Sorted array:/);

    const resultText = await insertionPage.getResultText();
    // Three NaNs should be joined with ", "
    expect(resultText).toBe('Sorted array: NaN, NaN, NaN');
  });

  test('Event handler verification: clicking sort multiple times updates result each time', async () => {
    // This verifies the click event listener is attached and works repeatedly.
    await insertionPage.setArray('2,1');

    await insertionPage.clickSort();
    await expect(insertionPage.resultDiv).toHaveText('Sorted array: 2, 1');
    let first = await insertionPage.getResultText();
    expect(first).toBe('Sorted array: 2, 1');

    // Change array and click again
    await insertionPage.setArray('10,7,9');
    await insertionPage.clickSort();
    await expect(insertionPage.resultDiv).toHaveText('Sorted array: 10, 7, 9');
    let second = await insertionPage.getResultText();
    expect(second).toBe('Sorted array: 10, 7, 9');
  });

  test('Robustness: clicking sort with only size provided (no textarea) results in NaN', async () => {
    // Provide size but leave textarea empty -> same behavior as empty textarea
    await insertionPage.setSize(3);
    await insertionPage.setArray('');

    await insertionPage.clickSort();

    const resultText = await insertionPage.getResultText();
    expect(resultText).toBe('Sorted array: NaN');
  });
});
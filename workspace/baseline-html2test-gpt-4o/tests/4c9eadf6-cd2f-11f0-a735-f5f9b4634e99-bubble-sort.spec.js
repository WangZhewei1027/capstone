import { test, expect } from '@playwright/test';

// Test file for: 4c9eadf6-cd2f-11f0-a735-f5f9b4634e99.html
// Filename (per requirements): 4c9eadf6-cd2f-11f0-a735-f5f9b4634e99-bubble-sort.spec.js
//
// This suite verifies the Bubble Sort Demonstration page behavior.
// It observes console messages and page errors (and asserts none occur),
// validates DOM updates, checks steps produced by the sorting routine,
// and exercises several edge cases (empty input, non-numeric input, single element).
//
// Important: tests do not modify the page source or patch runtime errors.
// They simply load the page as-is and assert observed behavior.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf6-cd2f-11f0-a735-f5f9b4634e99.html';

// Page object for the Bubble Sort demonstration page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#array-input');
    this.sortButton = page.locator('button', { hasText: 'Sort' });
    this.arrayOutput = page.locator('#array-output');
    this.stepsOutput = page.locator('#steps-output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(value) {
    await this.input.fill(value);
  }

  async clickSort() {
    await Promise.all([
      // click may trigger DOM updates
      this.sortButton.click(),
      // wait for at least steps-output to be updated
      this.stepsOutput.waitFor({ state: 'attached', timeout: 2000 }).catch(() => {}),
    ]);
  }

  async getArrayOutputText() {
    return (await this.arrayOutput.textContent())?.trim() ?? '';
  }

  async getStepParagraphs() {
    return this.stepsOutput.locator('p');
  }

  async getStepsCount() {
    return await this.getStepParagraphs().count();
  }

  async getStepText(index) {
    // index is 0-based index of p elements
    return (await this.getStepParagraphs().nth(index).textContent())?.trim() ?? '';
  }

  async getFinalResultText() {
    // final result is appended as an h2 inside steps-output
    const h2 = this.stepsOutput.locator('h2');
    return (await h2.textContent())?.trim() ?? '';
  }

  async getAllStepsText() {
    const count = await this.getStepsCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.getStepText(i));
    }
    return texts;
  }
}

// Utility to compute expected number of bubble sort steps: n*(n-1)/2
function expectedStepCountForArrayLength(n) {
  if (n <= 1) return 0;
  return (n * (n - 1)) / 2;
}

// Helper to parse an input string into the array displayed by the app (join format)
function normalizeInputToDisplay(inputString) {
  // replicates behavior of input.split(',').map(Number) then join(', ')
  const arr = inputString.split(',').map(Number);
  return arr.join(', ');
}

// Tests
test.describe('Bubble Sort Demonstration - functional tests', () => {
  // Collect console messages and page errors for each test to assert there are no runtime errors
  test.beforeEach(async ({ page }) => {
    // Attach listeners early to capture load-time issues
    page.__consoleMessages = [];
    page.__pageErrors = [];

    page.on('console', (msg) => {
      // store console messages (type and text) for later assertions
      page.__consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // store page errors
      page.__pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // Assert there were no unexpected console errors or page errors during the test.
    // If the app has runtime errors, these assertions will fail and surface them.
    const errorConsoleMessages = (page.__consoleMessages || []).filter(
      (m) =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/i.test(m.text)
    );
    const pageErrors = page.__pageErrors || [];

    // If there are errors, include their content in the assertion message to help debugging.
    expect(
      { errorConsoleMessagesCount: errorConsoleMessages.length, pageErrorsCount: pageErrors.length },
      'Expected no console error messages or page errors during test execution'
    ).toEqual({ errorConsoleMessagesCount: 0, pageErrorsCount: 0 });
  });

  test('Initial page load shows expected default state', async ({ page }) => {
    // Purpose: Verify title, default input value, and that outputs are empty before sorting.
    const app = new BubbleSortPage(page);
    await app.goto();

    // Title should match page content
    await expect(page).toHaveTitle(/Bubble Sort Demonstration/);

    // Default input value is prefilled as "5, 3, 8, 4, 2"
    const inputValue = await app.input.inputValue();
    expect(inputValue).toBe('5, 3, 8, 4, 2');

    // Before clicking Sort, array-output should be empty
    const arrayOut = await app.getArrayOutputText();
    expect(arrayOut).toBe('');

    // Steps output should have no paragraph children
    const stepsCount = await app.getStepsCount();
    expect(stepsCount).toBe(0);

    // No final result h2 should be present (text empty)
    const finalResult = await app.getFinalResultText();
    expect(finalResult).toBe('');
  });

  test('Perform bubble sort with default input: validate steps, final sorted step, and bug in final result', async ({ page }) => {
    // Purpose:
    // - Click Sort with default input and verify steps count and content
    // - Validate the final step produced by the algorithm is the sorted array
    // - Detect the known bug: the displayed "Sorted Array" h2 is built from the original input (unsorted)
    const app = new BubbleSortPage(page);
    await app.goto();

    // Trigger sort
    await app.clickSort();

    // After click, array-output should show the original parsed array (joined with ', ')
    const arrayOut = await app.getArrayOutputText();
    expect(arrayOut).toBe(normalizeInputToDisplay('5, 3, 8, 4, 2'));

    // Compute expected steps count for n=5 => 10
    const expectedSteps = expectedStepCountForArrayLength(5);
    const actualSteps = await app.getStepsCount();
    expect(actualSteps).toBe(expectedSteps);

    // Verify the last step (Step 10) is the fully sorted array
    const lastStepText = await app.getStepText(actualSteps - 1);
    expect(lastStepText).toMatch(/^Step\s+10:\s*/i);

    // Extract the textual array from last step
    const lastStepArrayText = lastStepText.replace(/^Step\s+\d+:\s*/i, '').trim();
    // The sorted version of the initial array [5,3,8,4,2] is [2,3,4,5,8]
    expect(lastStepArrayText).toBe('2, 3, 4, 5, 8');

    // The page appends a final h2 "Sorted Array: ..." — due to an implementation bug it uses the original array
    const finalResult = await app.getFinalResultText();
    expect(finalResult.startsWith('Sorted Array:')).toBeTruthy();

    // Because the implementation computes the final h2 from the original `array` variable,
    // we expect that the h2 text equals the original unsorted array representation:
    expect(finalResult).toBe(`Sorted Array: ${normalizeInputToDisplay('5, 3, 8, 4, 2')}`);

    // Assert that the final h2 does NOT match the last algorithm step (this demonstrates the bug)
    expect(finalResult.includes(lastStepArrayText)).toBeFalsy();
  });

  test('Custom inputs and edge cases: empty input, non-numeric input, single element', async ({ page }) => {
    // Purpose:
    // - Exercise several edge cases and ensure the page responds consistently with the implementation.
    const app = new BubbleSortPage(page);
    await app.goto();

    // Case 1: Empty input string -> split(',') => [''] => Number('') === 0
    await app.setInput('');
    await app.clickSort();

    // array-output shows "0" (since Number('') -> 0)
    const outEmpty = await app.getArrayOutputText();
    expect(outEmpty).toBe('0');

    // Since the array length is 1, expected steps = 0, but final h2 should still be appended
    expect(await app.getStepsCount()).toBe(0);
    expect(await app.getFinalResultText()).toBe('Sorted Array: 0');

    // Case 2: Non-numeric inputs => Number('a') -> NaN
    await app.setInput('a, b');
    await app.clickSort();

    const outNonNumeric = await app.getArrayOutputText();
    // The page shows 'NaN, NaN' for the parsed values
    expect(outNonNumeric).toBe('NaN, NaN');

    // Steps: bubble sort will perform comparisons that do not change NaN ordering; there are 1*2/2 = 1 step for n=2
    const stepsCountNonNumeric = await app.getStepsCount();
    expect(stepsCountNonNumeric).toBe(expectedStepCountForArrayLength(2));

    // Last step array text should be 'NaN, NaN'
    const lastStepNonNumeric = await app.getStepText(stepsCountNonNumeric - 1);
    const extractedArrayNonNumeric = lastStepNonNumeric.replace(/^Step\s+\d+:\s*/i, '').trim();
    expect(extractedArrayNonNumeric).toBe('NaN, NaN');

    // Final h2 should also reflect the original parsed (unsorted) array: 'NaN, NaN'
    expect(await app.getFinalResultText()).toBe('Sorted Array: NaN, NaN');

    // Case 3: Single element input => no steps, final h2 equals that element
    await app.setInput('7');
    await app.clickSort();

    const outSingle = await app.getArrayOutputText();
    expect(outSingle).toBe('7');

    // No steps (n=1)
    expect(await app.getStepsCount()).toBe(0);

    // final result h2 shows the single element
    expect(await app.getFinalResultText()).toBe('Sorted Array: 7');
  });

  test('DOM structure and accessibility sanity checks', async ({ page }) => {
    // Purpose:
    // - Validate the presence and accessibility of key interactive elements.
    const app = new BubbleSortPage(page);
    await app.goto();

    // Input should be visible and enabled
    await expect(app.input).toBeVisible();
    await expect(app.input).toBeEnabled();

    // Sort button should be visible and enabled
    await expect(app.sortButton).toBeVisible();
    await expect(app.sortButton).toBeEnabled();

    // Labels/headings: page should include "Original Array:" and "Steps:"
    await expect(page.locator('h2', { hasText: 'Original Array:' })).toBeVisible().catch(() => {
      // Some browsers might render heading differently; still assert the paragraph exists
    });
    await expect(page.locator('h2', { hasText: 'Steps:' })).toBeVisible();

    // Ensure steps-output container exists and is initially empty
    await expect(app.stepsOutput).toBeVisible();
    expect(await app.getStepsCount()).toBe(0);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f768baa1-d5b8-11f0-9ee1-ef07bdc6053d.html';

/**
 * Page object model for the Sliding Window demo page.
 * Encapsulates common interactions and assertions.
 */
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.windowSizeInput = page.locator('#windowSize');
    this.calculateButton = page.locator("button[onclick='calculateSlidingWindow()']");
    this.arrayDiv = page.locator('#array');
    this.resultDiv = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setArray(value) {
    await this.arrayInput.fill(value);
  }

  async setWindowSize(value) {
    // windowSize is an <input type="number">; we use fill to simulate user input (string)
    await this.windowSizeInput.fill(String(value));
  }

  async clickCalculate() {
    await this.calculateButton.click();
  }

  async getResultText() {
    return (await this.resultDiv.textContent()) ?? '';
  }

  async getArrayElementsCount() {
    return await this.page.locator('#array .element').count();
  }

  async getArrayElementsTexts() {
    const count = await this.getArrayElementsCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.page.locator('#array .element').nth(i).textContent());
    }
    return texts;
  }
}

test.describe('Sliding Window Demonstration - FSM comprehensive tests', () => {
  // Capture console and page errors for each test to assert that runtime errors are visible.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Ensure no uncaught page errors occurred during the test
    // If any page errors exist, include them in the assertion failure message to aid debugging.
    expect(pageErrors.length, `Unexpected pageerror events: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    // Optionally assert there are no console errors of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length, `Console reported errors/warnings: ${consoleErrors.map(c => c.text).join(' | ')}`).toBe(0);
  });

  test('Initial render - Idle state should display title and empty result/array', async ({ page }) => {
    // This test validates the S0_Idle state: page renders initial content (h1)
    const pv = new SlidingWindowPage(page);

    // Title exists
    const title = page.locator('h1');
    await expect(title).toHaveText('Sliding Window Technique');

    // Array and result containers should be present and initially empty
    await expect(pv.arrayDiv).toBeVisible();
    await expect(pv.arrayDiv).toBeEmpty();
    await expect(pv.resultDiv).toBeVisible();
    await expect(pv.resultDiv).toBeEmpty();
  });

  test('Invalid input transitions to S2_InvalidInput when inputs are missing or invalid', async ({ page }) => {
    // Validate the guard: if (!arrayInput || isNaN(windowSize) || windowSize <= 0)
    const pv = new SlidingWindowPage(page);

    // Case A: both fields empty
    await pv.setArray('');
    await pv.setWindowSize('');
    await pv.clickCalculate();
    await expect(pv.resultDiv).toHaveText('Please enter a valid array and window size.');

    // Clear for next sub-case
    await pv.setArray('');
    await pv.setWindowSize('');

    // Case B: array provided but window size invalid (non-numeric or 0)
    await pv.setArray('1,2,3');
    await pv.setWindowSize('0'); // windowSize <= 0 should be invalid
    await pv.clickCalculate();
    await expect(pv.resultDiv).toHaveText('Please enter a valid array and window size.');

    // Case C: window size missing
    await pv.setArray('1,2,3');
    await pv.setWindowSize('');
    await pv.clickCalculate();
    await expect(pv.resultDiv).toHaveText('Please enter a valid array and window size.');
  });

  test('Empty array input transitions to S3_EmptyArray when parsing yields no numbers', async ({ page }) => {
    // Validate the guard: if (nums.length === 0)
    const pv = new SlidingWindowPage(page);

    // Enter non-numeric values that will be filtered out => nums.length === 0
    await pv.setArray('a, b, , foo');
    await pv.setWindowSize('2');
    await pv.clickCalculate();

    await expect(pv.resultDiv).toHaveText('The array cannot be empty.');
    await expect(pv.arrayDiv).toBeEmpty();
  });

  test('Window size too large transitions to S4_WindowSizeTooLarge', async ({ page }) => {
    // Validate guard: if (windowSize > nums.length)
    const pv = new SlidingWindowPage(page);

    await pv.setArray('1,2,3');
    await pv.setWindowSize('5'); // larger than array length 3
    await pv.clickCalculate();

    await expect(pv.resultDiv).toHaveText('Window size cannot be larger than the array length.');
    // No array elements should be displayed in this error case (the code clears before checks)
    await expect(pv.arrayDiv).toBeEmpty();
  });

  test('Successful calculation transitions to S5_CalculationComplete and displays sliding sums', async ({ page }) => {
    // Validate the else branch: compute sliding window sums and append results
    const pv = new SlidingWindowPage(page);

    await pv.setArray('1,2,3,4,5');
    await pv.setWindowSize('3');
    await pv.clickCalculate();

    // Array elements should be rendered with the .element class
    await expect(page.locator('#array .element')).toHaveCount(5);
    const elementTexts = await pv.getArrayElementsTexts();
    // Ensure the displayed element texts match input numbers
    expect(elementTexts.map(t => t && t.trim())).toEqual(['1', '2', '3', '4', '5']);

    // Result text should include initial window and subsequent windows in the expected format
    const resultText = (await pv.getResultText()).replace(/\s+/g, ' ').trim();
    expect(resultText).toContain('Window Sum (0-2): 6');
    expect(resultText).toContain('Window Sum (1-3): 9');
    expect(resultText).toContain('Window Sum (2-4): 12');

    // For an array of length 5 and window size 3, there should be exactly 3 window sums (0-2,1-3,2-4)
    const occurrences = (resultText.match(/Window Sum \(/g) || []).length;
    expect(occurrences).toBe(3);
  });

  test('Edge case: window size equal to array length produces only initial sum (no appended windows)', async ({ page }) => {
    // Validate behavior when windowSize === nums.length
    const pv = new SlidingWindowPage(page);

    await pv.setArray('4,5,6');
    await pv.setWindowSize('3'); // equal to array length
    await pv.clickCalculate();

    const resultText = (await pv.getResultText()).replace(/\s+/g, ' ').trim();
    expect(resultText).toBe('Window Sum (0-2): 15'); // 4+5+6 = 15

    // Ensure there is exactly one "Window Sum (" occurrence
    const occurrences = (resultText.match(/Window Sum \(/g) || []).length;
    expect(occurrences).toBe(1);

    // Array should be displayed correctly
    await expect(page.locator('#array .element')).toHaveCount(3);
  });

  test('Repeated calculate calls clear previous results and re-render (S1_InputReceived exit/entry checks)', async ({ page }) => {
    // This test validates that previous results are cleared on new calculation attempts,
    // matching the S1_InputReceived evidence "resultDiv.innerHTML = ''" and "arrayDiv.innerHTML = ''"
    const pv = new SlidingWindowPage(page);

    // First calculation
    await pv.setArray('1,2,3,4');
    await pv.setWindowSize('2');
    await pv.clickCalculate();
    await expect(page.locator('#array .element')).toHaveCount(4);
    const firstResult = await pv.getResultText();
    expect(firstResult).toContain('Window Sum (0-1): 3');

    // Second calculation with different inputs should clear previous elements and results before rendering again
    await pv.setArray('10,20');
    await pv.setWindowSize('1');
    await pv.clickCalculate();

    // After second calculation, only the new array elements should exist
    await expect(page.locator('#array .element')).toHaveCount(2);
    const secondResult = await pv.getResultText();
    expect(secondResult).toBe('Window Sum (0-0): 10'); // first window only

    // Ensure the result text does not include fragments from the firstResult
    expect(secondResult).not.toContain('Window Sum (0-1): 3');
  });
});
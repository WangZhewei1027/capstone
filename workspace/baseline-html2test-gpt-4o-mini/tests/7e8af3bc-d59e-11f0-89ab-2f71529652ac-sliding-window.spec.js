import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3bc-d59e-11f0-89ab-2f71529652ac.html';

class SlidingWindowPage {
  /**
   * Page object for the Sliding Window demo.
   * Encapsulates selectors and common actions.
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.kInput = page.locator('#kInput');
    this.runButton = page.locator('button', { hasText: 'Run Sliding Window' });
    this.numbersContainer = page.locator('#numbers');
    this.sumResult = page.locator('#sumResult');
    this.elements = page.locator('#numbers .element');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterArray(value) {
    await this.arrayInput.fill(value);
  }

  async enterK(value) {
    await this.kInput.fill(String(value));
  }

  async clickRun() {
    await Promise.all([
      // The click doesn't navigate; still use a single click.
      this.runButton.click()
    ]);
  }

  async getDisplayedElementsText() {
    return this.elements.allTextContents();
  }

  async getSumText() {
    return (await this.sumResult.textContent()) ?? '';
  }
}

test.describe('Sliding Window Technique Demonstration - E2E', () => {
  // Track any console errors and page errors that occur during each test.
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test.afterEach(async () => {
    // Assert there were no uncaught JS errors or console.error calls during the test
    // This validates runtime stability of the page under test interactions.
    expect(consoleErrors, `Console errors encountered: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(pageErrors, `Page errors encountered: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('Initial page load: inputs and result area are present and empty', async ({ page }) => {
    // Purpose: Verify the page loads with expected elements and default empty state.
    const sw = new SlidingWindowPage(page);
    await sw.goto();

    // Basic page structure checks
    await expect(page).toHaveTitle(/Sliding Window Demonstration/i);
    await expect(sw.arrayInput).toBeVisible();
    await expect(sw.kInput).toBeVisible();
    await expect(sw.runButton).toBeVisible();

    // Result area should be present and initially empty
    await expect(sw.numbersContainer).toBeVisible();
    await expect(sw.sumResult).toBeVisible();
    const elementsCount = await sw.elements.count();
    expect(elementsCount).toBe(0);
    const sumText = await sw.getSumText();
    // sumResult is empty string initially
    expect(sumText.trim()).toBe('');
  });

  test('Valid input: computes max sum and displays final window after sliding', async ({ page }) => {
    // Purpose: Test main happy path with an integer array and k within bounds.
    const sw1 = new SlidingWindowPage(page);
    await sw.goto();

    // Provide input: [1,2,3,4,5], k = 3 -> final window should be [3,4,5] and Max Sum: 12
    await sw.enterArray('1,2,3,4,5');
    await sw.enterK(3);
    await sw.clickRun();

    // After synchronous computation, the UI should display the final window
    const texts = await sw.getDisplayedElementsText();
    expect(texts.length).toBe(3);
    expect(texts).toEqual(['3', '4', '5']);

    // And the maximum sum should be shown and correct
    const sumText1 = await sw.getSumText();
    expect(sumText.trim()).toBe('Max Sum: 12');
  });

  test('Parses whitespace and negative numbers correctly and computes max sum', async ({ page }) => {
    // Purpose: Verify trimming and parsing of inputs with spaces and negative values.
    const sw2 = new SlidingWindowPage(page);
    await sw.goto();

    // Input with spaces and a negative number: "10, -2, 3", k = 2
    // Windows: [10, -2] -> 8, [-2, 3] -> 1 ; Max is 8. Final window displayed is [-2, 3].
    await sw.enterArray(' 10,  -2 ,3 ');
    await sw.enterK(2);
    await sw.clickRun();

    const texts1 = await sw.getDisplayedElementsText();
    expect(texts.length).toBe(2);
    expect(texts).toEqual(['-2', '3']);

    const sumText2 = await sw.getSumText();
    expect(sumText.trim()).toBe('Max Sum: 8');
  });

  test('Invalid inputs trigger alert and do not change results', async ({ page }) => {
    // Purpose: Ensure client-side validation triggers the expected alert message and
    // that the result region remains unchanged when input is invalid.
    const sw3 = new SlidingWindowPage(page);
    await sw.goto();

    // Prepare to capture dialog (alert)
    let dialogMessage = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Submit with empty array input and a positive k -> should alert
    await sw.enterArray('');
    await sw.enterK(3);
    await sw.clickRun();

    // The page code uses alert() on invalid inputs. Ensure we captured it.
    expect(dialogMessage).toBe('Please enter valid numbers and window size.');

    // Ensure results remain empty after invalid submission
    const elementsCount1 = await sw.elements.count();
    expect(elementsCount).toBe(0);
    const sumText3 = await sw.getSumText();
    expect(sumText.trim()).toBe('');
  });

  test('k greater than array length: observes undefined elements and NaN max sum (bug/edge behavior)', async ({ page }) => {
    // Purpose: Validate the application's behavior in an edge case where k > array.length.
    // The implementation will attempt to access out-of-range indexes leading to "undefined"
    // displayed for elements and "Max Sum: NaN" for the sum.
    const sw4 = new SlidingWindowPage(page);
    await sw.goto();

    // Input with only two numbers, request k = 5
    await sw.enterArray('1,2');
    await sw.enterK(5);
    await sw.clickRun();

    // Expect that elements up to k are rendered, and out-of-range positions show "undefined"
    const texts2 = await sw.getDisplayedElementsText();
    // Should have 5 elements (0..4)
    expect(texts.length).toBe(5);
    // First two are '1' and '2', the rest are 'undefined' strings as produced by template `${numbers[i]}` where numbers[i] is undefined
    expect(texts[0]).toBe('1');
    expect(texts[1]).toBe('2');
    expect(texts.slice(2)).toEqual(['undefined', 'undefined', 'undefined']);

    // The sumResult should show 'NaN' because arithmetic with undefined produced NaN
    const sumText4 = await sw.getSumText();
    expect(sumText.includes('NaN')).toBeTruthy();
  });
});
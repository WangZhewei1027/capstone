import { test, expect } from '@playwright/test';

// Test file: 39b8d8a1-d1d5-11f0-b49a-6f458b3a25ef-two-pointers.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8d8a1-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Two Pointers Demonstration page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.findButton = page.locator('#findPairButton');
    this.resultDiv = page.locator('#result');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the array input value (comma separated numbers)
  async setArray(value) {
    await this.arrayInput.fill('');
    await this.arrayInput.type(value);
  }

  // Set the numeric target input
  async setTarget(value) {
    await this.targetInput.fill('');
    // targetInput is type=number; ensure we pass string
    await this.targetInput.type(String(value));
  }

  // Click the Find Pair button
  async clickFind() {
    await this.findButton.click();
  }

  // Get the result text
  async getResultText() {
    return (await this.resultDiv.textContent()) ?? '';
  }

  // Convenience: perform the full flow
  async findPair(arrayValue, targetValue) {
    await this.setArray(arrayValue);
    await this.setTarget(targetValue);
    await this.clickFind();
    return this.getResultText();
  }
}

test.describe('Two Pointers Demonstration - UI and behavior', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type "error"
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location()
          });
        }
      } catch (e) {
        // If reading console message fails for some reason, still record a generic entry
        consoleErrors.push({ text: `unreadable console message: ${String(e)}` });
      }
    });

    // Capture unhandled exceptions thrown on the page
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // As part of teardown verify no unexpected console errors or page errors occurred during the test.
    // This helps reveal runtime problems such as ReferenceError, SyntaxError, TypeError if they happen.
    // We assert they are empty arrays so that tests fail if the page produced runtime errors.
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page errors were logged: ${JSON.stringify(pageErrors)}`).toHaveLength(0);

    // Ensure page is closed/clean if not already
    try {
      await page.close();
    } catch {
      // ignore
    }
  });

  test('Initial load: all interactive elements are visible and default state is empty result', async ({ page }) => {
    // Purpose: Verify initial page structure and default state before any interaction
    const twoPointers = new TwoPointersPage(page);

    // Elements should exist and be visible
    await expect(twoPointers.arrayInput).toBeVisible();
    await expect(twoPointers.targetInput).toBeVisible();
    await expect(twoPointers.findButton).toBeVisible();
    await expect(twoPointers.findButton).toBeEnabled();

    // Result should be empty on initial load
    const resultText = await twoPointers.getResultText();
    expect(resultText.trim()).toBe('');
  });

  test('Find a valid pair: finds 4 + 6 = 10 in [1,2,3,4,6]', async ({ page }) => {
    // Purpose: Validate the happy path where a pair exists and is displayed
    const twoPointers1 = new TwoPointersPage(page);

    await twoPointers.setArray('1,2,3,4,6');
    await twoPointers.setTarget(10);

    // Click the button to trigger the algorithm
    await twoPointers.clickFind();

    // Verify the result text is exactly as expected
    const result = await twoPointers.getResultText();
    expect(result).toContain('Pair found: 4 + 6 = 10');
  });

  test('No pair found scenario: should indicate no pair for target not present', async ({ page }) => {
    // Purpose: Validate behavior when no two numbers sum to the target
    const twoPointers2 = new TwoPointersPage(page);

    await twoPointers.setArray('1,2,3,4');
    await twoPointers.setTarget(100);

    await twoPointers.clickFind();

    const result1 = await twoPointers.getResultText();
    expect(result).toBe('No pair found that sums up to 100');
  });

  test('Handles non-numeric inputs gracefully: "a,b,c" -> reports no pair found', async ({ page }) => {
    // Purpose: Ensure that non-numeric array entries do not crash the page and result is shown
    const twoPointers3 = new TwoPointersPage(page);

    // Input non-numeric values. The page code uses Number(...) which will produce NaN values.
    await twoPointers.setArray('a,b,c');
    await twoPointers.setTarget(5);

    await twoPointers.clickFind();

    // Expect the page to conclude that no pair was found (no runtime error thrown)
    const result2 = await twoPointers.getResultText();
    expect(result).toBe('No pair found that sums up to 5');
  });

  test('Empty or whitespace array input: should not crash and should report no pair', async ({ page }) => {
    // Purpose: Test how empty inputs are handled
    const twoPointers4 = new TwoPointersPage(page);

    // Empty string
    await twoPointers.setArray('');
    await twoPointers.setTarget(0);
    await twoPointers.clickFind();
    let result3 = await twoPointers.getResultText();
    expect(result).toBe('No pair found that sums up to 0');

    // Whitespace and spaces between values should be handled (Number will ignore spaces)
    await twoPointers.setArray(' 1,  2 ,3 ');
    await twoPointers.setTarget(3);
    await twoPointers.clickFind();
    result = await twoPointers.getResultText();
    // Pair 1 + 2 = 3 should be found
    expect(result).toBe('Pair found: 1 + 2 = 3');
  });

  test('Multiple clicks update the result consistently', async ({ page }) => {
    // Purpose: Ensure repeated interactions produce expected, updated outputs
    const twoPointers5 = new TwoPointersPage(page);

    // First interaction: find a valid pair
    await twoPointers.setArray('2,3,5,8');
    await twoPointers.setTarget(10);
    await twoPointers.clickFind();
    let result4 = await twoPointers.getResultText();
    expect(result).toBe('Pair found: 2 + 8 = 10');

    // Change to a target without a pair
    await twoPointers.setTarget(1);
    await twoPointers.clickFind();
    result = await twoPointers.getResultText();
    expect(result).toBe('No pair found that sums up to 1');

    // Change array and target again
    await twoPointers.setArray('0,1,4,5,9');
    await twoPointers.setTarget(9);
    await twoPointers.clickFind();
    result = await twoPointers.getResultText();
    expect(result).toBe('Pair found: 0 + 9 = 9');
  });

  test('Accessibility: interactive controls should be reachable and have meaningful attributes', async ({ page }) => {
    // Purpose: Basic accessibility checks for interactive elements presence and types
    const twoPointers6 = new TwoPointersPage(page);

    // Ensure inputs have expected types and placeholders (helps screen readers)
    await expect(twoPointers.arrayInput).toHaveAttribute('type', 'text');
    await expect(twoPointers.targetInput).toHaveAttribute('type', 'number');

    // Ensure placeholders exist
    await expect(twoPointers.arrayInput).toHaveAttribute('placeholder');
    await expect(twoPointers.targetInput).toHaveAttribute('placeholder');

    // Ensure button is a button element
    const buttonTag = await twoPointers.findButton.evaluate((el) => el.tagName);
    expect(buttonTag.toLowerCase()).toBe('button');
  });
});
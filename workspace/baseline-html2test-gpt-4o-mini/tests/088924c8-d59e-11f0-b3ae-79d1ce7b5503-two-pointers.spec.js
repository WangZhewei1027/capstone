import { test, expect } from '@playwright/test';

// Page object model for the Two Pointers demo page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.executeButton = page.locator('#execute');
    this.output = page.locator('#output');
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/088924c8-d59e-11f0-b3ae-79d1ce7b5503.html';
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Enter CSV array into input
  async enterArray(csv) {
    await this.input.fill(csv);
  }

  // Click the execute button
  async clickExecute() {
    await this.executeButton.click();
  }

  // Get text content of output div
  async getOutputText() {
    return (await this.output.textContent())?.trim() ?? '';
  }
}

test.describe('Two Pointers Demo - End to End', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(String(err?.message ?? err));
    });
  });

  // After each test ensure there are no unexpected runtime errors or console errors
  test.afterEach(async () => {
    // Fail the test if the page produced uncaught exceptions
    expect(pageErrors).toEqual([], { timeout: 0 });
    // Fail if any console.error messages were emitted
    expect(consoleErrors).toEqual([], { timeout: 0 });
  });

  // Test initial load and default state of the page
  test('Initial page load shows input, button and empty output', async ({ page }) => {
    // Purpose: Verify initial UI elements are present and output is empty
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Input should be visible and empty
    await expect(twoPointers.input).toBeVisible();
    await expect(twoPointers.input).toHaveAttribute('placeholder', 'e.g. 1,2,3,4,5,6');
    await expect(twoPointers.input).toHaveValue('');

    // Execute button should be visible and have correct label
    await expect(twoPointers.executeButton).toBeVisible();
    await expect(twoPointers.executeButton).toHaveText('Find Pairs with Target Sum');

    // Output should exist and be empty initially
    await expect(twoPointers.output).toBeVisible();
    const initialText = await twoPointers.getOutputText();
    expect(initialText === '' || initialText === null).toBeTruthy();
  });

  // Test clicking execute with no input (edge case)
  test('Clicking execute with empty input shows "No pairs found" message', async ({ page }) => {
    // Purpose: Validate behavior for empty input (edge case)
    const twoPointers1 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Ensure input is empty and click execute
    await twoPointers.input.fill('');
    await twoPointers.clickExecute();

    // Expect the output to display the "no pairs" message with target 10
    const outputText = await twoPointers.getOutputText();
    expect(outputText).toBe('No pairs found that sum up to 10.');
  });

  // Test valid sorted array producing multiple pairs
  test('Finds all pairs in a sorted array that sum up to 10', async ({ page }) => {
    // Purpose: Validate main happy path with multiple pairs
    const twoPointers2 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Provide a sorted array that should produce three pairs for target=10
    await twoPointers.enterArray('1,2,3,7,8,9');
    await twoPointers.clickExecute();

    const outputText1 = await twoPointers.getOutputText();
    // Expected exact formatting produced by the implementation
    expect(outputText).toBe('Pairs that sum up to 10: (1, 9), (2, 8), (3, 7)');
    // Ensure output is visible to user
    await expect(twoPointers.output).toBeVisible();
  });

  // Test duplicate numbers producing multiple valid pairs
  test('Handles duplicate numbers and returns multiple pairs', async ({ page }) => {
    // Purpose: Ensure algorithm handles duplicate entries correctly
    const twoPointers3 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Four 5s should produce two pairs: (5, 5), (5, 5)
    await twoPointers.enterArray('5,5,5,5');
    await twoPointers.clickExecute();

    const outputText2 = await twoPointers.getOutputText();
    expect(outputText).toBe('Pairs that sum up to 10: (5, 5), (5, 5)');
  });

  // Test with non-numeric input: should safely handle and return no pairs
  test('Non-numeric entries produce no pairs (NaN handling)', async ({ page }) => {
    // Purpose: Check that non-numeric or malformed input does not crash page and yields no pairs
    const twoPointers4 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Mixed non-numeric values and a numeric value
    await twoPointers.enterArray('a, b, 10');
    await twoPointers.clickExecute();

    const outputText3 = await twoPointers.getOutputText();
    // Implementation will parse 'a' and 'b' to NaN which shouldn't throw; expect no pairs found
    expect(outputText).toBe('No pairs found that sum up to 10.');
  });

  // Accessibility and control state checks
  test('Accessibility: button and input have expected attributes and are interactive', async ({ page }) => {
    // Purpose: Validate basic accessibility and interactivity of controls
    const twoPointers5 = new TwoPointersPage(page);
    await twoPointers.goto();

    // The input should be focusable and accept keyboard input
    await twoPointers.input.focus();
    await twoPointers.input.type('2,8');
    await expect(twoPointers.input).toHaveValue('2,8');

    // The button should be enabled and clicking via keyboard triggers the action
    await twoPointers.executeButton.focus();
    await page.keyboard.press('Enter');

    // After pressing Enter (on the button), expect output to show the (2, 8) pair
    const outputText4 = await twoPointers.getOutputText();
    expect(outputText).toBe('Pairs that sum up to 10: (2, 8)');
  });
});
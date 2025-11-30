import { test, expect } from '@playwright/test';

// Page Object for the Linear Search application
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afba-cd33-11f0-bdf9-b3d97e91273d.html';
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.searchBtn = page.locator('#searchBtn');
    this.output = page.locator('#output');
    this.title = page.locator('h1');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async fillArray(value) {
    await this.arrayInput.fill(value);
  }

  async fillTarget(value) {
    // Use fill even if the input is type=number; Playwright will set the value attribute.
    await this.targetInput.fill(value);
  }

  async clickSearch() {
    await this.searchBtn.click();
  }

  async getOutputText() {
    return (await this.output.innerText()).trim();
  }
}

test.describe('Linear Search Visualization App - 20d2afba-cd33-11f0-bdf9-b3d97e91273d', () => {
  // Collect console messages and page errors for each test so we can assert on them.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors for every test
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('page loads with expected elements and default state', async ({ page }) => {
    const app = new LinearSearchPage(page);
    // Navigate to the app
    await app.goto();

    // Verify main elements are visible
    await expect(app.title).toBeVisible();
    await expect(app.arrayInput).toBeVisible();
    await expect(app.targetInput).toBeVisible();
    await expect(app.searchBtn).toBeVisible();
    await expect(app.output).toBeVisible();

    // Check title text is correct
    await expect(app.title).toHaveText('Linear Search Visualization');

    // Inputs should be empty by default
    await expect(app.arrayInput).toHaveValue('');
    await expect(app.targetInput).toHaveValue('');

    // Output should be empty (or whitespace only)
    const outText = await app.getOutputText();
    expect(outText === '' || outText === '\n' || outText === '\r\n').toBeTruthy();

    // Ensure no uncaught page errors happened during load
    expect(pageErrors.length).toBe(0);

    // Ensure there are no console.error messages on load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test validation error scenarios when inputs are missing
  test('shows validation messages when inputs are missing', async ({ page }) => {
    const app1 = new LinearSearchPage(page);
    await app.goto();

    // Click search with both inputs empty
    await app.clickSearch();
    await expect(app.output).toHaveText('Please enter the array elements.');

    // Now provide array but leave target empty
    await app.fillArray('1,2,3');
    await app.clickSearch();
    await expect(app.output).toHaveText('Please enter a target element.');

    // Now clear array and provide target -> should prompt for array again
    await app.fillArray('');
    await app.fillTarget('2');
    await app.clickSearch();
    await expect(app.output).toHaveText('Please enter the array elements.');

    // No runtime errors expected during validation interactions
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test performing a successful linear search with numeric elements
  test('performs linear search and finds numeric target', async ({ page }) => {
    const app2 = new LinearSearchPage(page);
    await app.goto();

    // Provide array and numeric target that exists
    await app.fillArray('5,3,8,4,2,7');
    await app.fillTarget('4');
    await app.clickSearch();

    const output = await app.getOutputText();

    // Verify step-by-step checks are present in output
    expect(output).toContain('Checking index 0: value 5');
    expect(output).toContain('Checking index 1: value 3');
    expect(output).toContain('Checking index 2: value 8');
    expect(output).toContain('Checking index 3: value 4');

    // Verify success message and index
    expect(output).toContain('Element 4 found at index 3! ✅');

    // No uncaught errors or console.error messages should have occurred
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test when the target is not present in the array
  test('performs linear search and reports not found when target absent', async ({ page }) => {
    const app3 = new LinearSearchPage(page);
    await app.goto();

    // Provide array and numeric target not in array
    await app.fillArray('1,2,3,4');
    await app.fillTarget('9');
    await app.clickSearch();

    const output1 = await app.getOutputText();

    // Should check all indices and end with not found message
    expect(output).toContain('Checking index 0: value 1');
    expect(output).toContain('Checking index 1: value 2');
    expect(output).toContain('Checking index 2: value 3');
    expect(output).toContain('Checking index 3: value 4');
    expect(output).toContain('Element 9 not found in the array. ❌');

    // No runtime errors should have been thrown during the search
    expect(pageErrors.length).toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test handling of string elements and a non-numeric target (fallback to string comparison)
  test('handles string array elements and string target by falling back to string comparison', async ({ page }) => {
    const app4 = new LinearSearchPage(page);
    await app.goto();

    // Provide string array elements
    await app.fillArray('a, b, c, d');
    // The target input is type=number in the DOM, but Playwright can fill a non-numeric value into it.
    // The application is expected to attempt Number(targetInput) and then fallback to trimmed string when NaN.
    await app.fillTarget('b');
    await app.clickSearch();

    const output2 = await app.getOutputText();

    // Expect checks and success for string 'b' at index 1
    expect(output).toContain('Checking index 0: value a');
    expect(output).toContain('Checking index 1: value b');
    expect(output).toContain('Element b found at index 1! ✅');

    // Confirm no uncaught errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test that extra commas and whitespace are handled (filtering out empty items)
  test('parses array input with extra commas and whitespace correctly', async ({ page }) => {
    const app5 = new LinearSearchPage(page);
    await app.goto();

    // Provide array with empty entries and spaces
    await app.fillArray('5, , , 3,  ,8,,4');
    await app.fillTarget('3');
    await app.clickSearch();

    const output3 = await app.getOutputText();

    // After filtering empty items and trimming, '3' should be found
    expect(output).toContain('Element 3 found at index');

    // The output should include checks for index 0.. (ensure indices correspond to filtered array)
    expect(output).toContain('Checking index 0: value 5');
    expect(output).toContain('Checking index 1: value 3');

    expect(pageErrors.length).toBe(0);
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Final test to assert that no unexpected console errors or uncaught exceptions occurred
  test('no uncaught exceptions or console.error messages after typical interactions', async ({ page }) => {
    const app6 = new LinearSearchPage(page);
    await app.goto();

    // Perform a sequence of interactions
    await app.fillArray('10,20,30');
    await app.fillTarget('20');
    await app.clickSearch();
    await app.fillArray('x,y,z');
    await app.fillTarget('z');
    await app.clickSearch();

    // Collect final counts
    const consoleErrors6 = consoleMessages.filter(m => m.type === 'error');

    // Expect no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Expect no console.error messages
    expect(consoleErrors.length).toBe(0);
  });
});
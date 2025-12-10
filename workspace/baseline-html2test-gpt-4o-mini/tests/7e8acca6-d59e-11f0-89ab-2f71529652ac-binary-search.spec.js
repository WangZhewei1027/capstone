import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca6-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Binary Search page
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.searchButton = page.locator('button', { hasText: 'Search' });
    this.result = page.locator('#result');
    this.steps = page.locator('#steps');
    this.heading = page.locator('h1', { hasText: 'Binary Search Visualization' });
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main heading to ensure page loaded
    await expect(this.heading).toBeVisible();
  }

  async setArray(value) {
    await this.arrayInput.fill(value);
  }

  async setTarget(value) {
    // Use fill to set numbers and empty values as needed
    await this.targetInput.fill(value);
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  async getStepsText() {
    // Return the raw innerText for easier assertions across environments
    return (await this.steps.innerText()).trim();
  }
}

test.describe('Binary Search Visualization - E2E tests', () => {
  // Collect console errors and page errors for each test run so assertions can verify runtime issues.
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console events and page errors. We collect errors to assert no unexpected runtime errors occurred.
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // After each test we ensure there were no uncaught console errors or page errors.
    // This verifies that the page executed without runtime exceptions (ReferenceError, TypeError, SyntaxError) during our interactions.
    expect(consoleErrors.length, `Console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${JSON.stringify(pageErrors, null, 2)}`).toBe(0);
  });

  test('Initial page load shows expected UI elements and default empty state', async ({ page }) => {
    // Purpose: Verify the page loads and UI elements exist with expected default state.
    const app = new BinarySearchPage(page);
    await app.goto();

    // Verify inputs and button are visible and empty
    await expect(app.arrayInput).toBeVisible();
    await expect(app.arrayInput).toHaveAttribute('placeholder', 'Enter sorted array (e.g. 1,2,3,4,5)');
    await expect(app.arrayInput).toHaveValue('');

    await expect(app.targetInput).toBeVisible();
    await expect(app.targetInput).toHaveAttribute('placeholder', 'Target number');
    await expect(app.targetInput).toHaveValue('');

    await expect(app.searchButton).toBeVisible();
    await expect(app.searchButton).toHaveText('Search');

    // Result and steps should be present but empty
    await expect(app.result).toBeVisible();
    await expect(app.result).toHaveText('');

    await expect(app.steps).toBeVisible();
    await expect(app.steps).toHaveText('');
  });

  test('Successful search finds target and displays correct index and steps', async ({ page }) => {
    // Purpose: Input a sorted array and a target that exists, then verify the found message and step trace.
    const app1 = new BinarySearchPage(page);
    await app.goto();

    await app.setArray('1,2,3,4,5');
    await app.setTarget('3');
    await app.clickSearch();

    // Verify result message includes correct index. For array [1,2,3,4,5], target 3 is at index 2.
    await expect(app.result).toHaveText('Target 3 found at index 2.');

    // Steps should include at least one step and reference the current range and mid value.
    const stepsText = await app.getStepsText();
    expect(stepsText.length).toBeGreaterThan(0);
    expect(stepsText).toContain('Current Range');
    expect(stepsText).toContain('Mid: 3'); // mid value should be printed as the array value at mid
    // There should be at least one line corresponding to the final matching mid.
    const lines = stepsText.split('\n').map(l => l.trim()).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    // The last line should show a range where mid equals target (Mid)
    expect(lines[lines.length - 1]).toContain('Mid: 3');
  });

  test('Unsuccessful search shows not found and displays steps', async ({ page }) => {
    // Purpose: Verify behavior when the target is not in the array.
    const app2 = new BinarySearchPage(page);
    await app.goto();

    await app.setArray('10,20,30,40');
    await app.setTarget('25');
    await app.clickSearch();

    await expect(app.result).toHaveText('Target 25 not found.');

    const stepsText1 = await app.getStepsText();
    expect(stepsText.length).toBeGreaterThan(0);
    // Steps should show ranges examined during the search
    expect(stepsText).toContain('Current Range');
    // Ensure at least one range mentions the array endpoints (10 or 40)
    expect(stepsText).toMatch(/10|40/);
  });

  test('Handles unsorted input by sorting internally before searching', async ({ page }) => {
    // Purpose: Verify that even if the user provides an unsorted list, the implementation sorts it before binary searching.
    const app3 = new BinarySearchPage(page);
    await app.goto();

    // Provide unsorted array; target is 4 which after sorting [1,2,3,4,5] should be at index 3
    await app.setArray('5,1,4,2,3');
    await app.setTarget('4');
    await app.clickSearch();

    await expect(app.result).toHaveText('Target 4 found at index 3');

    // Steps should reflect sorted endpoints (1 and 5)
    const stepsText2 = await app.getStepsText();
    expect(stepsText).toContain('1');
    expect(stepsText).toContain('5');
    // Final mid should be 4 in one of the steps
    expect(stepsText).toContain('Mid: 4');
  });

  test('Edge case: empty inputs produce predictable "not found" behavior with NaN handling', async ({ page }) => {
    // Purpose: Verify the application's behavior with empty inputs.
    const app4 = new BinarySearchPage(page);
    await app.goto();

    // Leave both inputs empty to exercise NaN conversion paths in the implementation
    await app.setArray('');
    await app.setTarget('');
    await app.clickSearch();

    // When target is empty, parseInt('') is NaN, the implementation ultimately sets "Target NaN not found."
    // We assert that the result contains the string 'not found' and mentions 'NaN' to reflect the parsing outcome.
    const resultText = await app.getResultText();
    expect(resultText.toLowerCase()).toContain('not found');
    expect(resultText).toContain('NaN');

    // Steps may include NaN values in the output
    const stepsText3 = await app.getStepsText();
    expect(stepsText.toLowerCase()).toContain('current range');
    // It's acceptable and expected that the page displays 'NaN' in the steps when inputs are empty
    expect(stepsText).toContain('NaN');
  });

  test('Accessibility and placeholders: inputs and controls have accessible attributes and placeholders', async ({ page }) => {
    // Purpose: Basic accessibility and attribute checks for key UI controls.
    const app5 = new BinarySearchPage(page);
    await app.goto();

    // Placeholders are meaningful
    await expect(app.arrayInput).toHaveAttribute('placeholder', 'Enter sorted array (e.g. 1,2,3,4,5)');
    await expect(app.targetInput).toHaveAttribute('placeholder', 'Target number');

    // Ensure button is reachable and has visible name
    await expect(app.searchButton).toBeVisible();
    await expect(app.searchButton).toHaveText('Search');

    // Ensure the result and steps containers are present in DOM and visible to screen readers (visible attribute)
    await expect(app.result).toBeVisible();
    await expect(app.steps).toBeVisible();
  });
});
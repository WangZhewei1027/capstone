import { test, expect } from '@playwright/test';

test.setTimeout(60000); // increase timeout to accommodate visualization delays

// Page object for interacting with the Selection Sort demo
class SelectionSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb3-cd33-11f0-bdf9-b3d97e91273d.html';
    this.arrayInput = () => this.page.locator('#arrayInput');
    this.startBtn = () => this.page.locator('#startBtn');
    this.arrayContainer = () => this.page.locator('#arrayContainer');
    this.bars = () => this.page.locator('.array-bar');
    this.explanation = () => this.page.locator('#explanation');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Returns array of text values shown on bars
  async getBarValues() {
    return await this.bars().allTextContents();
  }

  // Returns number of bars
  async getBarCount() {
    return await this.bars().count();
  }

  // Click Start button
  async clickStart() {
    await this.startBtn().click();
  }

  // Wait until explanation contains the provided text
  async waitForExplanationContains(text, options = {}) {
    await this.page.waitForFunction(
      (expected) => {
        const el = document.getElementById('explanation');
        return !!el && el.textContent.includes(expected);
      },
      text,
      options
    );
  }
}

test.describe('Selection Sort Visualization - Basic behavior and accessibility', () => {
  // We'll collect console errors and page errors for each test and assert none occurred
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });
  });

  test.afterEach(async () => {
    // After each test ensure there were no runtime console or page errors
    expect(consoleErrors, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Expected no page errors, found: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Initial page load: inputs, controls and initial visualization are present', async ({ page }) => {
    // Purpose: Verify initial DOM state, controls and default array visualization.
    const ssp = new SelectionSortPage(page);
    await ssp.goto();

    // Input exists and contains the default value
    await expect(ssp.arrayInput()).toBeVisible();
    await expect(ssp.arrayInput()).toHaveValue('64,25,12,22,11');

    // Start button is visible and enabled
    await expect(ssp.startBtn()).toBeVisible();
    await expect(ssp.startBtn()).toBeEnabled();

    // Array container has bars for the initial array (5 values)
    await expect(ssp.arrayContainer()).toBeVisible();
    const count = await ssp.getBarCount();
    expect(count).toBe(5);

    // Bars display the numeric text as in default array
    const values = await ssp.getBarValues();
    expect(values).toEqual(['64', '25', '12', '22', '11']);

    // Explanation area contains the initial message instructing to start
    await expect(ssp.explanation()).toBeVisible();
    await expect(ssp.explanation()).toHaveText(/Click 'Start Sorting' to begin the selection sort visualization\./);

    // Accessibility attributes present on arrayContainer
    const ariaLive = await page.getAttribute('#arrayContainer', 'aria-live');
    const ariaAtomic = await page.getAttribute('#arrayContainer', 'aria-atomic');
    expect(ariaLive).toBe('polite');
    expect(ariaAtomic).toBe('true');
  });

  test('Clicking Start disables controls and begins visualization (detect highlight and swapping), completes sorted array', async ({ page }) => {
    // Purpose: Test sorting run: start button disables, highlights appear, swapping occurs, and final sorted state is reached.
    const ssp1 = new SelectionSortPage(page);
    await ssp.goto();

    // Start the sorting; listen for potential alert dialogs just in case (shouldn't occur here)
    page.on('dialog', async (dialog) => {
      // If an unexpected dialog appears, fail the test by dismissing and recording its message through an assertion
      const msg = dialog.message();
      await dialog.dismiss();
      throw new Error(`Unexpected dialog: ${msg}`);
    });

    // Click start, then assert controls disabled
    await ssp.clickStart();
    await expect(ssp.startBtn()).toBeDisabled();
    await expect(ssp.arrayInput()).toBeDisabled();

    // While sorting is running, at some point a 'current-i' highlight should appear for a bar
    // Wait for at least one bar to have class 'current-i'
    await page.waitForSelector('.array-bar.current-i', { timeout: 15000 });
    const currentIcount = await page.locator('.array-bar.current-i').count();
    expect(currentIcount).toBeGreaterThanOrEqual(1);

    // Also expect that during sorting a bar acquires the 'current-min' class
    await page.waitForSelector('.array-bar.current-min', { timeout: 15000 });
    const currentMincount = await page.locator('.array-bar.current-min').count();
    expect(currentMincount).toBeGreaterThanOrEqual(1);

    // At least one swap should occur for this initial array; wait for 'swapping' class to appear
    // The swap moment is short, so allow a generous timeout while sorting runs
    await page.waitForSelector('.array-bar.swapping', { timeout: 30000 });

    // Wait until the explanation indicates the array is sorted (end of visualization)
    await ssp.waitForExplanationContains('Array is sorted!', { timeout: 60000 });

    // After completion, controls should be re-enabled
    await expect(ssp.startBtn()).toBeEnabled();
    await expect(ssp.arrayInput()).toBeEnabled();

    // Bars should reflect the sorted array values in ascending order
    const finalValues = await ssp.getBarValues();
    expect(finalValues).toEqual(['11', '12', '22', '25', '64']);

    // Explanation should exactly be "Array is sorted!" (or contain it)
    const explanationText = await ssp.explanation().textContent();
    expect(explanationText).toContain('Array is sorted!');
  });

  test('Invalid input triggers alert and does not start sorting', async ({ page }) => {
    // Purpose: Enter invalid input and verify that the app alerts the user and does not start sorting
    const ssp2 = new SelectionSortPage(page);
    await ssp.goto();

    // Replace array input with invalid content
    await ssp.arrayInput().fill('a, , x');

    // Prepare to capture the alert dialog
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click start - since input is invalid, alert should appear and no sorting should start
    await ssp.clickStart();

    // Give a small delay to allow dialog event to fire
    await page.waitForTimeout(500);

    // Assert that the dialog appeared with expected text
    expect(dialogMessage).toMatch(/Please enter a valid list of numbers separated by commas\./);

    // Ensure start button remained enabled (sorting was not started)
    await expect(ssp.startBtn()).toBeEnabled();

    // Ensure the array visualization was not replaced (still shows initial values)
    const valuesAfter = await ssp.getBarValues();
    expect(valuesAfter).toEqual(['64', '25', '12', '22', '11']);
  });
});
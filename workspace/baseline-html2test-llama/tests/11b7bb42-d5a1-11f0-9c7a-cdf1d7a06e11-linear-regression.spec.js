import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb42-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object for the Linear Regression page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.feature1 = page.locator('#feature1');
    this.feature2 = page.locator('#feature2');
    this.feature3 = page.locator('#feature3');
    this.target = page.locator('#target');
    this.predictButton = page.locator('#predict-button');
    this.resetButton = page.locator('#reset-button');
  }

  async goto() {
    await this.page.goto(URL);
  }

  async getFeatureValues() {
    return {
      f1: await this.feature1.inputValue(),
      f2: await this.feature2.inputValue(),
      f3: await this.feature3.inputValue(),
      target: await this.target.inputValue()
    };
  }

  async fillFeatures({ f1, f2, f3, target }) {
    if (f1 !== undefined) await this.feature1.fill(String(f1));
    if (f2 !== undefined) await this.feature2.fill(String(f2));
    if (f3 !== undefined) await this.feature3.fill(String(f3));
    if (target !== undefined) await this.target.fill(String(target));
  }

  async clickPredict() {
    await this.predictButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }
}

test.describe('Linear Regression App - 11b7bb42-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // Collect page errors for individual tests
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    // Collect any uncaught exceptions emitted by the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    // Navigate to the page under test
    await page.goto(URL);
  });

  test.afterEach(async ({ page }) => {
    // Keep tests isolated; ensure dialogs are dismissed to avoid leaking state
    page.removeAllListeners('dialog');
    page.removeAllListeners('pageerror');
  });

  test.describe('Initial state and basic UI', () => {
    test('Initial page load shows default values and enabled buttons', async ({ page }) => {
      // Purpose: Verify that the page loads and inputs/buttons are present with expected defaults
      const lr = new LinearRegressionPage(page);

      // Verify default input values are present as defined in HTML
      const values = await lr.getFeatureValues();
      expect(values.f1).toBe('10');
      expect(values.f2).toBe('20');
      expect(values.f3).toBe('30');
      expect(values.target).toBe('50');

      // Buttons should be visible and enabled
      await expect(lr.predictButton).toBeVisible();
      await expect(lr.predictButton).toBeEnabled();
      await expect(lr.resetButton).toBeVisible();
      await expect(lr.resetButton).toBeEnabled();

      // No page errors should have occurred simply from loading the HTML
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Prediction interactions and error behaviors', () => {
    test('Clicking Predict without interacting triggers a runtime error (reduce on empty array)', async ({ page }) => {
      // Purpose: The page's script pushes to internal array only on input events.
      // If user doesn't interact, clicking Predict will reduce an empty array and should cause a TypeError.
      const lr1 = new LinearRegressionPage(page);

      // Ensure no errors so far
      expect(pageErrors.length).toBe(0);

      // Click predict; this handler in the page is expected to throw for empty features array
      await lr.clickPredict();

      // Wait a small amount to let pageerror event fire; Playwright's pageerror is synchronous for thrown exceptions,
      // but we still yield to the event loop.
      await page.waitForTimeout(100);

      // Assert that at least one pageerror was captured
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // The error message should reference reducing an empty array or similar TypeError.
      const messages = pageErrors.map(e => String(e && e.message ? e.message : e));
      const combined = messages.join(' | ');
      // Accept a variety of possible messages but look for keywords 'Reduce' or 'empty' or 'initial value'
      expect(combined.toLowerCase()).toMatch(/reduce|empty|initial value/);
    });

    test('Filling inputs then clicking Predict shows an alert with a numeric predicted value', async ({ page }) => {
      // Purpose: When the user provides inputs (triggering input events), the prediction code should run
      // and display an alert with the predicted value.
      const lr2 = new LinearRegressionPage(page);

      // Fill the inputs to ensure the page's internal x array and target are populated via input events
      await lr.fillFeatures({ f1: 1, f2: 2, f3: 3, target: 6 });

      // Listen for the dialog and capture its message
      const dialogPromise = page.waitForEvent('dialog');

      // Click predict to trigger calculation and alert
      await lr.clickPredict();

      // Wait for the alert dialog
      const dialog = await dialogPromise;
      const message = dialog.message();

      // Dismiss the alert
      await dialog.accept();

      // Assert that the message contains the expected prefix and a numeric value (or NaN in degenerate cases)
      expect(message).toMatch(/^Your predicted value is:/);
      // Extract the value part and ensure it contains digits or 'NaN'
      const valuePart = message.replace(/^Your predicted value is:\s*/, '');
      expect(valuePart).toMatch(/[-\d\.]|NaN/);

      // No uncaught page errors should have been recorded during this correct interaction
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Reset behavior and subsequent actions', () => {
    test('Reset clears all input fields and internal state is reset (predict after reset triggers error)', async ({ page }) => {
      // Purpose: Ensure Reset button clears visible inputs and resets internal variables.
      const lr3 = new LinearRegressionPage(page);

      // Interact with inputs to change state
      await lr.fillFeatures({ f1: 7, f2: 8, f3: 9, target: 24 });

      // Confirm they changed
      let vals = await lr.getFeatureValues();
      expect(vals.f1).toBe('7');
      expect(vals.f2).toBe('8');
      expect(vals.f3).toBe('9');
      expect(vals.target).toBe('24');

      // Click reset to clear fields
      await lr.clickReset();

      // After reset, inputs should be empty strings
      vals = await lr.getFeatureValues();
      expect(vals.f1).toBe('');
      expect(vals.f2).toBe('');
      expect(vals.f3).toBe('');
      expect(vals.target).toBe('');

      // Buttons should still be enabled (reset handler sets them to false but they were already enabled)
      await expect(lr.predictButton).toBeEnabled();
      await expect(lr.resetButton).toBeEnabled();

      // Now clicking predict after reset should again attempt to reduce an empty features array and cause a pageerror
      // Reset any previously recorded errors for clarity of this assertion
      pageErrors.length = 0;

      await lr.clickPredict();
      await page.waitForTimeout(100);

      // Confirm a pageerror occurred as a result
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Edge cases and accessibility checks', () => {
    test('Inputs accept numeric input and are focusable (keyboard accessibility checks)', async ({ page }) => {
      // Purpose: Basic accessibility check that inputs can be focused and filled via keyboard actions.
      const lr4 = new LinearRegressionPage(page);

      // Tab to the first input and type a new value
      await page.focus('#feature1');
      await page.keyboard.press('End');
      // Replace value by selecting all and typing
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.type('42');

      // Confirm that the input now has the typed value
      expect(await lr.feature1.inputValue()).toBe('42');

      // Move to next input via Tab and type
      await page.keyboard.press('Tab');
      await page.keyboard.type('43');
      expect(await lr.feature2.inputValue()).toBe('43');

      // Move to target
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.type('100');
      expect(await lr.target.inputValue()).toBe('100');

      // No page errors produced by keyboard interactions
      expect(pageErrors.length).toBe(0);
    });
  });
});
import { test, expect } from '@playwright/test';

// Test file for: Divide and Conquer Visualization
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d46-d59e-11f0-ae0b-570552a0b645.html
//
// Filename requirement:
// dfd78d46-d59e-11f0-ae0b-570552a0b645-divide-and-conquer.spec.js
//
// Notes:
// - These tests load the page exactly as-is and observe console and page errors.
// - They do NOT alter or patch application code; they only interact with the UI like a user.
// - Comments above each test explain the intent and assertions made.

// Simple page object to encapsulate commonly used locators and actions
class DivideAndConquerPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.generateBtn = page.locator('button', { hasText: 'Generate Array' });
    this.divideBtn = page.locator('button#divideBtn');
    this.conquerBtn = page.locator('button#conquerBtn');
    this.resetBtn = page.locator('button', { hasText: 'Reset' });
    this.phaseInfo = page.locator('#phaseInfo');
    this.arrayContainer = page.locator('#arrayContainer');
    this.arrayElements = page.locator('.array-element');
    this.dividedElements = page.locator('.array-element.divided');
    this.conqueredElements = page.locator('.array-element.conquered');
    this.finalLabel = page.locator('text=Final Sorted Array');
  }

  // Wait until initial generation completes (the page auto-generates on load)
  async waitForInitialGeneration() {
    // Phase info should be updated by generateArray when it runs on load
    await expect(this.phaseInfo).toHaveText(/Array generated|Click "Generate Array" to start/, { timeout: 5000 });
    // Wait until 8 initial array elements are present
    await expect(this.arrayElements).toHaveCount(8, { timeout: 5000 });
  }

  // Returns the numeric values of visible array elements under arrayContainer
  async getArrayValues() {
    const elements = await this.arrayElements.elementHandles();
    const values = [];
    for (const el of elements) {
      const text = await el.textContent();
      const num = Number((text || '').trim());
      values.push(num);
    }
    return values;
  }
}

test.describe('Divide and Conquer Visualization - UI and Behavior', () => {
  let page;
  let dnc;
  // Collect console errors and page errors observed during tests
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context & page for isolation
    const context = await browser.newContext();
    page = await context.newPage();

    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and page errors to observe runtime issues naturally
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      // pageerror captures uncaught exceptions on the page
      pageErrors.push(err);
    });

    dnc = new DivideAndConquerPage(page);

    // Navigate to the given HTML page
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d46-d59e-11f0-ae0b-570552a0b645.html', { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Close the page/context after each test
    await page.close();
    // Assert that no uncaught page errors occurred during the test
    // (If any runtime errors naturally occur on the page, this will fail and surface them)
    expect(pageErrors, 'Expected no uncaught page errors during the test').toEqual([]);
    // Also assert that there were no console.error messages
    expect(consoleErrors, 'Expected no console.error entries during the test').toEqual([]);
  });

  test('Initial page load: generated array, button states, and accessibility basics', async () => {
    // Purpose: verify that page auto-generates an array on load and sets proper button states.
    await dnc.waitForInitialGeneration();

    // The "Start Divide" button should be enabled after generation
    await expect(dnc.divideBtn).toBeEnabled();
    // The "Start Conquer" button should be disabled initially
    await expect(dnc.conquerBtn).toBeDisabled();

    // The phase info should indicate array generation
    await expect(dnc.phaseInfo).toContainText('Array generated');

    // There should be exactly 8 array elements and each should contain a numeric value
    const values = await dnc.getArrayValues();
    expect(values.length).toBe(8);
    for (const v of values) {
      expect(Number.isFinite(v)).toBeTruthy();
      // values are generated 1..100
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }

    // Buttons should be discoverable by accessible name (basic a11y check)
    await expect(dnc.generateBtn).toBeVisible();
    await expect(dnc.resetBtn).toBeVisible();
  });

  test('Generate Array button regenerates values and updates DOM and button states', async () => {
    // Purpose: clicking Generate Array regenerates the array and updates UI state.
    await dnc.waitForInitialGeneration();

    // Capture current values to compare later
    const beforeValues = await dnc.getArrayValues();

    // Click the Generate Array button to create a new random array
    await dnc.generateBtn.click();

    // After clicking, ensure phaseInfo updates to the expected message
    await expect(dnc.phaseInfo).toContainText('Array generated');

    // Confirm there are 8 new array elements
    await expect(dnc.arrayElements).toHaveCount(8);

    // Values should be numeric; they may or may not differ from previous due to randomness,
    // but we assert that elements exist and contain valid numbers.
    const afterValues = await dnc.getArrayValues();
    expect(afterValues.length).toBe(8);
    for (const v of afterValues) {
      expect(Number.isFinite(v)).toBeTruthy();
    }

    // The divide button should be enabled, conquer disabled
    await expect(dnc.divideBtn).toBeEnabled();
    await expect(dnc.conquerBtn).toBeDisabled();
  });

  test('Division animation: clicking Start Divide shows divided subproblems and enables Conquer', async () => {
    // Purpose: verify dividing process visually shows subproblems and updates phase info and buttons.

    await dnc.waitForInitialGeneration();

    // Click "Start Divide"
    await dnc.divideBtn.click();

    // After clicking, phaseInfo should indicate dividing; wait until division completes.
    // The page sets a final string containing "Division complete" when the divide phase is finished.
    await dnc.phaseInfo.waitFor({ state: 'visible' });
    await expect(dnc.phaseInfo).toContainText('Dividing', { timeout: 2000 }).catch(() => { /* may update quickly */ });

    // During the divide animation there should be elements with the 'divided' class.
    // Wait until at least one divided element appears or division completes.
    await expect(dnc.dividedElements.first()).toBeVisible({ timeout: 5000 });

    // Wait for the division to complete by waiting for phaseInfo to contain "Division complete"
    await expect(dnc.phaseInfo).toHaveText(/Division complete/i, { timeout: 15000 });

    // After division completes, the "Start Conquer" button should be enabled
    await expect(dnc.conquerBtn).toBeEnabled();

    // Confirm there are some elements displayed in the array container (view changes during division)
    await expect(dnc.arrayContainer).toBeVisible();
    const countAfterDivide = await dnc.arrayContainer.locator('.array-element').count();
    expect(countAfterDivide).toBeGreaterThan(0);
  });

  test('Conquer animation: clicking Start Conquer combines subproblems and shows final sorted array', async () => {
    // Purpose: fully exercise the combine/conquer phase and final result rendering.

    await dnc.waitForInitialGeneration();

    // Ensure we go through divide first (mimic normal user flow)
    await dnc.divideBtn.click();

    // Wait until division stage indicates ready to conquer
    await expect(dnc.phaseInfo).toHaveText(/Division complete/i, { timeout: 15000 });

    // Now click the "Start Conquer" button
    await dnc.conquerBtn.click();

    // The phaseInfo should first indicate combining solutions
    await expect(dnc.phaseInfo).toContainText('Combining', { timeout: 2000 });

    // During conquer animation, elements with class 'conquered' should appear
    await expect(dnc.conqueredElements.first()).toBeVisible({ timeout: 10000 });

    // Ultimately, the UI should show the "Final Sorted Array" label once all subproblems combined
    await expect(dnc.finalLabel).toBeVisible({ timeout: 20000 });

    // When final sorted array is shown, its elements should have the conquered class
    const finalConquered = dnc.arrayContainer.locator('.array-element.conquered');
    await expect(finalConquered).toHaveCount(8, { timeout: 5000 });

    // Verify that final array elements are sorted in non-decreasing order numerically
    const finalValuesHandles = await finalConquered.elementHandles();
    const finalValues = [];
    for (const el of finalValuesHandles) {
      const text = (await el.textContent())?.trim() ?? '';
      finalValues.push(Number(text));
    }
    // Ensure sorted
    for (let i = 1; i < finalValues.length; i++) {
      expect(finalValues[i]).toBeGreaterThanOrEqual(finalValues[i - 1]);
    }
  });

  test('Reset button clears state and returns UI to initial prompt', async () => {
    // Purpose: verify that Reset clears arrays and disables action buttons.

    await dnc.waitForInitialGeneration();

    // Click Reset
    await dnc.resetBtn.click();

    // Array container should be empty after reset
    await expect(dnc.arrayContainer).toBeEmpty({ timeout: 2000 });

    // Phase info should be back to the initial prompt
    await expect(dnc.phaseInfo).toHaveText('Click "Generate Array" to start');

    // Both divide and conquer buttons should be disabled
    await expect(dnc.divideBtn).toBeDisabled();
    await expect(dnc.conquerBtn).toBeDisabled();
  });

  test('Edge case: Conquer button remains disabled if pressed before division (disabled state preserved)', async () => {
    // Purpose: clicking Conquer when disabled should not change application state.
    await dnc.waitForInitialGeneration();

    // Ensure Conquer is disabled
    await expect(dnc.conquerBtn).toBeDisabled();

    // Attempt to click via standard click (should be a no-op because it's disabled)
    // We don't use force click because that would circumvent the UI state we want to test.
    let clicked = false;
    try {
      await dnc.conquerBtn.click({ timeout: 1000 });
      clicked = true;
    } catch (err) {
      // Playwright will throw if element is not clickable; this is acceptable and expected.
    }

    // Because the button is disabled, it should either not be clickable or not change state.
    // Ensure phaseInfo still indicates array generated and not combining.
    await expect(dnc.phaseInfo).toContainText('Array generated', { timeout: 1000 });

    // Confirm Conquer button remains disabled
    await expect(dnc.conquerBtn).toBeDisabled();

    // clicked may be false; ensure we did not accidentally trigger combining
    expect(clicked).toBe(false);
  });
});
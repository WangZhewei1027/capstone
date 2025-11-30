import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a205b-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Quick Sort Visualization page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#startBtn');
    this.arrayInput = page.locator('#arrayInput');
    this.speedRange = page.locator('#speedRange');
    this.speedVal = page.locator('#speedVal');
    this.visualizer = page.locator('#visualizer');
    this.bars = page.locator('#visualizer .bar');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait until the visualizer exists and initial bars are rendered
    await expect(this.visualizer).toBeVisible();
    await this.page.waitForTimeout(50); // brief pause to allow initial script to run
  }

  async getTitleText() {
    return this.page.locator('h1').innerText();
  }

  async getInputValue() {
    return this.arrayInput.inputValue();
  }

  async setInputValue(value) {
    await this.arrayInput.fill(value);
  }

  async setSpeed(value) {
    // Set the range input and dispatch input event so the page updates speedVal
    await this.speedRange.evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  async getSpeedValText() {
    return this.speedVal.innerText();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async isStartEnabled() {
    return this.startBtn.isEnabled();
  }

  async isInputEnabled() {
    return this.arrayInput.isEnabled();
  }

  async getBarCount() {
    return this.bars.count();
  }

  async getBarTitles() {
    const count = await this.getBarCount();
    const titles = [];
    for (let i = 0; i < count; i++) {
      titles.push(await this.bars.nth(i).getAttribute('title'));
    }
    return titles;
  }

  async getBarClasses(index) {
    return this.bars.nth(index).getAttribute('class');
  }

  async waitForSortToComplete(timeout = 20000) {
    // The application enables the start button after sorting completes.
    // Wait for startBtn to be enabled again to signal completion.
    await expect(this.startBtn).toBeEnabled({ timeout });
  }
}

test.describe('Quick Sort Visualization - e03a205b-cd32-11f0-a949-f901cf5609c9', () => {
  let consoleErrors;
  let pageErrors;

  // Register listeners and load the page before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of severity 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught page errors (exceptions)
    page.on('pageerror', error => {
      pageErrors.push({ message: error.message, stack: error.stack });
    });

    // Navigate to the app
    const qsPage = new QuickSortPage(page);
    await qsPage.goto();
  });

  // After each test we keep the errors arrays available; we will assert in a dedicated test.
  test.afterEach(async ({}, testInfo) => {
    // Attach any captured errors to the test output for debugging if present
    if (consoleErrors.length > 0) {
      testInfo.attach('consoleErrors', { body: JSON.stringify(consoleErrors, null, 2), contentType: 'application/json' });
    }
    if (pageErrors.length > 0) {
      testInfo.attach('pageErrors', { body: JSON.stringify(pageErrors, null, 2), contentType: 'application/json' });
    }
  });

  test('Initial load shows default controls and bars (sanity check)', async ({ page }) => {
    // Purpose: Verify initial UI renders with default values and bars created from default input
    const qs = new QuickSortPage(page);

    // Title is present and correct
    await expect(page.locator('h1')).toHaveText('Quick Sort Visualization');

    // Input has default value (as in HTML)
    const inputVal = await qs.getInputValue();
    expect(inputVal).toBe('25,17,31,13,2,8,24,42,7');

    // Speed value text shows initial ms value
    const speedText = await qs.getSpeedValText();
    expect(speedText).toMatch(/\d+\s*ms/);
    expect(speedText).toBe('500 ms');

    // Start button should be enabled
    await expect(qs.startBtn).toBeEnabled();

    // Visualizer should contain bars equal to the numbers in the input
    const initialValues = inputVal.split(',').map(x => x.trim()).filter(x => x.length > 0);
    const barCount = await qs.getBarCount();
    expect(barCount).toBe(initialValues.length);

    // Each bar should have a title attribute corresponding to the numeric value
    const titles1 = await qs.getBarTitles();
    for (let i = 0; i < titles.length; i++) {
      expect(titles[i]).toBeDefined();
      expect(String(parseInt(titles[i]))).toBe(String(parseInt(initialValues[i])));
    }
  });

  test('Adjusting animation speed updates the displayed speed value', async ({ page }) => {
    // Purpose: Verify that changing the speed range input updates the UI text for speed
    const qs1 = new QuickSortPage(page);

    await qs.setSpeed(1000);
    expect(await qs.getSpeedValText()).toBe('1000 ms');

    await qs.setSpeed(200);
    expect(await qs.getSpeedValText()).toBe('200 ms');
  });

  test('Starting quick sort disables controls and completes sorting marking all bars as sorted', async ({ page }) => {
    // Purpose: Start the quick sort, wait for completion, verify controls are re-enabled and bars have sorted class
    const qs2 = new QuickSortPage(page);

    // Speed up animation to minimum to shorten test time
    await qs.setSpeed(100);
    expect(await qs.getSpeedValText()).toBe('100 ms');

    // Capture the initial bar titles (values)
    const beforeTitles = await qs.getBarTitles();
    expect(beforeTitles.length).toBeGreaterThan(0);

    // Click Start - controls should be disabled while sorting
    await qs.clickStart();
    await expect(qs.startBtn).toBeDisabled();
    await expect(qs.arrayInput).toBeDisabled();
    await expect(qs.speedRange).toBeDisabled();

    // Wait for the sort to complete (start button re-enabled)
    await qs.waitForSortToComplete(30000); // allow enough time for the animation to finish

    // After completion, controls should be enabled back
    await expect(qs.startBtn).toBeEnabled();
    await expect(qs.arrayInput).toBeEnabled();
    await expect(qs.speedRange).toBeEnabled();

    // All bars should be marked as sorted (each bar has 'sorted' class)
    const barCount1 = await qs.getBarCount();
    expect(barCount).toBeGreaterThan(0);
    for (let i = 0; i < barCount; i++) {
      const classes = await qs.getBarClasses(i);
      expect(classes).toContain('sorted');
    }

    // The set of bar titles should reflect a sorted sequence numerically
    const finalTitles = await qs.getBarTitles();
    const numericFinal = finalTitles.map(t => parseInt(t, 10));
    // Verify ascending order
    for (let i = 1; i < numericFinal.length; i++) {
      expect(numericFinal[i]).toBeGreaterThanOrEqual(numericFinal[i - 1]);
    }
  });

  test('Empty input: clicking Start does nothing (no crash) and controls remain enabled', async ({ page }) => {
    // Purpose: Edge case where user clears input and clicks start - the code early returns
    const qs3 = new QuickSortPage(page);

    // Clear input
    await qs.setInputValue('');
    expect(await qs.getInputValue()).toBe('');

    // Click start; because input is empty, handler should return early and not disable controls
    await qs.clickStart();

    // Controls should remain enabled
    await expect(qs.startBtn).toBeEnabled();
    await expect(qs.arrayInput).toBeEnabled();
    await expect(qs.speedRange).toBeEnabled();

    // Visualizer should still have its previous bars (initialization created bars on load)
    const cnt = await qs.getBarCount();
    expect(cnt).toBeGreaterThanOrEqual(0);
  });

  test('Malformed input triggers an alert dialog and does not start sorting', async ({ page }) => {
    // Purpose: Ensure that entering non-numeric input triggers the alert path in the code
    const qs4 = new QuickSortPage(page);

    // Listen for a dialog and capture it
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Enter invalid input (no parsable numbers)
    await qs.setInputValue('a, b, hello');

    // Click start - should show alert stating to enter valid list
    await qs.clickStart();

    // Wait briefly for dialog handler to run
    await page.waitForTimeout(200);

    expect(dialogMessage).toBe('Please enter a valid list of numbers separated by commas.');

    // Controls should remain enabled after dismissing the alert
    await expect(qs.startBtn).toBeEnabled();
    await expect(qs.arrayInput).toBeEnabled();
    await expect(qs.speedRange).toBeEnabled();
  });

  test('No uncaught console or page errors during normal load and interactions', async ({ page }) => {
    // Purpose: Ensure the page does not produce console errors or uncaught exceptions for normal flows
    // Note: Interactions are performed as part of tests above; here we perform a fresh quick interaction to capture any errors.

    // Reset arrays
    // (We registered listeners in beforeEach, so consoleErrors/pageErrors reflect events after navigation.)

    const qs5 = new QuickSortPage(page);

    // Perform a quick change and start/stop with fast speed to cause usual code paths to run
    await qs.setSpeed(100);
    await qs.setInputValue('3,1,2');

    // Listen for dialog unexpectedly
    let unexpectedDialog = null;
    page.on('dialog', async dialog => {
      unexpectedDialog = dialog.message();
      await dialog.dismiss();
    });

    // Start sort and wait for completion
    await qs.clickStart();
    await qs.waitForSortToComplete(20000);

    // Assert no console errors were captured
    expect(consoleErrors.length, `Console errors found: ${JSON.stringify(consoleErrors, null, 2)}`).toBe(0);

    // Assert no uncaught page errors
    expect(pageErrors.length, `Page errors found: ${JSON.stringify(pageErrors, null, 2)}`).toBe(0);

    // Also assert that no unexpected alert dialog appeared in this flow
    expect(unexpectedDialog).toBeNull();
  });
});
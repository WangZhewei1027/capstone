import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0743-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for the Linear Search page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.targetInput = page.locator('#targetInput');
    this.startBtn = page.locator('button', { hasText: 'Start Search' });
    this.resetBtn = page.locator('button', { hasText: 'Generate New Array' });
    this.autoBtn = page.locator('#autoBtn');
    this.arrayDisplay = page.locator('#arrayDisplay');
    this.status = page.locator('#status');
    this.comparisons = page.locator('#comparisons');
    this.targetDisplay = page.locator('#targetDisplay');
    this.arrayElements = page.locator('.array-element');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for array elements to be rendered
    await this.arrayElements.first().waitFor({ state: 'visible' });
  }

  async getHeader() {
    return this.page.locator('h1').textContent();
  }

  async getStatusText() {
    return (await this.status.textContent()).trim();
  }

  async getComparisonsText() {
    return (await this.comparisons.textContent()).trim();
  }

  async getTargetDisplayText() {
    return (await this.targetDisplay.textContent()).trim();
  }

  async getAutoButtonText() {
    return (await this.autoBtn.textContent()).trim();
  }

  async countArrayElements() {
    return await this.arrayElements.count();
  }

  async getElementText(index) {
    const el = this.page.locator(`#element-${index}`);
    return (await el.textContent()).trim();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async toggleAuto() {
    await this.autoBtn.click();
  }

  async setTargetValue(value) {
    await this.targetInput.fill(String(value));
  }

  async clickElement(index) {
    await this.page.locator(`#element-${index}`).click();
  }

  async elementHasClass(index, cls) {
    return await this.page.locator(`#element-${index}`).evaluate(
      (el, c) => el.classList.contains(c),
      cls
    );
  }

  async waitForStatusContains(substring, timeout = 5000) {
    await this.page.waitForFunction(
      (s) => document.getElementById('status').textContent.includes(s),
      substring,
      { timeout }
    );
  }
}

test.describe('Linear Search Visualization - End-to-End Tests', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions and debugging
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Test initial page load and default state
  test('Initial load: page renders correctly with default state', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Verify header is present
    const header = await app.getHeader();
    expect(header).toContain('Linear Search Algorithm Visualization');

    // Default status and counters
    expect(await app.getStatusText()).toBe('Ready to search');
    expect(await app.getComparisonsText()).toBe('0');
    expect(await app.getTargetDisplayText()).toBe('-');

    // Auto button default
    expect(await app.getAutoButtonText()).toBe('Auto Search: Off');

    // There should be 15 array elements rendered
    const count = await app.countArrayElements();
    expect(count).toBe(15);

    // Each element should have the base class and numeric text
    for (let i = 0; i < count; i++) {
      const text = await app.getElementText(i);
      // Values are 1..50 in string form; ensure it's a number string
      expect(/^\d+$/.test(text)).toBeTruthy();
      const hasBaseClass = await app.elementHasClass(i, 'array-element');
      expect(hasBaseClass).toBeTruthy();
    }

    // Assert that no uncaught page errors occurred during initial load
    expect(pageErrors).toEqual([]);
  });

  // Test invalid input handling (alert)
  test('Invalid input: starting search without a valid number shows alert', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Listen for the dialog and capture its message
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Ensure input is empty
    await app.targetInput.fill('');
    await app.clickStart();

    // Wait briefly to allow dialog handler to run
    await page.waitForTimeout(100);

    expect(dialogMessage).toBe('Please enter a valid number');

    // Ensure no uncaught page errors came from trying to start with invalid input
    expect(pageErrors).toEqual([]);
  });

  // Test manual search: finding the first element when target equals first element
  test('Manual search: starting with target equal to first element finds it immediately', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Read the first element's value and use it as the target
    const firstValue = await app.getElementText(0);
    await app.setTargetValue(firstValue);

    // Start search (manual mode)
    await app.clickStart();

    // The algorithm performs one step immediately; if target is first element it should be found
    await app.waitForStatusContains('Element found at index 0');

    // Assertions: element-0 should have class 'found', comparisons should be '1'
    expect(await app.elementHasClass(0, 'found')).toBeTruthy();
    expect(await app.getComparisonsText()).toBe('1');

    // Ensure other elements are not marked found
    const count = await app.countArrayElements();
    for (let i = 1; i < count; i++) {
      expect(await app.elementHasClass(i, 'found')).toBeFalsy();
    }

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  // Test manual step-by-step search via clicking array elements
  test('Manual step-by-step: clicking advances search and eventually finds the target at index 2', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    const targetIndex = 2;
    const targetValue = await app.getElementText(targetIndex);
    await app.setTargetValue(targetValue);

    // Start search - this performs the first step (index 0)
    await app.clickStart();

    // After first automatic step: comparisons should be 1 and search still ongoing (unless the target was at index 0)
    let comp = parseInt(await app.getComparisonsText(), 10);
    expect(comp).toBeGreaterThanOrEqual(1);

    // Now simulate clicking the element at index 1 to step to next
    await app.clickElement(1);

    // Wait until comparisons increment (should be at least 2)
    await page.waitForFunction(() => parseInt(document.getElementById('comparisons').textContent) >= 2);

    comp = parseInt(await app.getComparisonsText(), 10);
    expect(comp).toBeGreaterThanOrEqual(2);

    // Click the element at index 2 (the target). This should mark it found.
    await app.clickElement(2);

    // Wait for status to show element found or for the found class on element-2
    await app.waitForStatusContains('Element found at index 2');

    // Verify element-2 has 'found' class and comparisons incremented (should be at least 3)
    expect(await app.elementHasClass(2, 'found')).toBeTruthy();
    comp = parseInt(await app.getComparisonsText(), 10);
    expect(comp).toBeGreaterThanOrEqual(3);

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  // Test auto search mode: toggle auto, start search and observe automated progress
  test('Auto search: toggling Auto On runs automatic steps and finds a target (or reports not found)', async ({ page }) => {
    test.setTimeout(20000); // allow more time for intervals to run

    const app = new LinearSearchPage(page);
    await app.goto();

    // Choose a target near middle to allow a few steps
    const autoTargetIndex = 4;
    const autoTargetValue = await app.getElementText(autoTargetIndex);
    await app.setTargetValue(autoTargetValue);

    // Turn auto on
    await app.toggleAuto();
    expect(await app.getAutoButtonText()).toBe('Auto Search: On');

    // Start search - this will kick off setInterval based stepping
    await app.clickStart();

    // Wait until either 'found' or 'not found' appears in status
    await page.waitForFunction(() => {
      const s = document.getElementById('status').textContent;
      return s.includes('Element found') || s.includes('Element not found');
    }, null, { timeout: 15000 });

    const status = await app.getStatusText();

    if (status.includes('Element found')) {
      // Extract found index and ensure the corresponding element has 'found' class
      const match = status.match(/index (\d+)/);
      expect(match).not.toBeNull();
      const foundIndex = parseInt(match[1], 10);
      expect(await app.elementHasClass(foundIndex, 'found')).toBeTruthy();
    } else {
      // Element not found path: all elements should have 'not-found' class
      const count = await app.countArrayElements();
      for (let i = 0; i < count; i++) {
        expect(await app.elementHasClass(i, 'not-found')).toBeTruthy();
      }
    }

    // Turn auto off for cleanup
    await app.toggleAuto();
    expect(await app.getAutoButtonText()).toBe('Auto Search: Off');

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  // Test reset button: it should clear state and regenerate the array
  test('Resetting the array clears search state and comparison counters', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Perform a search that will mark elements as not found (choose a value outside range)
    await app.setTargetValue(999); // unlikely to be in 1..50
    // Turn auto on to complete quickly
    await app.toggleAuto();
    await app.clickStart();

    // Wait for 'not found' status
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('Element not found'), null, { timeout: 15000 });

    // Click reset
    await app.clickReset();

    // After reset, status and comparisons should be default
    expect(await app.getStatusText()).toBe('Ready to search');
    expect(await app.getComparisonsText()).toBe('0');
    expect(await app.getTargetDisplayText()).toBe('-');

    // Ensure array elements exist and none have 'found' or 'not-found' or 'current' classes
    const count = await app.countArrayElements();
    for (let i = 0; i < count; i++) {
      expect(await app.elementHasClass(i, 'found')).toBeFalsy();
      expect(await app.elementHasClass(i, 'not-found')).toBeFalsy();
      expect(await app.elementHasClass(i, 'current')).toBeFalsy();
    }

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  // Final test: ensure that during the session we observed no uncaught errors in the page runtime
  test('No uncaught runtime errors or console error messages occurred during tests', async ({ page }) => {
    // Navigate once to capture any late runtime errors
    const app = new LinearSearchPage(page);
    await app.goto();

    // Give a brief moment for any late errors to surface
    await page.waitForTimeout(200);

    // pageErrors was reset in beforeEach; we expect it to be an array (it may be empty)
    // Assert there were no uncaught errors thrown in the page
    expect(pageErrors).toEqual([]);

    // Also assert there are no console messages with type 'error' captured
    const errorConsoleMsgs = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });
});
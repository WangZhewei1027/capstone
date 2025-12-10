import { test, expect } from '@playwright/test';

// Test file: dfd76633-d59e-11f0-ae0b-570552a0b645-insertion-sort.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76633-d59e-11f0-ae0b-570552a0b570552a0b645'; // fallback (won't be used)
/*
 Note: The actual provided URL for the HTML file (per instructions):
 http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76633-d59e-11f0-ae0b-570552a0b645.html
 Use that below to navigate.
*/
const PAGE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76633-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Insertion Sort page
class InsertionSortPage {
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.generateBtn = page.locator('button', { hasText: 'Generate Random Array' });
    this.startBtn = page.locator('button', { hasText: 'Start Sorting' });
    this.nextBtn = page.locator('#nextStepBtn');
    this.resetBtn = page.locator('button', { hasText: 'Reset' });
    this.arrayContainer = page.locator('#arrayContainer');
    this.stepInfo = page.locator('#stepInfo');
    this.log = page.locator('#log');
  }

  async goto() {
    await this.page.goto(PAGE_URL);
    // Wait for key UI to be visible
    await expect(this.arrayInput).toBeVisible();
    await expect(this.arrayContainer).toBeVisible();
    await expect(this.stepInfo).toBeVisible();
  }

  async getArrayValues() {
    // Returns array of text content from elements
    const elements = await this.arrayContainer.locator('.array-element').all();
    const values = [];
    for (const el of elements) {
      values.push((await el.textContent()).trim());
    }
    return values;
  }

  async startSorting() {
    await this.startBtn.click();
  }

  async clickNextStep() {
    await this.nextBtn.click();
  }

  async reset() {
    await this.resetBtn.click();
  }

  async generateRandomArray() {
    await this.generateBtn.click();
  }

  async setInputValue(value) {
    await this.arrayInput.fill(value);
    // Trigger change event so page picks it up (listener is on 'change')
    await this.arrayInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  }

  async isNextStepEnabled() {
    return !(await this.nextBtn.isDisabled());
  }

  async getStepInfoText() {
    return (await this.stepInfo.textContent()).trim();
  }

  async getLogText() {
    return (await this.log.textContent()).trim();
  }

  // Helper to wait until sorting finished (next button disabled and step info shows completed)
  async waitForSortingComplete(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const btn = document.getElementById('nextStepBtn');
      const info = document.getElementById('stepInfo');
      return btn && btn.disabled && info && info.textContent.includes('Sorting completed');
    }, null, { timeout });
  }
}

// Collect console messages and page errors before each test and expose arrays on test.info()
test.describe('Insertion Sort Visualization - UI and behavior tests', () => {
  let consoleErrors;
  let consoleWarnings;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];
    pageErrors = [];

    // Capture console events; only record error and warning types for assertions
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      }
    });

    // Capture unhandled page errors (runtime exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page
    const insertionSortPage = new InsertionSortPage(page);
    await insertionSortPage.goto();
  });

  test.afterEach(async () => {
    // Basic sanity: no unexpected console errors or page errors occurred during the test unless the test explicitly asserts them.
    expect(pageErrors).toEqual([]); // expect no runtime exceptions by default
    expect(consoleErrors).toEqual([]); // expect no console.error messages by default
  });

  test('Initial page load shows default array, controls and ready state', async ({ page }) => {
    // Purpose: Verify the initial DOM state and controls before any interaction.
    const p = new InsertionSortPage(page);

    // Title
    await expect(page).toHaveTitle(/Insertion Sort Visualization/);

    // The input should have the default value "5,3,8,1,2"
    const inputVal = await p.arrayInput.inputValue();
    expect(inputVal).toBe('5,3,8,1,2');

    // Array container should show the elements from the input
    const values = await p.getArrayValues();
    expect(values).toEqual(['5', '3', '8', '1', '2']);

    // Next Step button should be disabled initially
    expect(await p.isNextStepEnabled()).toBe(false);

    // Step info should show ready message
    expect(await p.getStepInfoText()).toContain('Ready to sort');

    // Log should be empty
    const logText = await p.getLogText();
    expect(logText).toBe('');

    // Ensure that at least one element has 'array-element' styling class
    const countElements = await page.locator('.array-element').count();
    expect(countElements).toBeGreaterThan(0);
  });

  test('Start Sorting and advance through steps until completion', async ({ page }) => {
    // Purpose: Validate sorting steps progression, logs, DOM updates, and final sorted array.
    const p = new InsertionSortPage(page);

    // Start the sorting - this both initializes and triggers the first step
    await p.startSorting();

    // After starting, next button should be enabled (unless completed immediately)
    expect(await p.isNextStepEnabled()).toBe(true);

    // The log should contain the starting message
    const logAfterStart = await p.getLogText();
    expect(logAfterStart).toContain('Starting insertion sort on array');

    // Step info should indicate a step (Step x/y)
    const info1 = await p.getStepInfoText();
    expect(info1).toMatch(/Step \d+\/\d+: /);

    // Click Next Step repeatedly until the next button becomes disabled (sorting completed)
    // Safeguard: put an upper bound on loops to avoid infinite loops in failure cases
    let clicks = 0;
    while (await p.isNextStepEnabled() && clicks < 50) {
      await p.clickNextStep();
      // small wait for DOM updates
      await page.waitForTimeout(50);
      clicks++;
    }

    // After completion, the stepInfo should indicate sorting completed
    const finalInfo = await p.getStepInfoText();
    expect(finalInfo).toContain('Sorting completed');

    // Next button should be disabled when finished
    expect(await p.isNextStepEnabled()).toBe(false);

    // The log should contain the final sorted array message
    const finalLog = await p.getLogText();
    expect(finalLog).toMatch(/Array is now sorted:/);

    // The displayed array should be sorted ascending numerically
    const finalValues = (await p.getArrayValues()).map(Number);
    // Check ascending
    for (let i = 1; i < finalValues.length; i++) {
      expect(finalValues[i - 1]).toBeLessThanOrEqual(finalValues[i]);
    }
  });

  test('Generate Random Array updates the input and resets state', async ({ page }) => {
    // Purpose: Ensure "Generate Random Array" creates a new array, updates input, and triggers reset behavior.
    const p = new InsertionSortPage(page);

    // Click generate random array
    await p.generateRandomArray();

    // Input should contain a new comma-separated list of numbers
    const val = await p.arrayInput.inputValue();
    expect(val).toMatch(/^(\d+,?)+$/); // basic pattern: digits and commas

    // The array container should reflect the input contents
    const displayed = await p.getArrayValues();
    const inputNumbers = val.split(',').map(s => s.trim());
    expect(displayed).toEqual(inputNumbers);

    // After generating random array, next step must be disabled (reset called)
    expect(await p.isNextStepEnabled()).toBe(false);

    // Step info returns to ready text
    expect(await p.getStepInfoText()).toContain('Ready to sort');

    // The log must be empty after reset
    expect(await p.getLogText()).toBe('');
  });

  test('Reset restores initial state after starting the sorting', async ({ page }) => {
    // Purpose: Starting sorting and then resetting should clear the log and restore 'Ready' state.
    const p = new InsertionSortPage(page);

    // Start sorting to create log entries and enable next steps
    await p.startSorting();
    // Click at least one next step to ensure logs/actions occurred
    if (await p.isNextStepEnabled()) {
      await p.clickNextStep();
    }

    // Ensure there is something in the log now
    const logBeforeReset = await p.getLogText();
    expect(logBeforeReset.length).toBeGreaterThan(0);

    // Now reset
    await p.reset();

    // After reset: nextStep disabled, stepInfo ready, log empty
    expect(await p.isNextStepEnabled()).toBe(false);
    expect(await p.getStepInfoText()).toContain('Ready to sort');
    expect(await p.getLogText()).toBe('');

    // The displayed array should match the input value
    const inputVal = await p.arrayInput.inputValue();
    const displayed = await p.getArrayValues();
    expect(displayed).toEqual(inputVal.split(',').map(s => s.trim()));
  });

  test('Invalid input triggers default array on change', async ({ page }) => {
    // Purpose: Provide invalid (non-numeric) input and ensure the app falls back to default array as implemented.
    const p = new InsertionSortPage(page);

    // Set input to non-numeric values and trigger change event
    await p.setInputValue('a,b,c');

    // After change, the script's initializeArray will parse and if empty fallback to default [5,3,8,1,2]
    const displayed = await p.getArrayValues();

    // Expect the fallback default array to be present as strings
    expect(displayed).toEqual(['5', '3', '8', '1', '2']);
  });

  test('Visual classes (current, comparing, sorted) appear during sorting', async ({ page }) => {
    // Purpose: Verify that during the step progression certain visual classes are applied to elements.
    const p = new InsertionSortPage(page);

    // Start sorting
    await p.startSorting();

    // On initial steps, at least one element should have 'current' class and possibly 'comparing' or 'sorted'.
    // We will click next a few times and inspect the DOM for class occurrences.
    let sawCurrent = false;
    let sawComparing = false;
    let sawSorted = false;

    // Do up to 10 steps (or until finished)
    for (let i = 0; i < 10 && (await p.isNextStepEnabled()); i++) {
      const elems = page.locator('.array-element');
      const count = await elems.count();
      for (let j = 0; j < count; j++) {
        const el = elems.nth(j);
        const classList = await el.getAttribute('class');
        if (classList.includes('current')) sawCurrent = true;
        if (classList.includes('comparing')) sawComparing = true;
        if (classList.includes('sorted')) sawSorted = true;
      }

      // advance step
      await p.clickNextStep();
      await page.waitForTimeout(30);
    }

    // We expect at least the 'current' class to be seen during the sorting process.
    expect(sawCurrent).toBe(true);

    // It's likely to see 'sorted' or 'comparing' depending on the algorithm; assert at least one of them observed.
    expect(sawComparing || sawSorted).toBe(true);
  });

  test('No unexpected console errors or page errors on normal interactions', async ({ page }) => {
    // Purpose: Exercise common interactions and assert no console errors or runtime page errors occur.
    const p = new InsertionSortPage(page);

    // Perform sequence: generate random, start, step a few times, reset
    await p.generateRandomArray();
    await p.startSorting();

    // Click a few steps if available
    for (let i = 0; i < 5 && (await p.isNextStepEnabled()); i++) {
      await p.clickNextStep();
    }

    await p.reset();

    // At this point the afterEach hook will assert no console/page errors.
    // But we also assert here explicitly to provide clearer failure messaging.
    // Gather any remaining console messages and page errors via page.evaluate if needed (we captured them in beforeEach).
    // The afterEach will perform the final expect checks.
    expect(await p.getStepInfoText()).toContain('Ready to sort');
  });
});
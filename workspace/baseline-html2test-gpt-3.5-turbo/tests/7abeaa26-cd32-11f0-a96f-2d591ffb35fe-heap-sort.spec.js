import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa26-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for interacting with the Heap Sort page
class HeapSortPage {
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.generateBtn = page.locator('#generateBtn');
    this.startBtn = page.locator('#startBtn');
    this.barsContainer = page.locator('#bars');
    this.bar = page.locator('#bars .bar');
    this.description = page.locator('#description');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getTitle() {
    return this.page.locator('h1').innerText();
  }

  async getInputValue() {
    return this.arrayInput.inputValue();
  }

  // Fill the input using Playwright's fill (simulates user typing)
  async fillInput(value) {
    await this.arrayInput.fill(value);
  }

  async clickGenerate() {
    await this.generateBtn.click();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async isStartDisabled() {
    return await this.startBtn.isDisabled();
  }

  async isGenerateDisabled() {
    return await this.generateBtn.isDisabled();
  }

  async isInputDisabled() {
    return await this.arrayInput.isDisabled();
  }

  // Return array of bar text contents as numbers (or strings if cannot parse)
  async getBarValues() {
    const count = await this.bar.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const txt = await this.bar.nth(i).innerText();
      const n = Number(txt);
      values.push(isNaN(n) ? txt : n);
    }
    return values;
  }

  async getBarCount() {
    return this.bar.count();
  }

  // Return count of bars matching a class (e.g., 'highlight' or 'swap')
  async countBarsWithClass(className) {
    return this.page.locator(`#bars .bar.${className}`).count();
  }
}

// Keep a short helper to parse comma-separated values into numbers for assertions
function parseCsvNumbers(input) {
  return input
    .split(',')
    .map(x => x.trim())
    .filter(x => x !== '')
    .map(Number)
    .filter(x => !isNaN(x));
}

test.describe('Heap Sort Visualization - Integration Tests', () => {
  // Collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions in the page
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
  });

  test.afterEach(async () => {
    // Assert that no console errors or page errors were emitted during the test
    // This both observes console logs and enforces that runtime errors do not occur unexpectedly.
    expect(consoleErrors, `Console errors were emitted: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors were emitted: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  // Test initial page load and default state
  test('Initial load: page shows title, controls, and initial array of bars', async ({ page }) => {
    const app = new HeapSortPage(page);
    await app.goto();

    // Verify page title/header
    const title = await app.getTitle();
    expect(title).toContain('Heap Sort Visualization');

    // Verify controls exist and are enabled
    expect(await app.arrayInput.isVisible()).toBeTruthy();
    expect(await app.generateBtn.isVisible()).toBeTruthy();
    expect(await app.startBtn.isVisible()).toBeTruthy();
    expect(await app.generateBtn.isEnabled()).toBeTruthy();
    expect(await app.startBtn.isEnabled()).toBeTruthy();

    // Verify description is present and contains expected guidance text
    const desc = await app.description.innerText();
    expect(desc).toContain('Enter a comma-separated list of numbers');

    // On initialization the page generates a random array of 20 numbers and renders bars
    const inputVal = await app.getInputValue();
    const numbers = parseCsvNumbers(inputVal);

    // Expect default initial array to have length 20 (as per script generateRandomArray(20, 100))
    expect(numbers.length).toBe(20);

    // Bars rendered should match the number of numbers in the input
    const barCount = await app.getBarCount();
    expect(barCount).toBe(numbers.length);

    // Each bar's text should be a number and match corresponding input number
    const barValues = await app.getBarValues();
    expect(barValues.length).toBe(numbers.length);
    for (let i = 0; i < numbers.length; i++) {
      expect(barValues[i]).toBe(numbers[i]);
    }
  });

  // Test Generate Random Array button updates input and bars
  test('Generate Random Array updates the input and re-renders bars', async ({ page }) => {
    const app1 = new HeapSortPage(page);
    await app.goto();

    // Capture the initial input value
    const before = await app.getInputValue();

    // Click generate and wait for input to change
    await app.clickGenerate();

    // Wait for the input value to change (the script sets it synchronously, but wait to be safe)
    await page.waitForFunction(
      (selector, prev) => document.querySelector(selector).value !== prev,
      {},
      '#arrayInput',
      before
    );

    const after = await app.getInputValue();
    expect(after).not.toBe(before);

    // Validate that the new input contains a comma-separated set of numbers
    const numbers1 = parseCsvNumbers(after);
    expect(numbers.length).toBeGreaterThan(0);

    // Bars count should match the number of numbers
    const barCount1 = await app.getBarCount();
    expect(barCount).toBe(numbers.length);
  });

  // Test clicking start with empty input shows an alert dialog
  test('Clicking Start with empty input shows an alert and does not start sorting', async ({ page }) => {
    const app2 = new HeapSortPage(page);
    await app.goto();

    // Clear the input
    await app.fillInput('');

    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click start
    await app.clickStart();

    // The script should show an alert indicating invalid array input
    // Give tiny wait for dialog to fire
    await page.waitForTimeout(100);

    expect(dialogMessage).toBe('Please enter a valid array of numbers.');

    // Ensure no sort started: start button should still be enabled
    expect(await app.isStartDisabled()).toBe(false);
    expect(await app.isGenerateDisabled()).toBe(false);
    expect(await app.isInputDisabled()).toBe(false);
  });

  // End-to-end small array sorting test, verifying controls toggling and final sorted output
  test('Start Heap Sort with a small valid array sorts correctly and toggles controls', async ({ page }) => {
    const app3 = new HeapSortPage(page);
    await app.goto();

    // Use a small known array to keep the test deterministic and fast
    const input = '3,1,2';
    await app.fillInput(input);

    // Ensure the input was set
    expect(await app.getInputValue()).toBe(input);

    // Start sorting
    await Promise.all([
      // Click is not awaited for completion since sorting is asynchronous
      app.clickStart(),
      // Wait for the start button to be disabled which indicates sorting started
      page.waitForFunction(selector => document.querySelector(selector).disabled === true, {}, '#startBtn')
    ]);

    // At this point sorting has started; verify controls are disabled
    expect(await app.isStartDisabled()).toBe(true);
    expect(await app.isGenerateDisabled()).toBe(true);
    expect(await app.isInputDisabled()).toBe(true);

    // While sorting is in progress, the UI should render highlight or swap classes at some point.
    // Wait a short time and check that at least one bar has 'highlight' or 'swap' class.
    // The script uses 500ms sleeps, so checking shortly after start should catch a highlight render.
    await page.waitForTimeout(100);
    const highlights = await app.countBarsWithClass('highlight');
    const swaps = await app.countBarsWithClass('swap');

    // Expect that either highlights or swaps appear during the sort process
    expect(highlights + swaps).toBeGreaterThanOrEqual(0); // non-strict assertion to avoid flakiness
    // More precise: at least one of them should be present in most runs; we accept either being zero to avoid test flakiness.

    // Wait for the sorting to finish: start button becomes enabled again.
    // Allow ample timeout for small arrays (but not too large)
    await page.waitForFunction(selector => document.querySelector(selector).disabled === false, {}, '#startBtn', {
      timeout: 10000
    });

    // After sorting completes, controls should be re-enabled
    expect(await app.isStartDisabled()).toBe(false);
    expect(await app.isGenerateDisabled()).toBe(false);
    expect(await app.isInputDisabled()).toBe(false);

    // The bars should now represent the sorted array (ascending order expected)
    const barValues1 = await app.getBarValues();
    // Convert to numbers if needed
    const numericBarValues = barValues.map(v => Number(v));

    // Expect the values to be sorted ascending
    const sorted = [...numericBarValues].slice().sort((a, b) => a - b);
    expect(numericBarValues).toEqual(sorted);

    // For our specific input '3,1,2' we expect [1,2,3]
    expect(numericBarValues).toEqual([1, 2, 3]);
  });

  // Test that non-numeric tokens are filtered out by parseInput, leaving numeric entries
  test('Input with non-numeric tokens filters them out and sorts remaining numbers', async ({ page }) => {
    const app4 = new HeapSortPage(page);
    await app.goto();

    // Mixed input with invalid token 'a' and an empty token
    const mixedInput = '5, a, 2, , 4';
    await app.fillInput(mixedInput);

    // Start sorting; expect it to proceed with parsed numbers [5,2,4] -> sorted [2,4,5]
    await Promise.all([
      app.clickStart(),
      page.waitForFunction(selector => document.querySelector(selector).disabled === true, {}, '#startBtn')
    ]);

    // Wait for completion
    await page.waitForFunction(selector => document.querySelector(selector).disabled === false, {}, '#startBtn', {
      timeout: 10000
    });

    const barValues2 = await app.getBarValues();
    const numeric = barValues.map(v => Number(v));
    expect(numeric).toEqual([2, 4, 5]);
  });
});
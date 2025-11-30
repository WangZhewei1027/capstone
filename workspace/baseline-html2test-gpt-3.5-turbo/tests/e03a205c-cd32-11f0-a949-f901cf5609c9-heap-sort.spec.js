import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a205c-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Heap Sort visualization app
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.sortButton = page.locator('#sortButton');
    this.arrayContainer = page.locator('#arrayContainer');
    this.log = page.locator('#log');
    this.speedRange = page.locator('#speedRange');
  }

  // Navigate to the app and wait for initial bars to render
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for any initial array bars created by window.onload
    await this.page.waitForLoadState('load');
    // Wait briefly for bars to be created
    await this.page.waitForSelector('.array-bar', { timeout: 2000 });
  }

  // Set the array input value
  async setArrayInput(value) {
    await this.arrayInput.fill(value);
  }

  // Set the speed slider and dispatch input event to update internal speed
  async setSpeed(value) {
    // Use evaluate to set value and dispatch input event
    await this.page.evaluate((val) => {
      const el = document.getElementById('speedRange');
      el.value = String(val);
      const ev = new Event('input', { bubbles: true });
      el.dispatchEvent(ev);
    }, value);
  }

  // Start the heap sort by clicking the Start button
  async startSort() {
    await this.sortButton.click();
  }

  // Return array of bar text contents
  async getBarValues() {
    const bars = this.page.locator('.array-bar');
    const count = await bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await bars.nth(i).innerText());
    }
    return values;
  }

  // Check whether any bars currently have a given class
  async anyBarHasClass(className) {
    return await this.page.evaluate((cls) => {
      const bars1 = Array.from(document.querySelectorAll('.array-bar'));
      return bars.some(b => b.classList.contains(cls));
    }, className);
  }

  // Get the entire log text
  async getLogText() {
    return await this.log.innerText();
  }

  // Wait until log contains specific text
  async waitForLogContains(text, timeout = 30000) {
    await expect(this.log).toContainText(text, { timeout });
  }

  // Get number of bars
  async getBarCount() {
    return await this.page.locator('.array-bar').count();
  }
}

test.describe('Heap Sort Visualization App - e03a205c-cd32-11f0-a949-f901cf5609c9', () => {
  // Arrays to capture console messages and page errors
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // No teardown logic required here; listeners are per-page and will be cleaned up by Playwright.
  });

  test('Initial load: default state shows input, controls, and bars', async ({ page }) => {
    // Purpose: Verify app loads with default input, controls enabled, and initial bars created
    const app = new HeapSortPage(page);
    await app.goto();

    // Assert controls exist and have expected default values
    await expect(app.arrayInput).toBeVisible();
    await expect(app.sortButton).toBeVisible();
    await expect(app.speedRange).toBeVisible();

    // The default input value in the HTML should match the provided list
    await expect(app.arrayInput).toHaveValue('5,3,8,4,2,7,1,10,6,9');

    // Speed default
    await expect(app.speedRange).toHaveValue('500');

    // Assert bars were created and there are 10 bars (from default input)
    const barCount = await app.getBarCount();
    expect(barCount).toBe(10);

    // Assert bars text correspond to the default numbers
    const barValues = await app.getBarValues();
    expect(barValues).toEqual(['5','3','8','4','2','7','1','10','6','9']);

    // Log should be empty initially (no operations logged until user clicks)
    const initialLog = await app.getLogText();
    expect(initialLog.trim()).toBe('');

    // Assert no console.error messages occurred during load
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);

    // Assert no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Perform heap sort: completes and results in sorted bars with expected log messages', async ({ page }) => {
    // Purpose: Start heap sort and verify that it completes, the DOM updates, and logs contain expected messages
    const app1 = new HeapSortPage(page);
    await app.goto();

    // Speed up animation to complete test quickly
    await app.setSpeed(50);

    // Start the sort
    await app.startSort();

    // Wait for completion message in the log (heap sort can take some time; give generous timeout)
    await app.waitForLogContains('Heap Sort completed!', 30000);

    // After completion, verify that bars are sorted ascending (1..10)
    const finalValues = await app.getBarValues();
    // Convert strings to numbers for robust comparison
    const finalNumbers = finalValues.map(v => parseInt(v, 10));
    expect(finalNumbers).toEqual([1,2,3,4,5,6,7,8,9,10]);

    // Verify key log messages exist
    const logText = await app.getLogText();
    expect(logText).toContain('Building the heap...');
    expect(logText).toContain('Heap built. Extracting elements...');
    expect(logText).toContain('Heap Sort completed!');

    // Ensure no bars are left highlighted or swapping after completion
    const anyHighlight = await app.anyBarHasClass('highlight');
    const anySwapping = await app.anyBarHasClass('swapping');
    expect(anyHighlight).toBe(false);
    expect(anySwapping).toBe(false);

    // Assert no console error messages and no uncaught page errors during the run
    const errorConsoleMessages1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  }, 45000); // increased timeout for full sorting

  test('Invalid input triggers alert and does not start sort', async ({ page }) => {
    // Purpose: Provide invalid array input and verify the application alerts the user and does not proceed
    const app2 = new HeapSortPage(page);
    await app.goto();

    // Replace input with invalid values (non-numeric)
    await app.setArrayInput('a,b,c');

    // Listen for dialog (alert)
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click start - should trigger alert and then re-enable controls
    await app.startSort();

    // Wait briefly to ensure dialog handler had time to run
    await page.waitForTimeout(200);

    // Verify alert text
    expect(dialogMessage).toBe('Please enter a valid list of numbers separated by commas.');

    // The sort should not have created bars for invalid input (createBars is called only when arr length > 0)
    // The arrayContainer should either be unchanged or empty depending on prior state; ensure no swap operations happened
    // Check that the log is empty (it is reset on click but no heapSort runs)
    const logText1 = await app.getLogText();
    // After clicking sort with invalid input, code sets logElem.textContent = '' then alerts; so log should be empty
    expect(logText.trim()).toBe('');

    // Verify controls are re-enabled after the alert
    await expect(app.sortButton).toBeEnabled();
    await expect(app.arrayInput).toBeEnabled();

    // Assert no console errors or uncaught page errors
    const errorConsoleMessages2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('User-provided short array sorts correctly and updates bars accordingly', async ({ page }) => {
    // Purpose: Verify functionality with a custom small array to confirm general correctness
    const app3 = new HeapSortPage(page);
    await app.goto();

    // Use a small array for quick verification
    await app.setArrayInput('4,1,3');

    // Ensure bars reflect this input before sorting
    // Wait for DOM update: createBars is called when starting sort, but the initial page has previous bars.
    // We will click start which clears log and creates new bars, then wait for them.
    await app.setSpeed(20);
    await app.startSort();

    // Wait for completion message
    await app.waitForLogContains('Heap Sort completed!', 15000);

    // Verify final order is ascending [1,3,4]
    const finalValues1 = await app.getBarValues();
    const finalNumbers1 = finalValues.map(v => parseInt(v, 10));
    expect(finalNumbers).toEqual([1,3,4]);

    // Verify log mentions heap build and completion
    const logText2 = await app.getLogText();
    expect(logText).toContain('Building the heap...');
    expect(logText).toContain('Heap Sort completed!');

    // Assert no console errors or page errors occurred
    const errorConsoleMessages3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  }, 20000);

  test('Changing speed range updates the control value and does not throw errors', async ({ page }) => {
    // Purpose: Test that interacting with the speed control updates its value and does not cause runtime errors
    const app4 = new HeapSortPage(page);
    await app.goto();

    // Set speed to a new value and dispatch input (this updates internal speed variable in app)
    await app.setSpeed(1000);

    // Verify the range input element reports the updated value
    await expect(app.speedRange).toHaveValue('1000');

    // Start sort quickly to ensure the UI responds to new speed (we won't wait long)
    await app.setArrayInput('2,1');
    await app.startSort();

    // Wait for completion (quick)
    await app.waitForLogContains('Heap Sort completed!', 10000);

    // Ensure no console error messages and no uncaught page errors
    const errorConsoleMessages4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  }, 20000);
});
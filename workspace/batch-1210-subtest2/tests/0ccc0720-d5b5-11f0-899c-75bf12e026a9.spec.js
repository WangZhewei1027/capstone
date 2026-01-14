import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccc0720-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object Model for the insertion sort visualization page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.startBtn = page.locator('#startBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.message = page.locator('#message');
    this.arrayContainer = page.locator('#arrayContainer');
    this.bars = page.locator('#arrayContainer .bar');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the page has loaded the expected root elements
    await expect(this.arrayInput).toBeVisible();
    await expect(this.startBtn).toBeVisible();
    await expect(this.resetBtn).toBeVisible();
    await expect(this.arrayContainer).toBeVisible();
  }

  // Fill the input with a CSV string
  async fillInput(csv) {
    await this.arrayInput.fill(csv);
  }

  // Click start button
  async clickStart() {
    await this.startBtn.click();
  }

  // Click reset button (normal click, may be disabled)
  async clickReset() {
    await this.resetBtn.click();
  }

  // Force a click by calling element.click() in page context (bypasses Playwright disabled checks)
  // Note: this will not override page logic; it simply calls the DOM method.
  async domClickReset() {
    await this.page.evaluate(() => {
      const btn = document.getElementById('resetBtn');
      if (btn) btn.click();
    });
  }

  // Return array of bar labels as numbers (reads textContent)
  async getBarValues() {
    return (await this.bars.allTextContents()).map((t) => t.trim()).filter(Boolean).map((t) => parseInt(t, 10));
  }

  // Wait until message contains the provided substring
  async waitForMessageContains(text, timeout = 10000) {
    await this.page.waitForFunction(
      (selector, txt) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.includes(txt);
      },
      ['#message', text],
      { timeout }
    );
  }

  // Wait until message equals exact string
  async waitForMessageEquals(text, timeout = 10000) {
    await this.page.waitForFunction(
      (selector, txt) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.trim() === txt;
      },
      ['#message', text],
      { timeout }
    );
  }

  // Check whether reset button is disabled
  async isResetDisabled() {
    return await this.resetBtn.isDisabled();
  }

  // Check whether start button is disabled
  async isStartDisabled() {
    return await this.startBtn.isDisabled();
  }

  // Check whether input is disabled
  async isInputDisabled() {
    return await this.arrayInput.isDisabled();
  }

  // Count bars
  async barCount() {
    return await this.bars.count();
  }
}

test.describe('Insertion Sort Visualization - FSM and UI tests', () => {
  // Collect console messages and page errors for each test
  /** @type {string[]} */
  let consoleMessages;
  /** @type {string[]} */
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      try {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      } catch (e) {
        consoleMessages.push(`console: (failed to stringify)`);
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test('Initial Idle state renders correctly (S0_Idle)', async ({ page }) => {
    // Validate the initial UI (Idle state) - renderPage() entry action expected
    const p = new InsertionSortPage(page);
    await p.goto();

    // The input should be visible and enabled
    await expect(p.arrayInput).toBeVisible();
    await expect(p.arrayInput).toBeEnabled();

    // Start button should be enabled
    await expect(p.startBtn).toBeVisible();
    await expect(p.startBtn).toBeEnabled();

    // Reset button should be present but disabled in Idle
    await expect(p.resetBtn).toBeVisible();
    await expect(p.resetBtn).toBeDisabled();

    // No bars present in Idle
    await expect(p.arrayContainer).toBeVisible();
    expect(await p.barCount()).toBe(0);

    // Message should be empty
    await expect(p.message).toHaveText('');

    // Ensure no runtime errors were emitted on load
    expect(pageErrors).toEqual([]);
    expect(consoleMessages.filter((m) => m.startsWith('error')).length).toBe(0);
  });

  test('StartSorting transitions to Sorting and completes to Idle (S0 -> S1 -> S0)', async ({ page }) => {
    // This test validates:
    // - Clicking Start with valid input disables start/reset/input (S1_Sorting evidence)
    // - Bars are created (createBars action)
    // - Sorting completes and enables reset & input (back to Idle after completion)
    const p = new InsertionSortPage(page);
    await p.goto();

    // Provide a small array to keep sorting time short
    const input = '3,1,2';
    await p.fillInput(input);

    // Click start and immediately assert the Sorting state's immediate effects
    const startClick = p.clickStart();
    // After clicking start, sorting should begin:
    await expect(p.startBtn).toBeDisabled();
    await expect(p.resetBtn).toBeDisabled();
    await expect(p.arrayInput).toBeDisabled();

    // Bars should be created corresponding to the array length
    await page.waitForFunction(
      (expectedCount) => document.querySelectorAll('#arrayContainer .bar').length === expectedCount,
      [3],
      { timeout: 2000 }
    );
    expect(await p.barCount()).toBe(3);

    // insertionSort sets initial message "Starting insertion sort..."
    await p.waitForMessageContains('Starting insertion sort', 2000);

    // Wait for sorting to complete - insertionSort sets "Array sorted!"
    await p.waitForMessageContains('Array sorted!', 10000);

    // After sorting completes, start should be enabled and reset should be enabled per implementation
    await expect(p.startBtn).toBeEnabled();
    await expect(p.resetBtn).toBeEnabled();
    await expect(p.arrayInput).toBeEnabled();

    // Bars' labels should be in sorted order [1,2,3]
    const barValues = await p.getBarValues();
    expect(barValues).toEqual([1, 2, 3]);

    // Ensure no uncaught page errors or console.error messages occurred during the scenario
    expect(pageErrors).toEqual([]);
    expect(consoleMessages.filter((m) => m.startsWith('error')).length).toBe(0);

    // await the original click promise to avoid unhandled promise rejections
    await startClick;
  });

  test('Attempting Reset while Sorting should have no effect (reset disabled) (S1_Sorting -> Reset attempt)', async ({ page }) => {
    // Validate that while sorting is active the reset button remains disabled and clicking it in DOM has no effect
    const p = new InsertionSortPage(page);
    await p.goto();

    await p.fillInput('2,1');
    await p.clickStart();

    // Immediately assert Sorting state invariants
    await expect(p.startBtn).toBeDisabled();
    await expect(p.resetBtn).toBeDisabled();
    await expect(p.arrayInput).toBeDisabled();

    // Try to invoke reset via DOM click (document.getElementById('resetBtn').click())
    // This simulates a programmatic click; because the button is disabled it should not change state.
    await p.domClickReset();

    // Confirm that the message did not clear and bars still exist (sorting still in progress)
    // Because sorting will continue and later set "Array sorted!", we expect currently message to be non-empty.
    await p.waitForMessageContains('Starting insertion sort', 2000);
    expect(await p.barCount()).toBeGreaterThan(0);

    // Wait for sorting to finish normally
    await p.waitForMessageContains('Array sorted!', 10000);

    // After sorting completes reset button should become enabled
    await expect(p.resetBtn).toBeEnabled();

    // Ensure no uncaught page errors
    expect(pageErrors).toEqual([]);
    expect(consoleMessages.filter((m) => m.startsWith('error')).length).toBe(0);
  });

  test('Reset after sorting transitions to Reset then Idle (S1_Sorting -> S2_Reset -> S0_Idle)', async ({ page }) => {
    // Validates reset() entry actions and evidence:
    // - After sorting, clicking Reset should clear bars, enable input, disable reset, and leave start enabled.
    const p = new InsertionSortPage(page);
    await p.goto();

    await p.fillInput('4,2,3,1');
    await p.clickStart();

    // Wait for sorting to finish
    await p.waitForMessageContains('Array sorted!', 15000);

    // Now click Reset button (should be enabled)
    await expect(p.resetBtn).toBeEnabled();
    await p.clickReset();

    // After reset(), the container should be cleared and input enabled, reset disabled
    await expect(p.arrayInput).toBeEnabled();
    await expect(p.resetBtn).toBeDisabled();
    await expect(p.startBtn).toBeEnabled();

    // Bars should be removed
    expect(await p.barCount()).toBe(0);

    // Message should be cleared (reset sets message.textContent = "")
    await expect(p.message).toHaveText('');

    // No page errors
    expect(pageErrors).toEqual([]);
    expect(consoleMessages.filter((m) => m.startsWith('error')).length).toBe(0);
  });

  test('Empty input triggers alert and remains in Idle (edge case)', async ({ page }) => {
    // This tests the application's validation branch where StartSorting is clicked with empty input.
    const p = new InsertionSortPage(page);
    await p.goto();

    // Ensure input is empty
    await p.arrayInput.fill('');

    // Listen for dialog and assert message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      p.clickStart(), // clicking start with empty input should trigger alert dialog
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Please enter a comma-separated list of numbers.');
    await dialog.accept();

    // Ensure still in Idle state
    await expect(p.startBtn).toBeEnabled();
    await expect(p.resetBtn).toBeDisabled();
    await expect(p.arrayInput).toBeEnabled();

    // No page errors
    expect(pageErrors).toEqual([]);
    expect(consoleMessages.filter((m) => m.startsWith('error')).length).toBe(0);
  });

  test('Invalid input triggers alert and remains in Idle (edge case)', async ({ page }) => {
    // Test invalid non-integer input branch
    const p = new InsertionSortPage(page);
    await p.goto();

    await p.fillInput('a,b,c');

    const [dialog] = await Promise.all([page.waitForEvent('dialog'), p.clickStart()]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Invalid input. Please enter only integers separated by commas.');
    await dialog.accept();

    // Ensure still in Idle state
    await expect(p.startBtn).toBeEnabled();
    await expect(p.resetBtn).toBeDisabled();
    await expect(p.arrayInput).toBeEnabled();

    // No page errors
    expect(pageErrors).toEqual([]);
    expect(consoleMessages.filter((m) => m.startsWith('error')).length).toBe(0);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccd3fa1-d5b5-11f0-899c-75bf12e026a9.html';

// Increase default timeout to accommodate the demo's built-in sleeps during animations
test.setTimeout(30000);

// Page Object for the Two Pointers demo page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputArray = page.locator('#inputArray');
    this.inputTarget = page.locator('#inputTarget');
    this.runBtn = page.locator('#runBtn');
    this.output = page.locator('#output');
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getHeaderText() {
    return await this.header.textContent();
  }

  async getArrayValue() {
    return await this.inputArray.inputValue();
  }

  async getTargetValue() {
    return await this.inputTarget.inputValue();
  }

  async setArray(value) {
    await this.inputArray.fill('');
    // Use type to simulate user input more closely
    await this.inputArray.type(value);
  }

  async setTarget(value) {
    await this.inputTarget.fill('');
    await this.inputTarget.type(String(value));
  }

  async clickRun() {
    await this.runBtn.click();
  }

  async getOutputText() {
    return await this.output.textContent();
  }

  async getOutputHTML() {
    return await this.page.$eval('#output', el => el.innerHTML);
  }

  // Wait until the output contains the expected substring (with timeout)
  async waitForOutputContains(substring, options = {}) {
    const timeout = options.timeout ?? 20000;
    await this.page.waitForFunction(
      ({ selector, substring }) => {
        const el = document.querySelector(selector);
        return el && el.innerText.includes(substring);
      },
      { selector: '#output', substring },
      { timeout }
    );
  }
}

test.describe('Two Pointers Technique Demo - FSM validation and UI tests', () => {
  // Collect console messages, page errors and dialogs for assertions per test
  let consoleMessages;
  let pageErrors;
  let dialogs;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    dialogs = [];

    // Capture console messages
    page.on('console', msg => {
      // Store text for later assertions / inspection
      try {
        consoleMessages.push(msg.text());
      } catch (e) {
        // ignore potential serialization issues
        consoleMessages.push(String(msg));
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Capture dialogs (alerts) - accept them so tests can continue
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });
  });

  test.afterEach(async () => {
    // No-op cleanup here; event listeners are tied to the page lifecycle in each test
  });

  test('S0_Idle: initial render shows title, inputs with default values and empty output', async ({ page }) => {
    // Validate Idle state (S0)
    const p = new TwoPointersPage(page);
    await p.goto();

    // Validate header present
    await expect(p.header).toHaveCount(1);
    const h1 = await p.getHeaderText();
    expect(h1.trim()).toBe('Two Pointers Technique Demo');

    // Validate default inputs (from HTML attributes)
    expect(await p.getArrayValue()).toBe('1,2,3,4,5,6,7,8,9');
    expect(await p.getTargetValue()).toBe('10');

    // Output should be empty at idle
    const outText = await p.getOutputText();
    expect(outText.trim()).toBe('');

    // Ensure no unexpected page errors occurred on load
    expect(pageErrors).toEqual([]);

    // Console messages may be empty; assert it's an array
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Transition S0 -> S1 -> S3: run with pair present results in "Found!" (pair found)', async ({ page }) => {
    // This test validates the run button transitions into Running then PairFound final state.
    const p = new TwoPointersPage(page);
    await p.goto();

    // Use the default array [1..9] and target 10 which should immediately find (1,9)
    // We will click run and wait for the final "Found!" text in output
    await p.clickRun();

    // The demo writes synchronous content and uses sleeps before the check,
    // wait for the expected "Found!" message that indicates S3_PairFound entry action completed.
    await p.waitForOutputContains('Found!');

    const outHTML = await p.getOutputHTML();

    // Assert the output contains the explicit "Found!" highlight and the pair (1, 9) message
    expect(outHTML).toContain('Found!');
    expect(outHTML).toMatch(/The pair\s*\(1,\s*9\)\s*sums to 10/);

    // Ensure the visual pointers were rendered at least once (presence of .pointer spans)
    expect(outHTML).toContain('class="pointer"');

    // No uncaught JS errors should have been thrown during execution
    expect(pageErrors).toEqual([]);

    // No alerts should have occurred during a valid run
    expect(dialogs).toEqual([]);
  });

  test('Transition S0 -> S1 -> S2: run with no possible pair results in "No pair found"', async ({ page }) => {
    // Validate the NoPairFound final state occurs for an input with no valid pair.
    const p = new TwoPointersPage(page);
    await p.goto();

    // Use a small array and a large target to ensure no pair exists
    await p.setArray('1,2,3,4');
    await p.setTarget('100');

    await p.clickRun();

    // Wait for the "No pair found" message to appear
    await p.waitForOutputContains('No pair found');

    const outHTML = await p.getOutputHTML();

    // Validate final message includes the highlight span and target value
    expect(outHTML).toContain('No pair found');
    expect(outHTML).toContain('sum = 100') || expect(outHTML).toContain('= 100'); // tolerant match

    // Ensure pointers were at least rendered (pointer spans appear in the log)
    expect(outHTML).toContain('class="pointer"');

    // No uncaught JS errors during this run
    expect(pageErrors).toEqual([]);

    // No alerts during valid run
    expect(dialogs).toEqual([]);
  });

  test('InputArrayInvalid: clicking run with empty array input triggers alert', async ({ page }) => {
    // Validate InputArrayInvalid transition which should trigger an alert.
    const p = new TwoPointersPage(page);
    await p.goto();

    // Set inputArray to empty and click run
    await p.setArray('');
    await p.setTarget('10'); // valid target

    await p.clickRun();

    // Expect an alert with the exact message per FSM / implementation
    // Because we accepted alerts in the dialog handler, the dialog message should be captured.
    expect(dialogs.length).toBeGreaterThan(0);
    expect(dialogs[0]).toBe('Please enter a sorted array.');

    // Output should remain empty because handler returns early
    const outText = await p.getOutputText();
    expect(outText.trim()).toBe('');

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  test('InputArrayNotSorted: clicking run with unsorted array triggers alert', async ({ page }) => {
    // Validate transition where unsorted input triggers the "Array must be sorted..." alert
    const p = new TwoPointersPage(page);
    await p.goto();

    // Provide an unsorted array
    await p.setArray('3,1,2,4');
    await p.setTarget('10');

    await p.clickRun();

    // Expect the unsorted array alert to be shown and captured
    expect(dialogs.length).toBeGreaterThan(0);
    // The first dialog from this action should be the unsorted array alert
    // If previous tests ran in same browser context, there may be earlier dialogs captured;
    // ensure that at least one of the captured dialogs matches our expected message.
    expect(dialogs).toEqual(expect.arrayContaining(['Array must be sorted in non-decreasing order for two pointers technique.']));

    // No uncaught JS errors
    expect(pageErrors).toEqual([]);
  });

  test('InputTargetInvalid: clicking run with invalid target triggers alert', async ({ page }) => {
    // Validate transition where invalid target input triggers the "Please enter a valid target number." alert
    const p = new TwoPointersPage(page);
    await p.goto();

    // Provide a valid sorted array but an invalid target (empty)
    await p.setArray('1,2,3,4');
    // Clear target input (number input) by setting empty string
    await p.setTarget('');

    await p.clickRun();

    // Expect an alert about invalid target
    expect(dialogs.length).toBeGreaterThan(0);
    expect(dialogs).toEqual(expect.arrayContaining(['Please enter a valid target number.']));

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  test('Runtime observation: capture console messages and ensure no unexpected runtime exceptions', async ({ page }) => {
    // This test explicitly demonstrates that the tests observe console logs and page errors.
    const p = new TwoPointersPage(page);
    await p.goto();

    // There are no guarantees that console messages will appear; we simply ensure we can observe them
    // and that no pageerrors (uncaught exceptions) were recorded on page load.
    expect(Array.isArray(consoleMessages)).toBe(true);
    expect(pageErrors).toEqual([]);

    // Now provoke a normal run and observe again
    await p.clickRun();

    // Wait for result to be produced
    await p.waitForOutputContains('Found!');

    // After normal run, ensure no uncaught exceptions (ReferenceError, SyntaxError, TypeError) occurred.
    // The pageErrors array would have captured them if they happened.
    expect(pageErrors).toEqual([]);

    // At least one console message may have been recorded or none; ensure observation works.
    expect(consoleMessages).toBeInstanceOf(Array);
  });
});
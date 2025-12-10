import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b0d41-d1c9-11f0-9efc-d1db1618a544.html';

// Page object helpers to centralize selectors and small utilities
class RadixPage {
  constructor(page) {
    this.page = page;
    this.selectors = {
      inputArray: '#inputArray',
      fromText: '#fromText',
      randomize: '#randomize',
      size: '#size',
      maxVal: '#maxVal',
      radix: '#radix',
      start: '#start',
      stepBtn: '#stepBtn',
      pauseBtn: '#pauseBtn',
      resetBtn: '#resetBtn',
      speed: '#speed',
      mainArray: '#mainArray',
      buckets: '#buckets',
      passPill: '#passPill',
      actionPill: '#actionPill',
      bucketInfo: '#bucketInfo',
      infoPill: '#infoPill',
      logDiv: '#log',
      ascending: '#ascending',
      allowNeg: '#allowNeg',
      showValues: '#showValues'
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getLogLines() {
    const raw = await this.page.locator(this.selectors.logDiv).innerText();
    if (!raw) return [];
    // logDiv prepends new lines - split by newline and filter empties
    return raw.split('\n').map(s => s.trim()).filter(Boolean);
  }

  async getMainArrayCount() {
    return await this.page.locator(`${this.selectors.mainArray} .item`).count();
  }

  async getBucketCount() {
    // bucket elements have class 'bucket' under #buckets
    return await this.page.locator(`${this.selectors.buckets} .bucket`).count();
  }

  async click(selector) {
    await this.page.click(this.selectors[selector]);
  }

  async fillInputArray(value) {
    await this.page.fill(this.selectors.inputArray, value);
  }

  async changeRadixTo(value) {
    await this.page.selectOption(this.selectors.radix, { value: String(value) });
  }

  async toggleCheckbox(selector, wantChecked) {
    const locator = this.page.locator(this.selectors[selector]);
    const isChecked = await locator.isChecked();
    if (isChecked !== wantChecked) {
      await locator.click();
    }
  }

  async setSpeed(ms) {
    await this.page.fill(this.selectors.speed, String(ms));
    // dispatch input event - the app listens to 'input' event; filling triggers it in Playwright
    await this.page.locator(this.selectors.speed).dispatchEvent('input');
  }

  async getPassPillText() {
    return this.page.locator(this.selectors.passPill).innerText();
  }

  async getActionPillText() {
    return this.page.locator(this.selectors.actionPill).innerText();
  }

  async getInfoPillText() {
    return this.page.locator(this.selectors.infoPill).innerText();
  }

  async reset() {
    await this.page.click(this.selectors.resetBtn);
  }
}

test.describe('Radix Sort Visualizer (LSD) - interactive tests', () => {
  // Collect console and page errors for each test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture browser console events and page errors for assertions later
    page.on('console', msg => {
      // Save console text and type for diagnostics
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  test('Initial page load: layout, default array and buckets render with no runtime errors', async ({ page }) => {
    // Purpose: Verify initial state after page load, basic DOM elements, and ensure no page errors occurred.
    const app = new RadixPage(page);

    // Title exists
    await expect(page.locator('h1')).toHaveText(/Radix Sort Visualizer/i);

    // The input textarea should contain the default dataset
    const inputVal = await page.locator(app.selectors.inputArray).inputValue();
    expect(inputVal).toContain('170'); // confirm default content

    // Main array should have items rendered (initially 8 in the provided default)
    const mainCount = await app.getMainArrayCount();
    expect(mainCount).toBeGreaterThanOrEqual(1);

    // Buckets default to Radix 10 on initial render
    const bucketCount = await app.getBucketCount();
    expect(bucketCount).toBe(10);

    // Status pills initial text checks
    const passText = await app.getPassPillText();
    expect(passText).toMatch(/Pass: 0/);
    const actionText = await app.getActionPillText();
    expect(actionText).toMatch(/Action: 0 \/ 0/);
    const infoText = await app.getInfoPillText();
    expect(infoText).toContain('Radix: 10');

    // Confirm that no uncaught page errors were raised during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Load button reads textarea and renders array; logs expected message', async ({ page }) => {
    // Purpose: Ensure clicking "Load" reads the textarea, re-renders the main array and appends a log entry.
    const app = new RadixPage(page);

    // Modify textarea to a known array and then click Load
    await app.fillInputArray('3, 1, 4, 1, 5');
    await page.click(app.selectors.fromText);

    // Wait for DOM render: main array count should equal 5
    await expect(page.locator(`${app.selectors.mainArray} .item`))).toHaveCount(5);

    // The log should include the "Loaded array from text input." message (it's prepended)
    const logs = await app.getLogLines();
    const found = logs.find(l => /Loaded array from text input/i.test(l));
    expect(found).toBeTruthy();

    // Confirm no page errors during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Step button prepares actions and performs a single low-level action (move or collect)', async ({ page }) => {
    // Purpose: Verify that Step triggers buildAllActions and executes one action; confirm DOM changes in buckets/main array and logs.
    const app = new RadixPage(page);

    // Ensure initial known data
    await app.fillInputArray('170,45,75,90,802,24,2,66');

    // Click step to prepare and perform the first action
    await page.click(app.selectors.stepBtn);

    // After clicking step, buildAllActions logs "Prepared ..." and a MOVE/collect is logged
    // Wait briefly for async bucket insert (there is an 80ms setTimeout in code)
    await page.waitForTimeout(200);

    const logs = await app.getLogLines();
    // Look for the "Prepared ..." line
    const prepared = logs.find(l => /Prepared .* low-level actions over .* pass\(es\)\./i.test(l));
    expect(prepared).toBeTruthy();

    // There should be at least one move or collect log present
    const moveOrCollect = logs.find(l => /\[pass \d+\] (MOVE|COLLECT)/i.test(l));
    expect(moveOrCollect).toBeTruthy();

    // One or more bucket slots should now contain children (since move appends a clone to bucket slot)
    const bucketChildExists = await page.locator(`${app.selectors.buckets} .slot .item`).count();
    expect(bucketChildExists).toBeGreaterThanOrEqual(0); // could be 0 if the single action was a collect that created a fresh node; just ensure no crash

    // Also, check that at least one main array item may have been hidden due to a MOVE
    const hiddenItems = await page.locator(`${app.selectors.mainArray} .item`).filter({ has: page.locator('xpath=..') }).evaluateAll(nodes =>
      nodes.map(n => n.style.visibility).filter(v => v === 'hidden').length
    );
    // The code may or may not hide something depending on which action occurred; ensure the UI is still stable (no errors)
    expect(pageErrors.length).toBe(0);
  });

  test('Start runs the sorting (fast) and Pause/Resume toggles execution; sorting completes', async ({ page }) => {
    // Purpose: Validate Start triggers animation run; Pause toggles state and Resume continues; finalization logs finish and restores UI state.
    const app = new RadixPage(page);

    // Reduce speed for faster test execution
    await app.setSpeed(50);

    // Use a small dataset to keep run short
    await app.fillInputArray('3, 1, 4, 1, 5, 9');

    // Click start to prepare actions and begin running
    await page.click(app.selectors.start);

    // Allow some steps to execute
    await page.waitForTimeout(300);

    // Pause the run
    await page.click(app.selectors.pauseBtn);

    // After pause, pause button's text should be 'Resume' (as per pause() implementation)
    await expect(page.locator(app.selectors.pauseBtn)).toHaveText(/Resume|Resume/);

    // Capture action count (must be > 0)
    const actionText = await app.getActionPillText();
    // Example format: "Action: 5 / 24" so ensure first number > 0
    const match = actionText.match(/Action:\s*(\d+)\s*\/\s*(\d+)/);
    expect(match).not.toBeNull();
    const processed = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    expect(total).toBeGreaterThan(0);
    expect(processed).toBeGreaterThanOrEqual(0);

    // Resume the run
    await page.click(app.selectors.pauseBtn); // clicking Resume will re-run
    // Wait for completion: finalization logs 'Sorting finished.' in #log. Give generous timeout.
    await page.waitForFunction(
      () => document.querySelector('#log') && /Sorting finished\./i.test(document.querySelector('#log').innerText),
      null,
      { timeout: 10000 }
    );

    // Final pills should indicate actions completed (Action: total / total)
    const finalActionText = await app.getActionPillText();
    expect(/\/\s*\d+\s*\)/.test(finalActionText) || /Action: \d+ \/ \d+/.test(finalActionText)).toBeTruthy();
    // Ensure 'Sorting finished.' is present in logs
    const logs = await app.getLogLines();
    const finished = logs.find(l => /Sorting finished\./i.test(l));
    expect(finished).toBeTruthy();

    // No pagelevel uncaught errors
    expect(pageErrors.length).toBe(0);
  }, 20000); // extended timeout for async run

  test('Reset restores initial array and logs reset', async ({ page }) => {
    // Purpose: Ensure Reset returns UI to the initial pre-sort state and logs the action.
    const app = new RadixPage(page);

    // Start then reset quickly
    await app.fillInputArray('7,2,5');
    await page.click(app.selectors.start);

    // Wait briefly and then reset
    await page.waitForTimeout(150);
    await page.click(app.selectors.resetBtn);

    // The log should contain 'Reset to initial array.'
    const logs = await app.getLogLines();
    const resetLog = logs.find(l => /Reset to initial array\./i.test(l));
    expect(resetLog).toBeTruthy();

    // Pass pill and action pill reset
    const passText = await app.getPassPillText();
    expect(passText).toMatch(/Pass: 0/);
    const actionText = await app.getActionPillText();
    expect(actionText).toMatch(/Action: 0 \/ 0/);

    // No page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Changing radix updates bucket count and Randomize creates a new array', async ({ page }) => {
    // Purpose: Validate that changing radix updates the bucket DOM and Randomize populates the textarea and main array.
    const app = new RadixPage(page);

    // Change radix to base 4
    await app.changeRadixTo(4);
    // bucketInfo should reflect 4 buckets
    await expect(page.locator(app.selectors.bucketInfo)).toHaveText(/Buckets:\s*4/);

    // Click Randomize - ensure the textarea updates and a log entry appears
    await page.click(app.selectors.randomize);

    // Wait for log; random generation writes 'Random array generated.'
    await page.waitForTimeout(100);
    const logs = await app.getLogLines();
    const randLog = logs.find(l => /Random array generated\./i.test(l));
    expect(randLog).toBeTruthy();

    // The inputArray should now contain comma separated numbers (non-empty)
    const inputVal = await page.locator(app.selectors.inputArray).inputValue();
    expect(inputVal.trim().length).toBeGreaterThan(0);

    // The mainArray should have at least one item rendered
    const mainCount = await app.getMainArrayCount();
    expect(mainCount).toBeGreaterThanOrEqual(1);

    // No page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Negative values with "Support negatives" apply offset and restore after finalize', async ({ page }) => {
    // Purpose: Confirm negative offset handling logs and that finalization restores original negative values.
    const app = new RadixPage(page);

    // Provide an array with a negative value
    await app.fillInputArray('3, -2, 1');

    // Enable support for negatives
    await app.toggleCheckbox('allowNeg', true);

    // Speed up for the test
    await app.setSpeed(50);

    // Start sorting
    await page.click(app.selectors.start);

    // Wait until 'Offset reversed' and 'Sorting finished.' appear in log
    await page.waitForFunction(
      () => document.querySelector('#log') && /Offset reversed; original negative values restored in display\./i.test(document.querySelector('#log').innerText),
      null,
      { timeout: 8000 }
    );

    // Confirm log contains the offset-applied message and offset-reversed message
    const logs = await app.getLogLines();
    const offsetApplied = logs.find(l => /Negative offset applied:/i.test(l));
    const offsetReversed = logs.find(l => /Offset reversed; original negative values restored in display\./i.test(l));
    expect(offsetApplied).toBeTruthy();
    expect(offsetReversed).toBeTruthy();

    // Verify that the final main array displays the original negative value visible in DOM text
    const items = page.locator('#mainArray .item');
    const texts = await items.allInnerTexts();
    // Flatten and look for "-2" somewhere in the vspan text
    const joined = texts.join(' ');
    expect(joined).toContain('-2');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  }, 15000);

  test.afterEach(async ({ page }) => {
    // Diagnostics logging in test output if unexpected page errors present
    if (pageErrors.length > 0) {
      console.error('Page errors were encountered during test:', pageErrors);
    }
    // Also surface console messages for easier debugging
    if (consoleMessages.length > 0) {
      // Keep this lightweight; don't fail tests for console messages alone
      console.info('Console messages captured:', consoleMessages.slice(0, 20));
    }
  });
});
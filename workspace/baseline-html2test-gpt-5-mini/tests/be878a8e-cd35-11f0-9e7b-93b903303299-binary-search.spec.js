import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a8e-cd35-11f0-9e7b-93b903303299.html';

// Page object to encapsulate common interactions and element locators
class BinarySearchPage {
  constructor(page) {
    this.page = page;
    this.array = page.locator('#array');
    this.cells = page.locator('#array .cell');
    this.genBtn = page.locator('#genBtn');
    this.shuffleBtn = page.locator('#shuffleBtn');
    this.customBtn = page.locator('#customBtn');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.autoBtn = page.locator('#autoBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.sizeInput = page.locator('#size');
    this.minVal = page.locator('#minVal');
    this.maxVal = page.locator('#maxVal');
    this.targetInput = page.locator('#target');
    this.modeSelect = page.locator('#mode');
    this.speedSelect = page.locator('#speed');
    this.compCount = page.locator('#compCount');
    this.status = page.locator('#status');
    this.log = page.locator('#log');
    this.lowBadge = page.locator('#lowIdx');
    this.midBadge = page.locator('#midIdx');
    this.highBadge = page.locator('#highIdx');
    this.explain = page.locator('#explain');
  }

  // helper: get number of cells currently rendered
  async cellCount() {
    return await this.cells.count();
  }

  // helper: get cell text by index (value displayed)
  async cellText(idx) {
    return await this.page.locator(`#array .cell[data-index="${idx}"]`).nth(0).textContent();
  }

  // click a cell (left click) and accept the alert dialog the app shows
  async clickCellAndAcceptAlert(idx) {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.page.locator(`#array .cell[data-index="${idx}"]`).click();
    const dialog = await dialogPromise;
    // Accept the alert and return its message
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // right-click (contextmenu) a cell to set target input via the app's handler
  async rightClickCell(idx) {
    await this.page.locator(`#array .cell[data-index="${idx}"]`).click({ button: 'right' });
  }

  // click Generate Sorted Array button
  async generateArray() {
    await this.genBtn.click();
  }

  // click Shuffle (and sort) button
  async shuffleThenSort() {
    await this.shuffleBtn.click();
  }

  // click Custom Array button and respond to the prompt with provided value
  async useCustomArray(promptValue) {
    const dialogPromise1 = this.page.waitForEvent('dialog');
    // trigger prompt
    const p = this.customBtn.click();
    const dialog1 = await dialogPromise;
    // respond with value
    await dialog.accept(promptValue);
    await p;
  }

  // start search button
  async clickStart() {
    await this.startBtn.click();
  }

  // click step button
  async clickStep() {
    await this.stepBtn.click();
  }

  // toggle auto
  async clickAuto() {
    await this.autoBtn.click();
  }

  // reset
  async clickReset() {
    await this.resetBtn.click();
  }

  // set target input value
  async setTarget(value) {
    await this.targetInput.fill(String(value));
  }

  // set mode: 'iter' or 'rec'
  async setMode(value) {
    await this.modeSelect.selectOption(value);
  }

  // set speed value (string of milliseconds)
  async setSpeed(value) {
    await this.speedSelect.selectOption(value);
  }

  // read status text
  async getStatusText() {
    return (await this.status.textContent()).trim();
  }

  // read comp count
  async getCompCount() {
    const txt = (await this.compCount.textContent()).trim();
    return Number(txt);
  }

  // read low/mid/high badges
  async badges() {
    const low = (await this.lowBadge.textContent()).trim();
    const mid = (await this.midBadge.textContent()).trim();
    const high = (await this.highBadge.textContent()).trim();
    return { low, mid, high };
  }

  // return whether a cell has a given class
  async cellHasClass(idx, cls) {
    const locator = this.page.locator(`#array .cell[data-index="${idx}"]`);
    return await locator.evaluate((el, c) => el.classList.contains(c), cls);
  }

  // find index of a cell that contains a specific numeric value (text)
  async findIndexForValue(value) {
    const count = await this.cellCount();
    const s = String(value);
    for (let i = 0; i < count; i++) {
      const text = (await this.page.locator(`#array .cell[data-index="${i}"]`).nth(0).textContent()) || '';
      // the cell contains a label child with index; the value is the cell's textContent including label, but the label is inside,
      // so we strip whitespace and digits from the end if needed. Safer: read the first child text node (nodeValue).
      // But to keep robust, check if text includes the value string.
      if (text.includes(s)) return i;
    }
    return -1;
  }
}

// Global hooks: collect console messages and page errors for assertions
test.describe('Binary Search Visualizer - end-to-end checks', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // collect page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // collect console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // wait for initial array generation (script runs generateArray on init)
    await page.waitForSelector('#array .cell');
  });

  // Test initial load and default state
  test('Initial page load shows UI and initial generated array', async ({ page }) => {
    const app = new BinarySearchPage(page);

    // Ensure basic UI elements present
    await expect(app.genBtn).toBeVisible();
    await expect(app.startBtn).toBeVisible();
    await expect(app.stepBtn).toBeVisible();
    await expect(app.autoBtn).toBeVisible();
    await expect(app.resetBtn).toBeVisible();
    await expect(app.sizeInput).toHaveValue('15'); // default value as in HTML
    // status should indicate ready or generated
    const statusText = await app.getStatusText();
    expect(statusText.length).toBeGreaterThan(0);

    // The array should be rendered with cells
    const count1 = await app.cellCount();
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(30);

    // compCount should start at 0
    expect(await app.getCompCount()).toBe(0);

    // No unexpected page errors occurred during load
    // We assert that there are ZERO serious runtime errors (ReferenceError, SyntaxError, TypeError)
    // If any occurred, we fail the test and dump them for debugging
    const serious = pageErrors.filter(e => /ReferenceError|SyntaxError|TypeError/.test(String(e)));
    expect(serious).toHaveLength(0);
  });

  // Test Generate, Shuffle, and Reset behavior plus console logging
  test('Generate Sorted Array and Shuffle operations update DOM and logs', async ({ page }) => {
    const app1 = new BinarySearchPage(page);

    // Click Generate Sorted Array and verify new array rendered and log updated
    await app.generateArray();
    // wait for at least one log entry about generation
    await expect(app.log).toContainText('Generated array');

    // Capture count after generation
    const genCount = await app.cellCount();
    expect(genCount).toBeGreaterThanOrEqual(5);

    // Click Shuffle (and sort) and verify status text and log update
    await app.shuffleThenSort();
    await expect(app.status).toContainText('reshuffled').or.toContainText('Array reshuffled');
    await expect(app.log).toContainText('Shuffled then sorted');

    // Reset should restore ready state and not crash
    await app.clickReset();
    await expect(app.status).toHaveText('Status: Ready.');
  });

  // Test clicking a cell shows an alert with correct index and value
  test('Clicking a cell shows an alert with index and value', async ({ page }) => {
    const app2 = new BinarySearchPage(page);

    // choose first cell (index 0) and click it; accept alert and validate message text
    const firstText = await app.cellText(0);
    const dialogPromise2 = page.waitForEvent('dialog');
    await page.locator('#array .cell[data-index="0"]').click();
    const dialog2 = await dialogPromise;
    const msg = dialog.message();
    // The alert message should include "Index: 0" and the value of the first cell
    expect(msg).toContain('Index: 0');
    expect(msg).toContain(String(firstText).trim());
    await dialog.accept();
  });

  // Test the "Use custom array" prompt flow and that duplicates are removed & sorted
  test('Custom array prompt accepts input and updates rendered array (duplicates removed & sorted)', async ({ page }) => {
    const app3 = new BinarySearchPage(page);

    // Prepare prompt response
    const promptResponse = '7,3,9,7,2';
    // Intercept the dialog produced by calling the custom button
    const dialogPromise3 = page.waitForEvent('dialog');
    const clickPromise = app.customBtn.click();
    const dialog3 = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    // Accept with our custom array string
    await dialog.accept(promptResponse);
    await clickPromise;

    // After custom array, ensure array updated: unique sorted values are [2,3,7,9] => length 4
    const count2 = await app.cellCount();
    expect(count).toBe(4);

    // Validate ordering (ascending)
    const values = [];
    for (let i = 0; i < count; i++) {
      const txt1 = await page.locator(`#array .cell[data-index="${i}"]`).nth(0).textContent();
      // strip label digits (index) appended inside label element — the value appears before the label when textContent is used,
      // the exact whitespace may vary; to be robust, parse first number found.
      const match = String(txt).match(/-?\d+/);
      values.push(Number(match ? match[0] : txt.trim()));
    }
    // Check ascending order
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }

    // Log should contain custom array message
    await expect(app.log).toContainText('Custom array');
  });

  // Test starting a search without entering a target triggers an alert
  test('Starting search without a target triggers alert', async ({ page }) => {
    const app4 = new BinarySearchPage(page);

    // ensure target input is empty
    await app.targetInput.fill('');
    // Expect an alert dialog when clicking Start Search
    const dialogPromise4 = page.waitForEvent('dialog');
    await app.clickStart();
    const dialog4 = await dialogPromise;
    const message1 = dialog.message1();
    expect(message).toContain('Please enter a target value');
    await dialog.accept();
  });

  // Test iterative search step-by-step for a present target (use right-click to set target to a cell value)
  test('Iterative search: setting target via right-click and stepping to find the element', async ({ page }) => {
    const app5 = new BinarySearchPage(page);

    // Right-click a known cell to set the target input
    // Use index 2 (if exists) to set a deterministic present target
    const count3 = await app.cellCount();
    const idxToPick = Math.min(2, Math.max(0, count - 1));
    // Extract value at that index
    const rawText = await page.locator(`#array .cell[data-index="${idxToPick}"]`).nth(0).textContent();
    const match1 = String(rawText).match1(/-?\d+/);
    const value = match ? Number(match[0]) : null;
    expect(value).not.toBeNull();

    // right-click to set target value via contextmenu handler
    await page.locator(`#array .cell[data-index="${idxToPick}"]`).click({ button: 'right' });

    // The target input should now be populated with the chosen value
    await expect(app.targetInput).toHaveValue(String(value));

    // Start iterative search (mode default is 'iter')
    await app.clickStart();
    await expect(app.status).toContainText(`Searching for ${value}`);

    // Step until found (limit steps to avoid infinite loop)
    for (let i = 0; i < 20; i++) {
      const statusText1 = await app.getStatusText();
      if (/Found target/.test(statusText)) break;
      if (/NOT found/.test(statusText)) break;
      await app.clickStep();
      // small wait to allow DOM updates
      await page.waitForTimeout(50);
    }

    const finalStatus = await app.getStatusText();
    // Should either find the target or exhaust search; since target was present, expect Found
    expect(finalStatus).toContain('Found target');

    // The found cell should have the 'found' class applied
    const foundIndexMatch = finalStatus.match(/index (\d+)/);
    if (foundIndexMatch) {
      const foundIndex = Number(foundIndexMatch[1]);
      const hasFoundClass = await app.cellHasClass(foundIndex, 'found');
      expect(hasFoundClass).toBeTruthy();
    }

    // comparisons should be > 0
    expect(await app.getCompCount()).toBeGreaterThan(0);
  });

  // Test recursive mode stepping and final state includes '(recursive)' in status
  test('Recursive search: switch to recursive mode and step to find target', async ({ page }) => {
    const app6 = new BinarySearchPage(page);

    // pick a cell index near middle to make recursion exercise quick
    const count4 = await app.cellCount();
    const pick = Math.floor(count / 2);
    const rawText1 = await page.locator(`#array .cell[data-index="${pick}"]`).nth(0).textContent();
    const match2 = String(rawText).match2(/-?\d+/);
    const value1 = match ? Number(match[0]) : null;
    expect(value).not.toBeNull();

    // set mode to recursive
    await app.setMode('rec');

    // set target via right-click
    await page.locator(`#array .cell[data-index="${pick}"]`).click({ button: 'right' });
    await expect(app.targetInput).toHaveValue(String(value));

    // start recursive search
    await app.clickStart();
    await expect(app.status).toContainText(`Searching for ${value}`);

    // Step until found or exhausted (cap at 40 steps)
    for (let i = 0; i < 40; i++) {
      const s1 = await app.getStatusText();
      if (/Found target/.test(s)) break;
      if (/NOT found/.test(s)) break;
      await app.clickStep();
      await page.waitForTimeout(40);
    }

    const finalStatus1 = await app.getStatusText();
    expect(finalStatus).toContain('(recursive)');

    // comparisons should be > 0 for recursive search
    expect(await app.getCompCount()).toBeGreaterThan(0);
  });

  // Test Auto Play functionality: start search and toggle Auto Play to completion
  test('Auto Play runs the search automatically and stops when done', async ({ page }) => {
    const app7 = new BinarySearchPage(page);

    // pick a target value using right-click on any cell (use index 1)
    const idx = Math.min(1, Math.max(0, (await app.cellCount()) - 1));
    const rawText2 = await page.locator(`#array .cell[data-index="${idx}"]`).nth(0).textContent();
    const match3 = String(rawText).match3(/-?\d+/);
    const value2 = match ? Number(match[0]) : null;
    expect(value).not.toBeNull();

    await page.locator(`#array .cell[data-index="${idx}"]`).click({ button: 'right' });
    await expect(app.targetInput).toHaveValue(String(value));

    // Use fast speed to finish quickly
    await app.setSpeed('120');
    // Start search
    await app.clickStart();
    // Start Auto Play
    await app.clickAuto();

    // Wait until status indicates found (cap time)
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el && /Found target/.test(el.textContent || '');
      },
      '#status',
      { timeout: 5000 }
    );

    const finalStatus2 = await app.getStatusText();
    expect(finalStatus).toContain('Found target');

    // Auto button should have returned to 'Auto Play' text after stopping
    await expect(app.autoBtn).toHaveText('Auto Play');

    // comparisons should be > 0
    expect(await app.getCompCount()).toBeGreaterThan(0);
  });

  // Test edge cases: non-numeric target input triggers alert about number
  test('Entering non-numeric target triggers an alert about numeric target', async ({ page }) => {
    const app8 = new BinarySearchPage(page);

    await app.targetInput.fill('not-a-number');
    // Start search: the code will call alert('Target must be a number.') after parsing
    const dialogPromise5 = page.waitForEvent('dialog');
    await app.clickStart();
    const dialog5 = await dialogPromise;
    const message2 = dialog.message2();
    expect(message).toContain('Target must be a number');
    await dialog.accept();
  });

  // Test keyboard shortcuts: pressing space triggers a step action when not focused on an input
  test('Keyboard shortcut: pressing Space triggers step when not focused on an input', async ({ page }) => {
    const app9 = new BinarySearchPage(page);

    // Ensure focus is not on an input element
    await page.evaluate(() => (document.activeElement && document.activeElement.blur && document.activeElement.blur()));

    // Press Space: should call stepOnce -> since not running it will update status to "Not running..."
    await page.keyboard.press(' ');
    // Wait a tick for handlers to run
    await page.waitForTimeout(50);
    const status = await app.getStatusText();
    expect(status).toContain('Not running. Click Start Search first.');
  });

  // Final test: assert no unexpected serious runtime errors collected during any test actions
  test('No unexpected serious runtime errors (ReferenceError/SyntaxError/TypeError) occurred during interactions', async ({ page }) => {
    // pageErrors was captured per-test in beforeEach; but ensure that any collected errors are not serious
    // (this test provides an explicit check after interactions in previous steps of the same test file)
    const serious1 = pageErrors.filter(e => /ReferenceError|SyntaxError|TypeError/.test(String(e)));
    // Expect that there are no serious JS runtime errors
    expect(serious).toHaveLength(0);
  });

  test.afterEach(async ({}, testInfo) => {
    // If any page errors occurred during the test, expose them in test output for debugging
    if (pageErrors.length > 0) {
      // Attach page errors to the test report output
      for (const err of pageErrors) {
        testInfo.attachments?.push?.({ name: 'pageerror', contentType: 'text/plain', body: String(err) });
      }
    }
    if (consoleMessages.length > 0) {
      // optionally attach the latest console messages
      const last = consoleMessages.slice(-20).map(c => `[${c.type}] ${c.text}`).join('\n');
      testInfo.attachments?.push?.({ name: 'console', contentType: 'text/plain', body: last });
    }
  });
});
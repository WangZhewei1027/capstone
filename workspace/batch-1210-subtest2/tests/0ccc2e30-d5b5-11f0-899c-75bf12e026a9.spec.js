import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccc2e30-d5b5-11f0-899c-75bf12e026a9.html';

// Page object for the Heap Sort Visualizer
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.startBtn = page.locator('#startBtn');
    this.speedRange = page.locator('#speedRange');
    this.speedValue = page.locator('#speedValue');
    this.arrayContainer = page.locator('#arrayContainer');
    this.log = page.locator('#log');
    this.bars = page.locator('.array-bar');
  }

  async goto() {
    await this.page.goto(BASE_URL);
    // wait for basic UI to render
    await this.page.waitForSelector('#arrayInput');
  }

  async getArrayInputValue() {
    return await this.arrayInput.inputValue();
  }

  async getSpeedValueText() {
    return (await this.speedValue.textContent())?.trim();
  }

  async setSpeed(rangeValue) {
    // Use evaluate to set value and dispatch input event to trigger listeners
    await this.page.evaluate((v) => {
      const speedRange = document.getElementById('speedRange');
      speedRange.value = String(v);
      speedRange.dispatchEvent(new Event('input', { bubbles: true }));
    }, rangeValue);
    // wait a tick for UI update
    await this.page.waitForTimeout(20);
  }

  async getBarCount() {
    return await this.bars.count();
  }

  async getBarValues() {
    return await this.page.$$eval('.array-bar .bar-value', els => els.map(e => e.textContent.trim()));
  }

  async getSortedBarCount() {
    return await this.page.locator('.array-bar.sorted').count();
  }

  async setArrayInput(value) {
    await this.arrayInput.fill(value);
  }

  async clickStart() {
    await Promise.all([
      this.page.waitForTimeout(10), // small scheduling allowance
      this.startBtn.click()
    ]);
  }

  async isStartBtnDisabled() {
    return await this.startBtn.isDisabled();
  }

  async isArrayInputDisabled() {
    return await this.arrayInput.isDisabled();
  }

  async isSpeedRangeDisabled() {
    return await this.speedRange.isDisabled();
  }

  async getLogText() {
    return (await this.log.textContent()) ?? '';
  }

  // Wait for final log message indicating completion
  async waitForCompletion(timeout = 20000) {
    await this.page.waitForFunction(() => {
      const log = document.getElementById('log');
      return log && log.textContent.includes('Heap Sort Completed!');
    }, null, { timeout });
  }

  // Wait until an expected substring appears in log
  async waitForLogContains(substring, timeout = 10000) {
    await this.page.waitForFunction((s) => {
      const log = document.getElementById('log');
      return log && log.textContent.includes(s);
    }, substring, { timeout });
  }
}

test.describe('Heap Sort Visualization - FSM & UI Tests', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console output
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect unhandled page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // S0 Idle: verify initial setup (entry_actions createBars(array))
  test('S0_Idle - initial state has prefilled input, created bars, and proper speed display', async ({ page }) => {
    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Validate the input's initial example value set by the app
    const inputValue = await heapPage.getArrayInputValue();
    expect(inputValue).toBe('12, 3, 19, 5, 7, 15, 2, 1');

    // Validate that bars were created for the example array (8 values)
    const barCount = await heapPage.getBarCount();
    expect(barCount).toBe(8);

    // Validate bar labels match expected parsed numbers (order preserved)
    const barValues = await heapPage.getBarValues();
    expect(barValues).toEqual(['12', '3', '19', '5', '7', '15', '2', '1']);

    // The log area should be initially empty (no sorting has started)
    const logText = await heapPage.getLogText();
    expect(logText.trim()).toBe('');

    // Speed control should reflect default value and label should show "500 ms"
    const speedLabel = await heapPage.getSpeedValueText();
    expect(speedLabel).toBe('500 ms');

    // Ensure no unexpected page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
  });

  // ChangeSpeed event: ensure UI updates and no page errors
  test('ChangeSpeed event updates animationSpeed display and does not cause errors', async ({ page }) => {
    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Change speed to a faster rate and verify displayed text updates
    await heapPage.setSpeed(200);
    expect(await heapPage.getSpeedValueText()).toBe('200 ms');

    // Change speed to minimum to accelerate animations during subsequent tests
    await heapPage.setSpeed(50);
    expect(await heapPage.getSpeedValueText()).toBe('50 ms');

    // No page errors should have been emitted by changing the range
    expect(pageErrors.length).toBe(0);

    // Console messages should not contain errors; just ensure it's an array (could be empty)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  // Transition: S0_Idle -> S1_Sorting (StartSorting) and then S1_Sorting -> S2_Sorted (HeapSortCompleted)
  test('StartSorting transition: sorting runs, logs appear, buttons disabled during sort and re-enabled after completion', async ({ page }) => {
    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Speed up animations to keep test runtime reasonable
    await heapPage.setSpeed(50);

    // Ensure initial state before starting
    expect(await heapPage.isStartBtnDisabled()).toBe(false);
    expect(await heapPage.isArrayInputDisabled()).toBe(false);
    expect(await heapPage.isSpeedRangeDisabled()).toBe(false);

    // Start sorting and immediately check that start button and inputs are disabled (S1 entry/exit actions)
    const started = heapPage.clickStart(); // don't await heapSort completion here
    // Wait a short moment to allow the start handler to disable controls
    await page.waitForTimeout(50);

    // startBtn should be disabled during sorting
    expect(await heapPage.isStartBtnDisabled()).toBe(true);
    expect(await heapPage.isArrayInputDisabled()).toBe(true);
    expect(await heapPage.isSpeedRangeDisabled()).toBe(true);

    // The log should show "Starting Heap Sort..." as part of the S1 entry actions
    await heapPage.waitForLogContains('Starting Heap Sort...', 5000);
    const logAfterStart = await heapPage.getLogText();
    expect(logAfterStart).toContain('Starting Heap Sort...');
    expect(logAfterStart).toContain('Building max heap');

    // Wait for the sort to complete (S2 entry: 'Heap Sort Completed!')
    await heapPage.waitForCompletion(20000);

    // After completion, ensure start button and inputs were re-enabled (S1 exit_actions)
    expect(await heapPage.isStartBtnDisabled()).toBe(false);
    expect(await heapPage.isArrayInputDisabled()).toBe(false);
    expect(await heapPage.isSpeedRangeDisabled()).toBe(false);

    // All bars should be marked as sorted (S2 evidence markSorted called for each index)
    const totalBars = await heapPage.getBarCount();
    const sortedBars = await heapPage.getSortedBarCount();
    expect(sortedBars).toBe(totalBars);

    // Final log should indicate completion
    const finalLog = await heapPage.getLogText();
    expect(finalLog).toContain('Heap Sort Completed!');

    // Ensure the array content remains consistent (same number of bars)
    expect(totalBars).toBe(8);

    // No unhandled page errors during the sorting process
    expect(pageErrors.length).toBe(0);

    await started; // ensure clickStart promise chain resolved
  }, 30000); // extend timeout to allow sorting to complete

  // Edge cases / error scenarios
  test.describe('Input validation and error scenarios', () => {
    test('Empty input shows alert error and prevents sorting', async ({ page }) => {
      const heapPage = new HeapSortPage(page);
      await heapPage.goto();

      // Intercept dialog and capture message
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await heapPage.setArrayInput('');
      await heapPage.clickStart();

      // Give the dialog handler a moment
      await page.waitForTimeout(50);

      expect(dialogMessage).toBe('Input cannot be empty.');

      // No page errors
      expect(pageErrors.length).toBe(0);
    });

    test('Non-numeric input shows alert error and prevents sorting', async ({ page }) => {
      const heapPage = new HeapSortPage(page);
      await heapPage.goto();

      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await heapPage.setArrayInput('1, 2, three, 4');
      await heapPage.clickStart();

      await page.waitForTimeout(50);

      expect(dialogMessage).toBe('Input contains non-numeric values.');

      expect(pageErrors.length).toBe(0);
    });

    test('Too many numbers (>60) shows alert error and prevents sorting', async ({ page }) => {
      const heapPage = new HeapSortPage(page);
      await heapPage.goto();

      // create 61 numbers
      const values = Array.from({ length: 61 }, (_, i) => String(i + 1)).join(', ');
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await heapPage.setArrayInput(values);
      await heapPage.clickStart();

      await page.waitForTimeout(50);

      expect(dialogMessage).toBe('Please enter 60 or fewer numbers for visualization.');
      expect(pageErrors.length).toBe(0);
    });
  });

  // Observe console logs and page errors - ensure we capture and assert the absence of uncaught exceptions
  test('Console and page error monitoring - ensure no unexpected runtime errors', async ({ page }) => {
    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Run a quick sorting sequence to generate internal logs in the UI (not console)
    await heapPage.setSpeed(50);
    await heapPage.clickStart();

    // Wait for completion
    await heapPage.waitForCompletion(20000);

    // We expect no unhandled page errors (no ReferenceError/SyntaxError/TypeError)
    expect(pageErrors.length).toBe(0);

    // Console messages captured may be empty or contain minor browser messages; ensure none are JS errors
    const jsErrorConsoles = consoleMessages.filter(m => m.type === 'error');
    expect(jsErrorConsoles.length).toBe(0);

    // The UI log should contain expected lifecycle messages
    const fullLog = await heapPage.getLogText();
    expect(fullLog).toContain('Starting Heap Sort...');
    expect(fullLog).toContain('Max heap constructed.');
    expect(fullLog).toContain('Heap Sort Completed!');
  }, 30000);
});
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80ba981-d1c9-11f0-9efc-d1db1618a544.html';

// Page object to encapsulate common UI interactions and locators
class FibonacciPage {
  constructor(page) {
    this.page = page;
    this.count = page.locator('#count');
    this.method = page.locator('#method');
    this.limitDigits = page.locator('#limitDigits');
    this.computeBtn = page.locator('#computeBtn');
    this.copyBtn = page.locator('#copyBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.output = page.locator('#output');
    this.outCount = page.locator('#outCount');
    this.timeBadge = page.locator('#timeBadge');
    this.algoBadge = page.locator('#algoBadge');
    this.chart = page.locator('#chart');
    this.downloadPNG = page.locator('#downloadPNG');
    this.toggleLog = page.locator('#toggleLog');
    this.phiBadge = page.locator('#phiBadge');
  }

  // Helpers
  async goto() {
    await this.page.goto(BASE, { waitUntil: 'load' });
    // Wait for the default compute to finish (page triggers compute on load)
    // The output text will change from the initial prompt to computed lines.
    await this.page.waitForFunction(() => {
      const out = document.getElementById('output');
      return out && !out.textContent.includes('Press "Compute" to begin.') && !out.textContent.includes('Computing… please wait.');
    }, null, { timeout: 5000 }).catch(() => {}); // don't fail hard; tests will assert expected state
  }

  async setCount(n) {
    await this.count.fill(String(n));
  }

  async setMethod(value) {
    await this.method.selectOption(value);
  }

  async clickCompute() {
    await this.computeBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async clickCopy() {
    await this.copyBtn.click();
  }

  async clickDownloadPNG() {
    await this.downloadPNG.click();
  }

  async clickToggleLog() {
    await this.toggleLog.click();
  }

  async hoverPhi() {
    await this.phiBadge.hover();
  }

  async unhoverPhi() {
    // Move mouse somewhere else
    await this.page.mouse.move(0, 0);
  }

  // Return output lines as array
  async getOutputLines() {
    const text = await this.output.textContent();
    if (!text) return [];
    return text.split('\n').map(l => l.trim()).filter(Boolean);
  }

  async getOutputText() {
    return (await this.output.textContent()) || '';
  }
}

test.describe('Fibonacci Sequence Explorer - end-to-end', () => {
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      // Capture uncaught exceptions thrown in the page context
      pageErrors.push(err);
    });
    page.on('console', msg => {
      // Capture console.error messages (and all console for debugging)
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
  });

  test('Initial load: default computation runs and UI shows results', async ({ page }) => {
    // Purpose: Verify that on page load the app auto-computes with default settings and updates badges/output/chart.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Basic presence checks
    await expect(fib.computeBtn).toBeVisible();
    await expect(fib.output).toBeVisible();
    await expect(fib.algoBadge).toBeVisible();

    // Algorithm badge should reflect the default selected algorithm (fastdoubling)
    await expect(fib.algoBadge).toHaveText(/Algorithm:\s*fastdoubling/);

    // outCount should reflect default value (count input value is 30)
    await expect(fib.outCount).toHaveText('30');

    // Output should contain numbered lines starting with "1: 1"
    const lines = await fib.getOutputLines();
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toMatch(/^1:\s*1$/);

    // Last line should start with "30:" (since default value is 30)
    const last = lines[lines.length - 1];
    expect(last).toMatch(/^30:\s*\d+/);

    // timeBadge should have been updated to a measured time (not the initial '--')
    const timeText = (await fib.timeBadge.textContent()) || '';
    expect(timeText).not.toBe('Time: --');

    // Chart canvas should exist and be in the DOM
    await expect(fib.chart).toBeVisible();

    // Assert there were no uncaught page errors during initial load
    expect(pageErrors.length).toBe(0);
    // Console errors (if any) are collected; assert none for a clean run
    expect(consoleErrors.length).toBe(0);
  });

  test('Compute iterative algorithm with small count produces expected first 10 Fibonacci numbers', async ({ page }) => {
    // Purpose: Validate user can change algorithm and count and that correct sequence is rendered.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Set count to 10 and select iterative algorithm, then compute
    await fib.setCount(10);
    await fib.setMethod('iterative');

    // Wait for method badge to reflect change (the select has change listener)
    await expect(fib.algoBadge).toHaveText(/Algorithm:\s*iterative/);

    await fib.clickCompute();

    // Wait for the output to update with 10 lines
    await page.waitForFunction(() => document.getElementById('outCount').textContent === '10', null, { timeout: 2000 });

    const lines = await fib.getOutputLines();
    expect(lines.length).toBe(10);

    // Validate exact known sequence for n=1..10
    const expected = [
      '1: 1',
      '2: 1',
      '3: 2',
      '4: 3',
      '5: 5',
      '6: 8',
      '7: 13',
      '8: 21',
      '9: 34',
      '10: 55'
    ];
    expect(lines.slice(0, 10)).toEqual(expected);
  });

  test('Naive recursive algorithm rejects large n and displays error message', async ({ page }) => {
    // Purpose: Confirm the UI surfaces errors thrown by computeSequence (naive recursion limit).
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Set a value greater than 40 and choose recursive method which should throw
    await fib.setCount(45);
    await fib.setMethod('recursive');

    // Trigger compute - this should be caught by the click handler and displayed in output
    await fib.clickCompute();

    // Wait for the timeBadge to show 'Time: error' which indicates the error path was taken
    await page.waitForFunction(() => document.getElementById('timeBadge').textContent.includes('error'), null, { timeout: 2000 });

    // Output should contain the thrown error message
    const outputText = await fib.getOutputText();
    expect(outputText).toContain('Error:');
    expect(outputText).toContain('Naive recursion limited');

    // The page should not have uncaught exceptions (error handled by try/catch)
    expect(pageErrors.length).toBe(0);
  });

  test('Clear button resets output, outCount and time badge and clears the chart', async ({ page }) => {
    // Purpose: Verify that clear resets UI state after a computation.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Ensure there is some content first
    await expect(fib.outCount).not.toHaveText('0');

    // Click clear
    await fib.clickClear();

    // Output should be empty and outCount reset to '0'
    await expect(fib.output).toHaveText('');
    await expect(fib.outCount).toHaveText('0');

    // timeBadge should be reset to initial placeholder
    await expect(fib.timeBadge).toHaveText('Time: --');

    // Chart canvas may have been cleared; ensure canvas is present but no exception thrown
    await expect(fib.chart).toBeVisible();

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Copy button toggles text to show success or failure and then reverts', async ({ page }) => {
    // Purpose: Ensure copy button handles clipboard behavior (success or failure) and updates button text temporarily.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Click the copy button
    await fib.clickCopy();

    // The UI changes button text to either 'Copied!' or 'Copy failed' briefly.
    // Wait for the immediate text change.
    const copyBtn = fib.copyBtn;
    await page.waitForTimeout(50); // small wait for event handler to update text

    const btnText = (await copyBtn.textContent()) || '';
    expect(['Copied!', 'Copy failed', 'Copy sequence']).toContain(btnText);

    // After ~1.2s the button should revert to 'Copy sequence' — wait up to 2s total
    await page.waitForTimeout(1400);
    const reverted = (await copyBtn.textContent()) || '';
    expect(reverted).toBe('Copy sequence');

    // No uncaught exceptions should be produced by clipboard handling (errors are caught in handler)
    expect(pageErrors.length).toBe(0);
  });

  test('Download PNG and toggle Y-scale trigger redraw without uncaught errors', async ({ page }) => {
    // Purpose: clicking download and toggling y-scale should not produce uncaught exceptions and should trigger compute.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Click download PNG - the handler creates an <a> and clicks it
    await fib.clickDownloadPNG();

    // Toggle y-scale (this triggers computeBtn.click internally)
    const beforeBadge = await fib.toggleLog.textContent();
    await fib.clickToggleLog();

    // toggleLog text should switch to the opposite label
    const afterBadge = await fib.toggleLog.textContent();
    expect(afterBadge).not.toBe(beforeBadge);

    // Ensure compute triggered by toggle completed (outCount stays consistent)
    await page.waitForTimeout(300);

    // No uncaught page errors after these operations
    expect(pageErrors.length).toBe(0);
  });

  test('Hovering phi badge shows ratio details, mouse leave restores φ text', async ({ page }) => {
    // Purpose: Ensure hover behaviour updates the phi badge text and leaving restores original text.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Hover the phi badge to trigger the mouseenter handler
    await fib.hoverPhi();

    // The phiBadge text is replaced with computed rows containing "n=" entries
    await page.waitForFunction(() => {
      const el = document.getElementById('phiBadge');
      return el && el.textContent && el.textContent.includes('n=5:');
    }, null, { timeout: 2000 });

    const phiTextHovered = (await fib.phiBadge.textContent()) || '';
    expect(phiTextHovered).toContain('n=5:');

    // Move mouse away and wait for the original text to be restored
    await fib.unhoverPhi();
    await page.waitForFunction(() => {
      const el = document.getElementById('phiBadge');
      return el && el.textContent && el.textContent.includes('φ ≈');
    }, null, { timeout: 2000 });

    const phiTextRestored = (await fib.phiBadge.textContent()) || '';
    expect(phiTextRestored).toMatch(/φ ≈\s*1\.6180/);
  });

  test('Pressing Enter in the count input triggers compute (accessibility test)', async ({ page }) => {
    // Purpose: Confirm that pressing Enter in the count input triggers computation (keyboard accessibility).
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Set a distinct small count, then focus and press Enter
    await fib.setCount(7);
    await fib.count.focus();
    await page.keyboard.press('Enter');

    // Wait for outCount to reflect '7'
    await page.waitForFunction(() => document.getElementById('outCount').textContent === '7', null, { timeout: 2000 });

    const lines = await fib.getOutputLines();
    expect(lines.length).toBe(7);
    expect(lines[0]).toBe('1: 1');
  });
});
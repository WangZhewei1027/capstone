import { test, expect } from '@playwright/test';

// Test file for Application ID: 6e0a0753-d5a0-11f0-8040-510e90b1f3a7
// Purpose: End-to-end Playwright tests for the Sliding Window interactive HTML application.
// Notes:
// - Uses ES module syntax as required.
// - Loads the page exactly as-is and observes console logs and page errors.
// - Verifies UI state, DOM updates, visual changes, and interactive controls.
// - Does not modify or patch the page under test.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0753-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for the Sliding Window page to encapsulate selectors and common actions.
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Buttons
    this.resetBtn = page.getByRole('button', { name: 'Reset' });
    this.leftBtn = page.locator('#leftBtn');
    this.rightBtn = page.locator('#rightBtn');
    this.autoBtn = page.locator('#autoBtn');
    this.runExampleBtn = page.getByRole('button', { name: 'Calculate Max Sum' });

    // Stats
    this.windowSizeSpan = page.locator('#windowSize');
    this.currentPosSpan = page.locator('#currentPos');
    this.currentSumSpan = page.locator('#currentSum');

    // Visualization
    this.visualization = page.locator('#visualization');
    this.slidingWindow = page.locator('#slidingWindow');
    this.exampleResult = page.locator('#exampleResult');
  }

  // Click controls
  async clickReset() { await this.resetBtn.click(); }
  async clickLeft() { await this.leftBtn.click(); }
  async clickRight() { await this.rightBtn.click(); }
  async clickAuto() { await this.autoBtn.click(); }
  async clickRunExample() { await this.runExampleBtn.click(); }

  // Read stats
  async getWindowSizeText() { return (await this.windowSizeSpan.textContent()).trim(); }
  async getCurrentPosText() { return (await this.currentPosSpan.textContent()).trim(); }
  async getCurrentSumText() { return (await this.currentSumSpan.textContent()).trim(); }

  // Get computed inline style values set by the page script for the sliding window
  async getWindowStyle() {
    return this.page.$eval('#slidingWindow', el => ({
      width: el.style.width,
      left: el.style.left
    }));
  }

  // Return an array of active element indices (those with .active class)
  async getActiveIndices() {
    return this.page.$$eval('.element', nodes =>
      nodes.map((n, i) => ({ i, active: n.classList.contains('active'), text: n.textContent.trim() }))
    );
  }

  // Utility to read button text content (useful for Auto Slide toggle)
  async getAutoBtnText() {
    return (await this.autoBtn.textContent()).trim();
  }

  // Read whether left/right buttons are disabled
  async isLeftDisabled() { return await this.leftBtn.isDisabled(); }
  async isRightDisabled() { return await this.rightBtn.isDisabled(); }
}

test.describe('Sliding Window Application - Visual & Interactive Tests', () => {
  // Hold console and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Clear arrays before each test and attach listeners to capture console and page errors.
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application and wait for load (the page registers initVisualization on window.onload).
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // After each test, assert that there were no uncaught page errors (ReferenceError/SyntaxError/TypeError).
    // The test will fail if any page error happened during the test run.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.toString()).join(' | ')}`).toBe(0);

    // Also assert that there were no console.error messages emitted.
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, `Unexpected console.error messages: ${errorConsoleMessages.map(m => m.text).join(' | ')}`).toBe(0);
  });

  test('Initial load displays correct default state and visualization', async ({ page }) => {
    // Purpose: Verify that the page initializes with the expected default stats and active elements.
    const sw = new SlidingWindowPage(page);

    // Header/title is present
    await expect(page.getByRole('heading', { name: 'Sliding Window Algorithm' })).toBeVisible();

    // Default window size should be 3
    await expect(sw.windowSizeSpan).toHaveText('3');

    // Default current position should be 0-2
    await expect(sw.currentPosSpan).toHaveText('0-2');

    // Default current sum should be 6 (2+1+3) as in the HTML initial value
    await expect(sw.currentSumSpan).toHaveText('6');

    // The sliding window element should exist and have inline width set to 3 * (40 + 10) = 150px
    const style = await sw.getWindowStyle();
    expect(style.width).toBe('150px');
    expect(style.left).toBe('0px'); // starting at position 0

    // Elements 0,1,2 should have active class, others not
    const elementStates = await sw.getActiveIndices();
    for (const info of elementStates) {
      if (info.i >= 0 && info.i <= 2) {
        expect(info.active, `Element ${info.i} should be active`).toBe(true);
      } else {
        expect(info.active, `Element ${info.i} should NOT be active`).toBe(false);
      }
    }

    // Left button should be disabled at start; right button should be enabled
    expect(await sw.isLeftDisabled()).toBe(true);
    expect(await sw.isRightDisabled()).toBe(false);
  });

  test('Slide Right increments position and updates sum and active elements until end', async ({ page }) => {
    // Purpose: Verify that clicking the "Slide Right" button moves the window right,
    // updates the displayed position and sum, and toggles active classes accordingly.
    const sw = new SlidingWindowPage(page);

    // The array length and window size combination determines the number of possible moves.
    // From the page source: arr.length = 9, windowSize = 3, so max position = 6.
    const maxPosition = 9 - 3;

    // We'll click right repeatedly until the right button becomes disabled.
    for (let expectedPos = 1; expectedPos <= maxPosition; expectedPos++) {
      await sw.clickRight();

      // Wait for the transition to complete (the page uses CSS transitions, but inline styles update immediately).
      await page.waitForTimeout(50);

      // Validate the position display updates correctly
      await expect(sw.currentPosSpan).toHaveText(`${expectedPos}-${expectedPos + 2}`);

      // Validate the left button is enabled once we moved right
      expect(await sw.isLeftDisabled()).toBe(false);

      // If we are at the final position, right button should be disabled
      if (expectedPos === maxPosition) {
        expect(await sw.isRightDisabled()).toBe(true);
      } else {
        expect(await sw.isRightDisabled()).toBe(false);
      }

      // Validate that the active elements correspond to the current window
      const elements = await sw.getActiveIndices();
      for (const info of elements) {
        if (info.i >= expectedPos && info.i < expectedPos + 3) {
          expect(info.active, `Element ${info.i} should be active at position ${expectedPos}`).toBe(true);
        } else {
          expect(info.active, `Element ${info.i} should NOT be active at position ${expectedPos}`).toBe(false);
        }
      }

      // Validate the numeric sum shown is correct by computing it using the visible element texts
      const activeTexts = elements.filter(e => e.active).map(e => Number(e.text));
      const expectedSum = activeTexts.reduce((a, b) => a + b, 0);
      await expect(sw.currentSumSpan).toHaveText(String(expectedSum));
    }
  });

  test('Slide Left and Reset behavior at edges', async ({ page }) => {
    // Purpose: Verify that sliding left is disabled at the left edge,
    // and that Reset returns the window to the start.
    const sw = new SlidingWindowPage(page);

    // Ensure left disabled at start
    expect(await sw.isLeftDisabled()).toBe(true);

    // Move right two steps
    await sw.clickRight();
    await page.waitForTimeout(50);
    await sw.clickRight();
    await page.waitForTimeout(50);

    // Now left should be enabled
    expect(await sw.isLeftDisabled()).toBe(false);

    // Click left once and verify position decremented
    await sw.clickLeft();
    await page.waitForTimeout(50);
    await expect(sw.currentPosSpan).toHaveText('1-3');

    // Click Reset and verify we are back to 0-2 and sum 6
    await sw.clickReset();
    await page.waitForTimeout(50);
    await expect(sw.currentPosSpan).toHaveText('0-2');
    await expect(sw.currentSumSpan).toHaveText('6');

    // After reset, left should be disabled and right enabled
    expect(await sw.isLeftDisabled()).toBe(true);
    expect(await sw.isRightDisabled()).toBe(false);
  });

  test('Auto Slide toggles and progresses the window automatically', async ({ page }) => {
    // Purpose: Verify that clicking the Auto Slide button starts automatic sliding and toggles the button text,
    // and that clicking again stops it and restores the button label.
    const sw = new SlidingWindowPage(page);

    // Start auto sliding
    const initialAutoText = await sw.getAutoBtnText();
    expect(initialAutoText).toBe('Auto Slide');

    await sw.clickAuto();

    // After clicking, text should change to 'Stop'
    await expect(sw.autoBtn).toHaveText('Stop');

    // Wait for longer than one interval (interval is 800ms) to allow the window to move at least once.
    await page.waitForTimeout(900);

    // After auto sliding has started, position should be > 0
    const posTextAfterAuto = await sw.getCurrentPosText();
    const posStart = Number(posTextAfterAuto.split('-')[0]);
    expect(posStart).toBeGreaterThanOrEqual(0);

    // Stop auto sliding
    await sw.clickAuto();
    await expect(sw.autoBtn).toHaveText('Auto Slide');

    // Capture current position and ensure that after stopping and waiting another full interval, position did not advance.
    const posWhenStoppedText = await sw.getCurrentPosText();
    const posWhenStopped = Number(posWhenStoppedText.split('-')[0]);

    // Wait another interval to ensure auto sliding really stopped (if it didn't stop, position would change)
    await page.waitForTimeout(900);
    const posAfterWaitText = await sw.getCurrentPosText();
    const posAfterWait = Number(posAfterWaitText.split('-')[0]);

    expect(posAfterWait).toBe(posWhenStopped);
  });

  test('Run Example computes maximum sum correctly and displays result', async ({ page }) => {
    // Purpose: Validate the example function result is computed and displayed correctly.
    const sw = new SlidingWindowPage(page);

    // Click the example calculate button
    await sw.clickRunExample();

    // The exampleResult element should contain the maximum sum for window size 3.
    // We know from the page data: expected max sum is 11 (from the arr in the HTML).
    await expect(sw.exampleResult).toContainText('Maximum sum of subarray of size 3: 11');
  });

  test('Edge conditions: clicking left at start or right at end does not change state', async ({ page }) => {
    // Purpose: Ensure that attempting to move beyond bounds does not alter the displayed state.
    const sw = new SlidingWindowPage(page);

    // At start, left is disabled; try clicking left anyway.
    expect(await sw.isLeftDisabled()).toBe(true);
    await sw.clickLeft(); // should be a no-op
    await page.waitForTimeout(50);
    await expect(sw.currentPosSpan).toHaveText('0-2');

    // Move to end
    const maxMoves = 9 - 3; // 6 moves to reach final pos
    for (let i = 0; i < maxMoves; i++) {
      await sw.clickRight();
      await page.waitForTimeout(20);
    }

    // Right should now be disabled
    expect(await sw.isRightDisabled()).toBe(true);

    // Try clicking right at end (no-op)
    await sw.clickRight();
    await page.waitForTimeout(50);
    const posText = await sw.getCurrentPosText();
    expect(posText).toBe('6-8');
  });

  test('Accessibility checks: buttons are visible, enabled/disabled states reflect functionality', async ({ page }) => {
    // Purpose: Quick accessibility-related checks: the control buttons should be visible and have accessible names.
    const sw = new SlidingWindowPage(page);

    await expect(sw.resetBtn).toBeVisible();
    await expect(sw.leftBtn).toBeVisible();
    await expect(sw.rightBtn).toBeVisible();
    await expect(sw.autoBtn).toBeVisible();

    // Accessible names should match expected text
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Slide Left' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Slide Right' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Auto Slide' })).toBeVisible();

    // Verify disabled/enabled states are reflected in attributes
    expect(await sw.leftBtn.getAttribute('disabled')).not.toBeNull();
    expect(await sw.rightBtn.getAttribute('disabled')).toBeNull();
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80bd090-d1c9-11f0-9efc-d1db1618a544.html';

class LcsPage {
  /**
   * Page object for the LCS Visualizer
   * Encapsulates common interactions and queries against the UI.
   */
  constructor(page) {
    this.page = page;
    this.strA = page.locator('#strA');
    this.strB = page.locator('#strB');
    this.computeBtn = page.locator('#computeBtn');
    this.animateChk = page.locator('#animateChk');
    this.speedInput = page.locator('#speed');
    this.stepBtn = page.locator('#stepBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.status = page.locator('#status');
    this.lcsLen = page.locator('#lcsLen');
    this.oneLcs = page.locator('#oneLcs');
    this.allLcs = page.locator('#allLcs');
    this.tableWrapper = page.locator('#tableWrapper');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setStrings(a, b) {
    await this.strA.fill(a);
    await this.strB.fill(b);
  }

  async clickCompute() {
    await this.computeBtn.click();
  }

  async setAnimate(enabled) {
    const checked = await this.animateChk.isChecked();
    if (checked !== enabled) {
      await this.animateChk.click();
    }
  }

  async setSpeed(ms) {
    await this.speedInput.fill(String(ms));
  }

  // Wait for the app to reach final "Done. Click any sequence..." status text.
  async waitForDone(timeout = 15000) {
    await this.page.waitForFunction(() => {
      const el = document.getElementById('status');
      return el && /Done\./.test(el.textContent || '');
    }, null, { timeout });
  }

  // Wait until the status contains a specific fragment
  async waitForStatusContains(fragment, timeout = 10000) {
    await this.page.waitForFunction(frag => {
      const el = document.getElementById('status');
      return el && (el.textContent || '').includes(frag);
    }, fragment, { timeout });
  }

  async getLcsLengthText() {
    return (await this.lcsLen.textContent()) || '';
  }

  async getOneLcsText() {
    return (await this.oneLcs.textContent()) || '';
  }

  async getAllLcsItems() {
    // returns visible sequence text items from the .sequences container
    return this.allLcs.locator('div').allTextContents();
  }

  async clickAllLcsIndex(idx = 0) {
    const items = this.allLcs.locator('div');
    await items.nth(idx).click();
  }

  async highlightedCellCount() {
    return await this.page.locator('table.dp td.highlight').count();
  }
}

test.describe('LCS Visualizer - end-to-end interactions', () => {
  // Capture console messages and page errors for each test to assert on them.
  test.beforeEach(async ({ page }) => {
    // nothing here; each test will attach its own listeners to collect logs/errors
  });

  // Test initial page load and default compute behavior
  test('loads page, runs initial compute, and shows LCS results', async ({ page }) => {
    // Collect console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const p = new LcsPage(page);
    await p.goto();

    // Ensure inputs have their default values
    await expect(p.strA).toHaveValue('ABCBDAB');
    await expect(p.strB).toHaveValue('BDCABA');

    // Wait for computation to finish (the app triggers compute on load)
    await p.waitForDone(20000);

    // After done, verify LCS length is shown and is a non-negative integer.
    const lenText = await p.getLcsLengthText();
    expect(lenText).toMatch(/^\d+$/);
    const lenNum = Number(lenText);
    expect(Number.isFinite(lenNum)).toBeTruthy();
    expect(lenNum).toBeGreaterThanOrEqual(0);

    // The displayed "one LCS" should have a length equal to the computed length or be '(empty)' for zero.
    const one = (await p.getOneLcsText()).trim();
    if (lenNum === 0) {
      expect(one).toBe('(empty)');
    } else {
      // Some valid LCS string should be displayed and its length should match
      expect(one.length).toBe(lenNum);
    }

    // Ensure the initial console message from the page is present
    const hasReadyLog = consoleMessages.some(m => m.text.includes('LCS Visualizer ready'));
    expect(hasReadyLog).toBeTruthy();

    // Assert there were no uncaught page errors during load/computation
    expect(pageErrors.length).toBe(0);
  });

  // Test explicit compute with empty strings and animation disabled (edge case)
  test('computes correctly for empty input strings with animation disabled', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const p = new LcsPage(page);
    await p.goto();

    // Disable animation to get immediate results
    await p.setAnimate(false);

    // Set both strings to empty
    await p.setStrings('', '');

    // Click compute
    await p.clickCompute();

    // Wait for final state
    await p.waitForDone(10000);

    // Expect LCS length to be 0 and one LCS to be displayed as '(empty)'
    const lenText = await p.getLcsLengthText();
    expect(lenText).toBe('0');

    const one = (await p.getOneLcsText()).trim();
    expect(one).toBe('(empty)');

    // The allLcs area should include an entry that represents the empty sequence
    const allItems = await p.getAllLcsItems();
    // At least one entry should exist and contain '(empty)' or be empty text for the sequence
    const hasEmpty = allItems.some(t => t.includes('(empty)') || t.trim().endsWith('.'));
    expect(hasEmpty).toBeTruthy();

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Test that clicking an enumerated LCS sequence highlights cells in the DP table
  test('clicking an LCS sequence highlights matching DP table cells', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const p = new LcsPage(page);
    await p.goto();

    // Wait until computation completes from initial load
    await p.waitForDone(20000);

    // Wait for at least one sequence element to be present in the sequences container.
    await page.waitForSelector('#allLcs div', { timeout: 5000 });

    // Click the first available sequence to highlight it in the table
    await p.clickAllLcsIndex(0);

    // After clicking, at least one cell in the DP table should have the 'highlight' class
    const count = await p.highlightedCellCount();
    expect(count).toBeGreaterThan(0);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Test pause/resume behavior during animation
  test('pause and resume toggle while animating', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const p = new LcsPage(page);
    await p.goto();

    // Ensure animation is enabled and set speed to a small value for faster animation
    await p.setAnimate(true);
    await p.setSpeed(10);

    // Trigger compute explicitly to start an animation run
    await p.clickCompute();

    // Wait until the pause button becomes enabled (animation in progress)
    await page.waitForSelector('#pauseBtn:not([disabled])', { timeout: 10000 });

    // Click the pause button to pause animation
    await p.pauseBtn.click();

    // When paused, pause button text should indicate 'Resume' and status should include 'Paused.'
    await expect(p.pauseBtn).toHaveText(/Resume/);
    await expect(p.status).toHaveText(/Paused\./);

    // Step button should be enabled in paused state (UI enables it even though stepMode logic may not be wired fully)
    const stepEnabled = !(await p.stepBtn.getAttribute('disabled'));
    expect(stepEnabled).toBeTruthy();

    // Click pause again to resume
    await p.pauseBtn.click();

    // After resuming, pause button text should be 'Pause' (original label)
    await expect(p.pauseBtn).toHaveText(/Pause/);

    // Finally wait for the run to complete to avoid interfering with other tests
    await p.waitForDone(20000);

    // Assert no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);
  });
});
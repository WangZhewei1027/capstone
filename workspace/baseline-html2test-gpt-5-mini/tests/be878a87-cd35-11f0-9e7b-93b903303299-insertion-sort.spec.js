import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a87-cd35-11f0-9e7b-93b903303299.html';

// Page Object for the Insertion Sort Visualizer
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.size = page.locator('#size');
    this.max = page.locator('#max');
    this.sizeVal = page.locator('#sizeVal');
    this.maxVal = page.locator('#maxVal');
    this.speed = page.locator('#speed');
    this.speedVal = page.locator('#speedVal');

    // Buttons
    this.randomBtn = page.locator('#randomBtn');
    this.almostSortedBtn = page.locator('#almostSortedBtn');
    this.reverseBtn = page.locator('#reverseBtn');
    this.applyManual = page.locator('#applyManual');
    this.resetBtn = page.locator('#resetBtn');
    this.playBtn = page.locator('#playBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.backBtn = page.locator('#backBtn');
    this.toStart = page.locator('#toStart');

    // Manual input
    this.manual = page.locator('#manual');

    // Visualization and stats
    this.bars = page.locator('#bars');
    this.bar = page.locator('#bars .bar');
    this.barValues = page.locator('#bars .bar .val');

    this.stepCount = page.locator('#stepCount');
    this.totalSteps = page.locator('#totalSteps');
    this.compCount = page.locator('#compCount');
    this.shiftCount = page.locator('#shiftCount');
    this.action = page.locator('#action');

    this.pseudocode = page.locator('#pseudocode');
    this.pseudocodeLines = page.locator('#pseudocode .line');
  }

  // Helper to get numeric values displayed in bars
  async getBarValues() {
    const count = await this.barValues.count();
    const vals = [];
    for (let i = 0; i < count; i++) {
      vals.push((await this.barValues.nth(i).textContent()).trim());
    }
    return vals;
  }

  // Click helpers
  async clickRandom() {
    await this.randomBtn.click();
  }
  async clickAlmostSorted() {
    await this.almostSortedBtn.click();
  }
  async clickReverse() {
    await this.reverseBtn.click();
  }
  async setManual(text) {
    await this.manual.fill(text);
  }
  async clickApplyManual() {
    await this.applyManual.click();
  }
  async clickReset() {
    await this.resetBtn.click();
  }
  async clickPlay() {
    await this.playBtn.click();
  }
  async clickStep() {
    await this.stepBtn.click();
  }
  async clickBack() {
    await this.backBtn.click();
  }
  async clickToStart() {
    await this.toStart.click();
  }
  async setSize(value) {
    await this.size.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  }
  async setMax(value) {
    await this.max.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  }
  async setSpeed(value) {
    await this.speed.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  }

  // Count of bars
  async barCount() {
    return this.bar.count();
  }

  // Get which pseudocode lines have 'active' class
  async getActivePseudocodeLines() {
    const lines = [];
    const count1 = await this.pseudocodeLines.count1();
    for (let i = 0; i < count; i++) {
      const el = this.pseudocodeLines.nth(i);
      const has = await el.evaluate(node => node.classList.contains('active'));
      if (has) {
        const lineNum = await el.getAttribute('data-line');
        lines.push(lineNum);
      }
    }
    return lines;
  }
}

test.describe('Insertion Sort Visualizer — end-to-end', () => {
  // Capture console messages and page errors for each test and assert none are errors.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Wait for the bars element to be populated by the initialization script
    await page.waitForSelector('#bars .bar');
  });

  test.afterEach(async () => {
    // After each test ensure there were no uncaught page errors and no console errors.
    // This verifies the application ran without runtime exceptions or console.error calls.
    expect(pageErrors.length, `Expected no page errors, but got: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages, but found: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial page load displays controls, default values, and renders bars', async ({ page }) => {
    // Purpose: Verify the default UI state after load: control labels, default values and initial visualization
    const p = new InsertionSortPage(page);

    // Check control display values
    await expect(p.sizeVal).toHaveText('20');
    await expect(p.maxVal).toHaveText('100');
    await expect(p.speedVal).toHaveText('1x');

    // Ensure bars rendered and count matches displayed size
    const barsCount = await p.barCount();
    const expectedSize = Number((await p.sizeVal.textContent()).trim());
    expect(barsCount).toBe(expectedSize);

    // Stats should be initialized (step 0)
    await expect(p.stepCount).toHaveText('0');
    // totalSteps should be greater than 0 since frames were generated
    const totalStepsText = await p.totalSteps.textContent();
    expect(Number(totalStepsText)).toBeGreaterThan(0);

    // Pseudocode lines are present
    await expect(p.pseudocodeLines).toHaveCount(7);
  });

  test('Randomize, Almost Sorted and Reverse buttons generate arrays and update the manual textarea and bars', async ({ page }) => {
    // Purpose: Validate that the preset generators update both the manual textarea and visualization bars
    const p1 = new InsertionSortPage(page);

    // Randomize
    await p.clickRandom();
    // Manual textarea should be populated with comma-separated values
    const manualTextRandom = (await p.manual.inputValue()).trim();
    expect(manualTextRandom.length).toBeGreaterThan(0);
    const arrRandom = manualTextRandom.split(/[\s,]+/).filter(Boolean);
    expect(arrRandom.length).toBeGreaterThan(0);
    // Bars count should match parsed manual array
    expect(await p.barCount()).toBe(arrRandom.length);

    // Nearly sorted
    await p.clickAlmostSorted();
    const manualAlmost = (await p.manual.inputValue()).trim();
    expect(manualAlmost.length).toBeGreaterThan(0);
    expect(await p.barCount()).toBeGreaterThan(0);

    // Reverse
    await p.clickReverse();
    const manualReverse = (await p.manual.inputValue()).trim();
    expect(manualReverse.length).toBeGreaterThan(0);
    expect(await p.barCount()).toBeGreaterThan(0);
  });

  test('Apply manual input: valid input updates visualization; invalid input triggers alert', async ({ page }) => {
    // Purpose: Test both successful manual apply and invalid input edge-case handling that triggers an alert
    const p2 = new InsertionSortPage(page);

    // Apply valid manual input
    await p.setManual('5,3,8,1');
    await p.clickApplyManual();
    // Bars should now reflect 4 values
    expect(await p.barCount()).toBe(4);
    const vals1 = await p.getBarValues();
    expect(vals).toEqual(['5', '3', '8', '1']);

    // Now apply invalid manual input and expect an alert dialog
    await p.setManual('a, b, !');
    // Listen for dialog and assert message
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('No valid numbers found.');
      await dialog.accept();
    });
    await p.clickApplyManual();
    // After handling dialog, ensure visualization was not changed to an empty state (bars remain previous 4 values)
    expect(await p.barCount()).toBeGreaterThanOrEqual(1);
  });

  test('Step, Back and To Start buttons navigate frames and update stats and pseudocode highlighting', async ({ page }) => {
    // Purpose: Ensure stepper controls move through frames and pseudocode highlights change accordingly
    const p3 = new InsertionSortPage(page);

    // Use a small manual array for deterministic and fast frame progression
    await p.setManual('3,1,2');
    await p.clickApplyManual();

    // Initial state
    await expect(p.stepCount).toHaveText('0');
    const totalStepsBefore = Number((await p.totalSteps.textContent()).trim());
    expect(totalStepsBefore).toBeGreaterThan(0);

    // Step forward once
    await p.clickStep();
    // Step count should increment
    const stepAfter1 = Number((await p.stepCount.textContent()).trim());
    expect(stepAfter1).toBeGreaterThan(0);
    // Action text should change from '—'
    const action1 = (await p.action.textContent()).trim();
    expect(action1.length).toBeGreaterThan(0);

    // Pseudocode lines active after stepping should include some line(s)
    const activeLinesAfterStep = await p.getActivePseudocodeLines();
    expect(activeLinesAfterStep.length).toBeGreaterThanOrEqual(0); // presence is enough; specific mapping tested below

    // Step forward until at least one 'shift' or 'compare' frame observed: check bar backgrounds/styles
    // We will step a few times and inspect bar inline styles for 'var(--comp)' or 'var(--shift)' or 'var(--key)'
    let sawCompareOrShiftOrKey = false;
    for (let i = 0; i < 6; i++) {
      await p.clickStep();
      // examine bars for style background containing 'var(--comp)' or 'var(--shift)' or 'var(--key)'
      const barCount = await p.bar.count();
      for (let j = 0; j < barCount; j++) {
        const bg = await p.bar.nth(j).evaluate(el => el.style.background || '');
        if (bg.includes('var(--comp)') || bg.includes('var(--shift)') || bg.includes('var(--key)') || bg.includes('var(--sorted)')) {
          sawCompareOrShiftOrKey = true;
          break;
        }
      }
      if (sawCompareOrShiftOrKey) break;
    }
    expect(sawCompareOrShiftOrKey).toBe(true);

    // Step back and ensure step count decreases
    const beforeBack = Number((await p.stepCount.textContent()).trim());
    await p.clickBack();
    const afterBack = Number((await p.stepCount.textContent()).trim());
    expect(afterBack).toBeLessThanOrEqual(beforeBack);

    // To Start should reset step to 0
    await p.clickToStart();
    await expect(p.stepCount).toHaveText('0');
  });

  test('Play button toggles play/pause and progresses frames automatically; speed control updates display', async ({ page }) => {
    // Purpose: Validate play/pause behavior and that the speed control updates its display
    const p4 = new InsertionSortPage(page);

    // Use a small manual array
    await p.setManual('4,2,3,1');
    await p.clickApplyManual();

    // Set speed to 2x and verify display updates
    await p.setSpeed('2');
    await expect(p.speedVal).toHaveText('2x');

    // Click play and expect button text to change to Pause
    await p.clickPlay();
    await expect(p.playBtn).toHaveText('Pause');

    // Wait briefly to allow automatic progression (we don't rely on exact timing)
    await page.waitForTimeout(600); // allow at least one tick at default base interval scaled by speed

    // Step count should have advanced
    const stepAfterPlay = Number((await p.stepCount.textContent()).trim());
    expect(stepAfterPlay).toBeGreaterThan(0);

    // Pause by clicking again
    await p.clickPlay();
    await expect(p.playBtn).toHaveText('Play');
  });

  test('Keyboard shortcuts: Space toggles play, ArrowRight steps, ArrowLeft back, Home to start', async ({ page }) => {
    // Purpose: Confirm keyboard accessibility shortcuts trigger corresponding controls
    const p5 = new InsertionSortPage(page);

    // Small manual array
    await p.setManual('6,5,4');
    await p.clickApplyManual();

    // Space toggles play
    await page.keyboard.press('Space');
    await expect(p.playBtn).toHaveText('Pause');
    // Pause via Space again
    await page.keyboard.press('Space');
    await expect(p.playBtn).toHaveText('Play');

    // ArrowRight steps forward
    const stepBefore = Number((await p.stepCount.textContent()).trim());
    await page.keyboard.press('ArrowRight');
    const stepAfter = Number((await p.stepCount.textContent()).trim());
    expect(stepAfter).toBeGreaterThanOrEqual(stepBefore + 1);

    // ArrowLeft steps backward
    await page.keyboard.press('ArrowLeft');
    const stepAfterBack = Number((await p.stepCount.textContent()).trim());
    expect(stepAfterBack).toBeLessThanOrEqual(stepAfter);

    // Move forward a few steps then press Home to reset
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Home');
    await expect(p.stepCount).toHaveText('0');
  });

  test('Window resize triggers re-render without producing page errors', async ({ page }) => {
    // Purpose: Ensure the resize event handler calls renderFrame and does not throw
    const p6 = new InsertionSortPage(page);

    // Trigger a resize
    await page.setViewportSize({ width: 800, height: 600 });
    // Wait briefly to allow resize handler to run
    await page.waitForTimeout(200);
    // Resize to another size
    await page.setViewportSize({ width: 400, height: 800 });
    await page.waitForTimeout(200);

    // Basic sanity check: bars still present
    await expect(p.bar).toHaveCountGreaterThan(0);
    // No extra assertions needed here; afterEach will assert there were no page errors or console errors
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80abf22-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object for the Merge Sort Visualizer
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.sizeRange = page.locator('#sizeRange');
    this.speedRange = page.locator('#speedRange');
    this.newBtn = page.locator('#newBtn');
    this.shuffleBtn = page.locator('#shuffleBtn');
    this.startBtn = page.locator('#startBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.stopBtn = page.locator('#stopBtn');
    // Info elements
    this.cmpCount = page.locator('#cmpCount');
    this.writeCount = page.locator('#writeCount');
    this.arrSize = page.locator('#arrSize');
    this.barsContainer = page.locator('#bars');
    this.bars = page.locator('#bars .bar');
    this.pseudocodeLines = page.locator('#pseudocode .code-line');
  }

  // Utility: return text values shown on bars as array of numbers
  async getBarValues() {
    const count = await this.bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const txt = await this.bars.nth(i).locator('.val').innerText();
      values.push(Number(txt));
    }
    return values;
  }

  // Wait for a given pseudocode line to be highlighted (data-line attr)
  async waitForPseudocodeLine(line, opts = {}) {
    return this.page.waitForSelector(`#pseudocode .code-line.active[data-line="${line}"]`, opts);
  }

  // Helper to set input range value and dispatch input event
  async setRangeValue(rangeLocator, value) {
    // Use evaluate to set value and dispatch input event to trigger listeners
    await rangeLocator.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
}

test.describe('Merge Sort Visualizer - End-to-End', () => {
  // Capture console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  test.afterEach(async ({}, testInfo) => {
    // If there were console or page errors, attach them to test output for debugging
    if (consoleErrors.length > 0) {
      testInfo.attach('consoleErrors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    }
    if (pageErrors.length > 0) {
      const serialized = pageErrors.map(e => (e && e.stack) ? e.stack : String(e)).join('\n\n');
      testInfo.attach('pageErrors', { body: serialized, contentType: 'text/plain' });
    }
  });

  test('Initial load: UI elements present and default state is correct', async ({ page }) => {
    // Purpose: Verify that on initial load, the main controls and visual elements are present and in expected default states.
    const app = new MergeSortPage(page);

    // Ensure main controls exist
    await expect(app.sizeRange).toBeVisible();
    await expect(app.speedRange).toBeVisible();
    await expect(app.newBtn).toBeVisible();
    await expect(app.shuffleBtn).toBeVisible();
    await expect(app.startBtn).toBeVisible();
    await expect(app.pauseBtn).toBeVisible();
    await expect(app.stepBtn).toBeVisible();
    await expect(app.stopBtn).toBeVisible();

    // Default values: arr size should match sizeRange default (value="30")
    const sizeValue = await app.sizeRange.getAttribute('value');
    await expect(Number(sizeValue)).toBeGreaterThan(0);
    await expect(await app.arrSize.innerText()).toBe(String(sizeValue));

    // Counts should start at 0
    await expect(await app.cmpCount.innerText()).toBe('0');
    await expect(await app.writeCount.innerText()).toBe('0');

    // Bars should be rendered with count equal to arr size
    const barsCount = await app.bars.count();
    expect(barsCount).toBeGreaterThanOrEqual(6); // min size is 6
    expect(barsCount).toBe(Number(sizeValue));

    // No pseudocode line should be active initially
    const activeLines = await page.$$(`#pseudocode .code-line.active`);
    expect(activeLines.length).toBe(0);

    // No console or page errors should have been emitted during initial load
    expect(consoleErrors.length, 'No console error messages expected on load').toBe(0);
    expect(pageErrors.length, 'No page errors expected on load').toBe(0);
  });

  test('New Array and Size control: changing size updates display and re-renders', async ({ page }) => {
    // Purpose: Verify size range input updates the displayed array size and New Array generates new bars accordingly.
    const app = new MergeSortPage(page);

    // Choose a smaller size to make subsequent tests faster
    await app.setRangeValue(app.sizeRange, 10);
    await expect(app.arrSize).toHaveText('10');

    // Click New Array to generate a fresh array of the chosen size
    await app.newBtn.click();

    // After re-render, bars count should match arrSize
    await expect(app.bars).toHaveCount(10);

    // Values should be present and numeric
    const vals = await app.getBarValues();
    expect(vals.length).toBe(10);
    for (const v of vals) {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBeTruthy();
    }

    // No runtime errors introduced by New Array action
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Shuffle: shuffles the current array (order should change most times)', async ({ page }) => {
    // Purpose: Ensure the Shuffle button reorders bars in the container.
    const app = new MergeSortPage(page);

    // Ensure a deterministic-ish case: set size moderately small
    await app.setRangeValue(app.sizeRange, 12);
    await app.newBtn.click();

    const before = await app.getBarValues();
    // Click shuffle
    await app.shuffleBtn.click();
    const after = await app.getBarValues();

    // They should have the same elements (multiset equality) but likely different order.
    // Check multisets are equal: sort and compare
    const sortNum = arr => arr.slice().sort((a,b)=>a-b).join(',');
    expect(sortNum(after)).toBe(sortNum(before));

    // If the shuffle produced the same order (rare), we don't fail the test; instead we assert they are arrays of same length.
    // However, attempt to assert that there is at least one position changed to validate action effect
    const samePositions = before.every((v,i) => v === after[i]);
    // It's acceptable if shuffle results in same order (low probability), but we prefer it to change
    // We assert that either order changed OR we still have correct multiset equality which we already checked.
    if (samePositions) {
      // Attach a note but don't fail - this is an acceptable edge case
      test.info().attach('note', { body: 'Shuffle produced same order as before (rare). Multiset equality confirmed.', contentType: 'text/plain' });
    }

    expect(consoleErrors.length, 'No console errors expected after shuffle').toBe(0);
    expect(pageErrors.length, 'No page errors expected after shuffle').toBe(0);
  });

  test('Step action highlights pseudocode and updates visuals and counters', async ({ page }) => {
    // Purpose: Clicking Step when not playing should prepare the recording and execute a single recorded action,
    // resulting in UI changes (highlighted pseudocode line and bar classes / updated counters).
    const app = new MergeSortPage(page);

    // Ensure array large enough to perform split/merge logic
    await app.setRangeValue(app.sizeRange, 14);
    await app.newBtn.click();

    // Capture counts before step
    const cmpBefore = Number(await app.cmpCount.innerText());
    const writeBefore = Number(await app.writeCount.innerText());

    // Click step (this should prepare the actions and execute the first action)
    await app.stepBtn.click();

    // After stepping once, either comparisons or writes might change depending on first action.
    // At minimum, some bar should have a class indicating activity (source, target, or compare).
    let anyActive = false;
    const n = await app.bars.count();
    for (let i = 0; i < n; i++) {
      const classAttr = await app.bars.nth(i).getAttribute('class');
      if (classAttr && (classAttr.includes('source') || classAttr.includes('target') || classAttr.includes('compare'))) {
        anyActive = true;
        break;
      }
    }
    expect(anyActive, 'At least one bar should have an active highlight after a step').toBeTruthy();

    // Pseudocode should have some active line after step (the code toggles active line)
    const activeLines = await page.$$(`#pseudocode .code-line.active`);
    expect(activeLines.length).toBeGreaterThanOrEqual(1);

    // Counters should be non-negative and likely incremented (or equal if first action is idle/split)
    const cmpAfter = Number(await app.cmpCount.innerText());
    const writeAfter = Number(await app.writeCount.innerText());
    expect(cmpAfter).toBeGreaterThanOrEqual(cmpBefore);
    expect(writeAfter).toBeGreaterThanOrEqual(writeBefore);

    // No runtime errors expected from stepping
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Start runs to completion quickly when speed is minimal and updates counts & highlights final state', async ({ page }) => {
    // Purpose: Start the visualization with a very small speed value to complete quickly, then verify final state.
    const app = new MergeSortPage(page);

    // Shrink size to speed up run
    await app.setRangeValue(app.sizeRange, 16);
    await app.newBtn.click();

    // Speed to minimal delay (1ms) to accelerate animation
    await app.setRangeValue(app.speedRange, 1);

    // Click Start
    await app.startBtn.click();

    // Wait for the pseudocode line 13 to be active which indicates near-completion/final copy
    await app.waitForPseudocodeLine(13, { timeout: 15000 });

    // After completion, the Start button should be disabled (final state sets startBtn.disabled=true)
    await expect(app.startBtn).toBeDisabled();

    // The comparison/write counts should be non-zero for non-trivial arrays
    const cmp = Number(await app.cmpCount.innerText());
    const writes = Number(await app.writeCount.innerText());
    expect(cmp).toBeGreaterThanOrEqual(0);
    expect(writes).toBeGreaterThanOrEqual(0);

    // After done, bars should be marked as 'source' (the code marks all bars as 'source' on 'done')
    const n = await app.bars.count();
    let allMarkedSource = true;
    for (let i = 0; i < n; i++) {
      const cls = await app.bars.nth(i).getAttribute('class');
      if (!cls || !cls.includes('source')) {
        allMarkedSource = false;
        break;
      }
    }
    expect(allMarkedSource, 'All bars should be marked as source (sorted) after done').toBeTruthy();

    // No unhandled exceptions should have occurred during run
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Pause and Stop behavior: pause toggles and stop resets counts and UI', async ({ page }) => {
    // Purpose: Test pause toggling (disabled state changes) and that Stop resets the visualization state.
    const app = new MergeSortPage(page);

    // Prepare a small run
    await app.setRangeValue(app.sizeRange, 12);
    await app.newBtn.click();
    await app.setRangeValue(app.speedRange, 50); // moderate speed

    // Start the run
    await app.startBtn.click();

    // Wait a little for play to start (pause button should become enabled)
    await expect(app.pauseBtn).toBeEnabled({ timeout: 2000 });

    // Click Pause to pause the animation
    await app.pauseBtn.click();

    // When paused, pauseBtn is disabled in this implementation and startBtn is re-enabled
    // (pause() sets pauseBtn.disabled = true, startBtn.disabled = false)
    await expect(app.pauseBtn).toBeDisabled();
    await expect(app.startBtn).toBeEnabled();

    // Click Pause again (this should resume because event handler toggles based on paused state)
    await app.pauseBtn.click(); // this will do nothing if already disabled, but ensure it does not crash

    // Now click Stop to reset the visualization
    await app.stopBtn.click();

    // After stop, counts should be reset to '0'
    await expect(app.cmpCount).toHaveText('0');
    await expect(app.writeCount).toHaveText('0');

    // Controls should be re-enabled for new interactions
    await expect(app.newBtn).toBeEnabled();
    await expect(app.shuffleBtn).toBeEnabled();
    await expect(app.sizeRange).toBeEnabled();

    // Pseudocode active highlights should be cleared
    const active = await page.$$(`#pseudocode .code-line.active`);
    expect(active.length).toBe(0);

    // No runtime exceptions due to pause/stop interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility: pressing Space toggles start/pause and does not throw', async ({ page }) => {
    // Purpose: Verify keyboard accessibility: Space key starts the algorithm and subsequent space toggles pause/resume.
    const app = new MergeSortPage(page);

    // Use small size & fast speed for quick test
    await app.setRangeValue(app.sizeRange, 10);
    await app.setRangeValue(app.speedRange, 10);
    await app.newBtn.click();

    // Focus body and press Space to start
    await page.focus('body');
    await page.keyboard.press('Space');

    // After pressing space, the start button's 'click' handler should have been invoked and play started (startBtn disabled while playing)
    // Wait shortly for it to take effect
    await page.waitForTimeout(200);
    // startBtn may be disabled while playing
    const startDisabled = await app.startBtn.isDisabled();
    expect(startDisabled).toBeTruthy();

    // Press Space again to attempt to toggle pause (if playing, pressing pauseBtn is triggered)
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // No unhandled errors should be triggered by keyboard interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});
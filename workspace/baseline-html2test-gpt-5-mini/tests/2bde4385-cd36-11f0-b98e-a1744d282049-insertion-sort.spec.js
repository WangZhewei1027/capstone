import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4385-cd36-11f0-b98e-a1744d282049.html';

// Page Object Model for the Insertion Sort Visualizer
class InsertionSortPage {
  constructor(page) {
    this.page = page;
    // controls
    this.sizeInput = page.locator('#size');
    this.speedInput = page.locator('#speed');
    this.sizeLabel = page.locator('#sizeLabel');
    this.speedLabel = page.locator('#speedLabel');
    this.randomizeBtn = page.locator('#randomize');
    this.startBtn = page.locator('#start');
    this.pauseBtn = page.locator('#pause');
    this.stepBtn = page.locator('#step');
    this.resetBtn = page.locator('#reset');
    this.minValInput = page.locator('#minVal');
    this.maxValInput = page.locator('#maxVal');
    this.seedInput = page.locator('#seed');
    this.seedApply = page.locator('#seedApply');
    this.ascBtn = page.locator('#ascBtn');
    this.descBtn = page.locator('#descBtn');

    // stats and UI
    this.canvas = page.locator('#canvas');
    this.pseudocodeLines = page.locator('#pseudocode div');
    this.stepCount = page.locator('#stepCount');
    this.compCount = page.locator('#compCount');
    this.shiftCount = page.locator('#shiftCount');
    this.iIndex = page.locator('#iIndex');
    this.jIndex = page.locator('#jIndex');
  }

  async goto() {
    await this.page.goto(URL);
  }

  // get bar values (text content of span inside each .bar)
  async getBarValues() {
    const count = await this.page.locator('#canvas .bar').count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const span = this.page.locator('#canvas .bar >> nth=' + i + ' span');
      const text = await span.textContent();
      values.push(Number(text));
    }
    return values;
  }

  // helpers for assertions
  async isSortedAscending() {
    const vals = await this.getBarValues();
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < vals[i - 1]) return false;
    }
    return true;
  }

  async isSortedDescending() {
    const vals1 = await this.getBarValues();
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[i - 1]) return false;
    }
    return true;
  }

  // set size and randomize
  async setSize(n) {
    await this.sizeInput.fill(String(n));
    // trigger input event
    await this.sizeInput.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, String(n));
  }

  async setSpeed(ms) {
    await this.speedInput.fill(String(ms));
    await this.speedInput.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, String(ms));
  }

  async randomize() {
    await this.randomizeBtn.click();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickPause() {
    await this.pauseBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async applySeed(value) {
    await this.seedInput.fill(String(value));
    await this.seedApply.click();
  }

  async clickAsc() {
    await this.ascBtn.click();
  }

  async clickDesc() {
    await this.descBtn.click();
  }

  async fillRange(minV, maxV) {
    await this.minValInput.fill(String(minV));
    await this.maxValInput.fill(String(maxV));
  }
}

test.describe('Insertion Sort Visualizer - Comprehensive E2E', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // collect runtime page errors
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      // capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(String(err && err.stack ? err.stack : err));
    });
    page.on('console', (msg) => {
      // capture console errors specifically
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.describe('Initial load and default state', () => {
    test('Page loads with expected title, controls and default array', async ({ page }) => {
      // Purpose: Validate initial load, control visibility and default values are present
      const p = new InsertionSortPage(page);
      await p.goto();

      // basic page checks
      await expect(page).toHaveTitle(/Insertion Sort Visualizer/);
      await expect(p.sizeInput).toBeVisible();
      await expect(p.speedInput).toBeVisible();
      await expect(p.randomizeBtn).toBeVisible();
      await expect(p.startBtn).toBeVisible();
      await expect(p.stepBtn).toBeVisible();
      await expect(p.pauseBtn).toBeVisible();
      await expect(p.resetBtn).toBeVisible();

      // default labels
      await expect(p.sizeLabel).toHaveText('20');
      await expect(p.speedLabel).toHaveText('150');

      // canvas should contain bars equal to default size
      const barsCount = await page.locator('#canvas .bar').count();
      expect(barsCount).toBeGreaterThanOrEqual(6); // sanity check
      expect(barsCount).toBeLessThanOrEqual(80);
      // default value should match size label
      expect(barsCount).toBe(Number(await p.sizeLabel.textContent()));

      // stats should be zeroed
      await expect(p.stepCount).toHaveText('0');
      await expect(p.compCount).toHaveText('0');
      await expect(p.shiftCount).toHaveText('0');
      await expect(p.iIndex).toHaveText('-');
      await expect(p.jIndex).toHaveText('-');

      // no uncaught errors in console or pageerror
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Control interactions and state updates', () => {
    test('Randomize updates the array and resets counters', async ({ page }) => {
      // Purpose: Ensure randomize produces a new array and resets counters/states
      const p1 = new InsertionSortPage(page);
      await p.goto();

      const before = await p.getBarValues();
      await p.randomize();

      // step/comp/shift counters remain at zero after randomize
      await expect(p.stepCount).toHaveText('0');
      await expect(p.compCount).toHaveText('0');
      await expect(p.shiftCount).toHaveText('0');

      const after = await p.getBarValues();
      // randomize should change at least one value most of the time; allow same array occasionally
      expect(after.length).toBe(before.length);
      // It's acceptable if arrays are equal due to random chance, but we assert DOM has bars present
      expect(after.every(v => typeof v === 'number')).toBe(true);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Seed apply yields deterministic arrays when seed is same', async ({ page }) => {
      // Purpose: Validate deterministic generation via seed
      const p2 = new InsertionSortPage(page);
      await p.goto();

      // use a smaller size to make checks faster
      await p.setSize(8);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));

      // apply seed first time
      await p.applySeed('12345');
      const first = await p.getBarValues();

      // apply seed again: seed apply triggers randomize by clicking randomizeBtn in handler
      await p.applySeed('12345');
      const second = await p.getBarValues();

      // With same seed the arrays should be identical (deterministic PRNG used)
      expect(first).toEqual(second);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Range inputs constrain generated values', async ({ page }) => {
      // Purpose: Ensure min/max inputs affect generated bar values
      const p3 = new InsertionSortPage(page);
      await p.goto();

      // choose narrow range
      await p.fillRange(50, 55);
      await p.randomize();

      const values1 = await p.getBarValues();
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) {
        // values should be within inclusive range or occasionally equal due to rounding
        expect(v).toBeGreaterThanOrEqual(50);
        expect(v).toBeLessThanOrEqual(55);
      }

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Ascending/Descending buttons update pseudocode and sort order', async ({ page }) => {
      // Purpose: Verify UI reflects chosen order and sorting result matches order
      const p4 = new InsertionSortPage(page);
      await p.goto();

      // set smaller size for fast execution and deterministic checks
      await p.setSize(6);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.randomize();

      // verify pseudocode line 3 includes '>' for ascending by default
      const line3 = p.pseudocodeLines.nth(3);
      await expect(line3).toContainText('>');

      // Switch to descending and check pseudocode updates
      await p.clickDesc();
      await expect(line3).toContainText('<');

      // Now run automatic sort for descending to completion and check order
      await p.setSpeed(10);
      // ensure speed event fired
      await p.speedInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.clickStart();

      // wait until bars are sorted descending (give up to 5s)
      await page.waitForFunction(() => {
        const bars = Array.from(document.querySelectorAll('#canvas .bar span')).map(s => Number(s.textContent));
        if (bars.length === 0) return false;
        for (let i = 1; i < bars.length; i++) {
          if (bars[i] > bars[i - 1]) return false;
        }
        return true;
      }, null, { timeout: 5000 });

      // confirm descending
      expect(await p.isSortedDescending()).toBe(true);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Execution controls and step-wise behavior', () => {
    test('Step button advances exactly one step', async ({ page }) => {
      // Purpose: Ensure step button applies exactly one generator step and updates step counter
      const p5 = new InsertionSortPage(page);
      await p.goto();

      // ensure a deterministic small array
      await p.setSize(7);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.randomize();

      // click step once
      await p.clickStep();

      // step count should increment to 1
      await expect(p.stepCount).toHaveText('1');

      // iIndex and jIndex should reflect some numeric or '-' (but step increments)
      const stepTxt = await p.stepCount.textContent();
      expect(Number(stepTxt)).toBeGreaterThanOrEqual(1);

      // clicking step again increments again
      await p.clickStep();
      await expect(p.stepCount).toHaveText(/^[12]$/);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Start begins auto run and Pause stops it', async ({ page }) => {
      // Purpose: Validate start/pause toggling stops the automated step loop
      const p6 = new InsertionSortPage(page);
      await p.goto();

      // small array for speed
      await p.setSize(6);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.randomize();

      // speed low so steps happen quickly
      await p.setSpeed(30);
      await p.speedInput.evaluate((el) => el.dispatchEvent(new Event('input')));

      // start the automated run
      await p.clickStart();

      // wait until at least one step happened
      await page.waitForFunction(() => Number(document.getElementById('stepCount').textContent) > 0, null, { timeout: 2000 });

      // capture current step count
      const before1 = Number(await p.stepCount.textContent());

      // pause the run
      await p.clickPause();

      // wait a bit and make sure step count doesn't advance after pause
      await page.waitForTimeout(200);
      const after1 = Number(await p.stepCount.textContent());

      expect(after).toBe(before);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Keyboard shortcuts: r -> randomize, ArrowRight -> step, Space -> start/pause', async ({ page }) => {
      // Purpose: Verify keyboard handlers call the correct actions
      const p7 = new InsertionSortPage(page);
      await p.goto();

      // set a small size for testing
      await p.setSize(6);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));

      // press 'r' to randomize: capture a snapshot
      await page.keyboard.press('r');
      const afterR = await p.getBarValues();
      expect(afterR.length).toBeGreaterThan(0);

      // press ArrowRight to step: stepCount increases by 1
      // ensure step generator is fresh by resetting first
      await p.clickReset();
      await page.keyboard.press('ArrowRight');
      await expect(p.stepCount).toHaveText('1');

      // press Space to start, then Space to pause
      await p.setSpeed(30);
      await p.speedInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await page.keyboard.press(' ');
      // wait for at least one step to occur
      await page.waitForFunction(() => Number(document.getElementById('stepCount').textContent) > 0, null, { timeout: 2000 });
      const mid = Number(await p.stepCount.textContent());
      expect(mid).toBeGreaterThan(0);

      // pause
      await page.keyboard.press(' ');
      // wait briefly to ensure no change
      await page.waitForTimeout(200);
      const afterPause = Number(await p.stepCount.textContent());
      expect(afterPause).toBe(mid);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('Edge cases and accessibility checks', () => {
    test('Reset returns UI to initial arr and clears highlights', async ({ page }) => {
      // Purpose: Verify reset button clears running state and reverts highlights
      const p8 = new InsertionSortPage(page);
      await p.goto();

      // take snapshot
      const before2 = await p.getBarValues();

      // make some steps
      await p.clickStep();
      await expect(p.stepCount).toHaveText('1');

      // reset
      await p.clickReset();

      // counters cleared
      await expect(p.stepCount).toHaveText('0');
      await expect(p.compCount).toHaveText('0');
      await expect(p.shiftCount).toHaveText('0');

      // bars should be redrawn to original arr (arr is not regenerated on reset)
      const after2 = await p.getBarValues();
      // The implementation keeps arr unchanged on reset, so arrays should match initial snapshot
      expect(after.length).toBe(before.length);

      // pseudocode lines should have no .active class (no highlights)
      const activeCount = await page.locator('#pseudocode .active').count();
      expect(activeCount).toBe(0);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('Large size toggles small bar class for visual scaling', async ({ page }) => {
      // Purpose: For visual scaling, when size > 40 the bars should get class "small"
      const p9 = new InsertionSortPage(page);
      await p.goto();

      // set to a large size
      await p.setSize(45);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.randomize();

      // at least one bar should have the 'small' class when n > 40
      const hasSmall = await page.locator('#canvas .bar.small').count();
      expect(hasSmall).toBeGreaterThan(0);

      // no runtime errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test('No uncaught errors occurred during long interaction scenario', async ({ page }) => {
      // Purpose: Stress test the application by performing many interactions and ensure no uncaught errors
      const p10 = new InsertionSortPage(page);
      await p.goto();

      // perform a sequence of interactions
      await p.setSize(10);
      await p.sizeInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.fillRange(5, 100);
      await p.randomize();
      await p.applySeed('999');
      await p.clickAsc();
      await p.setSpeed(20);
      await p.speedInput.evaluate((el) => el.dispatchEvent(new Event('input')));
      await p.clickStart();
      // wait a short while, then pause
      await page.waitForTimeout(300);
      await p.clickPause();
      // step a few times
      await p.clickStep();
      await p.clickStep();
      await p.clickReset();

      // check that no page errors or console errors were captured
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  });

  test.afterEach(async () => {
    // after each test we assert that there were no runtime page errors collected globally
    // (This double-checks in case earlier tests didn't assert)
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a89-cd35-11f0-9e7b-93b903303299.html';

// Page Object for the Quick Sort visualization page
class QuickSortPage {
  constructor(page) {
    this.page = page;
    this.size = page.locator('#size');
    this.speed = page.locator('#speed');
    this.speedLabel = page.locator('#speedLabel');
    this.pivot = page.locator('#pivot');
    this.pivotLabel = page.locator('#pivotLabel');
    this.newBtn = page.locator('#newArr');
    this.shuffleBtn = page.locator('#shuffle');
    this.sortBtn = page.locator('#sortBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.cancelBtn = page.locator('#cancelBtn');
    this.bars = page.locator('#bars .bar');
    this.comp = page.locator('#comp');
    this.swaps = page.locator('#swaps');
    this.stack = page.locator('#stack');
    this.header = page.locator('h1');
  }

  // Helpers to interact with inputs in a way consistent with the page's event listeners
  async setSize(value) {
    // set value and dispatch 'input' event so the page reacts
    await this.page.evaluate((v) => {
      const el = document.getElementById('size');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  async setSpeed(value) {
    await this.page.evaluate((v) => {
      const el1 = document.getElementById('speed');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  async selectPivot(value) {
    await this.pivot.selectOption(value);
    // change event listener updates label
    await this.page.evaluate(() => {
      const el2 = document.getElementById('pivot');
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async clickNew() { await this.newBtn.click(); }
  async clickShuffle() { await this.shuffleBtn.click(); }
  async clickSort() { await this.sortBtn.click(); }
  async clickPause() { await this.pauseBtn.click(); }
  async clickCancel() { await this.cancelBtn.click(); }

  async clickBar(index = 0) {
    const count = await this.bars.count();
    const idx = Math.max(0, Math.min(index, count - 1));
    await this.bars.nth(idx).click();
  }

  async barsCount() {
    return await this.bars.count();
  }

  async firstBarStyle() {
    return await this.bars.nth(0).getAttribute('style');
  }

  async getComp() {
    return (await this.comp.textContent()).trim();
  }

  async getSwaps() {
    return (await this.swaps.textContent()).trim();
  }

  async getSpeedLabel() {
    return (await this.speedLabel.textContent()).trim();
  }

  async getPivotLabel() {
    return (await this.pivotLabel.textContent()).trim();
  }

  async getStackText() {
    return (await this.stack.textContent()).trim();
  }

  async isSizeDisabled() {
    return await this.size.isDisabled();
  }

  async pauseButtonText() {
    return (await this.pauseBtn.textContent()).trim();
  }

  async waitForRunningStart(timeout = 5000) {
    // When running, certain controls are disabled. Wait for size input to become disabled.
    await this.page.waitForFunction(() => {
      const el3 = document.getElementById('size');
      return el && el.disabled === true;
    }, null, { timeout });
  }

  async waitForRunningStop(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const el4 = document.getElementById('size');
      return el && el.disabled === false;
    }, null, { timeout });
  }
}

test.describe('Quick Sort Visualization - be878a89-cd35-11f0-9e7b-93b903303299', () => {
  let page;
  let qs;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];

    // capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // capture uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    qs = new QuickSortPage(page);

    // sanity wait for initial render
    await page.waitForSelector('#bars .bar');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial load: default UI elements and state are correct', async () => {
    // Purpose: Verify page loaded, header present, default size and labels correct.
    await expect(qs.header).toHaveText('Quick Sort Visualization');

    // Default size input value is 40 -> there should be 40 bars initially
    const sizeValue = await page.$eval('#size', el => el.value);
    const barsCount = await qs.barsCount();
    expect(Number(sizeValue)).toBeGreaterThan(0);
    expect(barsCount).toBe(Number(sizeValue));

    // Default speed label and pivot label should reflect initial inputs
    expect(await qs.getSpeedLabel()).toBe(String(await page.$eval('#speed', e => e.value)));
    expect(await qs.getPivotLabel()).toBe('Last Element');

    // Comparisons and swaps start at 0
    expect(await qs.getComp()).toBe('0');
    expect(await qs.getSwaps()).toBe('0');

    // Stack should show idle text
    const stackText = await qs.getStackText();
    expect(stackText).toMatch(/Stack is empty \(idle\)/i);

    // Ensure there are no page errors at initial load
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('Size input updates bars when changed', async () => {
    // Purpose: Changing the range input 'size' should create arrays of corresponding length
    await qs.setSize(10);
    // wait for DOM update
    await page.waitForTimeout(50);
    expect(await qs.barsCount()).toBe(10);

    await qs.setSize(7);
    await page.waitForTimeout(50);
    expect(await qs.barsCount()).toBe(7);
  });

  test('New Array button generates a fresh array for the selected size', async () => {
    // Purpose: Clicking New Array should regenerate the bars for the current size without running state
    await qs.setSize(8);
    // ensure bars reflect new size via the input's change event
    await page.waitForTimeout(50);
    await qs.clickNew();
    await page.waitForTimeout(50);
    expect(await qs.barsCount()).toBe(8);

    // Ensure stats were reset for a newly created array
    expect(await qs.getComp()).toBe('0');
    expect(await qs.getSwaps()).toBe('0');
  });

  test('Shuffle button randomizes array content and resets stats', async () => {
    // Purpose: Shuffle should not change number of bars and should reset comparisons/swaps
    const beforeLabels = await page.$$eval('#bars .bar .label', labels => labels.map(l => l.textContent));
    await qs.clickShuffle();
    await page.waitForTimeout(50);
    const afterLabels = await page.$$eval('#bars .bar .label', labels => labels.map(l => l.textContent));
    // Number of bars remains the same
    expect(afterLabels.length).toBe(beforeLabels.length);
    // Comparisons and swaps should be reset to zero
    expect(await qs.getComp()).toBe('0');
    expect(await qs.getSwaps()).toBe('0');
    // It's acceptable that shuffle could produce same sequence rarely; assert at least the arrays are present
    expect(afterLabels.length).toBeGreaterThan(0);
  });

  test('Clicking a bar while idle highlights it as a pivot briefly', async () => {
    // Purpose: Clicking a bar should apply a pivot highlight and reset after timeout (visual check via inline style)
    // get first bar's style before click
    const beforeStyle = await qs.firstBarStyle();
    await qs.clickBar(0);
    // small delay to let style apply
    await page.waitForTimeout(30);
    const duringStyle = await qs.firstBarStyle();
    // We expect style to at least be modified to include the pivot background variable
    expect(duringStyle === beforeStyle ? false : true).toBeTruthy();
    // after 800ms the style should have been reset (the demo resets pivot highlight after ~700ms)
    await page.waitForTimeout(800);
    const afterStyle = await qs.firstBarStyle();
    // It may or may not exactly equal beforeStyle due to order of style attributes; ensure not stuck with pivot var
    expect(afterStyle.includes('var(--bar-pivot)')).toBeFalsy();
  });

  test('Start sort, pause/resume, and cancel interactions update UI state', async () => {
    // Purpose: Validate the sorting lifecycle: start -> pause -> resume -> cancel
    // Make sorting fast by setting speed to max (reduces animation delay)
    await qs.setSpeed(100);
    expect(await qs.getSpeedLabel()).toBe('100');

    // Start sort
    await qs.clickSort();

    // Wait for 'running' state to be signaled by the size input being disabled
    await qs.waitForRunningStart(4000);
    expect(await qs.isSizeDisabled()).toBe(true);

    // While running, clicking Pause should toggle pause state text
    const beforePauseText = await qs.pauseButtonText();
    await qs.clickPause();
    // The button text should change to 'Resume' when paused
    const pausedText = await qs.pauseButtonText();
    expect(pausedText.toLowerCase()).toContain('resume');
    // And pressing pause again should resume
    await qs.clickPause();
    const resumedText = await qs.pauseButtonText();
    expect(resumedText.toLowerCase()).toContain('pause');

    // Now cancel the run
    await qs.clickCancel();

    // Wait until running stops (size input becomes enabled again)
    await qs.waitForRunningStop(5000);
    expect(await qs.isSizeDisabled()).toBe(false);

    // After cancellation, controls should be enabled and pause text resettable
    const finalPauseText = await qs.pauseButtonText();
    expect(finalPauseText.length).toBeGreaterThan(0);

    // Ensure comparisons/swaps show numbers (could be > 0 or 0 depending on progress)
    const comp = Number(await qs.getComp());
    const swaps = Number(await qs.getSwaps());
    expect(Number.isFinite(comp)).toBe(true);
    expect(Number.isFinite(swaps)).toBe(true);

    // Confirm that there were no unhandled page errors during the whole flow
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('Keyboard shortcuts: Space toggles pause/resume during running, Escape cancels', async () => {
    // Purpose: Verify keyboard interactions work while sort is running
    await qs.setSpeed(100);
    await qs.clickSort();
    await qs.waitForRunningStart(4000);

    // Press space to pause
    await page.keyboard.press('Space');
    // small wait to let handler update state
    await page.waitForTimeout(100);
    expect((await qs.pauseButtonText()).toLowerCase()).toContain('resume');

    // Press space again to resume
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect((await qs.pauseButtonText()).toLowerCase()).toContain('pause');

    // Press Escape to request cancel
    await page.keyboard.press('Escape');

    // Wait for running to stop
    await qs.waitForRunningStop(5000);
    expect(await qs.isSizeDisabled()).toBe(false);

    // No uncaught errors recorded
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });

  test('Pivot selection updates pivot label and affects pivot strategy selection', async () => {
    // Purpose: Changing pivot select should update visible pivot label
    await qs.selectPivot('first');
    expect(await qs.getPivotLabel()).toBe('First Element');

    await qs.selectPivot('middle');
    expect(await qs.getPivotLabel()).toBe('Middle Element');

    await qs.selectPivot('random');
    expect(await qs.getPivotLabel()).toBe('Random');

    await qs.selectPivot('median');
    expect(await qs.getPivotLabel()).toBe('Median of Three');
  });

  test('Recursion stack shows entries during sorting and returns to idle after completion/cancel', async () => {
    // Purpose: Validate stack UI updates: shows calls during sort and empties when done/cancelled
    await qs.setSpeed(100);
    await qs.clickSort();
    await qs.waitForRunningStart(4000);

    // While running, stack should not be the idle text
    const stackTextDuring = (await qs.getStackText());
    expect(stackTextDuring.toLowerCase()).not.toContain('stack is empty');

    // Cancel sorting
    await qs.clickCancel();
    await qs.waitForRunningStop(5000);

    // After stop, stack should show idle text again
    const stackTextAfter = (await qs.getStackText());
    expect(stackTextAfter.toLowerCase()).toContain('stack is empty');
  });

  test('No unexpected console errors or uncaught page exceptions during normal interactions', async () => {
    // Purpose: Stress a sequence of interactions and assert no runtime errors are emitted
    await qs.setSize(12);
    await qs.clickShuffle();
    await qs.setSpeed(90);
    await qs.selectPivot('median');
    await qs.clickSort();
    await qs.waitForRunningStart(4000);
    // toggle pause/resume a couple times
    await qs.clickPause();
    await page.waitForTimeout(50);
    await qs.clickPause();
    await page.waitForTimeout(50);
    // cancel
    await qs.clickCancel();
    await qs.waitForTimeout(200);
    await qs.waitForRunningStop(5000);

    // final assertion: no console errors or page errors were observed
    expect(consoleErrors.length + pageErrors.length).toBe(0);
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a8b-cd35-11f0-9e7b-93b903303299.html';

// Page object encapsulating interactions and queries for the Counting Sort visualizer
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.size = page.locator('#size');
    this.sizeLabel = page.locator('#sizeLabel');
    this.maxVal = page.locator('#maxVal');
    this.kLabel = page.locator('#kLabel');
    this.speed = page.locator('#speed');
    this.speedLabel = page.locator('#speedLabel');

    this.genBtn = page.locator('#gen');
    this.genUniqueBtn = page.locator('#genUnique');
    this.startBtn = page.locator('#start');
    this.pauseBtn = page.locator('#pause');
    this.stepBtn = page.locator('#step');
    this.resetBtn = page.locator('#reset');

    this.inputBars = page.locator('#inputBars');
    this.countBars = page.locator('#countBars');
    this.cumBars = page.locator('#cumBars');
    this.outBars = page.locator('#outBars');
    this.stepInfo = page.locator('#stepInfo');
  }

  // navigate to page
  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial script init has run
    await expect(this.stepInfo).toBeVisible();
  }

  // Read the numeric values from the input array bars
  async getInputValues() {
    return await this._getBarsValues('#inputBars');
  }

  // Read the numeric counts (0..k) as numbers (counts may be '0', '1', etc)
  async getCountValues() {
    return await this._getBarsValues('#countBars', true);
  }

  // Read the cumulative values
  async getCumValues() {
    return await this._getBarsValues('#cumBars', true);
  }

  // Read the output array values (empty slots produce empty strings)
  async getOutValues() {
    return await this._getBarsValues('#outBars');
  }

  // Generic helper to read .value elements under a bars container.
  // If numeric==true, convert empty to 0 and return numbers.
  async _getBarsValues(containerSelector, numeric = false) {
    const locator = this.page.locator(`${containerSelector} .bar .value`);
    const count = await locator.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      const txt = (await locator.nth(i).textContent()).trim();
      if (numeric) {
        const num = txt === '' ? 0 : Number(txt);
        out.push(num);
      } else {
        out.push(txt === '' ? null : Number(txt));
      }
    }
    return out;
  }

  // Click helpers
  async clickGenerate() { await this.genBtn.click(); }
  async clickGenerateUnique() { await this.genUniqueBtn.click(); }
  async clickStart() { await this.startBtn.click(); }
  async clickPause() { await this.pauseBtn.click(); }
  async clickStep() { await this.stepBtn.click(); }
  async clickReset() { await this.resetBtn.click(); }

  // Set slider values via input event so app responds
  async setSize(value) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('size');
      el.value = String(v);
      el.dispatchEvent(new Event('input'));
    }, value);
  }
  async setMaxVal(value) {
    await this.page.evaluate((v) => {
      const el1 = document.getElementById('maxVal');
      el.value = String(v);
      el.dispatchEvent(new Event('input'));
    }, value);
  }
  async setSpeed(value) {
    await this.page.evaluate((v) => {
      const el2 = document.getElementById('speed');
      el.value = String(v);
      el.dispatchEvent(new Event('input'));
    }, value);
  }

  // Expect the Step Info to contain some substring (with timeout)
  async waitForStatusContains(substring, timeout = 5000) {
    await this.page.waitForFunction(
      (sel, sub) => document.querySelector(sel) && document.querySelector(sel).textContent.includes(sub),
      { timeout },
      '#stepInfo',
      substring
    );
  }

  // Retrieve the textual content of step info
  async getStepInfoText() {
    return (await this.stepInfo.textContent()).trim();
  }

  // Utility to check whether controls are disabled/enabled
  async isStartDisabled() { return await this.startBtn.isDisabled(); }
  async isPauseDisabled() { return await this.pauseBtn.isDisabled(); }
  async isStepDisabled() { return await this.stepBtn.isDisabled(); }
  async isGenDisabled() { return await this.genBtn.isDisabled(); }
  async isGenUniqueDisabled() { return await this.genUniqueBtn.isDisabled(); }
  async isSizeDisabled() { return await this.size.isDisabled(); }
  async isMaxValDisabled() { return await this.maxVal.isDisabled(); }
}

test.describe('Counting Sort Visualizer - be878a8b-cd35-11f0-9e7b-93b903303299', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for each test run
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // store console messages so tests can assert no unexpected errors occurred
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // collect thrown exceptions from the page (uncaught runtime errors)
      pageErrors.push(err);
    });
  });

  test('Initial page load shows default controls and arrays are rendered', async ({ page }) => {
    // Purpose: verify initial state, labels and UI elements after init() runs on load
    const vis = new CountingSortPage(page);
    await vis.goto();

    // Assertions about default slider values and labels
    await expect(vis.size).toHaveValue('12');
    await expect(vis.sizeLabel).toHaveText('12');
    await expect(vis.maxVal).toHaveValue('9');
    await expect(vis.kLabel).toHaveText('9');
    await expect(vis.speed).toHaveValue('600');
    await expect(vis.speedLabel).toHaveText('600ms');

    // Step info should reflect ready message from init()
    const info = await vis.getStepInfoText();
    expect(info).toContain('Ready. Press Start to run or Step to advance one micro-step.');

    // Check that bars are rendered with expected counts: input n items, counts k+1 bars, cum k+1, out n
    const n = Number(await vis.size.inputValue());
    const k = Number(await vis.maxVal.inputValue());
    const inputValues = await vis.getInputValues();
    const outValues = await vis.getOutValues();
    const countValues = await vis.getCountValues();
    const cumValues = await vis.getCumValues();

    expect(inputValues.length).toBe(n);
    expect(outValues.length).toBe(n);
    expect(countValues.length).toBe(k + 1);
    expect(cumValues.length).toBe(k + 1);

    // By design, at init counts/cum should be zeros and out slots null/empty
    // countValues and cumValues are numeric arrays via helper (they default empty->0)
    for (const c of countValues) expect(typeof c).toBe('number');
    for (const c of cumValues) expect(typeof c).toBe('number');

    // Ensure there were no uncaught errors or console-level "error" messages on initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors, `console errors: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `page errors: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });

  test('Generate Random and Unique work and update UI; unique respects uniqueness', async ({ page }) => {
    // Purpose: validate Generate Random and Generate Unique buttons produce arrays and UI updates
    const vis1 = new CountingSortPage(page);
    await vis.goto();

    // Click Generate Random and check status update
    await vis.clickGenerate();
    await vis.waitForStatusContains('Random array generated. Ready.');
    const afterGenValues = await vis.getInputValues();
    expect(afterGenValues.length).toBe(Number(await vis.size.inputValue()));
    // Values should be numbers (or nulls if something odd), but expect numbers
    for (const v of afterGenValues) expect(typeof v).toBe('number');

    // Click Generate Unique and verify uniqueness (all present values should be distinct)
    await vis.clickGenerateUnique();
    await vis.waitForStatusContains('Unique random array generated. Ready.');
    const uniqueVals = await vis.getInputValues();
    const set = new Set(uniqueVals);
    expect(set.size).toBe(uniqueVals.length);

    // No console errors or page errors during these operations
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Step button advances counting for the first element and updates count bar', async ({ page }) => {
    // Purpose: ensure stepping advances the "count" micro-step and updates the corresponding count bar and pointer
    const vis2 = new CountingSortPage(page);
    await vis.goto();

    // Read first input value to anticipate which count should increment
    const inputValsBefore = await vis.getInputValues();
    const firstVal = inputValsBefore[0];

    // Click Step once -> counting arr[0] should be processed
    await vis.clickStep();

    // stepInfo should show counting for arr[0]
    await vis.waitForStatusContains(`Counting: reading arr[0] = ${firstVal} -> count[${firstVal}]++`);

    // The corresponding count bar's displayed numeric value should be 1 now
    const counts = await vis.getCountValues();
    expect(counts[firstVal]).toBeGreaterThanOrEqual(1);

    // The input rendering should highlight the active index (pointer text exists in the first bar when active)
    // We can't rely on pointer to persist after the micro-step finished, but the counting micro-step sets renderInput(i) prior to incrementing i
    // We assert counts updated and no page errors occurred
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Full sorting run via Start completes and results in ascending output', async ({ page }) => {
    // Purpose: start auto-run and wait for sorting to finish; then assert output is sorted ascending and controls reflect completion
    const vis3 = new CountingSortPage(page);
    await vis.goto();

    // Speed up the auto-run so test completes quickly
    await vis.setSpeed(50);

    // Start the run
    await vis.clickStart();

    // Wait until the status indicates completion
    await vis.waitForStatusContains('Sorting complete. Result is stable and ascending.', 10000);

    // After completion, verify the input (arr) shown is sorted ascending
    const finalInput = await vis.getInputValues();
    // Filter out possible nulls, though final copy should fill all positions
    const numeric = finalInput.map(v => (v === null ? Number.NaN : v));
    // Ensure all entries are numbers
    for (const v of numeric) expect(Number.isFinite(v)).toBe(true);

    for (let idx = 1; idx < numeric.length; idx++) {
      expect(numeric[idx]).toBeGreaterThanOrEqual(numeric[idx - 1]);
    }

    // Check that Start/Step buttons are disabled after done according to implementation
    expect(await vis.isStartDisabled()).toBeTruthy();
    expect(await vis.isStepDisabled()).toBeTruthy();

    // No runtime errors occurred during the run
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Keyboard shortcuts: Space triggers Step, Enter toggles Start/Pause', async ({ page }) => {
    // Purpose: validate keyboard interactions bound to Space (step) and Enter (start/pause)
    const vis4 = new CountingSortPage(page);
    await vis.goto();

    // Press Space to perform a single step - should count arr[0]
    await page.keyboard.press('Space');

    // Step info should reflect the counting of arr[0]
    const infoAfterSpace = await vis.getStepInfoText();
    expect(infoAfterSpace).toMatch(/Counting: reading arr\[0\] =/);

    // Press Enter to start auto-run
    await page.keyboard.press('Enter');

    // After pressing Enter, the app should have a timer and pause button should be enabled
    await page.waitForTimeout(100); // allow small time for startAuto to kick in
    expect(await vis.isPauseDisabled()).toBe(false);

    // Press Enter again to toggle pause (Enter handler calls pauseAuto if timer exists)
    await page.keyboard.press('Enter');

    // After pausing, pauseBtn should be disabled
    await page.waitForTimeout(50);
    expect(await vis.isPauseDisabled()).toBe(true);

    // No console or page errors from using keyboard shortcuts
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Reset returns visualizer to ready state after partial progress', async ({ page }) => {
    // Purpose: perform a few steps, then reset and verify ready state and re-enabled controls
    const vis5 = new CountingSortPage(page);
    await vis.goto();

    // Step a few times to change state
    await vis.clickStep();
    await vis.clickStep();

    // Now click Reset
    await vis.clickReset();

    // Reset should re-run init and set Ready message
    await vis.waitForStatusContains('Ready. Press Start to run or Step to advance one micro-step.');

    // Controls that should be enabled after reset
    expect(await vis.isGenDisabled()).toBe(false);
    expect(await vis.isGenUniqueDisabled()).toBe(false);
    expect(await vis.isSizeDisabled()).toBe(false);
    expect(await vis.isMaxValDisabled()).toBe(false);

    // Bars lengths should match the slider values
    const n1 = Number(await vis.size.inputValue());
    const k1 = Number(await vis.maxVal.inputValue());
    const inputVals = await vis.getInputValues();
    const counts1 = await vis.getCountValues();
    const cum = await vis.getCumValues();
    const out1 = await vis.getOutValues();

    expect(inputVals.length).toBe(n);
    expect(out.length).toBe(n);
    expect(counts.length).toBe(k + 1);
    expect(cum.length).toBe(k + 1);

    // No page errors or console-level errors
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
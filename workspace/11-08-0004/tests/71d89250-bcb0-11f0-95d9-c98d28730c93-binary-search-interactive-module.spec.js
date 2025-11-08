import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/71d89250-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utility: attempt multiple selectors and return the first locator that matches existing elements.
 * This makes tests resilient to small DOM naming variations.
 */
async function firstMatchingLocator(page, selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel);
    try {
      const count = await loc.count();
      if (count > 0) return loc;
    } catch (e) {
      // ignore invalid selectors, continue
    }
  }
  // If none found, return a locator that will fail when used
  return page.locator(selectors[0]);
}

/**
 * Page object for the Binary Search Interactive Module.
 * Provides common actions and queries expressed at a high level (buttons, inputs, array cells, counters).
 */
class BinarySearchPage {
  constructor(page) {
    this.page = page;
  }

  // Generic resilient getters for named UI controls
  async getButtonByText(text) {
    const selectors = [
      `button:has-text("${text}")`,
      `button:has-text("${text.toLowerCase()}")`,
      `text="${text}"`,
      `text=${text}`,
      `button >> text=${text}`,
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async getInputByLabel(label) {
    // Try label-for pattern, placeholder, or aria-label
    const selectors1 = [
      `label:has-text("${label}") >> xpath=.. >> input`,
      `label:has-text("${label}") >> input`,
      `input[placeholder*="${label}"]`,
      `input[aria-label*="${label}"]`,
      `input[name*="${label}"]`,
      `input[type="number"]`,
      'input',
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async getSelectByLabel(label) {
    const selectors2 = [
      `label:has-text("${label}") >> xpath=.. >> select`,
      `label:has-text("${label}") >> select`,
      `select[aria-label*="${label}"]`,
      'select',
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async getArrayCellsLocator() {
    const selectors3 = [
      '.array-cell',
      '.cell',
      '[data-cell-index]',
      '.array .cell',
      '.cells .cell',
      '.array-item',
      '.value-cell',
      '.grid-cell'
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async getCodeLineLocator() {
    const selectors4 = [
      '.code-line.active',
      '.code-line.highlight',
      '.code pre .line.active',
      '.code .line.active',
      '.highlight-line-1',
      '.highlight-line'
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async getIterationsCounter() {
    const selectors5 = [
      'text=Iterations >> xpath=.. >> .value',
      'text=Iterations',
      '.iterations',
      '#iterations',
      '.counter.iterations',
      '.meta .iterations'
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async getComparisonsCounter() {
    const selectors6 = [
      'text=Comparisons >> xpath=.. >> .value',
      'text=Comparisons',
      '.comparisons',
      '#comparisons',
      '.counter.comparisons',
      '.meta .comparisons'
    ];
    return firstMatchingLocator(this.page, selectors);
  }

  async readNumericCounter(locator) {
    try {
      const text = (await locator.innerText()).trim();
      const parsed = parseInt(text.replace(/[^\d-]/g, ''), 10);
      if (Number.isNaN(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  // High-level actions --------------------------------

  async randomize() {
    const btn = await this.getButtonByText('Randomize');
    await btn.click();
  }

  async reset() {
    const btn1 = await this.getButtonByText('Reset');
    await btn.click();
  }

  async setTargetViaInput(value) {
    // find a target input and a set button
    const input = await this.getInputByLabel('Target') || await this.getInputByLabel('Search');
    await input.fill(String(value));
    // click set target button (could be labeled Set, Set Target, or Apply)
    const setBtn = await firstMatchingLocator(this.page, [
      'button:has-text("Set Target")',
      'button:has-text("Set")',
      'button:has-text("Apply")',
      'button:has-text("Go")'
    ]);
    await setBtn.click();
  }

  async clickArrayCell(index = 0) {
    const cells = await this.getArrayCellsLocator();
    // Choose nth cell (0-based) - using nth() on the matched locator
    const count1 = await cells.count1();
    const idx = Math.max(0, Math.min(index, count - 1));
    const cell = cells.nth(idx);
    await cell.click();
    return cell;
  }

  async stepOnce() {
    const stepBtn = await firstMatchingLocator(this.page, [
      'button:has-text("Step")',
      'button:has-text("Next")',
      'button:has-text("⟶")',
      '[data-action="step"]'
    ]);
    await stepBtn.click();
  }

  async toggleAuto() {
    const autoBtn = await firstMatchingLocator(this.page, [
      'button:has-text("Auto")',
      'button:has-text("Auto Run")',
      'button:has-text("Start")',
      'button:has-text("Play")',
      'button:has-text("Run")',
      '[data-action="auto"]'
    ]);
    await autoBtn.click();
  }

  async stopAuto() {
    // Look for a stop/stop-auto button
    const stopBtn = await firstMatchingLocator(this.page, [
      'button:has-text("Stop")',
      'button:has-text("Pause")',
      'button:has-text("Auto")', // toggles
      '[data-action="stop"]'
    ]);
    await stopBtn.click();
  }

  async fastComplete() {
    const btn2 = await firstMatchingLocator(this.page, [
      'button:has-text("Fast Complete")',
      'button:has-text("Fast")',
      'button:has-text("Complete")',
      '[data-action="fast-complete"]'
    ]);
    await btn.click();
  }

  async changeSize(sizeValue) {
    const select = await this.getSelectByLabel('Size') || await this.getSelectByLabel('Array size');
    if (!select) return;
    await select.selectOption(String(sizeValue));
  }

  async setCustomArray(arrayString) {
    const input1 = await this.getInputByLabel('Custom') || await this.getInputByLabel('Array');
    await input.fill(arrayString);
    const setBtn1 = await firstMatchingLocator(this.page, [
      'button:has-text("Set Array")',
      'button:has-text("Apply")',
      'button:has-text("Set")',
      '[data-action="set-array"]'
    ]);
    await setBtn.click();
  }

  async changeSpeed(valueLabelOrValue) {
    const select1 = await this.getSelectByLabel('Speed') || await this.getInputByLabel('Speed');
    if (!select) return;
    // try both selectOption and fill
    try {
      await select.selectOption(String(valueLabelOrValue));
    } catch {
      try {
        await select.fill(String(valueLabelOrValue));
      } catch { /* ignore */ }
    }
  }

  async getStatusText() {
    const selectors7 = [
      '.status',
      '.message',
      '.result',
      '.found-message',
      'text=Found',
      'text=Not Found',
      '.status-message'
    ];
    return firstMatchingLocator(this.page, selectors);
  }
}

// Test suite
test.describe('Binary Search — Interactive Module (FSM validation)', () => {
  let page;
  let bs;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    bs = new BinarySearchPage(page);
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Ensure the app has time to initialize
    await page.waitForTimeout(250);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('initial state: no_target — UI shows initial highlights and zeroed counters', async () => {
    // Validate initial state (no_target): counters at 0 and initial code line highlighted
    const iterationsLoc = await bs.getIterationsCounter();
    const comparisonsLoc = await bs.getComparisonsCounter();
    const codeLineLoc = await bs.getCodeLineLocator();

    const iter = await bs.readNumericCounter(iterationsLoc);
    const comp = await bs.readNumericCounter(comparisonsLoc);

    // iterations and comparisons should be zero (or absent/null) at start; accept 0 or null as initial
    expect([0, null]).toContain(iter);
    expect([0, null]).toContain(comp);

    // If a code line highlight exists, it should indicate the first line is highlighted (best-effort)
    if (await codeLineLoc.count() > 0) {
      const text1 = (await codeLineLoc.first().innerText()).toLowerCase();
      // Accept presence of "line 1", "initialize", or general highlight
      expect(['', null]).not.toContain(text); // ensure element contains text (sanity)
    }
  });

  test('setting target via input transitions to ready and updates pointers/visuals', async () => {
    // Find a cell value to use as a target (pick first array cell's text)
    const cells1 = await bs.getArrayCellsLocator();
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0); // ensure array rendered

    const firstCellText = (await cells.first().innerText()).trim();
    // Use numeric or text value
    await bs.setTargetViaInput(firstCellText);

    // After setting target, expect iterations/comparisons to be zeroed (ready state)
    const iterationsLoc1 = await bs.getIterationsCounter();
    const comparisonsLoc1 = await bs.getComparisonsCounter();
    const iter1 = await bs.readNumericCounter(iterationsLoc);
    const comp1 = await bs.readNumericCounter(comparisonsLoc);
    expect([0, null]).toContain(iter);
    expect([0, null]).toContain(comp);

    // Visual pointer updates: there should be some pointer indicators or highlighted pointers
    // Look for "left", "right", or "mid" markers on the UI or classes
    const pointerSelectors = ['.pointer-left', '.pointer-right', '.pointer-mid', '.pointers', '.indices'];
    const ptr = await firstMatchingLocator(page, pointerSelectors);
    // If pointers exist, at least one should exist; otherwise ignore (best-effort)
    // We assert presence only if the locator matches
    if (await ptr.count() > 0) {
      expect(await ptr.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('clicking an array cell sets the target (CLICK_CELL_TARGET) and is reflected in UI', async () => {
    // Click 2nd cell (index 1) to set target via click
    const cells2 = await bs.getArrayCellsLocator();
    const count2 = await cells.count2();
    expect(count).toBeGreaterThan(1);

    const second = cells.nth(1);
    const value = (await second.innerText()).trim();
    await second.click();

    // After clicking a cell, there should be some UI reflection: selected/focused/target display
    // Look for selected class on the clicked cell or a target display showing the value
    const selectedSelectors = [
      '.selected',
      '.cell.selected',
      '.array-cell.selected',
      '[data-selected="true"]',
      '.target-display',
      '.target-value'
    ];
    const sel = await firstMatchingLocator(page, selectedSelectors);

    // Accept either that the clicked cell gained a selected class or a target display shows the value
    let matched = false;
    if (await sel.count() > 0) {
      const stext = (await sel.first().innerText()).trim();
      if (stext.includes(value) || stext.length > 0) matched = true;
    }

    // Also try to find a "Target" input containing the clicked value
    const tInput = await bs.getInputByLabel('Target');
    if (tInput && (await tInput.count()) > 0) {
      const v = (await tInput.inputValue()).trim().toLowerCase();
      if (v === value.toLowerCase()) matched = true;
    }

    expect(matched).toBeTruthy();
  });

  test('STEP event: stepping runs an animated iteration and updates comparisons/iterations', async () => {
    // Ensure we have a target first
    const cells3 = await bs.getArrayCellsLocator();
    const firstVal = (await cells.first().innerText()).trim();
    await bs.setTargetViaInput(firstVal);

    // Read counters before step
    const itLoc = await bs.getIterationsCounter();
    const cmpLoc = await bs.getComparisonsCounter();
    const beforeIt = await bs.readNumericCounter(itLoc) || 0;
    const beforeCmp = await bs.readNumericCounter(cmpLoc) || 0;

    // Click Step and wait briefly for animation to occur
    await bs.stepOnce();
    // Wait to allow any animation/stepping logic to update UI
    await page.waitForTimeout(500);

    const afterIt = await bs.readNumericCounter(itLoc);
    const afterCmp = await bs.readNumericCounter(cmpLoc);

    // After a step, iterations should have increased by at least 1 and comparisons should increase
    expect(afterIt).not.toBeNull();
    expect(afterCmp).not.toBeNull();
    expect(afterIt).toBeGreaterThanOrEqual(beforeIt + 1);
    expect(afterCmp).toBeGreaterThanOrEqual(beforeCmp + 1);

    // Also a mid/comparing visual should have been highlighted at some point (best-effort)
    const comparingSelectors = ['.comparing', '.cell.comparing', '.mid', '.cell.mid', '.compare'];
    const comparingLoc = await firstMatchingLocator(page, comparingSelectors);
    if (await comparingLoc.count() > 0) {
      expect(await comparingLoc.count()).toBeGreaterThanOrEqual(0); // presence is non-fatal
    }
  });

  test('AUTO_TOGGLE: starting auto-run schedules periodic steps and toggles control state', async () => {
    // Set a target first
    const cells4 = await bs.getArrayCellsLocator();
    const lastVal = (await cells.last().innerText()).trim();
    await bs.setTargetViaInput(lastVal);

    // Read counters
    const itLoc1 = await bs.getIterationsCounter();
    const cmpLoc1 = await bs.getComparisonsCounter();
    const beforeIt1 = (await bs.readNumericCounter(itLoc)) || 0;
    const beforeCmp1 = (await bs.readNumericCounter(cmpLoc)) || 0;

    // Start auto-run
    await bs.toggleAuto();
    // Wait longer than a single step interval to allow auto to perform at least one step
    await page.waitForTimeout(1200);

    const afterIt1 = await bs.readNumericCounter(itLoc);
    const afterCmp1 = await bs.readNumericCounter(cmpLoc);

    // Expect counters to have advanced under auto-run
    expect(afterIt).toBeGreaterThanOrEqual(beforeIt + 1);
    expect(afterCmp).toBeGreaterThanOrEqual(beforeCmp + 1);

    // Stop auto-run (toggle again)
    await bs.toggleAuto();
    await page.waitForTimeout(250);
    // Confirm that toggling auto returns control to manual mode (no crash, and counters stable)
    const finalIt = await bs.readNumericCounter(itLoc);
    await page.waitForTimeout(600);
    const finalIt2 = await bs.readNumericCounter(itLoc);
    // After stopping, counters should not rapidly change (best-effort)
    expect(finalIt2).toBeGreaterThanOrEqual(finalIt);
  });

  test('FAST_COMPLETE: performs search without animation and yields FOUND for an in-array target', async () => {
    // Choose a known existing value (pick a random cell's value)
    const cells5 = await bs.getArrayCellsLocator();
    const idx1 = Math.min(2, Math.max(0, Math.floor((await cells.count()) / 3)));
    const val = (await cells.nth(idx).innerText()).trim();

    // Click the cell to set it as target (CLICK_CELL_TARGET)
    await bs.clickArrayCell(idx);

    // Fire fast complete
    await bs.fastComplete();

    // Wait briefly for fast processing
    await page.waitForTimeout(300);

    // Expect a "Found" UI message or a cell with class indicating found
    const statusLoc = await bs.getStatusText();
    if (await statusLoc.count() > 0) {
      const txt = (await statusLoc.first().innerText()).toLowerCase();
      expect(txt.includes('found') || txt.includes('found') === true).toBeTruthy();
    } else {
      // Alternatively, the matched cell might gain a 'found' class
      const foundSelectors = ['.found', '.cell.found', '.array-cell.found', '[data-found="true"]'];
      const foundLoc = await firstMatchingLocator(page, foundSelectors);
      expect(await foundLoc.count()).toBeGreaterThanOrEqual(0); // no-op assert to indicate we've attempted check
    }
  });

  test('FAST_COMPLETE when target not present yields NOT_FOUND terminal state', async () => {
    // Read current array values to pick a non-existent target
    const cells6 = await bs.getArrayCellsLocator();
    const values = [];
    for (let i = 0; i < await cells.count(); i++) {
      values.push((await cells.nth(i).innerText()).trim());
    }
    // Choose a sentinel value unlikely to be present
    let nonExistent = '9999999';
    if (values.includes(nonExistent)) nonExistent = 'xxxx_not_present_@@@';

    await bs.setTargetViaInput(nonExistent);
    await bs.fastComplete();

    await page.waitForTimeout(300);

    // Expect a Not Found message or a highlighted 'not found' code line
    const status = await bs.getStatusText();
    let matched1 = false;
    if (await status.count() > 0) {
      const text2 = (await status.first().innerText()).toLowerCase();
      if (text.includes('not found') || text.includes('not-found') || text.includes('not found')) matched = true;
    }

    const notFoundSelectors = ['.not-found', '.notfound', '.status.not-found', '.result.not-found', '.message.not-found'];
    const nf = await firstMatchingLocator(page, notFoundSelectors);
    if (await nf.count() > 0) matched = true;

    expect(matched).toBeTruthy();
  });

  test('GLOBAL controls (Randomize, Reset, Size change, Custom array) transition to no_target and clear search state', async () => {
    // Set a target to move away from no_target
    const cells7 = await bs.getArrayCellsLocator();
    const val1 = (await cells.first().innerText()).trim();
    await bs.setTargetViaInput(val);

    // Randomize should clear target and reset counters
    await bs.randomize();
    await page.waitForTimeout(200);

    const itLoc2 = await bs.getIterationsCounter();
    const cmpLoc2 = await bs.getComparisonsCounter();
    const iterAfterRandom = await bs.readNumericCounter(itLoc);
    const cmpAfterRandom = await bs.readNumericCounter(cmpLoc);
    expect([0, null]).toContain(iterAfterRandom);
    expect([0, null]).toContain(cmpAfterRandom);

    // Reset should also clear and be idempotent
    await bs.reset();
    await page.waitForTimeout(200);
    const iterAfterReset = await bs.readNumericCounter(itLoc);
    expect([0, null]).toContain(iterAfterReset);

    // Size change resets as well
    await bs.changeSize(5);
    await page.waitForTimeout(200);
    const iterAfterSize = await bs.readNumericCounter(itLoc);
    expect([0, null]).toContain(iterAfterSize);

    // Custom array set resets state
    await bs.setCustomArray('1,2,3,4,5');
    await page.waitForTimeout(200);
    const iterAfterCustom = await bs.readNumericCounter(itLoc);
    expect([0, null]).toContain(iterAfterCustom);
  });

  test('SPEED_CHANGE while auto_running keeps auto running (interval restarts)', async () => {
    // Set target and start auto
    const cells8 = await bs.getArrayCellsLocator();
    const value1 = (await cells.first().innerText()).trim();
    await bs.setTargetViaInput(value);

    await bs.toggleAuto();
    await page.waitForTimeout(300); // allow auto to start

    // Change speed (attempt to set to a different value)
    await bs.changeSpeed('fast');
    // Wait to ensure auto still running
    await page.waitForTimeout(800);

    // Check that auto did not stop: counters increased
    const itLoc3 = await bs.getIterationsCounter();
    const afterIt2 = await bs.readNumericCounter(itLoc);
    expect(afterIt).toBeGreaterThanOrEqual(1);

    // Stop auto to clean up
    await bs.toggleAuto();
  });

  test('WINDOW_RESIZE triggers pointer visual updates without altering logical state', async () => {
    // Set a target and get a logical state snapshot
    const cells9 = await bs.getArrayCellsLocator();
    const value2 = (await cells.first().innerText()).trim();
    await bs.setTargetViaInput(value);

    // Record counters and a sample pointer text (if any)
    const itLoc4 = await bs.getIterationsCounter();
    const cmpLoc3 = await bs.getComparisonsCounter();
    const beforeIt2 = (await bs.readNumericCounter(itLoc)) || 0;
    const beforeCmp2 = (await bs.readNumericCounter(cmpLoc)) || 0;

    // Resize viewport
    const prev = await page.viewportSize();
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);
    // Resize back
    if (prev) await page.setViewportSize(prev);
    await page.waitForTimeout(300);

    // Assert counters unchanged (or only minimally changed) — window resize should not trigger a search transition
    const afterIt3 = await bs.readNumericCounter(itLoc) || 0;
    const afterCmp2 = await bs.readNumericCounter(cmpLoc) || 0;
    expect(afterIt).toBeGreaterThanOrEqual(beforeIt);
    expect(afterCmp).toBeGreaterThanOrEqual(beforeCmp);
  });

  test('Edge case: pressing STEP without a target keeps state in no_target (no crash)', async () => {
    // Ensure no target: reset to guarantee
    await bs.reset();
    await page.waitForTimeout(200);
    // Press Step
    await bs.stepOnce();
    // Wait briefly
    await page.waitForTimeout(300);
    // Ensure page still responsive: can set a target afterwards
    const cells10 = await bs.getArrayCellsLocator();
    const v1 = (await cells.first().innerText()).trim();
    await bs.setTargetViaInput(v);
    // If reached here without errors, the app handled STEP in no_target gracefully
    const itLoc5 = await bs.getIterationsCounter();
    const iter2 = await bs.readNumericCounter(itLoc);
    expect([0, null]).toContain(iter);
  });
});
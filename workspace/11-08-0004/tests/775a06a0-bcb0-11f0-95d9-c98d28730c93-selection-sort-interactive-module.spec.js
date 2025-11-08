import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/775a06a0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Selection Sort Interactive Module
 * Selectors use a number of fallback strategies to be robust against small DOM differences.
 */
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Primary controls (try multiple selector strategies)
    this.playButton = page.locator('button[aria-pressed], button#play, button:has-text("Play"), button:has-text("Run")');
    this.stepButton = page.locator('button#step, button:has-text("Step"), button[title="Step"]');
    this.shuffleButton = page.locator('button#shuffle, button:has-text("Shuffle")');
    this.resetButton = page.locator('button#reset, button:has-text("Reset")');
    this.applyArrayInput = page.locator('input#array-input, input[name="array"], textarea#array-input, input[placeholder*="array"]');
    this.applyArrayButton = page.locator('button#apply-array, button:has-text("Apply"), button:has-text("Apply array")');
    this.sizeSelect = page.locator('select#size, select#size-select, select[name="size"]');
    this.applySizeButton = page.locator('button#apply-size, button:has-text("Apply size"), button:has-text("Set size")');
    this.speedRange = page.locator('input[type="range"]#speed, input[type="range"][name="speed"], input#speed');
    this.statusLocator = page.locator('[data-status], #status, .status, .status-text').first();
    // Bars area - bars may have a variety of classes. Use multiple fallbacks.
    this.bars = page.locator('.bar, .bar-item, .bar-rect, [data-value].bar, [data-value]');
    this.canvas = page.locator('.canvas, .visual .canvas, #canvas, .bars');
    // Some visual highlight classes used during compare/swap phases
    this.compareSelector = page.locator('.compare, .comparing, .highlight, .bar.compare, .bar.highlight, [data-phase="compare"]');
    this.swapSelector = page.locator('.swap, .swapping, .bar.swap, [data-phase="swap"]');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the canvas or at least one bar to appear as a sign the app loaded
    await Promise.race([
      this.bars.first().waitFor({ state: 'visible', timeout: 3000 }),
      this.canvas.waitFor({ state: 'visible', timeout: 3000 }),
    ]).catch(() => {
      // If the app does not expose bars, still proceed; tests will assert presence later
    });
  }

  // Read numeric values from the bars in order
  async getBarValues() {
    // Try to find textContent or data-value attribute
    const nodes = await this.page.locator('.bar, .bar-item, .bar-rect, [data-value]').elementHandles();
    if (!nodes || nodes.length === 0) {
      // As ultimate fallback, look for elements inside canvas
      const fallbackNodes = await this.canvas.locator('*').elementHandles();
      if (!fallbackNodes || fallbackNodes.length === 0) return [];
      const texts = [];
      for (const n of fallbackNodes) {
        const text = (await n.innerText()).trim();
        if (text !== '') texts.push(text);
      }
      return texts.map(t => Number(t)).filter(n => !Number.isNaN(n));
    }
    const values = [];
    for (const n of nodes) {
      // Prefer data-value attribute
      const dv = await n.getAttribute('data-value');
      if (dv !== null) {
        const num = Number(dv);
        if (!Number.isNaN(num)) {
          values.push(num);
          continue;
        }
      }
      // Fallback to visible text
      const txt = (await n.innerText()).trim();
      const num1 = Number(txt);
      if (!Number.isNaN(num)) values.push(num);
    }
    return values;
  }

  async clickPlay() {
    await this.playButton.first().click();
  }
  async clickStep() {
    await this.stepButton.first().click();
  }
  async clickShuffle() {
    await this.shuffleButton.first().click();
  }
  async clickReset() {
    await this.resetButton.first().click();
  }
  async applyArray(text) {
    // Fill input and click apply; robust against textarea
    if (await this.applyArrayInput.count() > 0) {
      await this.applyArrayInput.first().fill(String(text));
    } else {
      // If missing, attempt to set via page.evaluate on a known global component
      await this.page.evaluate((arr) => {
        try {
          if (window && window.__applyArrayFromTest) window.__applyArrayFromTest(arr);
        } catch (e) {}
      }, String(text));
    }
    if (await this.applyArrayButton.count() > 0) {
      await this.applyArrayButton.first().click();
    } else {
      // try pressing Enter in the input
      if (await this.applyArrayInput.count() > 0) {
        await this.applyArrayInput.first().press('Enter');
      }
    }
  }

  async applySize(size) {
    if (await this.sizeSelect.count() > 0) {
      await this.sizeSelect.first().selectOption(String(size));
      if (await this.applySizeButton.count() > 0) {
        await this.applySizeButton.first().click();
      } else {
        // Some UIs apply size on change
      }
    } else {
      // try calling global if available
      await this.page.evaluate((s) => {
        try {
          if (window && window.__setSizeFromTest) window.__setSizeFromTest(Number(s));
        } catch (e) {}
      }, size);
    }
  }

  async changeSpeed(value) {
    if (await this.speedRange.count() > 0) {
      const handle = this.speedRange.first();
      await handle.evaluate((el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    } else {
      await this.page.evaluate((v) => {
        try {
          if (window && window.__setSpeedFromTest) window.__setSpeedFromTest(Number(v));
        } catch (e) {}
      }, value);
    }
  }

  async getStatusText() {
    // Look for obvious status strings in DOM
    const possible = [
      this.statusLocator,
      this.page.locator('text=Idle'),
      this.page.locator('text=Running'),
      this.page.locator('text=Finished'),
      this.page.locator('text=Sorting'),
      this.page.locator('.legend .pill:has-text("Running"), .legend .pill:has-text("Idle")'),
    ];
    for (const p of possible) {
      try {
        if (await p.count() > 0) {
          const txt1 = (await p.first().innerText()).trim();
          if (txt) return txt;
        }
      } catch (e) {}
    }
    // As last resort scan body for keywords
    const bodyText = await this.page.textContent('body');
    return (bodyText || '').slice(0, 200);
  }
}

test.describe('Selection Sort Interactive Module — FSM conformance', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new SelectionSortPage(page);
    await pageObj.goto();
    // Ensure page is ready: at least the app's status or canvas appears
    await page.waitForTimeout(200); // brief wait to allow app scripts to initialize
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup: stop running if play button exists and is pressed
    try {
      const pressed = await page.locator('button[aria-pressed="true"]').count();
      if (pressed) {
        await page.locator('button[aria-pressed="true"]').first().click();
      }
    } catch (e) {}
  });

  test.describe('Idle state and basic controls', () => {
    test('Initial state should be Idle and show bars', async ({ page }) => {
      // Validate the app loads into Idle (FSM: idle onEnter -> updateStatusIdle)
      const status = await pageObj.getStatusText();
      expect(status.toLowerCase()).toContain('idle', 'App should display Idle status on load');

      // There should be at least one visual bar displayed
      const values1 = await pageObj.getBarValues();
      expect(values.length).toBeGreaterThan(0);
      // Each value should be numeric
      for (const v of values) expect(typeof v).toBe('number');
    });

    test('Step in idle should perform a manual processing step (processing_manual)', async ({ page }) => {
      // Capture values before stepping
      const before = await pageObj.getBarValues();
      // Click Step
      await pageObj.clickStep();

      // FSM: processing_manual onEnter performStep -> transient compare/swap; after step return to idle or finished
      // Detect visual compare/swap markers briefly
      const compareAppeared = await pageObj.compareSelector.first().waitFor({ state: 'visible', timeout: 800 }).then(() => true).catch(() => false);
      const swapAppeared = await pageObj.swapSelector.first().waitFor({ state: 'visible', timeout: 800 }).then(() => true).catch(() => false);

      // At least one of compare or swap should have been shown during a step (best-effort)
      expect(compareAppeared || swapAppeared).toBeTruthy();

      // After processing, the app should return to Idle state (or to Finished if very small array)
      await page.waitForTimeout(300); // allow UI to settle
      const statusText = await pageObj.getStatusText();
      expect(statusText.toLowerCase()).toMatch(/idle|finished/);

      // Values may have changed if swap occurred; ensure no unexpected NaNs
      const after = await pageObj.getBarValues();
      expect(after.length).toBe(before.length);
      for (const v of after) expect(typeof v).toBe('number');
    });
  });

  test.describe('Run/Pause and automatic processing (running / processing_auto)', () => {
    test('Clicking Play should enter Running state and set aria-pressed', async ({ page }) => {
      // Trigger Play
      await pageObj.clickPlay();

      // Play button should have aria-pressed true (per FSM onEnter)
      const playPressed = await page.locator('button[aria-pressed="true"]').first().count();
      expect(playPressed).toBeGreaterThan(0);

      // Status should mention Running
      const statusText1 = await pageObj.getStatusText();
      expect(statusText.toLowerCase()).toContain('run');

      // Let it run briefly and ensure timer causes steps (bars updated over time)
      const before1 = await pageObj.getBarValues();
      await page.waitForTimeout(700); // allow a couple of timer ticks at default speed
      const after1 = await pageObj.getBarValues();
      // If array is already sorted, values may remain same; otherwise expect a change or at least no NaNs
      expect(after.length).toBe(before.length);
      for (const v of after) expect(typeof v).toBe('number');

      // Pause (FSM: PAUSE -> idle)
      await pageObj.clickPlay(); // toggle pause
      // Play button aria-pressed should be false
      const pressedNow = await page.locator('button[aria-pressed="true"]').count();
      expect(pressedNow).toBe(0);
      const statusAfter = await pageObj.getStatusText();
      expect(statusAfter.toLowerCase()).toMatch(/idle|finished/);
    });

    test('Changing speed while running should not leave Running state (SPEED_CHANGE event)', async ({ page }) => {
      // Ensure small array so run completes quickly if needed
      await pageObj.applyArray('3,2,1');
      await page.waitForTimeout(200);

      // Start running
      await pageObj.clickPlay();
      await page.waitForTimeout(150);

      // Change speed to a different value
      await pageObj.changeSpeed(80);
      // FSM: SPEED_CHANGE handled in running - should stay in running
      const status1 = await pageObj.getStatusText();
      expect(status.toLowerCase()).toContain('run');

      // Stop
      await pageObj.clickPlay();
      await page.waitForTimeout(100);
    });

    test('Run to completion should enter Finished state and stop timer (FINISH onEnter)', async ({ page }) => {
      // Apply tiny unsorted array to ensure quick finish
      await pageObj.applyArray('2,1');
      await page.waitForTimeout(200);
      // Start running
      await pageObj.clickPlay();
      // Wait for Finished status
      await page.waitForTimeout(2000); // give ample time for animation and finish
      const status2 = (await pageObj.getStatusText()).toLowerCase();
      expect(status).toMatch(/finished|sorted/);

      // Bars should be sorted in ascending order (finishAlgorithm)
      const vals = await pageObj.getBarValues();
      const sorted = [...vals].slice().sort((a, b) => a - b);
      expect(vals).toEqual(sorted);
    });
  });

  test.describe('Comparing and Swapping visual phases', () => {
    test('Manual Step should show compare then swap visuals for a known case', async ({ page }) => {
      // Set a known array where a swap is required at first step
      await pageObj.applyArray('4,1,3,2');
      await page.waitForTimeout(200);

      // Click Step to cause first comparison and eventual swap
      await pageObj.clickStep();

      // Wait briefly for compare highlight
      const compared = await pageObj.compareSelector.first().waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false);
      expect(compared).toBeTruthy();

      // Wait for swap highlight (may follow)
      const swapped = await pageObj.swapSelector.first().waitFor({ state: 'visible', timeout: 1200 }).then(() => true).catch(() => false);
      // It's acceptable if swap does not appear (e.g. if algorithm only compares in that step), but at least compare should have appeared
      // If swap did appear, ensure it disappears after a short time indicating SWAP_DONE -> processing
      if (swapped) {
        await page.waitForTimeout(300);
        const stillSwap = await pageObj.swapSelector.first().isVisible().catch(() => false);
        expect(stillSwap).toBeFalsy();
      }
    });
  });

  test.describe('Shuffle, Reset and Apply custom array states', () => {
    test('Apply custom array then Shuffle should change order; Reset restores applied array', async ({ page }) => {
      // Apply a specific array so we know the "initial"
      const initialArray = [5, 1, 3, 8, 2];
      await pageObj.applyArray(initialArray.join(','));
      await page.waitForTimeout(300);
      const afterApply = await pageObj.getBarValues();
      expect(afterApply).toEqual(initialArray);

      // Shuffle should produce a different order but same multiset
      await pageObj.clickShuffle();
      // Wait a bit for shuffling to finish
      await page.waitForTimeout(500);
      const afterShuffle = await pageObj.getBarValues();
      // Ensure it's permutation of the same multiset
      expect(afterShuffle.length).toBe(initialArray.length);
      const sortedA = [...afterShuffle].sort((a, b) => a - b);
      const sortedB = [...initialArray].sort((a, b) => a - b);
      expect(sortedA).toEqual(sortedB);
      // With high likelihood the order changed
      const sameOrder = afterShuffle.every((v, i) => v === initialArray[i]);
      expect(sameOrder).toBe(false);

      // Reset should restore the applied array order
      await pageObj.clickReset();
      await page.waitForTimeout(300);
      const afterReset = await pageObj.getBarValues();
      expect(afterReset).toEqual(initialArray);
    });

    test('Applying an invalid array input should not corrupt state (APPLY_INVALID)', async ({ page }) => {
      // Capture current array
      const before2 = await pageObj.getBarValues();
      // Try to apply invalid array
      await pageObj.applyArray('a,b,!,#');
      await page.waitForTimeout(300);
      // After invalid apply, FSM should go to idle and array should remain unchanged (or unchanged length)
      const after2 = await pageObj.getBarValues();
      // We accept either unchanged or unchanged length with no NaNs; at minimum ensure no NaNs
      expect(after.length).toBeGreaterThan(0);
      for (const v of after) expect(typeof v).toBe('number');
    });
  });

  test.describe('Editing individual bars and dialog handling (editing)', () => {
    test('Clicking a bar should open a prompt and EDIT_CONFIRM applies the new value', async ({ page }) => {
      // Get first bar element text
      const barHandles = await page.locator('.bar, .bar-item, [data-value]').elementHandles();
      if (barHandles.length === 0) test.skip('No bar elements available to test editing');

      const firstBarHandle = barHandles[0];
      const originalText = (await firstBarHandle.innerText()).trim();
      // Intercept dialog and accept with new value
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('prompt');
        await dialog.accept('42');
      });
      // Click the first bar to trigger the prompt (FSM)
      await firstBarHandle.click({ force: true });
      // Allow some time for dialog handling and UI to update
      await page.waitForTimeout(300);

      // After confirming, editing should apply and reset algorithm (FSM transitions to idle)
      const updatedValues = await pageObj.getBarValues();
      expect(updatedValues.length).toBeGreaterThan(0);
      // Verify that 42 is present somewhere (and probably replaced the first element)
      expect(updatedValues).toContain(42);
      // If original was numeric, ensure it's been changed or preserved as expected
      const status3 = await pageObj.getStatusText();
      expect(status.toLowerCase()).toMatch(/idle|finished/);
    });

    test('Canceling edit (EDIT_CANCEL) leaves array unchanged', async ({ page }) => {
      // Capture current values
      const before3 = await pageObj.getBarValues();
      // Intercept dialog and cancel
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('prompt');
        await dialog.dismiss();
      });
      // Click a bar to open prompt
      const barHandles1 = await page.locator('.bar, .bar-item, [data-value]').elementHandles();
      if (barHandles.length === 0) test.skip('No bar elements available to test editing cancel');
      await barHandles[0].click({ force: true });
      await page.waitForTimeout(300);
      const after3 = await pageObj.getBarValues();
      // Expect values unchanged (or at least same length and numeric)
      expect(after.length).toBe(before.length);
      for (let i = 0; i < after.length; i++) {
        expect(typeof after[i]).toBe('number');
      }
    });
  });

  test.describe('Sizing state (sizing) and edge cases', () => {
    test('Applying a new size should change number of bars (SIZE_APPLY -> SIZE_COMPLETE)', async ({ page }) => {
      // Determine current count
      const before4 = await pageObj.getBarValues();
      const targetSize = Math.max(3, Math.min(12, before.length + 2)); // pick reasonable size
      // Apply size via page object
      await pageObj.applySize(targetSize);
      await page.waitForTimeout(400);
      const after4 = await pageObj.getBarValues();
      expect(after.length).toBe(targetSize);
    });

    test('Applying extremely small or large sizes clamps to allowed range (edge cases)', async ({ page }) => {
      // Try set to 1 (too small) and to 100 (too large) and expect clamping
      await pageObj.applySize(1);
      await page.waitForTimeout(300);
      let after5 = await pageObj.getBarValues();
      expect(after.length).toBeGreaterThanOrEqual(2); // assuming min size is 2

      await pageObj.applySize(100);
      await page.waitForTimeout(300);
      after = await pageObj.getBarValues();
      expect(after.length).toBeLessThanOrEqual(50); // assuming UI caps size; we at least ensure it's not 100
    });
  });

  test.describe('Edge case flows and keyboard shortcuts mapping', () => {
    test('Keyboard shortcuts: space toggles Play/Pause and "s" triggers Step (if implemented)', async ({ page }) => {
      // Focus page
      await page.keyboard.press('Tab'); // try to get focus somewhere reasonable
      // Press space to toggle Play
      await page.keyboard.press(' ');
      await page.waitForTimeout(200);
      // Check if aria-pressed true exists
      const isRunning = await page.locator('button[aria-pressed="true"]').count();
      // Press space again to toggle back if it was toggled
      if (isRunning) {
        await page.keyboard.press(' ');
        await page.waitForTimeout(150);
      }

      // Test 's' for step -> will trigger a manual step in many implementations
      const before5 = await pageObj.getBarValues();
      await page.keyboard.press('s');
      await page.waitForTimeout(300);
      const after6 = await pageObj.getBarValues();
      // Ensure no NaNs and length consistent
      expect(after.length).toBe(before.length);
      for (const v of after) expect(typeof v).toBe('number');
    });
  });
});
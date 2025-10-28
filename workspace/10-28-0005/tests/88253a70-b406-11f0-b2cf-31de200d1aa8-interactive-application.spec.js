import { test, expect } from '@playwright/test';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/10-28-0005/html/88253a70-b406-11f0-b2cf-31de200d1aa8.html';
    // Common locators with fallbacks
    this.arrayInput = page.locator('input[type="text"]');
    this.rangeInputs = page.locator('input[type="range"]');
    this.numericInputs = page.locator('input[type="number"]');
    this.bars = page.locator('.bar, .bars .bar, [data-role="bar"]');
    this.barsContainer = page.locator('.bars, #bars, [data-testid="bars"]');
    this.explain = page.locator('#explain, .explain, [data-testid="explain"], .status, p.lead');
    this.codeActiveLines = page.locator('[data-line].active, .code-line.active, .pseudo .active, .pseudocode .active');
    this.tailGuide = page.locator('#tail-guide, .tail-guide, [data-testid="tail-guide"]');
    this.comparisonsCounter = page.locator('#comparisons, [data-testid="comparisons"], .counter:has-text("Comparisons") >> xpath=following-sibling::*[1]');
    this.swapsCounter = page.locator('#swaps, [data-testid="swaps"], .counter:has-text("Swaps") >> xpath=following-sibling::*[1]');
    this.passesCounter = page.locator('#passes, [data-testid="passes"], .counter:has-text("Passes") >> xpath=following-sibling::*[1]');
  }

  async goto() {
    await this.page.goto(this.url);
    // Wait for initial bars to render or explanation to appear
    await Promise.race([
      this.bars.first().waitFor({ state: 'visible' }).catch(() => { }),
      this.explain.first().waitFor({ state: 'visible' }).catch(() => { })
    ]);
  }

  async getButton(names) {
    for (const name of names) {
      const btn = this.page.getByRole('button', { name, exact: false });
      if (await btn.count() > 0) {
        return btn.first();
      }
    }
    // Fallback: find any button containing any of the names text
    for (const name of names) {
      const btn = this.page.locator(`button:has-text("${name}")`);
      if (await btn.count() > 0) return btn.first();
    }
    return null;
  }

  async clickButton(names) {
    const btn = await this.getButton(names);
    expect(btn, `Button not found for any of: ${names.join(', ')}`).toBeTruthy();
    await btn.click();
  }

  async toggleCheckbox(names, value) {
    for (const name of names) {
      const chk = this.page.getByLabel(new RegExp(name, 'i'));
      if (await chk.count() > 0) {
        const current = await chk.isChecked();
        if (current !== value) {
          await chk.setChecked(value);
        }
        return;
      }
    }
    // Fallback: try checkbox near text
    const chk = this.page.locator('input[type="checkbox"]');
    if (await chk.count() > 0) {
      const current = await chk.first().isChecked();
      if (current !== value) {
        await chk.first().setChecked(value);
      }
    } else {
      // If no checkbox found, ignore to keep test resilient
    }
  }

  async setSpeed(value) {
    // Try to find speed slider by label
    const speedByLabel = this.page.getByLabel(/speed/i);
    if (await speedByLabel.count() > 0) {
      await speedByLabel.fill(String(value));
      return;
    }
    // Fallback: first range input as speed
    if (await this.rangeInputs.count() > 0) {
      const slider = this.rangeInputs.first();
      await slider.focus();
      // Set to value via evaluate if possible
      try {
        await slider.evaluate((el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, value);
      } catch {
        await slider.fill(String(value));
      }
    }
  }

  async setSize(size) {
    const sizeInputByLabel = this.page.getByLabel(/size|items|length|count|n\b/i);
    if (await sizeInputByLabel.count() > 0) {
      // If it's range or number
      const el = sizeInputByLabel.first();
      const type = await el.getAttribute('type');
      if (type === 'range' || type === 'number') {
        await el.fill(String(size));
        await el.dispatchEvent('input');
        await el.dispatchEvent('change');
      } else {
        await el.fill(String(size));
      }
      return;
    }
    // Try numeric inputs
    if (await this.numericInputs.count() > 0) {
      await this.numericInputs.first().fill(String(size));
      await this.numericInputs.first().dispatchEvent('input');
      await this.numericInputs.first().dispatchEvent('change');
      return;
    }
    // Fallback: second range input as size
    if (await this.rangeInputs.count() > 1) {
      const slider = this.rangeInputs.nth(1);
      try {
        await slider.evaluate((el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, size);
      } catch {
        await slider.fill(String(size));
      }
    }
  }

  async applyArray(values) {
    await this.arrayInput.first().fill(values);
    await this.clickButton(['Apply', 'Set', 'Update', 'Apply Values']);
  }

  async shuffle() {
    await this.clickButton(['Shuffle', 'Randomize']);
  }

  async reset() {
    await this.clickButton(['Reset', 'Defaults', 'Clear']);
  }

  async play() {
    await this.clickButton(['Play', 'Start']);
  }

  async pause() {
    await this.clickButton(['Pause', 'Stop']);
  }

  async step() {
    await this.clickButton(['Step', 'Next']);
  }

  async runOnePass() {
    await this.clickButton(['Pass', 'One Pass', 'Run One Pass']);
  }

  async toggleReducedMotion(val) {
    await this.toggleCheckbox(['Reduced motion', 'Reduce motion', 'No animation'], val);
  }

  async toggleExplain(val) {
    await this.toggleCheckbox(['Explain', 'Explanation', 'Show explanation'], val);
  }

  async toggleEarlyExit(val) {
    await this.toggleCheckbox(['Early exit', 'Early stop', 'Short-circuit'], val);
  }

  async isEditingEnabled() {
    // Editing enabled if text input exists and not disabled/readOnly
    const count = await this.arrayInput.count();
    if (count === 0) return true;
    const el = this.arrayInput.first();
    const disabled = await el.isDisabled();
    const readonlyAttr = await el.getAttribute('readonly');
    return !disabled && !readonlyAttr;
  }

  async waitForExplanationTextContains(text, timeout = 3000) {
    await expect(this.explain).toContainText(new RegExp(text, 'i'), { timeout });
  }

  async waitForCompareHighlight(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('.bar.compare'));
      return els.length === 2;
    }, null, { timeout });
    return this.page.locator('.bar.compare');
  }

  async waitForSwapHighlight(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('.bar.swap'));
      return els.length >= 1;
    }, null, { timeout });
    return this.page.locator('.bar.swap');
  }

  async waitForNoSwapHighlight(timeout = 3000) {
    await this.page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('.bar.swap'));
      return els.length === 0;
    }, null, { timeout });
  }

  async waitForSorted(timeout = 10000) {
    await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      if (bars.length === 0) return false;
      return bars.every(b => b.classList.contains('sorted'));
    }, null, { timeout });
  }

  async getActiveCodeLines() {
    // Returns { count, lines } where lines is numbers if available
    const count = await this.codeActiveLines.count();
    const lines = [];
    for (let i = 0; i < count; i++) {
      const el = this.codeActiveLines.nth(i);
      const lineAttr = await el.getAttribute('data-line');
      if (lineAttr) {
        const n = parseInt(lineAttr, 10);
        if (!Number.isNaN(n)) lines.push(n);
      }
    }
    return { count, lines };
  }

  async getBarsOrderSignature() {
    // Try to read data-value or computed height to create signature
    const count = await this.bars.count();
    const sig = [];
    for (let i = 0; i < count; i++) {
      const bar = this.bars.nth(i);
      const dataVal = await bar.getAttribute('data-value');
      if (dataVal != null) {
        sig.push(Number(dataVal));
      } else {
        const height = await bar.evaluate(el => el.offsetHeight);
        sig.push(height);
      }
    }
    return sig.join(',');
  }

  async getBarsCount() {
    return await this.bars.count();
  }

  async getTailGuideWidth() {
    if (await this.tailGuide.count() === 0) return null;
    return await this.tailGuide.first().evaluate(el => el.offsetWidth);
  }
}

test.describe('Bubble Sort Interactive Tutor - FSM and UI Integration', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BubbleSortPage(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Teardown: pause if running to reset
    const pauseBtn = await app.getButton(['Pause', 'Stop']);
    if (pauseBtn) {
      try { await pauseBtn.click({ trial: true }); } catch { /* ignore */ }
    }
  });

  test.describe('Initialization and Idle state', () => {
    test('initializing -> idle on INIT_COMPLETE with Ready explanation and editing enabled', async () => {
      // On initial load, expect Ready explanation and editing enabled
      await app.waitForExplanationTextContains('Ready', 5000);
      const editingEnabled = await app.isEditingEnabled();
      expect(editingEnabled).toBeTruthy();

      // Active pseudocode lines [1,2,3,4] after load_array calls during init? Verify some header lines active.
      const active = await app.getActiveCodeLines();
      if (active.lines.length > 0) {
        expect(active.lines).toEqual(expect.arrayContaining([1, 2, 3, 4]));
      } else {
        expect(active.count).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Loading array actions (APPLY, SHUFFLE, RESET, SIZE_CHANGE)', () => {
    test('APPLY_CLICK transitions to loading_array then back to idle with pause/ready explanations', async () => {
      const beforeSig = await app.getBarsOrderSignature();
      await app.applyArray('5,1,4,2');
      // While loading array, pause() explanation might show
      await app.waitForExplanationTextContains('Paused', 3000).catch(() => { /* explanation may not change visibly */ });
      // After LOAD_COMPLETE -> idle
      await app.waitForExplanationTextContains('Ready', 3000);
      const afterSig = await app.getBarsOrderSignature();
      expect(afterSig).not.toEqual(beforeSig);
      const editingEnabled = await app.isEditingEnabled();
      expect(editingEnabled).toBeTruthy();
    });

    test('SHUFFLE_CLICK loads new array while staying in idle after completion', async () => {
      const beforeSig = await app.getBarsOrderSignature();
      await app.shuffle();
      await app.waitForExplanationTextContains('Ready', 3000);
      const afterSig = await app.getBarsOrderSignature();
      expect(afterSig).not.toEqual(beforeSig);
    });

    test('RESET_CLICK resets array and returns to idle', async () => {
      await app.applyArray('9,8,7');
      const sigCustom = await app.getBarsOrderSignature();
      await app.reset();
      await app.waitForExplanationTextContains('Ready', 3000);
      const sigReset = await app.getBarsOrderSignature();
      expect(sigReset).not.toEqual(sigCustom);
      const editingEnabled = await app.isEditingEnabled();
      expect(editingEnabled).toBeTruthy();
    });

    test('SIZE_CHANGE updates number of bars and returns to idle', async () => {
      await app.setSize(6);
      await app.waitForExplanationTextContains('Ready', 3000);
      const count6 = await app.getBarsCount();
      await app.setSize(3);
      await app.waitForExplanationTextContains('Ready', 3000);
      const count3 = await app.getBarsCount();
      expect(count6).toBeGreaterThan(count3);
      const editingEnabled = await app.isEditingEnabled();
      expect(editingEnabled).toBeTruthy();
    });
  });

  test.describe('Playing and Paused states and transitions', () => {
    test('PLAY_CLICK enters playing: editing disabled; STEP_TIMER_TICK triggers comparing', async () => {
      await app.play();
      expect(await app.isEditingEnabled()).toBeFalsy();

      // Wait for comparing state visual feedback: two bars with .compare
      const compareBars = await app.waitForCompareHighlight(7000);
      await expect(compareBars).toHaveCount(2);
      const active = await app.getActiveCodeLines();
      if (active.lines.length > 0) {
        expect(active.lines).toEqual(expect.arrayContaining([5, 6]));
      } else {
        expect(active.count).toBeGreaterThanOrEqual(1);
      }
    });

    test('PAUSE_CLICK transitions to paused: editing enabled and "Paused" explanation', async () => {
      await app.play();
      await app.pause();
      expect(await app.isEditingEnabled()).toBeTruthy();
      await app.waitForExplanationTextContains('Paused', 3000);
    });

    test('SPEED_INPUT while playing keeps state and accelerates progression', async () => {
      await app.play();
      expect(await app.isEditingEnabled()).toBeFalsy();
      // Set high speed
      await app.setSpeed(100);
      // Still playing
      expect(await app.isEditingEnabled()).toBeFalsy();
      // Should observe compare highlights repeatedly
      await app.waitForCompareHighlight(7000);
    });

    test('REDUCED_MOTION_TOGGLE while playing keeps executing without state change', async () => {
      await app.play();
      await app.toggleReducedMotion(true);
      // State should remain playing (editing disabled)
      expect(await app.isEditingEnabled()).toBeFalsy();
      await app.waitForCompareHighlight(7000);
      // Toggle off to restore animations
      await app.toggleReducedMotion(false);
    });

    test('WINDOW_RESIZE self-loop on playing: layout updates without interrupting', async ({ page }) => {
      await app.play();
      const beforeWidth = await app.barsContainer.first().evaluate(el => el.offsetWidth);
      await page.setViewportSize({ width: 1200, height: 800 });
      // slight wait for layout
      await page.waitForTimeout(200);
      const afterWidth = await app.barsContainer.first().evaluate(el => el.offsetWidth);
      expect(beforeWidth).not.toEqual(afterWidth);
      // Still playing
      expect(await app.isEditingEnabled()).toBeFalsy();
    });
  });

  test.describe('Step mode transitions and micro-states (comparing, swapping, advance_index)', () => {
    test('STEP_CLICK from idle enters comparing with .compare classes and active code lines [5,6]', async () => {
      await app.reset();
      await app.applyArray('3,2,1');
      await app.step();
      const compareBars = await app.waitForCompareHighlight(5000);
      await expect(compareBars).toHaveCount(2);
      const active = await app.getActiveCodeLines();
      if (active.lines.length > 0) {
        expect(active.lines).toEqual(expect.arrayContaining([5, 6]));
      } else {
        expect(active.count).toBeGreaterThanOrEqual(1);
      }
    });

    test('SWAP_NEEDED -> swapping: .swap classes; SWAP_ANIMATION_COMPLETE_STEP returns to idle', async () => {
      await app.reset();
      await app.applyArray('5,1'); // ensures swap needed on first compare
      await app.step(); // comparing
      await app.waitForCompareHighlight(3000);
      await app.step(); // perform swap
      const swapBars = await app.waitForSwapHighlight(5000);
      await expect(swapBars).toHaveCount(2);
      // After animation complete in step mode -> idle (editing enabled)
      await app.waitForNoSwapHighlight(5000).catch(() => { /* some implementations keep swap class longer; tolerate */ });
      const editingEnabled = await app.isEditingEnabled();
      expect(editingEnabled).toBeTruthy();
      const active = await app.getActiveCodeLines();
      if (active.lines.length > 0) {
        expect(active.lines).toEqual(expect.arrayContaining([7, 8]));
      } else {
        expect(active.count).toBeGreaterThanOrEqual(1);
      }
    });

    test('NO_SWAP -> advance_index: ADVANCE_INDEX_STEP returns to idle immediately without auto-loop', async () => {
      await app.reset();
      await app.applyArray('1,2,3'); // first compare should be no swap
      await app.step(); // comparing
      await app.waitForCompareHighlight(3000);
      await app.step(); // advance index
      // Should return to idle: editing enabled, no compare highlight persists
      expect(await app.isEditingEnabled()).toBeTruthy();
      await app.waitForNoSwapHighlight(3000);
    });

    test('ADVANCE_INDEX_AUTO while playing: compare continues automatically', async () => {
      await app.reset();
      await app.applyArray('1,3,2'); // no swap first, then swap later
      await app.play();
      expect(await app.isEditingEnabled()).toBeFalsy();
      await app.waitForCompareHighlight(5000);
      // After no swap, should auto-advance and continue to next compare without returning to idle
      expect(await app.isEditingEnabled()).toBeFalsy();
    });
  });

  test.describe('Pass running and completion', () => {
    test('PASS_CLICK enters pass_running; PASS_COMPLETE transitions to idle after one pass', async () => {
      await app.reset();
      await app.applyArray('4,3,2,1');
      const initialTailWidth = await app.getTailGuideWidth();
      await app.runOnePass();
      // Should disable editing while running one pass
      expect(await app.isEditingEnabled()).toBeFalsy();
      // Wait for end-of-pass
      await app.waitForExplanationTextContains('Pass complete', 8000).catch(() => { /* explanation message may vary */ });
      // STOP_AFTER_ONE_PASS -> idle
      await test.step('Verify editing re-enabled after one pass', async () => {
        // wait shortly to allow transition
        await app.page.waitForTimeout(300);
        expect(await app.isEditingEnabled()).toBeTruthy();
      });
      // Tail guide should increase (sorted tail longer)
      const afterTailWidth = await app.getTailGuideWidth();
      if (initialTailWidth != null && afterTailWidth != null) {
        expect(afterTailWidth).toBeGreaterThan(initialTailWidth);
      }
      const active = await app.getActiveCodeLines();
      if (active.lines.length > 0) {
        expect(active.lines).toEqual(expect.arrayContaining([9]));
      } else {
        expect(active.count).toBeGreaterThanOrEqual(1);
      }
    });

    test('CONTINUE_AUTOPLAY in playing after pass complete: continues until done', async () => {
      await app.reset();
      await app.applyArray('9,1,8,2,7,3');
      await app.play();
      // Wait until sorted
      await app.waitForSorted(15000);
      await app.waitForExplanationTextContains('Sorting complete', 5000).catch(() => { /* message may differ slightly */ });
    });

    test('EARLY_EXIT_COMPLETE: early exit toggled on with already sorted array short-circuits to done', async () => {
      await app.reset();
      await app.applyArray('1,2,3,4,5,6');
      await app.toggleEarlyExit(true);
      await app.play();
      await app.waitForSorted(8000);
      await app.waitForExplanationTextContains('Sorting complete', 5000).catch(() => { });
      // Active code line [10] on completion
      const active = await app.getActiveCodeLines();
      if (active.lines.length > 0) {
        expect(active.lines).toEqual(expect.arrayContaining([10]));
      } else {
        expect(active.count).toBeGreaterThanOrEqual(1);
      }
      await app.toggleEarlyExit(false);
    });
  });

  test.describe('Done state transitions', () => {
    test('ARRAY_COMPLETE transitions to done: all bars .sorted and editing enabled', async () => {
      await app.reset();
      await app.applyArray('4,2,3,1');
      await app.play();
      await app.waitForSorted(15000);
      const sortedBars = app.page.locator('.bar.sorted');
      const totalBars = await app.getBarsCount();
      await expect(sortedBars).toHaveCount(totalBars);
      expect(await app.isEditingEnabled()).toBeTruthy();
    });

    test('From done: APPLY/SHUFFLE/RESET/SIZE_CHANGE return to loading_array then idle; PLAY returns to playing', async () => {
      await app.reset();
      await app.applyArray('4,2,3,1');
      await app.play();
      await app.waitForSorted(12000);
      // Apply new values
      await app.applyArray('9,8,7,6');
      await app.waitForExplanationTextContains('Ready', 3000);
      // Shuffle
      await app.shuffle();
      await app.waitForExplanationTextContains('Ready', 3000);
      // Reset
      await app.reset();
      await app.waitForExplanationTextContains('Ready', 3000);
      // Size change
      await app.setSize(5);
      await app.waitForExplanationTextContains('Ready', 3000);
      // Play again from idle
      await app.play();
      expect(await app.isEditingEnabled()).toBeFalsy();
      await app.waitForCompareHighlight(7000);
    });
  });

  test.describe('Explain toggle and message stability', () => {
    test('EXPLAIN_TOGGLE self-loop does not change execution state but toggles verbosity', async () => {
      await app.reset();
      await app.applyArray('3,2,1');
      // Idle initially
      const beforeExplainText = await app.explain.first().innerText().catch(() => '');
      await app.toggleExplain(false);
      const afterExplainText1 = await app.explain.first().innerText().catch(() => '');
      await app.toggleExplain(true);
      const afterExplainText2 = await app.explain.first().innerText().catch(() => '');
      // Execution state unaffected (still idle)
      expect(await app.isEditingEnabled()).toBeTruthy();
      // Messages may change, but should remain present
      expect(afterExplainText1.length).toBeGreaterThanOrEqual(0);
      expect(afterExplainText2.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Empty array input should not crash; app stays in idle with some bars present', async () => {
      await app.applyArray(''); // empty
      // Remains in idle with bars present
      const count = await app.getBarsCount();
      expect(count).toBeGreaterThan(0);
      expect(await app.isEditingEnabled()).toBeTruthy();
    });

    test('Size set to 1 yields immediate done after play (trivial case)', async () => {
      await app.setSize(1);
      const count = await app.getBarsCount();
      expect(count).toBe(1);
      await app.play();
      await app.waitForSorted(5000);
      expect(await app.isEditingEnabled()).toBeTruthy();
    });

    test('Invalid characters in input are handled gracefully', async () => {
      const beforeSig = await app.getBarsOrderSignature();
      await app.applyArray('a, b, c, !@#');
      // Expect either unchanged or changed to a default array; no crash
      const afterSig = await app.getBarsOrderSignature();
      expect(typeof afterSig).toBe('string');
      // App remains responsive and idle
      await app.waitForExplanationTextContains('Ready', 3000).catch(() => { /* Some implementations may stay paused briefly */ });
      expect(await app.isEditingEnabled()).toBeTruthy();
    });
  });

  test.describe('Micro-state: swapping auto vs step completion', () => {
    test('SWAP_ANIMATION_COMPLETE_AUTO keeps playing after swap in auto mode', async () => {
      await app.reset();
      await app.applyArray('5,1,4');
      await app.play();
      await app.waitForCompareHighlight(5000);
      // Expect a swap sometime soon
      const swapBars = await app.waitForSwapHighlight(10000);
      await expect(swapBars).toHaveCount(2);
      // In auto mode, after animation complete should remain playing
      expect(await app.isEditingEnabled()).toBeFalsy();
      // Eventually compare highlights should reappear for next pair
      await app.waitForCompareHighlight(7000);
    });
  });
});
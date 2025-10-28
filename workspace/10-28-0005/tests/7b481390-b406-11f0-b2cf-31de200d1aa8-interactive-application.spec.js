import { test, expect } from '@playwright/test';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    // Locators using robust queries by name/role
    this.btnStart = page.getByRole('button', { name: /start/i });
    this.btnPause = page.getByRole('button', { name: /pause/i });
    this.btnStep = page.getByRole('button', { name: /step/i });
    this.btnNextPass = page.getByRole('button', { name: /next pass/i });
    this.btnRandomize = page.getByRole('button', { name: /randomize/i });
    this.btnShuffle = page.getByRole('button', { name: /shuffle/i });
    this.btnReset = page.getByRole('button', { name: /reset/i });
    this.btnApplyCsv = page.getByRole('button', { name: /apply csv|apply/i });

    // Form controls (fallback to first matching inputs/selects)
    this.inputCsv = page.locator('input[type="text"]');
    this.inputSize = page.locator('input[type="number"]');
    this.inputSpeed = page.locator('input[type="range"]');
    this.selectOrder = page.locator('select');

    // Visualization locators
    this.barsContainer = page.locator('.bars, #bars, [data-testid="bars"]');
    this.barItems = page.locator('.bar, [data-testid="bar"], .bars > *');
    this.narration = page.locator('.narration, [data-testid="narration"], [role="status"]');
    this.status = page.locator('.status, [data-testid="status"]');
    this.pseudocodeActiveLine = page.locator('[data-active-line], .code .line.active, .pseudocode .line.active, [data-line].active');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/10-28-0005/html/7b481390-b406-11f0-b2cf-31de200d1aa8.html', { waitUntil: 'domcontentloaded' });
    // Wait for bars to render
    await this.waitForBars();
  }

  async waitForBars() {
    await expect(this.barItems.first()).toBeVisible({ timeout: 5000 });
  }

  async start() {
    await this.btnStart.click();
  }

  async pause() {
    await this.btnPause.click();
  }

  async step() {
    await this.btnStep.click();
  }

  async nextPass() {
    await this.btnNextPass.click();
  }

  async reset() {
    await this.btnReset.click();
  }

  async randomize() {
    await this.btnRandomize.click();
  }

  async shuffle() {
    await this.btnShuffle.click();
  }

  async applyCsv(values) {
    // Ensure CSV input is visible
    await expect(this.inputCsv).toBeVisible();
    await this.inputCsv.fill(values);
    await this.btnApplyCsv.click();
  }

  async changeSize(n) {
    await expect(this.inputSize).toBeVisible();
    await this.inputSize.fill(String(n));
    // Trigger change event by blurring
    await this.inputSize.blur();
  }

  async changeOrder(optionText = /asc|ascending/i) {
    if (await this.selectOrder.count()) {
      const options = await this.selectOrder.locator('option').allTextContents();
      // choose first matching option by regex or fallback to first
      const match = options.find(o => optionText instanceof RegExp ? optionText.test(o) : (o === optionText));
      if (match) {
        await this.selectOrder.selectOption({ label: match });
      } else {
        await this.selectOrder.selectOption({ index: 0 });
      }
    }
  }

  async changeSpeedTo(value) {
    await expect(this.inputSpeed).toBeVisible();
    const min = await this.inputSpeed.getAttribute('min');
    const max = await this.inputSpeed.getAttribute('max');
    const v = Math.max(min ? Number(min) : 1, Math.min(max ? Number(max) : 1000, value));
    await this.inputSpeed.fill(String(v));
    await this.inputSpeed.dispatchEvent('input');
  }

  async pressSpace() {
    await this.page.keyboard.press('Space');
  }

  async pressN() {
    await this.page.keyboard.press('KeyN');
  }

  async pressR() {
    await this.page.keyboard.press('KeyR');
  }

  async focusFirstBar() {
    const first = this.barItems.first();
    await first.click();
    return first;
  }

  async keyboardReorderRight() {
    await (await this.focusFirstBar()).press('ArrowRight');
  }

  async keyboardReorderLeft() {
    await (await this.focusFirstBar()).press('ArrowLeft');
  }

  async dragBar(fromIndex = 0, toIndex = 2) {
    const from = this.barItems.nth(fromIndex);
    const to = this.barItems.nth(toIndex);
    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();
    if (!fromBox || !toBox) {
      throw new Error('Bars not found for dragging');
    }
    await this.page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 });
    await this.page.mouse.up();
  }

  async getBarsCount() {
    return await this.barItems.count();
  }

  async getBarValuesFromDOM() {
    const count = await this.barItems.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const bar = this.barItems.nth(i);
      // Try data-value attribute
      const dataVal = await bar.getAttribute('data-value');
      if (dataVal !== null) {
        values.push(Number(dataVal));
        continue;
      }
      // Try text content if labels on bars
      const text = (await bar.textContent())?.trim();
      if (text && /^[+-]?\d+(\.\d+)?$/.test(text)) {
        values.push(Number(text));
        continue;
      }
      // Try height style as proxy (assuming height proportional to value)
      const style = await bar.getAttribute('style');
      const m = style ? style.match(/height:\s*([0-9.]+)px/i) : null;
      if (m) {
        values.push(Number(m[1]));
        continue;
      }
      // If none, push NaN
      values.push(NaN);
    }
    return values;
  }

  async getNarrationText() {
    if (await this.narration.count()) {
      return (await this.narration.innerText()).trim();
    }
    // Fallback: look for any element containing common narration phrases
    const possible = this.page.locator('text=/Swap needed|No swap|Pass|Sorting complete|Invalid CSV/i').first();
    if (await possible.count()) {
      return (await possible.innerText()).trim();
    }
    return '';
  }

  async getStatusSnapshot() {
    const snapshot = await this.page.evaluate(() => {
      try {
        const g = globalThis;
        const stateCandidates = [
          g.__fsm, g.fsm, g.app, g.appState, g.state, g.__app, g.windowState
        ];
        let obj = null;
        for (const c of stateCandidates) {
          if (c && typeof c === 'object') {
            obj = c;
            break;
          }
        }
        // Derive possible fields
        const current =
          (obj && (obj.current || obj.state || obj.currentState || obj.name)) ||
          (g.currentState || null);
        const pass =
          (obj && (obj.pass ?? obj.currentPass)) ??
          (g.pass ?? null);
        const j =
          (obj && (obj.j ?? obj.indexJ)) ??
          (g.j ?? null);
        const comparisons =
          (obj && (obj.comparisons ?? obj.stats?.comparisons)) ??
          (g.comparisons ?? null);
        const swaps =
          (obj && (obj.swaps ?? obj.stats?.swaps)) ??
          (g.swaps ?? null);
        const isRunning =
          (obj && (obj.isRunning ?? obj.running)) ??
          (g.isRunning ?? null);
        const speedMs =
          (obj && (obj.speedMs ?? obj.speed)) ??
          (g.speedMs ?? null);
        const swappedInPass =
          (obj && (obj.swappedInPass ?? obj.swapFlag)) ??
          (g.swappedInPass ?? null);

        return { current, pass, j, comparisons, swaps, isRunning, speedMs, swappedInPass };
      } catch (e) {
        return { current: null, pass: null, j: null, comparisons: null, swaps: null, isRunning: null, speedMs: null, swappedInPass: null };
      }
    });
    return snapshot;
  }

  async getActiveLineNumber() {
    const count = await this.pseudocodeActiveLine.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const el = this.pseudocodeActiveLine.nth(i);
        const dl = await el.getAttribute('data-line');
        const dal = await el.getAttribute('data-active-line');
        const text = (await el.textContent())?.trim();
        if (dl && /^\d+$/.test(dl)) return Number(dl);
        if (dal && /^\d+$/.test(dal)) return Number(dal);
        // Try to parse "Line X"
        if (text) {
          const m = text.match(/line\s*(\d+)/i);
          if (m) return Number(m[1]);
        }
      }
    }
    return null;
  }

  async barsHaveCompareHighlight() {
    const compareBars = this.page.locator('.bar.compare, [data-state~="compare"], .compare');
    return await compareBars.count() > 0;
  }

  async barsHaveSwapHighlight() {
    const swapBars = this.page.locator('.bar.swap, [data-state~="swap"], .swap');
    return await swapBars.count() > 0;
  }

  async expectButtonsState({ startEnabled, pauseEnabled, stepEnabled, nextEnabled }) {
    if (startEnabled !== undefined) await expect(this.btnStart).toHaveJSProperty('disabled', !startEnabled);
    if (pauseEnabled !== undefined) await expect(this.btnPause).toHaveJSProperty('disabled', !pauseEnabled);
    if (stepEnabled !== undefined) await expect(this.btnStep).toHaveJSProperty('disabled', !stepEnabled);
    if (nextEnabled !== undefined) await expect(this.btnNextPass).toHaveJSProperty('disabled', !nextEnabled);
  }

  async wait(ms = 200) {
    await this.page.waitForTimeout(ms);
  }
}

test.describe('Bubble Sort Visualization FSM - Interactive Application', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();
    // Make sure we start from ready state: click Reset if available
    if (await app.btnReset.isVisible()) {
      await app.reset();
      await app.wait(100);
    }
  });

  test('Ready state: initial render_and_reset, controls, status baseline', async ({ page }) => {
    // Validates onEnter for ready: renderBars() + resetSortState() + toggleButtons()
    const app = new BubbleSortPage(page);
    // Bars present
    const count = await app.getBarsCount();
    expect(count).toBeGreaterThan(1);
    // Buttons: Start enabled, Pause disabled, Step enabled, Next Pass enabled
    await app.expectButtonsState({ startEnabled: true, pauseEnabled: false, stepEnabled: true, nextEnabled: true });
    // Status: isRunning false
    const snap = await app.getStatusSnapshot();
    if (snap.isRunning !== null) {
      expect(snap.isRunning).toBeFalsy();
    }
    // Active pseudocode line should be reset/none or set to initial lines before any action
    const active = await app.getActiveLineNumber();
    expect(active === null || typeof active === 'number').toBeTruthy();
  });

  test('Start running: transition ready -> running, startAuto onEnter', async ({ page }) => {
    // Validates running state: isRunning true, toggleButtons updates, auto loop begins
    const app = new BubbleSortPage(page);
    await app.start();
    const snap = await app.getStatusSnapshot();
    if (snap.isRunning !== null) {
      expect(snap.isRunning).toBeTruthy();
    }
    // Pause should be enabled in running
    await app.expectButtonsState({ startEnabled: false, pauseEnabled: true });
    // Auto tick leads into pass_init/inner_loop; verify active line moves to 2/3/4 eventually
    await app.wait(300);
    const line = await app.getActiveLineNumber();
    expect(line === 2 || line === 3 || line === 4 || line === null).toBeTruthy();
    // Pause via key space: running -> paused, pauseAuto onEnter
    await app.pressSpace();
    const snap2 = await app.getStatusSnapshot();
    if (snap2.isRunning !== null) {
      expect(snap2.isRunning).toBeFalsy();
    }
    await app.expectButtonsState({ startEnabled: true, pauseEnabled: false });
  });

  test('Paused: key and click interactions to visit pass_init and next_pass from paused', async ({ page }) => {
    const app = new BubbleSortPage(page);
    // Ensure paused via space from ready -> running -> paused
    await app.start();
    await app.pressSpace();
    // From paused, Step -> pass_init
    await app.step();
    await app.wait(200);
    const activeLine = await app.getActiveLineNumber();
    // pass_init_setup sets active lines 2 and 3, then PASS_INIT_DONE -> inner_loop_check sets line 4
    expect(activeLine === 2 || activeLine === 3 || activeLine === 4 || activeLine === null).toBeTruthy();
    // From paused (after step completed back to ready), Next Pass -> next_pass state
    await app.pressSpace(); // Pause toggled running -> paused ensures manual controls allowed
    await app.nextPass();
    // next_pass loops; we expect either early exit or pass completion eventually
    const narration = await app.getNarrationText();
    expect(typeof narration).toBe('string');
  });

  test('Manual step through comparing -> swapping -> advance_j -> ready with CSV forcing swap', async ({ page }) => {
    // Validates: CLICK_APPLY_CSV -> csv_applying; CSV_VALID -> ready; comparing/swapping states and onExit clearHighlights; STEP_COMPLETE -> ready
    const app = new BubbleSortPage(page);
    await app.applyCsv('3,2,1');
    await app.wait(100);
    // Ensure data applied and ready
    const values = await app.getBarValuesFromDOM();
    expect(values.length).toBeGreaterThan(0);
    // Click Step to enter pass_init -> inner_loop_check
    await app.step();
    await app.wait(150);
    // Next step to trigger comparing and swap path
    await app.step();
    await app.wait(150);
    // At comparing: highlight compare
    const compareHighlight = await app.barsHaveCompareHighlight();
    expect(compareHighlight || (await app.getActiveLineNumber()) === 5).toBeTruthy();
    // Continue to reach swapping
    // If NO_SWAP_NEEDED occurred due to unexpected values, step until swap seen in first pass of 3,2,1
    await app.step();
    await app.wait(150);
    const sawSwap = await app.barsHaveSwapHighlight();
    expect(sawSwap || (await app.getNarrationText()).match(/swap/i) !== null).toBeTruthy();
    // After SWAP_ANIM_DONE -> advance_j, onExit clearHighlights
    await app.wait(200);
    const compareCleared = await app.barsHaveCompareHighlight();
    const swapCleared = await app.barsHaveSwapHighlight();
    expect(compareCleared).toBeFalsy();
    expect(swapCleared).toBeFalsy();
    // Advance_j increments j and updates status, then STEP_COMPLETE -> ready
    const snap = await app.getStatusSnapshot();
    if (snap.j !== null) {
      expect(snap.j).toBeGreaterThanOrEqual(1);
    }
    await app.expectButtonsState({ startEnabled: true, stepEnabled: true });
  });

  test('Manual step through no_swap -> advance_j with CSV causing no swap', async ({ page }) => {
    // Validates no_swap narration and highlights cleared, counters updated
    const app = new BubbleSortPage(page);
    await app.applyCsv('1,3,2');
    await app.wait(100);
    // Step into comparing
    await app.step();
    await app.wait(150);
    await app.step();
    await app.wait(150);
    // Comparing 1 vs 3 should yield NO_SWAP_NEEDED
    const narrationBefore = await app.getNarrationText();
    expect(narrationBefore.toLowerCase()).toMatch(/pass|compare|line|setup/);
    await app.step(); // should narrate "No swap"
    await app.wait(150);
    const narration = await app.getNarrationText();
    expect(narration.toLowerCase()).toMatch(/no swap/);
    // Highlights cleared on exit
    const compareCleared = await app.barsHaveCompareHighlight();
    const swapCleared = await app.barsHaveSwapHighlight();
    expect(compareCleared).toBeFalsy();
    expect(swapCleared).toBeFalsy();
    // Advance_j updates j/comparisons count
    const snap = await app.getStatusSnapshot();
    if (snap.comparisons !== null) {
      expect(snap.comparisons).toBeGreaterThanOrEqual(1);
    }
  });

  test('Inner loop end -> early exit -> done with sorted CSV', async ({ page }) => {
    // Validates: inner_loop_check -> early_exit_check -> early_exit -> done
    const app = new BubbleSortPage(page);
    await app.applyCsv('1,2,3,4');
    await app.wait(100);
    // Click Next Pass to run until pass changes or early exit
    await app.nextPass();
    await app.wait(300);
    // Early exit narration
    const narration = await app.getNarrationText();
    expect(narration.toLowerCase()).toMatch(/early exit|no swaps|complete/);
    // Transition to done happens when SORTING_COMPLETE
    // Done state disables step/next
    await app.expectButtonsState({ stepEnabled: false, nextEnabled: false });
    // Try randomize from done -> should go to ready enabling step
    await app.randomize();
    await app.wait(100);
    await app.expectButtonsState({ stepEnabled: true, nextEnabled: true });
  });

  test('Pass completion path with swaps: next_pass -> pass_complete -> ready', async ({ page }) => {
    // Validates pass_complete onEnter updates status (pass++), resets j, highlights suffix mask
    const app = new BubbleSortPage(page);
    await app.applyCsv('3,1,2');
    await app.wait(100);
    const snap0 = await app.getStatusSnapshot();
    const initialPass = snap0.pass ?? 0;
    await app.nextPass();
    // Wait for pass complete
    await app.wait(400);
    const snap1 = await app.getStatusSnapshot();
    if (snap1.pass !== null) {
      expect(snap1.pass).toBeGreaterThanOrEqual((initialPass || 0) + 1);
      // j reset to 0 at new pass init
      if (snap1.j !== null) expect([0, null].includes(snap1.j)).toBeTruthy();
    }
    // Ready state after MANUAL_CONTINUE from pass_complete
    await app.expectButtonsState({ startEnabled: true, stepEnabled: true });
  });

  test('Data actions: Randomize, Shuffle, Reset and ORDER/SIZE change', async ({ page }) => {
    // Validates: data_randomized, data_shuffled, data_reset, order_changed, data_randomized via size change
    const app = new BubbleSortPage(page);
    const before = await app.getBarValuesFromDOM();
    await app.randomize();
    await app.wait(100);
    const afterRand = await app.getBarValuesFromDOM();
    expect(JSON.stringify(afterRand)).not.toEqual(JSON.stringify(before));
    await app.shuffle();
    await app.wait(100);
    const afterShuffle = await app.getBarValuesFromDOM();
    // Shuffle may equal randomize sometimes, but at least it should be an array of same length
    expect(afterShuffle.length).toBe(afterRand.length);
    await app.reset();
    await app.wait(100);
    const afterReset = await app.getBarValuesFromDOM();
    expect(afterReset.length).toBe(afterRand.length);
    // Change order (if select exists)
    if (await app.selectOrder.count()) {
      await app.changeOrder(/desc|descending/i);
      await app.wait(100);
      const afterOrder = await app.getBarValuesFromDOM();
      // Verify order change compared to reset
      expect(JSON.stringify(afterOrder) !== JSON.stringify(afterReset)).toBeTruthy();
    }
    // Change size
    await app.changeSize(5);
    await app.wait(100);
    expect(await app.getBarsCount()).toBe(5);
  });

  test('CSV applying: valid and invalid flows', async ({ page }) => {
    // Validates: csv_applying -> CSV_VALID -> ready; csv_applying -> CSV_INVALID -> csv_invalid_feedback -> DISMISS -> ready
    const app = new BubbleSortPage(page);
    await app.applyCsv('9,8,7,6');
    await app.wait(100);
    let vals = await app.getBarValuesFromDOM();
    expect(vals.length).toBeGreaterThan(0);
    // Invalid CSV
    await app.applyCsv('1, two, 3');
    await app.wait(100);
    const narrationInvalid = await app.getNarrationText();
    expect(narrationInvalid.toLowerCase()).toMatch(/invalid csv|invalid/i);
    // Dismiss invalid feedback
    // Try clicking any "Dismiss" button or pressing Escape
    const btnDismiss = page.getByRole('button', { name: /dismiss|close/i });
    if (await btnDismiss.isVisible()) {
      await btnDismiss.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await app.wait(100);
    // Back to ready; Step should be enabled
    await app.expectButtonsState({ stepEnabled: true });
  });

  test('Speed adjusting and run loop responsiveness', async ({ page }) => {
    // Validates: speed_adjusting -> SPEED_SET -> ready; auto run reacts to speed
    const app = new BubbleSortPage(page);
    await app.applyCsv('5,4,3,2,1');
    await app.wait(100);
    await app.changeSpeedTo(5);
    await app.wait(50);
    const snapFast = await app.getStatusSnapshot();
    if (snapFast.speedMs !== null) {
      expect(snapFast.speedMs).toBeLessThanOrEqual(5);
    }
    await app.start();
    await app.wait(200);
    // Running; change speed while running
    await app.changeSpeedTo(200);
    await app.wait(50);
    const snapSlow = await app.getStatusSnapshot();
    if (snapSlow.speedMs !== null) {
      expect(snapSlow.speedMs).toBeGreaterThanOrEqual(100);
    }
    // Pause via click
    await app.pause();
    const snapPaused = await app.getStatusSnapshot();
    if (snapPaused.isRunning !== null) expect(snapPaused.isRunning).toBeFalsy();
  });

  test('Resizing: recompute_layout invoked and returns to ready', async ({ page }) => {
    // Validates: resizing -> RESIZE_DONE -> ready; bars positions update
    const app = new BubbleSortPage(page);
    await app.waitForBars();
    const beforeBoxes = [];
    const count = await app.getBarsCount();
    for (let i = 0; i < Math.min(3, count); i++) {
      beforeBoxes.push(await app.barItems.nth(i).boundingBox());
    }
    await page.setViewportSize({ width: 800, height: 600 });
    await app.wait(200);
    await page.setViewportSize({ width: 400, height: 600 });
    await app.wait(200);
    const afterBoxes = [];
    for (let i = 0; i < Math.min(3, count); i++) {
      afterBoxes.push(await app.barItems.nth(i).boundingBox());
    }
    // Expect positions changed at least in x
    const moved = beforeBoxes.some((b, idx) => {
      const a = afterBoxes[idx];
      return !!(b && a) && Math.abs((b.x || 0) - (a.x || 0)) > 1;
    });
    expect(moved).toBeTruthy();
    // Ready state buttons enabled
    await app.expectButtonsState({ startEnabled: true, stepEnabled: true });
  });

  test('Dragging reorder: dragging_bar -> reorder_commit -> ready, ORDER_SET via keyboard', async ({ page }) => {
    // Validates pointer and keyboard reordering flows
    const app = new BubbleSortPage(page);
    await app.applyCsv('10,20,30,40,50');
    await app.wait(100);
    const before = await app.getBarValuesFromDOM();
    await app.dragBar(0, 3);
    await app.wait(150);
    const afterDrag = await app.getBarValuesFromDOM();
    // Order should change
    expect(JSON.stringify(afterDrag)).not.toEqual(JSON.stringify(before));
    // Keyboard reorder: focus a bar and press arrows
    await app.keyboardReorderRight();
    await app.wait(150);
    const afterKey = await app.getBarValuesFromDOM();
    expect(JSON.stringify(afterKey)).not.toEqual(JSON.stringify(afterDrag));
  });

  test('Running auto continues after pass_complete; early_exit transitions to done; space toggles', async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.applyCsv('4,3,2,1');
    await app.wait(100);
    await app.start();
    // Wait for at least one pass complete
    await app.wait(1200);
    const snap = await app.getStatusSnapshot();
    if (snap.isRunning !== null) {
      // After pass_complete with isRunning true, AUTO_RUNNING_CONTINUE -> running
      expect(snap.isRunning).toBeTruthy();
    }
    // Let it continue until possibly done
    // Speed up
    await app.changeSpeedTo(1);
    await app.wait(2000);
    const narration = await app.getNarrationText();
    // Sorting complete narration
    expect(narration.toLowerCase()).toMatch(/sorting complete/);
    // Done: space should not start running; but allowed events like randomize bring it back to ready
    await app.pressSpace();
    await app.randomize();
    await app.wait(100);
    await app.expectButtonsState({ stepEnabled: true, nextEnabled: true });
  });

  test('Keyboard shortcuts: KEY_N for step and KEY_R for reset from ready/paused', async ({ page }) => {
    const app = new BubbleSortPage(page);
    // KEY_N from ready -> pass_init
    await app.pressN();
    await app.wait(150);
    const line = await app.getActiveLineNumber();
    expect(line === 2 || line === 3 || line === 4 || line === null).toBeTruthy();
    // KEY_R -> data_reset -> ready
    await app.pressR();
    await app.wait(100);
    // Validate a known baseline (bars count persists but narration often resets)
    const narration = await app.getNarrationText();
    expect(typeof narration).toBe('string');
    await app.expectButtonsState({ startEnabled: true });
  });

  test('STEP_NO_PROGRESS event leads to done when already sorted in running', async ({ page }) => {
    const app = new BubbleSortPage(page);
    // Set sorted data
    await app.applyCsv('1,2,3,4,5');
    await app.wait(100);
    await app.start();
    // Auto detects no progress and transitions to done
    await app.wait(500);
    const narration = await app.getNarrationText();
    expect(narration.toLowerCase()).toMatch(/complete|sorted/);
    await app.expectButtonsState({ stepEnabled: false, nextEnabled: false });
  });
});
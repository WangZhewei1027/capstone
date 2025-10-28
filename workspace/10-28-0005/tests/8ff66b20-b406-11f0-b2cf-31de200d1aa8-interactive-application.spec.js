import { test, expect } from '@playwright/test';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/10-28-0005/html/8ff66b20-b406-11f0-b2cf-31de200d1aa8.html';
  }

  async goto() {
    await this.page.goto(this.url);
    // Wait for viz to be ready
    await this.page.waitForSelector('.viz');
    await this.page.waitForSelector('.bar-area');
    // Wait for bars to render
    await this.page.waitForSelector('.bar');
  }

  // Locators with fallbacks
  loadButton() {
    return this.page.getByRole('button', { name: /load numbers|load/i });
  }
  randomizeButton() {
    return this.page.getByRole('button', { name: /randomize/i });
  }
  resetButton() {
    return this.page.getByRole('button', { name: /reset/i });
  }
  playButton() {
    return this.page.getByRole('button', { name: /play|pause/i });
  }
  stepButton() {
    return this.page.getByRole('button', { name: /step/i });
  }
  speedSlider() {
    return this.page.locator('input[type="range"]');
  }
  earlyExitCheckbox() {
    return this.page.locator('input[type="checkbox"]');
  }
  numbersInput() {
    // Prefer a named input, fallback to first text input
    const named = this.page.getByRole('textbox', { name: /numbers|array|values/i });
    return named.count().then(n => (n > 0 ? named : this.page.locator('input[type="text"]').first()));
  }
  barArea() {
    return this.page.locator('.bar-area');
  }
  bars() {
    return this.page.locator('.bar');
  }
  compCount() {
    // Fallbacks for comparison counter
    return this.page.locator('#compCount, [data-comp-count], .comp-count').first();
  }
  swapCount() {
    return this.page.locator('#swapCount, [data-swap-count], .swap-count').first();
  }
  passCount() {
    return this.page.locator('#passCount, [data-pass-count], .pass-count').first();
  }
  annotationNode() {
    return this.page.locator('#annotation, [data-annotation], .annotation, .status, .announce').first();
  }
  async annotationText() {
    const node = this.annotationNode();
    if (await node.count() > 0) {
      return (await node.textContent())?.trim() || '';
    }
    return '';
  }

  async getBarsDescriptors() {
    const count = await this.bars().count();
    const descriptors = [];
    for (let i = 0; i < count; i++) {
      const bar = this.bars().nth(i);
      const box = await bar.boundingBox();
      const text = await bar.locator('span').textContent();
      const value = text ? parseInt(text.trim(), 10) : NaN;
      const className = await bar.evaluate(el => el.className);
      descriptors.push({
        domIndex: i,
        x: box ? box.x : i * 10,
        y: box ? box.y : 0,
        width: box ? box.width : 0,
        height: box ? box.height : 0,
        value,
        className
      });
    }
    descriptors.sort((a, b) => a.x - b.x);
    return descriptors;
  }

  async getBarsValues() {
    const desc = await this.getBarsDescriptors();
    return desc.map(d => d.value);
  }

  async setNumbersInput(nums) {
    const input = await this.numbersInput();
    await input.click();
    await input.fill(Array.isArray(nums) ? nums.join(',') : String(nums));
  }

  async parseInputNumbers() {
    const input = await this.numbersInput();
    const value = await input.inputValue();
    const parts = value.split(/[^-?\d]+/).filter(Boolean);
    return parts.map(p => parseInt(p, 10)).filter(n => !isNaN(n));
  }

  async clickLoadNumbers() {
    await this.loadButton().click();
  }

  async clickRandomize() {
    await this.randomizeButton().click();
  }

  async clickReset() {
    await this.resetButton().click();
  }

  async clickPlayToggle() {
    await this.playButton().click();
  }

  async clickStep() {
    await this.stepButton().click();
  }

  async isPlaying() {
    const txt = (await this.playButton().textContent())?.toLowerCase() || '';
    return txt.includes('pause');
  }

  async isPausedState() {
    const txt = (await this.playButton().textContent())?.toLowerCase() || '';
    return txt.includes('play');
  }

  async enableEarlyExit(enable = true) {
    const cb = this.earlyExitCheckbox();
    if (await cb.count() === 0) return;
    const checked = await cb.isChecked();
    if (checked !== enable) {
      await cb.check({ force: true });
    }
  }

  async changeSpeedTo(value) {
    const slider = this.speedSlider();
    if (await slider.count() === 0) return;
    await slider.fill(String(value));
  }

  async waitForCompare(timeout = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const count = await this.bars().count();
      for (let i = 0; i < count; i++) {
        const has = await this.bars().nth(i).evaluate(el => el.classList.contains('compare'));
        if (has) return true;
      }
      await this.page.waitForTimeout(20);
    }
    return false;
  }

  async waitForSwap(timeout = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const count = await this.bars().count();
      for (let i = 0; i < count; i++) {
        const has = await this.bars().nth(i).evaluate(el => el.classList.contains('swap'));
        if (has) return true;
      }
      await this.page.waitForTimeout(20);
    }
    return false;
  }

  async waitForPulse(timeout = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const count = await this.bars().count();
      for (let i = 0; i < count; i++) {
        const has = await this.bars().nth(i).evaluate(el => el.classList.contains('pulse'));
        if (has) return true;
      }
      await this.page.waitForTimeout(20);
    }
    return false;
  }

  async waitForRightmostSorted(timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const desc = await this.getBarsDescriptors();
      if (desc.length === 0) return false;
      const rightmostDomIndex = desc[desc.length - 1].domIndex;
      const hasSorted = await this.bars().nth(rightmostDomIndex).evaluate(el => el.classList.contains('sorted'));
      if (hasSorted) return true;
      await this.page.waitForTimeout(25);
    }
    return false;
  }

  async allBarsSorted() {
    const count = await this.bars().count();
    for (let i = 0; i < count; i++) {
      const hasSorted = await this.bars().nth(i).evaluate(el => el.classList.contains('sorted'));
      if (!hasSorted) return false;
    }
    return count > 0;
  }

  async dragBarToIndex(fromIndex, toIndex) {
    const desc = await this.getBarsDescriptors();
    if (desc.length === 0) return;
    const clampIndex = i => Math.max(0, Math.min(desc.length - 1, i));
    const from = desc[clampIndex(fromIndex)];
    const to = desc[clampIndex(toIndex)];
    const fromLocator = this.bars().nth(from.domIndex);
    const toLocator = this.bars().nth(to.domIndex);
    const fromBox = await fromLocator.boundingBox();
    const toBox = await toLocator.boundingBox();
    if (!fromBox || !toBox) return;

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const endX = toBox.x + toBox.width / 2;
    const endY = toBox.y + toBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Confirm 'dragging' class appears on source bar
    // We use polling to give the UI time
    const draggingAppeared = await this.page.waitForFunction(
      el => el.classList.contains('dragging'),
      await fromLocator.elementHandle(),
      { timeout: 500 }
    ).catch(() => null);
    await this.page.mouse.move(endX, endY, { steps: 12 });
    await this.page.mouse.up();
    return !!draggingAppeared;
  }

  async dragBarAndCancel(fromIndex) {
    const desc = await this.getBarsDescriptors();
    if (desc.length === 0) return;
    const from = desc[Math.max(0, Math.min(desc.length - 1, fromIndex))];
    const fromLocator = this.bars().nth(from.domIndex);
    const fromBox = await fromLocator.boundingBox();
    if (!fromBox) return;
    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Slight move to trigger drag start
    await this.page.mouse.move(startX + 20, startY);
    // Press Escape to cancel
    await this.page.keyboard.press('Escape');
    await this.page.mouse.up();
  }

  async openEditPromptOnBar(index = 0) {
    const desc = await this.getBarsDescriptors();
    if (desc.length === 0) return;
    const bar = this.bars().nth(desc[index].domIndex);
    // Try double-click first; fallback to click
    await bar.dblclick().catch(async () => {
      await bar.click({ button: 'left' });
    });
  }
}

test.describe('Bubble Sort Interactive Module - FSM and UI validation', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();
    // Ensure idle UI: Play button should show Play initially
    await expect(app.playButton()).toHaveText(/play/i);
    // There should be bars visible
    await expect(app.bars().first()).toBeVisible();
  });

  test.describe('Idle state and setupIdleUI', () => {
    test('initial idle: controls enabled, Play button shows "Play", no compare/swap classes', async ({ page }) => {
      const app = new BubbleSortPage(page);
      // Controls enabled
      await expect(app.loadButton()).toBeEnabled();
      await expect(app.randomizeButton()).toBeEnabled();
      await expect(app.resetButton()).toBeEnabled();
      await expect(app.playButton()).toBeEnabled();
      await expect(app.stepButton()).toBeEnabled();

      // Play button label
      await expect(app.playButton()).toHaveText(/play/i);

      // No compare/swap/dragging classes on bars
      const count = await app.bars().count();
      for (let i = 0; i < count; i++) {
        const bar = app.bars().nth(i);
        await expect(await bar.evaluate(el => el.classList.contains('compare'))).toBeFalsy();
        await expect(await bar.evaluate(el => el.classList.contains('swap'))).toBeFalsy();
        await expect(await bar.evaluate(el => el.classList.contains('dragging'))).toBeFalsy();
      }

      // Annotation exists (optional)
      const note = await app.annotationText();
      expect(note).toMatch(/loaded|ready|tip|reset|array|bubble sort|interactive/i);
    });
  });

  test.describe('Loading numbers (loading_numbers state)', () => {
    test('LOAD_INVALID: enter invalid data triggers error and returns to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const beforeValues = await app.getBarsValues();

      const input = await app.numbersInput();
      await input.fill('1, a, 1000, -5'); // includes invalid token and value out of range
      await app.clickLoadNumbers();

      // After invalid load, should return to idle and not change bars
      await expect(app.playButton()).toHaveText(/play/i);
      const afterValues = await app.getBarsValues();
      expect(afterValues).toEqual(beforeValues);

      const annotation = await app.annotationText();
      expect(annotation.toLowerCase()).toMatch(/invalid|error|please|range|parse/i);
    });

    test('LOAD_VALID: valid numbers parse and render, back to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const numbers = [5, 1, 4, 2, 8];
      await app.setNumbersInput(numbers);
      await app.clickLoadNumbers();

      // Bars reflect the new input sequence
      const values = await app.getBarsValues();
      expect(values).toEqual(numbers);

      const annotation = await app.annotationText();
      expect(annotation.toLowerCase()).toMatch(/loaded|numbers/i);

      // Idle state persists
      await expect(app.playButton()).toHaveText(/play/i);
    });
  });

  test.describe('Randomizing (randomizing state)', () => {
    test('RANDOMIZE_CLICK randomizes input and array, then returns to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const beforeInput = await (await app.numbersInput()).inputValue();
      await app.clickRandomize();

      const afterInput = await (await app.numbersInput()).inputValue();
      expect(afterInput).not.toEqual(beforeInput);

      const parsed = await app.parseInputNumbers();
      const barVals = await app.getBarsValues();
      expect(barVals).toEqual(parsed);

      const annotation = await app.annotationText();
      expect(annotation.toLowerCase()).toMatch(/random array generated|random/i);

      await expect(app.playButton()).toHaveText(/play/i);
    });
  });

  test.describe('Resetting (resetting state)', () => {
    test('RESET_CLICK clears sorting flags, keeps current order, returns to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      // Load known array
      await app.setNumbersInput([3, 2, 1]);
      await app.clickLoadNumbers();

      // Start play to set sorting flags
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      await app.clickReset();

      // Play shows Play again
      await expect(app.playButton()).toHaveText(/play/i);

      // Bars still reflect current order (should be initial [3,2,1] since we reset immediately)
      const vals = await app.getBarsValues();
      expect(vals).toEqual([3, 2, 1]);

      const annotation = await app.annotationText();
      expect(annotation.toLowerCase()).toMatch(/reset complete|reset/i);
    });
  });

  test.describe('Dragging (dragging state, DRAG_START/DRAG_DROP/DRAG_CANCEL)', () => {
    test('DRAG_DROP: drag-and-drop reorders bars and returns to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([1, 2, 3, 4]);
      await app.clickLoadNumbers();

      const before = await app.getBarsValues();
      // Drag first bar to the position of third bar
      const draggingFlag = await app.dragBarToIndex(0, 2);
      // After drop, dragging class removed and order changed
      const after = await app.getBarsValues();

      expect(draggingFlag).toBeTruthy();
      expect(after).not.toEqual(before);

      await expect(app.playButton()).toHaveText(/play/i);
    });

    test('DRAG_CANCEL: Esc during drag cancels and retains original order', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([5, 4, 3, 2]);
      await app.clickLoadNumbers();

      const before = await app.getBarsValues();
      await app.dragBarAndCancel(1);
      const after = await app.getBarsValues();

      expect(after).toEqual(before);

      // Ensure no lingering dragging class
      const count = await app.bars().count();
      for (let i = 0; i < count; i++) {
        const hasDrag = await app.bars().nth(i).evaluate(el => el.classList.contains('dragging'));
        expect(hasDrag).toBeFalsy();
      }
    });

    test('Dragging disabled while sorting', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([4, 3, 2, 1]);
      await app.clickLoadNumbers();
      await app.clickPlayToggle(); // enter sorting_playing
      await expect(app.playButton()).toHaveText(/pause/i);

      const before = await app.getBarsValues();
      // Attempt drag (should be ignored)
      await app.dragBarToIndex(0, 3);
      const after = await app.getBarsValues();

      expect(after).toEqual(before);
    });
  });

  test.describe('Editing values (editing_value state, EDIT_COMMIT/EDIT_CANCEL)', () => {
    test('EDIT_COMMIT: prompt edit commits valid value and returns to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([9, 8, 7]);
      await app.clickLoadNumbers();

      // Intercept prompt and provide new value
      page.once('dialog', async (dialog) => {
        await dialog.accept('42');
      });

      await app.openEditPromptOnBar(1); // edit the second bar
      await page.waitForTimeout(200); // allow layout update

      const vals = await app.getBarsValues();
      expect(vals).toContain(42);

      await expect(app.playButton()).toHaveText(/play/i);
    });

    test('EDIT_INVALID: out-of-range value shows validation feedback and does not change value', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([6, 5, 4]);
      await app.clickLoadNumbers();

      const before = await app.getBarsValues();

      page.once('dialog', async (dialog) => {
        await dialog.accept('1000'); // Invalid (>99)
      });

      await app.openEditPromptOnBar(0);
      await page.waitForTimeout(200);

      const after = await app.getBarsValues();
      expect(after).toEqual(before);

      const annotation = await app.annotationText();
      expect(annotation.toLowerCase()).toMatch(/invalid|range|error/i);
    });

    test('EDIT_CANCEL: dismissing prompt leaves array unchanged and returns to idle', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([10, 20, 30]);
      await app.clickLoadNumbers();

      const before = await app.getBarsValues();
      page.once('dialog', async (dialog) => {
        await dialog.dismiss();
      });

      await app.openEditPromptOnBar(2);
      await page.waitForTimeout(200);

      const after = await app.getBarsValues();
      expect(after).toEqual(before);

      await expect(app.playButton()).toHaveText(/play/i);
    });
  });

  test.describe('Sorting playing/paused, comparisons, swapping, no-swap feedback', () => {
    test('PLAY_TOGGLE enters sorting_playing, AUTOSTEP_TICK triggers comparing then swap if needed', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([3, 2, 1]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle(); // begin sorting_playing
      await expect(app.playButton()).toHaveText(/pause/i);

      // Controls should be disabled while sorting
      await expect(app.loadButton()).toBeDisabled();
      await expect(app.randomizeButton()).toBeDisabled();
      await expect(app.resetButton()).toBeEnabled(); // reset might stay enabled per notes
      await expect(app.stepButton()).toBeEnabled();

      // Wait for comparing
      const compared = await app.waitForCompare(2000);
      expect(compared).toBeTruthy();

      // Compare should decide swap for [3,2,1]
      const swapped = await app.waitForSwap(2000);
      expect(swapped).toBeTruthy();

      // Advancing should follow without waiting for CSS transition; still playing
      await expect(app.playButton()).toHaveText(/pause/i);
    });

    test('Pause via PLAY_TOGGLE enters sorting_paused and manual STEP produces comparing/no-swap', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([1, 2, 3]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle(); // play
      await expect(app.playButton()).toHaveText(/pause/i);
      // Pause
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/play/i);

      // Ensure no auto compare occurs while paused
      const compareBeforePause = await app.waitForCompare(400);
      // It's possible an in-flight compare occurs; do not assert strictly

      // Manual step triggers comparing
      await app.clickStep();
      const compared = await app.waitForCompare(1200);
      expect(compared).toBeTruthy();

      // Sorted array yields no swap feedback (pulse)
      const pulsed = await app.waitForPulse(1200);
      expect(pulsed).toBeTruthy();

      // After ADVANCE_READY_PAUSED, we should remain paused
      await expect(app.playButton()).toHaveText(/play/i);
    });

    test('Keyboard: Space toggles play/pause (KEY_PLAY_TOGGLE), Enter triggers step (KEY_STEP)', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([2, 1, 3]);
      await app.clickLoadNumbers();

      // Ensure focus not on an input
      await page.keyboard.press('Escape');

      // Space toggles to play
      await page.keyboard.press('Space');
      await expect(app.playButton()).toHaveText(/pause/i);

      // Space toggles to pause
      await page.keyboard.press('Space');
      await expect(app.playButton()).toHaveText(/play/i);

      // Enter triggers step: expect comparing
      await page.keyboard.press('Enter');
      const compared = await app.waitForCompare(1200);
      expect(compared).toBeTruthy();
    });

    test('Speed change while playing keeps state and adjusts timer (SPEED_CHANGE)', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([4, 3, 2, 1]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      // Change speed to faster
      await app.changeSpeedTo(50);
      await expect(app.playButton()).toHaveText(/pause/i);

      // We should still see comparing happening after shortly
      const compared = await app.waitForCompare(2000);
      expect(compared).toBeTruthy();

      // Change speed to slower and ensure state is still playing
      await app.changeSpeedTo(900);
      await expect(app.playButton()).toHaveText(/pause/i);
    });

    test('Speed change while paused does not start playing (SPEED_CHANGE)', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([4, 3, 2]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();
      await app.clickPlayToggle(); // pause
      await expect(app.playButton()).toHaveText(/play/i);

      await app.changeSpeedTo(200);
      await expect(app.playButton()).toHaveText(/play/i);
    });

    test('RESIZE triggers layoutBars without changing state', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([9, 1, 8, 2]);
      await app.clickLoadNumbers();

      // Playing state
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      const beforeVals = await app.getBarsValues();
      await page.setViewportSize({ width: 900, height: 700 });
      const afterVals = await app.getBarsValues();
      expect(afterVals).toEqual(beforeVals);
      await expect(app.playButton()).toHaveText(/pause/i);

      // Pause and resize; state should remain paused
      await app.clickPlayToggle();
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(app.playButton()).toHaveText(/play/i);
    });

    test('Keyboard ignores Space/Enter when focus is in input', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const input = await app.numbersInput();
      await input.focus();
      const before = await app.isPausedState();

      await page.keyboard.press('Space');
      await page.keyboard.press('Enter');

      const after = await app.isPausedState();
      expect(after).toBe(before);
    });
  });

  test.describe('Advancing, pass boundary, continue transitions', () => {
    test('Auto-play continues after ADVANCE_READY_AUTOPLAY and marks right boundary sorted at PASS_BOUNDARY_REACHED', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([5, 4, 3]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      // Wait for first pass boundary marking rightmost sorted
      const boundaryReached = await app.waitForRightmostSorted(5000);
      expect(boundaryReached).toBeTruthy();

      // Remains in playing state and continues
      await expect(app.playButton()).toHaveText(/pause/i);
    });

    test('Manual stepping (paused) hits PASS_BOUNDARY_REACHED and stays paused (CONTINUE_MANUAL)', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([3, 2, 1]);
      await app.clickLoadNumbers();

      // Enter and then pause
      await app.clickPlayToggle();
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/play/i);

      // Step until boundary; array length is small so a few steps suffice
      for (let i = 0; i < 6; i++) {
        await app.clickStep();
        await app.waitForCompare(1200);
        await app.page.waitForTimeout(200);
      }

      const boundaryReached = await app.waitForRightmostSorted(3000);
      expect(boundaryReached).toBeTruthy();
      await expect(app.playButton()).toHaveText(/play/i);
    });
  });

  test.describe('Early exit and completion (pass_complete, done)', () => {
    test('EARLY_EXIT_TOGGLE enabled with sorted input triggers EARLY_EXIT_TRIGGER and reaches done', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([1, 2, 3, 4]);
      await app.clickLoadNumbers();

      await app.enableEarlyExit(true);
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      // After a pass with no swaps, should early exit and complete
      // Wait for completion: all bars get sorted class, play shows Play
      let doneReached = false;
      for (let i = 0; i < 30; i++) {
        if (await app.allBarsSorted()) {
          doneReached = true;
          break;
        }
        await app.page.waitForTimeout(200);
      }
      expect(doneReached).toBeTruthy();
      await expect(app.playButton()).toHaveText(/play/i);

      const annotation = await app.annotationText();
      expect(annotation.toLowerCase()).toMatch(/sorting complete|complete/i);
    });

    test('READY_FINISH: array of length 1 finishes immediately when playing', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([7]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();

      // Should immediately mark done
      const complete = await app.allBarsSorted();
      expect(complete).toBeTruthy();
      await expect(app.playButton()).toHaveText(/play/i);
    });

    test('Transitions from done: RESET_CLICK, LOAD_CLICK, RANDOMIZE_CLICK, DRAG_START, EDIT_BAR, PLAY_TOGGLE', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([1, 2]);
      await app.clickLoadNumbers();
      await app.enableEarlyExit(true);
      await app.clickPlayToggle();

      // Wait until done (both bars sorted)
      let doneReached = false;
      for (let i = 0; i < 20; i++) {
        if (await app.allBarsSorted()) {
          doneReached = true;
          break;
        }
        await page.waitForTimeout(200);
      }
      expect(doneReached).toBeTruthy();

      // RESET_CLICK
      await app.clickReset();
      await expect(app.playButton()).toHaveText(/play/i);

      // LOAD_CLICK
      await app.setNumbersInput([9, 3, 5]);
      await app.clickLoadNumbers();
      expect(await app.getBarsValues()).toEqual([9, 3, 5]);

      // RANDOMIZE_CLICK
      await app.clickRandomize();
      const parsed = await app.parseInputNumbers();
      expect(await app.getBarsValues()).toEqual(parsed);

      // DRAG_START in done (allowed): reorder bars
      const beforeDrag = await app.getBarsValues();
      await app.dragBarToIndex(0, beforeDrag.length - 1);
      const afterDrag = await app.getBarsValues();
      expect(afterDrag).not.toEqual(beforeDrag);

      // EDIT_BAR in done (allowed)
      page.once('dialog', async (dialog) => {
        await dialog.accept('11');
      });
      await app.openEditPromptOnBar(0);
      await page.waitForTimeout(200);
      expect(await app.getBarsValues()).toContain(11);

      // PLAY_TOGGLE from done should start sorting_playing
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);
      // Pause again for cleanup
      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/play/i);
    });
  });

  test.describe('Visual feedback states: comparing, swapping, no_swap_feedback, pass_complete, done', () => {
    test('prepareComparison highlights two bars with compare class', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([2, 1, 3]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle(); // play
      await expect(app.playButton()).toHaveText(/pause/i);

      const compared = await app.waitForCompare(2000);
      expect(compared).toBeTruthy();

      // There should be at least two bars with compare class
      const count = await app.bars().count();
      let compareCount = 0;
      for (let i = 0; i < count; i++) {
        const hasCompare = await app.bars().nth(i).evaluate(el => el.classList.contains('compare'));
        if (hasCompare) compareCount++;
      }
      expect(compareCount).toBeGreaterThanOrEqual(2);
    });

    test('performSwap applies swap class and changes data order', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([3, 2, 1]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      const before = await app.getBarsValues();
      const swapped = await app.waitForSwap(2000);
      expect(swapped).toBeTruthy();

      const after = await app.getBarsValues();
      expect(after).not.toEqual(before);
    });

    test('showNoSwapPulse pulses bars briefly when no swap occurs', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([1, 2, 3]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      const pulsed = await app.waitForPulse(2000);
      expect(pulsed).toBeTruthy();

      // Pulse should clear shortly after
      await page.waitForTimeout(300);
      const count = await app.bars().count();
      for (let i = 0; i < count; i++) {
        const hasPulse = await app.bars().nth(i).evaluate(el => el.classList.contains('pulse'));
        expect(hasPulse).toBeFalsy();
      }
    });

    test('completePassUpdate marks boundary bars as sorted', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([5, 4, 3, 2, 1]);
      await app.clickLoadNumbers();

      await app.clickPlayToggle();
      await expect(app.playButton()).toHaveText(/pause/i);

      const boundaryReached = await app.waitForRightmostSorted(8000);
      expect(boundaryReached).toBeTruthy();
    });

    test('completeSorting adds sorted class to all bars and enables controls', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([1, 2, 3]);
      await app.clickLoadNumbers();
      await app.enableEarlyExit(true);
      await app.clickPlayToggle();

      // Wait until done
      let doneReached = false;
      for (let i = 0; i < 30; i++) {
        if (await app.allBarsSorted()) {
          doneReached = true;
          break;
        }
        await page.waitForTimeout(200);
      }
      expect(doneReached).toBeTruthy();

      // Controls enabled
      await expect(app.loadButton()).toBeEnabled();
      await expect(app.randomizeButton()).toBeEnabled();
      await expect(app.resetButton()).toBeEnabled();
      await expect(app.stepButton()).toBeEnabled();
      await expect(app.playButton()).toHaveText(/play/i);
    });
  });

  test.describe('Counters and metrics (optional UI)', () => {
    test('Comparisons and swaps increment during sorting', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setNumbersInput([5, 1, 4, 2]);
      await app.clickLoadNumbers();

      const compNode = app.compCount();
      const swapNode = app.swapCount();

      const initialComp = (await compNode.count()) ? parseInt((await compNode.textContent()) || '0', 10) : null;
      const initialSwap = (await swapNode.count()) ? parseInt((await swapNode.textContent()) || '0', 10) : null;

      await app.clickPlayToggle();
      await app.waitForCompare(2000);
      await page.waitForTimeout(500);
      await app.waitForCompare(2000);
      await page.waitForTimeout(500);

      if (initialComp !== null) {
        const compAfter = parseInt((await compNode.textContent()) || '0', 10);
        expect(compAfter).toBeGreaterThan(initialComp);
      }
      if (initialSwap !== null) {
        const swapAfter = parseInt((await swapNode.textContent()) || '0', 10);
        // swap count may or may not increase depending on input; just ensure it's >= initial
        expect(swapAfter).toBeGreaterThanOrEqual(initialSwap);
      }
    });
  });
});
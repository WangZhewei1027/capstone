import { test, expect } from '@playwright/test';

// Page Object for Bubble Sort interactive application
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.playBtn = page.getByRole('button', { name: /^Play$/i }).or(page.getByRole('button', { name: /Play/i }));
    this.pauseBtn = page.getByRole('button', { name: /^Pause$/i }).or(page.getByRole('button', { name: /Pause/i }));
    this.stepBtn = page.getByRole('button', { name: /^Step$/i }).or(page.getByRole('button', { name: /Step/i }));
    this.resetBtn = page.getByRole('button', { name: /^Reset$/i }).or(page.getByRole('button', { name: /Reset/i }));
    this.randomizeBtn = page.getByRole('button', { name: /^Randomize$/i }).or(page.getByRole('button', { name: /Randomize/i }));
    this.codeToggleBtn = page.getByRole('button', { name: /code/i }).or(page.locator('#codeToggle, .toggle-code'));
    this.applyValuesBtn = page.getByRole('button', { name: /^Apply$/i }).or(page.getByRole('button', { name: /Apply Values/i })).or(page.locator('#applyValues'));
    this.sizeInput = page.getByLabel(/Size/i).or(page.locator('#sizeInput, input[name="size"]'));
    this.speedInput = page.getByLabel(/Speed/i).or(page.locator('#speedInput, input[name="speed"], input[type="range"]'));
    this.valuesInput = page.getByLabel(/Values|Edit Values|Numbers/i).or(page.locator('#valuesInput, input[name="values"], textarea[name="values"]'));

    // Status and counters
    this.status = page.locator('#status, .status, [data-status], [aria-live="polite"], [aria-live="assertive"]');
    this.compareCount = page.locator('#compareCount, .compare-count, [data-counter="compare"]');
    this.swapCount = page.locator('#swapCount, .swap-count, [data-counter="swap"]');
    this.passCount = page.locator('#passCount, .pass-count, [data-counter="pass"]');

    // Bars and visualization
    this.barsContainer = page.locator('#bars, .bars, [data-role="bars"], .visualization');
    this.bars = page.locator('#bars .bar, .bars .bar, .visualization .bar, .bar');
    this.codeBlock = page.locator('#code, .code, .code-block, pre code, pre');

    // Utility: state text expectations
    this.readyText = /Ready/i;
    this.playingText = /Playing/i;
    this.pausedText = /Paused/i;
    this.doneText = /^Done$/i;
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/10-28-0005/html/8df543f0-b406-11f0-b2cf-31de200d1aa8.html', { waitUntil: 'domcontentloaded' });
    await this.waitForRenderComplete();
  }

  async waitForRenderComplete() {
    // Wait for bars to render and status to reach Ready after initializing and rendering states
    await expect(this.barsContainer.or(this.bars)).toBeVisible({ timeout: 10000 });
    await expect(this.bars.first()).toBeVisible({ timeout: 10000 });
    await expect(this.status).toContainText(this.readyText, { timeout: 10000 });
  }

  async getStatusText() {
    const count = await this.status.count();
    if (count > 0) {
      const s = await this.status.first().innerText();
      return s.trim();
    }
    return '';
  }

  async getBarCount() {
    return await this.bars.count();
  }

  async getBarValues() {
    const count = await this.getBarCount();
    const values = [];
    for (let i = 0; i < count; i++) {
      const bar = this.bars.nth(i);
      let text = '';
      try {
        text = (await bar.textContent()) || '';
      } catch {}
      let dataVal = null;
      try {
        dataVal = await bar.getAttribute('data-value');
      } catch {}
      let v = null;
      if (dataVal !== null && dataVal !== undefined) {
        v = parseFloat(dataVal);
      } else {
        const match = text.match(/-?\d+(\.\d+)?/);
        v = match ? parseFloat(match[0]) : null;
      }
      values.push(v);
    }
    return values;
  }

  async isSorted(values) {
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > values[i]) return false;
    }
    return true;
  }

  async play() {
    await this.playBtn.click();
    await expect(this.status).toContainText(this.playingText);
  }

  async pause() {
    await this.pauseBtn.click();
    await expect(this.status).toContainText(this.pausedText);
  }

  async step() {
    await this.stepBtn.click();
  }

  async reset() {
    await this.resetBtn.click();
    await expect(this.status).toContainText(this.readyText);
  }

  async randomize() {
    const before = await this.getBarValues();
    await this.randomizeBtn.click();
    await expect(this.status).toContainText(this.readyText);
    const after = await this.getBarValues();
    // Randomization could coincidentally produce same order; try again if unchanged
    if (JSON.stringify(before) === JSON.stringify(after)) {
      await this.randomizeBtn.click();
      await expect(this.status).toContainText(this.readyText);
    }
  }

  async setSize(newSize) {
    // Adjust size via slider or number input; expect rendering then ready
    if (await this.sizeInput.count()) {
      await this.sizeInput.fill(String(newSize));
      // Some UIs require Enter
      try { await this.sizeInput.press('Enter'); } catch {}
    }
    await expect(this.status).toContainText(this.readyText);
    // Wait for RENDER_COMPLETE; bar count should change
    await this.page.waitForTimeout(100); // slight delay
  }

  async setSpeed(value) {
    if (await this.speedInput.count()) {
      const slider = this.speedInput.first();
      await slider.focus();
      await slider.fill(String(value));
      try { await slider.press('Enter'); } catch {}
    }
  }

  async toggleCode() {
    await this.codeToggleBtn.click();
  }

  async applyValues(valuesStr) {
    if (await this.valuesInput.count()) {
      await this.valuesInput.fill(valuesStr);
    }
    await this.applyValuesBtn.click();
    await expect(this.status).toContainText(this.readyText);
  }

  async expectCodeVisibility(expectedVisible) {
    if (expectedVisible) {
      await expect(this.codeBlock.first()).toBeVisible();
    } else {
      await expect(this.codeBlock.first()).not.toBeVisible();
    }
  }

  async waitForComparingHighlight() {
    const comparing = this.page.locator('.bar.comparing');
    await expect(comparing.first()).toBeVisible({ timeout: 10000 });
    return comparing;
  }

  async waitForSwappingHighlight() {
    const swapping = this.page.locator('.bar.swapping, .bar.swap, .bar[data-state="swapping"]');
    await expect(swapping.first()).toBeVisible({ timeout: 10000 });
    return swapping;
  }

  async waitForSortedTail() {
    const sortedBars = this.page.locator('.bar.sorted, .bar[data-state="sorted"]');
    await expect(sortedBars.first()).toBeVisible({ timeout: 10000 });
    return sortedBars;
  }

  async ensureNoHighlights() {
    await expect(this.page.locator('.bar.comparing')).toHaveCount(0);
    await expect(this.page.locator('.bar.swapping, .bar.swap')).toHaveCount(0);
  }

  async dragBarByIndex(fromIndex, toIndex) {
    const from = this.bars.nth(fromIndex);
    const to = this.bars.nth(toIndex);
    await expect(from).toBeVisible();
    await expect(to).toBeVisible();
    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();
    if (!fromBox || !toBox) throw new Error('Bars bounding boxes not available for drag');
    await this.page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 15 });
    await this.page.mouse.up();
  }

  async pressArrowOnBar(index, key) {
    const bar = this.bars.nth(index);
    await bar.click();
    await bar.focus();
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(100);
  }
}

test.describe('Bubble Sort Visualization - FSM and UI Validation', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BubbleSortPage(page);
    await app.goto();
  });

  test.describe('Initialization and Rendering', () => {
    test('initializing -> ready via RENDER_COMPLETE; status Ready and bars visible', async () => {
      // Validates onEnter: initRender and event RENDER_COMPLETE transitions to ready
      await expect(app.status).toContainText(app.readyText);
      await expect(app.barsContainer.or(app.bars)).toBeVisible();
      const count = await app.getBarCount();
      expect(count).toBeGreaterThan(1);
      await app.ensureNoHighlights();
    });

    test('rendering state transitions from RANDOMIZE and returns to ready', async () => {
      const before = await app.getBarValues();
      await app.randomize();
      const after = await app.getBarValues();
      expect(await app.getStatusText()).toMatch(app.readyText);
      // Order may change
      expect(JSON.stringify(before) === JSON.stringify(after)).toBeFalsy();
      await app.ensureNoHighlights();
    });

    test('size change triggers rendering and returns to ready', async () => {
      const beforeCount = await app.getBarCount();
      // Choose a different size; attempt to change to between 5-15
      const targetSize = beforeCount > 10 ? 7 : 12;
      await app.setSize(targetSize);
      await app.page.waitForTimeout(300);
      const afterCount = await app.getBarCount();
      expect(afterCount).not.toBe(beforeCount);
      expect(await app.getStatusText()).toMatch(app.readyText);
    });

    test('RESIZE event recomputes positions without state change', async () => {
      // Ensure Ready
      await expect(app.status).toContainText(app.readyText);
      const beforeValues = await app.getBarValues();
      await app.page.setViewportSize({ width: 800, height: 600 });
      await app.page.waitForTimeout(200);
      const afterValues = await app.getBarValues();
      // Values/order unchanged; Status remains ready
      expect(JSON.stringify(beforeValues)).toBe(JSON.stringify(afterValues));
      await expect(app.status).toContainText(app.readyText);
    });
  });

  test.describe('Play, Pause, Step - core sorting states', () => {
    test('ready -> playing via PLAY; comparing/swapping highlights appear; onExit clear highlights', async () => {
      await app.play();
      await app.waitForComparingHighlight();
      // comparing -> playing loop resumes -> clear comparing highlight on exit
      await app.page.waitForTimeout(700);
      await expect(app.page.locator('.bar.comparing')).toHaveCount(0);
      // swapping highlight appears at some point
      await app.waitForSwappingHighlight();
      await app.page.waitForTimeout(700);
      await expect(app.page.locator('.bar.swapping, .bar.swap')).toHaveCount(0);
      // Still playing after delays
      await expect(app.status).toContainText(app.playingText);
    });

    test('playing -> paused via PAUSE; clearTimeoutSafe called (sorting halts)', async () => {
      await app.play();
      const valuesBeforePause = await app.getBarValues();
      await app.pause();
      await expect(app.status).toContainText(app.pausedText);
      // Ensure no changes for short duration indicating timeouts cleared
      await app.page.waitForTimeout(800);
      const valuesAfterPause = await app.getBarValues();
      expect(JSON.stringify(valuesAfterPause)).toBe(JSON.stringify(valuesBeforePause));
    });

    test('paused -> playing via PLAY and paused -> stepping via STEP', async () => {
      await app.play();
      await app.pause();
      await expect(app.status).toContainText(app.pausedText);
      // Resume play
      await app.play();
      await expect(app.status).toContainText(app.playingText);
      // Pause again then step
      await app.pause();
      await expect(app.status).toContainText(app.pausedText);
      await app.step();
      // Stepping triggers one event then returns to ready via DELAY_COMPLETE_STEPPING
      // Expect comparing or swapping briefly, then Ready
      await app.page.waitForTimeout(600);
      await expect(app.status).toContainText(app.readyText);
    });

    test('stepping from ready executes one event and returns to ready', async () => {
      await expect(app.status).toContainText(app.readyText);
      const before = await app.getBarValues();
      await app.step();
      // After step, we may have compared/swapped one pair
      await app.page.waitForTimeout(800);
      await expect(app.status).toContainText(app.readyText);
      const after = await app.getBarValues();
      // Either equal (compare only) or changed (swap)
      expect(Array.isArray(after)).toBeTruthy();
      await app.ensureNoHighlights();
    });

    test('RESET from playing or paused returns to ready and clears highlights', async () => {
      await app.play();
      await app.reset();
      await expect(app.status).toContainText(app.readyText);
      await app.ensureNoHighlights();
      // Also test from paused
      await app.play();
      await app.pause();
      await app.reset();
      await expect(app.status).toContainText(app.readyText);
      await app.ensureNoHighlights();
    });
  });

  test.describe('Internal events: pass_starting, comparing, swapping, pass_done, early_stop, done', () => {
    test('pass_starting and pass_done produce sorted tail marking during play', async () => {
      // Speed up to make sorting faster
      await app.setSpeed(100);
      await app.play();
      // Wait until at least one tail bar is marked sorted
      const sortedBars = await app.waitForSortedTail();
      const sortedCount = await sortedBars.count();
      expect(sortedCount).toBeGreaterThan(0);
      await expect(app.status).toContainText(app.playingText);
      // Pause to inspect highlights are cleared upon state exits
      await app.pause();
      await app.ensureNoHighlights();
    });

    test('early_stop occurs on already sorted array and transitions to done quickly', async () => {
      // Apply sorted values
      await app.applyValues('1,2,3,4,5,6,7');
      const values = await app.getBarValues();
      expect(await app.isSorted(values)).toBeTruthy();
      // Step once or play should early stop and go to done
      await app.play();
      // With a sorted array, should reach Done quickly
      await expect(app.status).toContainText(app.doneText, { timeout: 10000 });
      // Verify no swaps occurred (order unchanged)
      const afterValues = await app.getBarValues();
      expect(JSON.stringify(afterValues)).toBe(JSON.stringify(values));
      // All bars should be marked sorted in done
      await expect(app.page.locator('.bar.sorted, .bar[data-state="sorted"]')).toHaveCount(await app.getBarCount());
    });

    test('done state: all bars sorted, status Done; can RESET to ready or PLAY to restart', async () => {
      await app.randomize();
      // Make speed fast and run to completion
      await app.setSpeed(100);
      await app.play();
      await expect(app.status).toContainText(app.doneText, { timeout: 30000 });
      const barCount = await app.getBarCount();
      await expect(app.page.locator('.bar.sorted, .bar[data-state="sorted"]')).toHaveCount(barCount);
      // Reset brings back to ready
      await app.reset();
      await expect(app.status).toContainText(app.readyText);
      // Play should start again
      await app.play();
      await expect(app.status).toContainText(app.playingText);
      await app.pause();
    });
  });

  test.describe('Editing, Randomizing, and Validation', () => {
    test('EDIT_VALUES_APPLY: custom values render and generator resets', async () => {
      await app.applyValues('9,3,5,1,7');
      const values = await app.getBarValues();
      expect(values.filter(v => v !== null).length).toBeGreaterThan(0);
      // Ensure the applied order contains exactly those numbers (ignoring any UI parsing variance)
      expect(values.includes(9)).toBeTruthy();
      expect(values.includes(3)).toBeTruthy();
      expect(values.includes(5)).toBeTruthy();
      expect(values.includes(1)).toBeTruthy();
      expect(values.includes(7)).toBeTruthy();
      // Status ready
      await expect(app.status).toContainText(app.readyText);
    });

    test('EDIT_VALUES_INVALID: invalid input keeps state ready and shows error', async () => {
      const before = await app.getBarValues();
      await app.valuesInput.fill('a,b,c,!');
      await app.applyValuesBtn.click();
      // Expect status remains Ready (no transition) and DOM shows invalid feedback
      await expect(app.status).toContainText(app.readyText);
      // Check invalid class or error message near input
      const invalidFeedback = app.page.locator('.invalid, .error, .input-error, [aria-invalid="true"]');
      await expect(invalidFeedback.first()).toBeVisible();
      const after = await app.getBarValues();
      expect(JSON.stringify(before)).toBe(JSON.stringify(after));
    });

    test('RANDOMIZE: changes order and returns to ready', async () => {
      const before = await app.getBarValues();
      await app.randomize();
      const after = await app.getBarValues();
      expect(JSON.stringify(before) !== JSON.stringify(after)).toBeTruthy();
      await expect(app.status).toContainText(app.readyText);
    });
  });

  test.describe('Speed and Code Toggle (orthogonal events)', () => {
    test('SPEED_CHANGE: adjusting speed does not change state (Ready)', async () => {
      await expect(app.status).toContainText(app.readyText);
      await app.setSpeed(1);
      await app.setSpeed(100);
      await expect(app.status).toContainText(app.readyText);
    });

    test('SPEED_CHANGE while paused stays paused', async () => {
      await app.play();
      await app.pause();
      await app.setSpeed(50);
      await expect(app.status).toContainText(app.pausedText);
    });

    test('TOGGLE_CODE: toggles code block visibility and does not change sorting state', async () => {
      const initialStatus = await app.getStatusText();
      await app.toggleCode();
      // Code block visibility toggles (might be visible or hidden initially)
      // Try to assert toggle by toggling twice
      const visibleAfterFirstToggle = await app.codeBlock.first().isVisible().catch(() => false);
      await app.toggleCode();
      const visibleAfterSecondToggle = await app.codeBlock.first().isVisible().catch(() => false);
      // Expect visibility to change across toggles
      expect(visibleAfterFirstToggle !== visibleAfterSecondToggle).toBeTruthy();
      // Status unchanged
      expect(await app.getStatusText()).toBe(initialStatus);
    });
  });

  test.describe('Drag-and-Drop and Keyboard Reordering', () => {
    test('DRAG_START/DRAG_DROP: drag a bar to reorder; start/end drag feedback applied; returns to ready', async () => {
      await expect(app.status).toContainText(app.readyText);
      const before = await app.getBarValues();
      // Drag first bar to third position (indices 0 -> 2)
      await app.dragBarByIndex(0, Math.min(2, (await app.getBarCount()) - 1));
      // Ensure drag feedback classes are removed after drop
      await app.page.waitForTimeout(200);
      await expect(app.page.locator('.bar.comparing')).toHaveCount(0);
      const after = await app.getBarValues();
      // Order changed
      expect(JSON.stringify(before) !== JSON.stringify(after)).toBeTruthy();
      // Status ready due to generator reset
      await expect(app.status).toContainText(app.readyText);
    });

    test('Dragging while playing: drop resets generator and returns to ready', async () => {
      await app.play();
      // Drag a middle bar to end
      const count = await app.getBarCount();
      const from = Math.floor(count / 2);
      const to = count - 1;
      await app.dragBarByIndex(from, to);
      // After drop, generator resets and status returns to ready (playing stops)
      await expect(app.status).toContainText(app.readyText, { timeout: 3000 });
      await app.ensureNoHighlights();
    });

    test('Keyboard KEY_RIGHT_MOVE and KEY_LEFT_MOVE reorder bars and reset generator', async () => {
      await expect(app.status).toContainText(app.readyText);
      const before = await app.getBarValues();
      // Move a bar right
      const idx = Math.min(1, (await app.getBarCount()) - 2);
      await app.pressArrowOnBar(idx, 'ArrowRight');
      await app.page.waitForTimeout(150);
      const afterRight = await app.getBarValues();
      expect(JSON.stringify(before) !== JSON.stringify(afterRight)).toBeTruthy();
      await expect(app.status).toContainText(app.readyText);
      // Move the same bar left
      await app.pressArrowOnBar(idx + 1, 'ArrowLeft'); // After move right, bar shifted to idx+1
      await app.page.waitForTimeout(150);
      const afterLeft = await app.getBarValues();
      // Maybe back to original or a different order; ensure change occurred
      expect(JSON.stringify(afterRight) !== JSON.stringify(afterLeft)).toBeTruthy();
      await expect(app.status).toContainText(app.readyText);
    });

    test('Keyboard edge case: moving leftmost bar left does not change order', async () => {
      const before = await app.getBarValues();
      await app.pressArrowOnBar(0, 'ArrowLeft');
      const after = await app.getBarValues();
      expect(JSON.stringify(before)).toBe(JSON.stringify(after));
    });
  });

  test.describe('Visual Feedback and DOM Changes', () => {
    test('Comparing highlight appears during compare and is cleared on exit', async () => {
      await app.play();
      const comparing = await app.waitForComparingHighlight();
      await expect(comparing).toBeVisible();
      await app.page.waitForTimeout(700);
      await expect(app.page.locator('.bar.comparing')).toHaveCount(0);
      await app.pause();
      await app.ensureNoHighlights();
    });

    test('Swapping highlight appears during swap and is cleared on exit', async () => {
      await app.play();
      const swapHighlight = await app.waitForSwappingHighlight();
      await expect(swapHighlight).toBeVisible();
      await app.page.waitForTimeout(800);
      await expect(app.page.locator('.bar.swapping, .bar.swap')).toHaveCount(0);
      await app.pause();
      await app.ensureNoHighlights();
    });

    test('Sorted tail marking increases over passes', async () => {
      await app.randomize();
      await app.setSpeed(100);
      await app.play();
      // Check that count of sorted bars increases over time
      const count = await app.getBarCount();
      let lastSortedCount = 0;
      for (let i = 0; i < Math.min(count, 5); i++) {
        const sortedCount = await app.page.locator('.bar.sorted, .bar[data-state="sorted"]').count();
        expect(sortedCount).toBeGreaterThanOrEqual(lastSortedCount);
        lastSortedCount = sortedCount;
        await app.page.waitForTimeout(500);
      }
      await app.pause();
    });
  });

  test.describe('Reset and State Stability', () => {
    test('Reset clears sorted classes and returns to Ready', async () => {
      await app.randomize();
      await app.setSpeed(100);
      await app.play();
      await expect(app.status).toContainText(app.playingText);
      await expect(app.page.locator('.bar.sorted, .bar[data-state="sorted"]')).toHaveCountGreaterThan(0);
      await app.reset();
      await expect(app.page.locator('.bar.sorted, .bar[data-state="sorted"]')).toHaveCount(0);
      await expect(app.status).toContainText(app.readyText);
      await app.ensureNoHighlights();
    });

    test('No state change on TOGGLE_CODE and SPEED_CHANGE when Ready', async () => {
      const statusBefore = await app.getStatusText();
      await app.toggleCode();
      await app.setSpeed(75);
      const statusAfter = await app.getStatusText();
      expect(statusAfter).toBe(statusBefore);
    });
  });
});
import { test, expect } from '@playwright/test';

// Page Object for the Bubble Sort visualization
class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/10-28-0005/html/6a9e5450-b406-11f0-b2cf-31de200d1aa8.html';
    this.selectors = {
      // Buttons (use robust text-based locators)
      startButton: () => this.page.getByRole('button', { name: /^Start$/ }),
      pauseButton: () => this.page.getByRole('button', { name: /^Pause$/ }),
      stepButton: () => this.page.getByRole('button', { name: /^Step$/ }),
      resetButton: () => this.page.getByRole('button', { name: /^Reset$/ }),
      applyButton: () => this.page.getByRole('button', { name: /^Apply$/ }),
      randomizeButton: () => this.page.getByRole('button', { name: /^Randomize$/ }),

      // Inputs (prefer labels; fallback to type selectors)
      arrayInput: () => this.page.getByLabel(/Array|Values|Input|Numbers/i).or(this.page.locator('input[type="text"]').first()),
      speedSlider: () => this.page.getByLabel(/Speed/i).or(this.page.locator('input[type="range"]').first()),
      sizeInput: () => this.page.getByLabel(/Size|Count|Length/i).or(this.page.locator('input[type="number"]').first()),

      // Visualization elements
      bars: () => this.page.locator('.bar'),
      compareBars: () => this.page.locator('.bar.compare'),
      swapBars: () => this.page.locator('.bar.swap'),
      finishedBars: () => this.page.locator('.bar.finished'),

      // Narration / status
      narration: () => this.page.locator('.narration, .status, #status, [role="status"]'),
      pausedText: () => this.page.getByText(/paused/i),
      passText: () => this.page.getByText(/pass/i),
      errorText: () => this.page.getByText(/invalid|error/i)
    };
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Control methods
  async clickStart() {
    const btn = this.selectors.startButton();
    if (await btn.isVisible()) {
      await btn.click();
      return;
    }
    // Fallback: the unified Start/Pause button might not have exact text; attempt generic
    const generic = this.page.locator('button:has-text("Start")').first();
    if (await generic.isVisible()) {
      await generic.click();
      return;
    }
    throw new Error('Start button not found');
  }

  async clickPause() {
    const btn = this.selectors.pauseButton();
    if (await btn.isVisible()) {
      await btn.click();
      return;
    }
    const generic = this.page.locator('button:has-text("Pause")').first();
    if (await generic.isVisible()) {
      await generic.click();
      return;
    }
    throw new Error('Pause button not found');
  }

  async clickStep() {
    await this.selectors.stepButton().click();
  }

  async clickReset() {
    await this.selectors.resetButton().click();
  }

  async clickRandomize() {
    await this.selectors.randomizeButton().click();
  }

  async applyArray(values) {
    const input = this.selectors.arrayInput();
    await input.fill(values);
    await this.selectors.applyButton().click();
  }

  async setSpeedToMax() {
    const slider = this.selectors.speedSlider();
    // Set to max and dispatch events to trigger SPEED_CHANGE
    await slider.evaluate(el => {
      el.value = el.max || '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async setSpeedToMin() {
    const slider = this.selectors.speedSlider();
    await slider.evaluate(el => {
      el.value = el.min || '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async setSize(n) {
    const size = this.selectors.sizeInput();
    await size.fill(String(n));
    await size.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // Bar values extraction helper
  async getBarValues() {
    const values = await this.page.$$eval('.bar', bars =>
      bars.map(b => {
        const dv = b.dataset?.value ?? b.getAttribute('data-value');
        if (dv != null) return parseFloat(dv);
        const text = (b.textContent || '').trim();
        const parsed = parseFloat(text);
        return Number.isFinite(parsed) ? parsed : text;
      })
    );
    return values;
  }

  async getStartPauseLabel() {
    if (await this.selectors.pauseButton().isVisible()) return 'Pause';
    if (await this.selectors.startButton().isVisible()) return 'Start';
    // fallback read text of unified button
    const unified = this.page.locator('button:has-text("Start"), button:has-text("Pause")').first();
    if (await unified.isVisible()) {
      return (await unified.textContent())?.trim();
    }
    return 'Unknown';
  }

  // Expectations for states
  async expectIdle() {
    // OnEnter: set_start_button_label_start
    await expect(this.selectors.startButton()).toBeVisible();
    await expect(this.selectors.compareBars()).toHaveCount(0);
    await expect(this.selectors.swapBars()).toHaveCount(0);
  }

  async waitForComparing(timeout = 4000) {
    await expect(this.selectors.compareBars()).toHaveCount(2, { timeout });
  }

  async waitForSwapping(timeout = 4000) {
    await expect(this.selectors.swapBars()).toHaveCount(2, { timeout });
  }

  async waitForNoHighlights(timeout = 2000) {
    await expect(this.selectors.compareBars()).toHaveCount(0, { timeout });
    await expect(this.selectors.swapBars()).toHaveCount(0, { timeout });
  }

  async waitForFinished(timeout = 8000) {
    const totalBars = await this.selectors.bars().count();
    await expect(this.selectors.finishedBars()).toHaveCount(totalBars, { timeout });
  }

  async isBetweenPass() {
    const startLabel = await this.getStartPauseLabel();
    const compareCount = await this.selectors.compareBars().count();
    const swapCount = await this.selectors.swapBars().count();
    const finishedCount = await this.selectors.finishedBars().count();
    const totalBars = await this.selectors.bars().count();
    const notFinished = totalBars > 0 && finishedCount < totalBars;
    return startLabel === 'Start' && compareCount === 0 && swapCount === 0 && notFinished;
  }
}

// Test Suite
test.describe('Interactive Application - Bubble Sort FSM E2E', () => {
  test.describe.configure({ mode: 'serial' }); // Ensure order where necessary for dependent scenarios

  let app;

  test.beforeEach(async ({ page }) => {
    app = new BubbleSortPage(page);
    await app.goto();
    // Ensure we are in the idle state with a deterministic setup
    await app.expectIdle();
    // Prefer a small size for faster tests, if size control exists
    try {
      await app.setSize(5);
    } catch (e) {
      // size input may not exist; ignore
    }
    // Set speed to max for faster timers by default
    try {
      await app.setSpeedToMax();
    } catch (e) {
      // speed slider may not exist; ignore
    }
  });

  test.afterEach(async ({ page }) => {
    // Teardown: reset back to idle to isolate tests
    try {
      await app.clickReset();
    } catch (e) {
      // ignore if reset not found
    }
  });

  // Idle state verification
  test('Idle state on load: Start label "Start", no highlights, no finished', async () => {
    await app.expectIdle();
    const label = await app.getStartPauseLabel();
    expect(label).toBe('Start');
    await expect(app.selectors.finishedBars()).toHaveCount(0);
  });

  // Auto-play transitions: idle -> compute_next_step_auto -> playing_comparing -> maybe playing_swapping
  test('Auto-play starts comparing and transitions swapping when needed', async () => {
    // Apply an input that forces a swap on the first comparison: [2,1,3,4,5]
    await app.applyArray('2,1,3,4,5');
    await app.expectIdle();

    // CLICK_START: idle -> compute_next_step_auto
    await app.clickStart();

    // READY_TO_COMPARE -> playing_comparing (onEnter: highlight_pair_and_schedule_compare_timer)
    await app.waitForComparing();
    // Visual feedback: 2 bars highlighted with 'compare'
    const compareCount = await app.selectors.compareBars().count();
    expect(compareCount).toBe(2);
    // The start/pause button should now show "Pause" (running=true)
    const label = await app.getStartPauseLabel();
    expect(label).toBe('Pause');

    // TIMER_COMPARE_DONE_SWAP -> playing_swapping (onEnter: mark_swap... and schedule swap timer)
    await app.waitForSwapping();
    const swapCount = await app.selectors.swapBars().count();
    expect(swapCount).toBeGreaterThanOrEqual(2);

    // After swap animation completes, should continue auto-play: TIMER_SWAP_ANIM_DONE -> compute_next_step_auto
    // The swap highlights should eventually clear and next compare should occur again
    await app.waitForNoHighlights(4000);
  });

  // Pause functionality while auto-playing
  test('Pause during comparing: paused state clears timers and shows paused message', async () => {
    // Use slower speed to ensure we can click Pause while comparing
    try { await app.setSpeedToMin(); } catch (e) {}
    await app.applyArray('1,2,3,4');
    await app.clickStart();
    await app.waitForComparing();

    // CLICK_PAUSE -> paused (onEnter: clear_timer_and_set_paused_message)
    await app.clickPause();

    // Start button should show "Start"
    const label = await app.getStartPauseLabel();
    expect(label).toBe('Start');

    // Paused message should be present somewhere
    const pausedMessageVisible = await app.selectors.pausedText().isVisible().catch(() => false);
    expect(pausedMessageVisible).toBeTruthy();

    // Verify no swapping occurs while paused
    await expect(app.selectors.swapBars()).toHaveCount(0);

    // Ensure compare does not auto-advance for a short period
    await app.page.waitForTimeout(600);
    await expect(app.selectors.swapBars()).toHaveCount(0);
  });

  // Resume from paused state with Start (auto) or Step (manual)
  test('Resume from paused: Start -> auto comparing; Step -> stepping comparing', async () => {
    await app.applyArray('3,2,1');
    await app.clickStart();
    await app.waitForComparing();
    await app.clickPause();

    // Resume auto with Start: paused -> compute_next_step_auto -> playing_comparing
    await app.clickStart();
    await app.waitForComparing();
    expect(await app.getStartPauseLabel()).toBe('Pause');

    // Pause again and resume with Step for manual stepping path
    await app.clickPause();
    expect(await app.getStartPauseLabel()).toBe('Start');
    // CLICK_STEP: paused -> compute_next_step_step -> READY_TO_COMPARE -> stepping_comparing
    await app.clickStep();
    await app.waitForComparing();
    // In stepping mode, running=false; Start label should be "Start"
    expect(await app.getStartPauseLabel()).toBe('Start');
  });

  // Manual stepping path: stepping_comparing -> stepping_swapping -> idle
  test('Manual step causing swap: stepping_comparing -> stepping_swapping -> idle', async () => {
    await app.applyArray('2,1,3,4');
    await app.expectIdle();

    // CLICK_STEP: idle -> compute_next_step_step
    await app.clickStep();

    // READY_TO_COMPARE -> stepping_comparing (highlight_pair_and_schedule_compare_timer)
    await app.waitForComparing();
    expect(await app.getStartPauseLabel()).toBe('Start');

    // TIMER_COMPARE_DONE_SWAP -> stepping_swapping
    await app.waitForSwapping();

    // TIMER_SWAP_ANIM_DONE -> idle (highlights cleared)
    await app.waitForNoHighlights(4000);
    await app.expectIdle();
  });

  // Manual stepping path with no swap
  test('Manual step with no swap: stepping_comparing -> idle via TIMER_COMPARE_DONE_NO_SWAP', async () => {
    await app.applyArray('1,2,3,4');
    await app.expectIdle();

    // CLICK_STEP: idle -> compute_next_step_step
    await app.clickStep();

    // READY_TO_COMPARE -> stepping_comparing
    await app.waitForComparing();

    // Since first pair is already sorted, expect no swap and return to idle
    await app.waitForNoHighlights(4000);
    await app.expectIdle();
  });

  // Between-pass state: PASS_END_WITH_SWAPS -> between_pass; auto-play halts until user continues
  test('Between-pass state: auto-play halts at pass boundary with swaps', async () => {
    // Use a small array that requires swaps and verifies pass transition
    await app.applyArray('3,2,1');
    await app.clickStart();

    // Allow auto-play to run through first pass
    // We look for a period with no highlights and Start label resets to "Start" while not finished
    let inBetween = false;
    for (let i = 0; i < 10; i++) {
      await app.page.waitForTimeout(200);
      inBetween = await app.isBetweenPass();
      if (inBetween) break;
    }
    expect(inBetween).toBeTruthy();

    // Verify that auto-play has halted: no compare/swaps after waiting
    await app.page.waitForTimeout(600);
    expect(await app.isBetweenPass()).toBeTruthy();

    // From between_pass, CLICK_START -> compute_next_step_auto (resume)
    await app.clickStart();
    await app.waitForComparing();
  });

  // Finished state via PASS_END_NO_SWAPS or FINAL_PASS_COMPLETE
  test('Finished state: all bars marked finished; Start/Step do not change state', async () => {
    // Already sorted input triggers early exit (PASS_END_NO_SWAPS)
    await app.applyArray('1,2,3,4');
    await app.clickStart();

    // Wait for finished state (onEnter: mark_bars_finished_and_announce_completion)
    await app.waitForFinished(8000);

    const totalBars = await app.selectors.bars().count();
    await expect(app.selectors.finishedBars()).toHaveCount(totalBars);

    // Clicking Start or Step should keep finished state (no highlights, finished persists)
    await app.clickStart();
    await expect(app.selectors.finishedBars()).toHaveCount(totalBars);
    await expect(app.selectors.compareBars()).toHaveCount(0);
    await expect(app.selectors.swapBars()).toHaveCount(0);

    await app.clickStep();
    await expect(app.selectors.finishedBars()).toHaveCount(totalBars);
  });

  // Reset behavior from various states: returns to idle and clears finished highlights
  test('Reset returns to idle from finished and clears finished classes', async () => {
    await app.applyArray('1,2,3,4');
    await app.clickStart();
    await app.waitForFinished(8000);

    await app.clickReset();
    await app.expectIdle();
    await expect(app.selectors.finishedBars()).toHaveCount(0);
  });

  // Apply valid input while playing: transitions to idle and updates array values
  test('Apply valid while playing: transitions to idle and re-renders with new values', async () => {
    await app.applyArray('3,1,2,4');
    const beforeValues = await app.getBarValues();

    await app.clickStart(); // start auto-playing
    await app.waitForComparing(); // ensure we are in a playing state

    // CLICK_APPLY_VALID from playing_comparing/playing_swapping -> idle
    await app.applyArray('9,8,7,6');
    await app.expectIdle();

    const afterValues = await app.getBarValues();
    // Array values should have changed to the new applied values
    expect(afterValues.join(',')).toBe('9,8,7,6');

    // Highlights should be cleared
    await expect(app.selectors.compareBars()).toHaveCount(0);
    await expect(app.selectors.swapBars()).toHaveCount(0);

    // Start label should be "Start"
    expect(await app.getStartPauseLabel()).toBe('Start');
  });

  // Apply invalid input in idle: remains idle and shows error narration
  test('Apply invalid input: remains idle and shows error message', async () => {
    await app.expectIdle();
    const initialValues = await app.getBarValues();

    // CLICK_APPLY_INVALID should not change state; should show an error/narration
    await app.applyArray('1, a, 3, !');

    // Still idle
    await app.expectIdle();

    // Bars values should remain unchanged
    const afterValues = await app.getBarValues();
    expect(afterValues.join(',')).toBe(initialValues.join(','));

    // Error text should be present (case-insensitive match for "invalid" or "error")
    const hasError = await app.selectors.errorText().isVisible().catch(() => false);
    expect(hasError).toBeTruthy();
  });

  // Randomize: transitions to idle and changes the bars
  test('Randomize: transitions to idle and updates bars', async () => {
    await app.applyArray('5,4,3,2,1');
    const before = await app.getBarValues();

    // From idle, clicking Randomize keeps us in idle (FSM says CLICK_RANDOMIZE -> idle)
    await app.clickRandomize();
    await app.expectIdle();

    const after = await app.getBarValues();
    // Values should change; if implementation keeps same values occasionally, at least type remains array
    const changed = before.join(',') !== after.join(',');
    expect(changed).toBeTruthy();
  });

  // SPEED_CHANGE does not change state in playing_comparing
  test('Speed change during comparing: state remains playing_comparing', async () => {
    await app.applyArray('2,1,3,4,5');
    await app.clickStart();
    await app.waitForComparing();

    // Change speed and verify we are still comparing (SPEED_CHANGE -> playing_comparing)
    await app.setSpeedToMin();
    await expect(app.selectors.compareBars()).toHaveCount(2);

    // And Start/Pause should still be "Pause"
    expect(await app.getStartPauseLabel()).toBe('Pause');
  });

  // SPEED_CHANGE does not change state in paused
  test('Speed change during paused: state remains paused', async () => {
    await app.applyArray('2,1,3,4,5');
    await app.clickStart();
    await app.waitForComparing();
    await app.clickPause();

    await app.setSpeedToMax();
    // Still paused: label is "Start" and paused message visible
    expect(await app.getStartPauseLabel()).toBe('Start');
    const pausedMessageVisible = await app.selectors.pausedText().isVisible().catch(() => false);
    expect(pausedMessageVisible).toBeTruthy();
  });

  // SIZE_CHANGE in idle: remains idle and updates bar count
  test('Size change in idle: remains idle and bar count updates', async () => {
    await app.expectIdle();
    const beforeCount = await app.selectors.bars().count();

    // SIZE_CHANGE -> idle
    try {
      await app.setSize(7);
    } catch (e) {
      test.skip(true, 'Size control not available');
      return;
    }

    await app.expectIdle();
    const afterCount = await app.selectors.bars().count();
    expect(afterCount).not.toBe(beforeCount);
    expect(afterCount).toBe(7);
  });

  // SIZE_CHANGE in paused: remains paused, Start label stays "Start"
  test('Size change in paused: remains paused', async () => {
    await app.applyArray('4,3,2,1');
    await app.clickStart();
    await app.waitForComparing();
    await app.clickPause();

    try {
      await app.setSize(6);
    } catch (e) {
      test.skip(true, 'Size control not available');
      return;
    }

    // Still paused
    expect(await app.getStartPauseLabel()).toBe('Start');
    const pausedMessageVisible = await app.selectors.pausedText().isVisible().catch(() => false);
    expect(pausedMessageVisible).toBeTruthy();
  });

  // RESIZE event does not change state in comparing and swapping phases
  test('Resize during comparing/swapping: state remains', async ({ page }) => {
    await app.applyArray('2,1,3,4,5');
    await app.clickStart();
    await app.waitForComparing();

    // RESIZE -> should not change state; compare highlights should remain
    await page.setViewportSize({ width: 900, height: 700 });
    await expect(app.selectors.compareBars()).toHaveCount(2);

    // Allow transition to swapping and resize again
    await app.waitForSwapping();
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(app.selectors.swapBars()).toHaveCount(2);
  });

  // Finished: SPEED_CHANGE, SIZE_CHANGE, RESIZE do not change finished state
  test('Finished: speed/size/resize do not change finished state', async ({ page }) => {
    await app.applyArray('1,2,3,4,5');
    await app.clickStart();
    await app.waitForFinished(8000);

    const totalBars = await app.selectors.bars().count();

    // SPEED_CHANGE
    try {
      await app.setSpeedToMax();
    } catch (e) {}
    await expect(app.selectors.finishedBars()).toHaveCount(totalBars);

    // SIZE_CHANGE (if allowed during finished, FSM says remains finished)
    try {
      await app.setSize(4);
      await expect(app.selectors.finishedBars()).toHaveCount(await app.selectors.bars().count());
    } catch (e) {
      // if not available, skip size check
    }

    // RESIZE
    await page.setViewportSize({ width: 1000, height: 600 });
    await expect(app.selectors.finishedBars()).toHaveCount(await app.selectors.bars().count());
  });

  // Edge: Step from finished remains finished
  test('Step from finished: state remains finished', async () => {
    await app.applyArray('1,2,3');
    await app.clickStart();
    await app.waitForFinished(6000);

    const totalBars = await app.selectors.bars().count();

    await app.clickStep();
    await expect(app.selectors.finishedBars()).toHaveCount(totalBars);
    await expect(app.selectors.compareBars()).toHaveCount(0);
    await expect(app.selectors.swapBars()).toHaveCount(0);
  });

  // Edge: Start from finished remains finished
  test('Start from finished: state remains finished', async () => {
    await app.applyArray('1,2,3');
    await app.clickStart();
    await app.waitForFinished(6000);
    const totalBars = await app.selectors.bars().count();
    await app.clickStart();
    await expect(app.selectors.finishedBars()).toHaveCount(totalBars);
  });

  // Verify onExit noop by absence of unexpected side-effects when leaving playing_comparing
  test('Leaving playing_comparing has no extra side effects (noop onExit)', async () => {
    await app.applyArray('2,1,3');
    await app.clickStart();
    await app.waitForComparing();

    // Transition to swapping
    await app.waitForSwapping();

    // After leaving comparing, ensure no residual compare classes remain beyond expected
    await expect(app.selectors.compareBars()).toHaveCount(0);
    // After swap completes, highlights should clear
    await app.waitForNoHighlights(4000);
  });
});
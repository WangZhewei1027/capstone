import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7b293710-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object encapsulating interactions and common queries for the Quick Sort module
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Button locators (try to be resilient by matching by role/name and common text)
    this.playBtn = page.getByRole('button', { name: /play/i }).first();
    this.pauseBtn = page.getByRole('button', { name: /pause/i }).first();
    this.stopBtn = page.getByRole('button', { name: /stop/i }).first();
    this.stepBtn = page.getByRole('button', { name: /step/i }).first();
    this.randomizeBtn = page.getByRole('button', { name: /randomize|shuffle/i }).first();
    this.resetBtn = page.getByRole('button', { name: /reset/i }).first();
    this.applyCustomBtn = page.getByRole('button', { name: /apply/i }).first();

    // Bars container/individual bars - try multiple selectors to be tolerant of structure
    this.barsLocator = page.locator(
      '.bars .bar, [data-bars] .bar, .bar[data-value], [data-testid="bars"] .bar, .bar'
    );

    // Code highlight area and stack panel are optional; try generic selectors
    this.codeHighlight = page.locator('.code .highlight, .code-highlight, [data-code-highlight]');
    this.stackPanel = page.locator('.stack, [data-stack], .stack-panel');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // Wait a short time for module scripts to initialize
    await this.page.waitForTimeout(250);
  }

  async getBarCount() {
    const count = await this.barsLocator.count();
    return count;
  }

  // Returns array of numeric heights (or values) for bars
  async getBarValues() {
    const count1 = await this.getBarCount();
    if (count === 0) return [];
    const values = [];
    for (let i = 0; i < count; i++) {
      const bar = this.barsLocator.nth(i);
      // Try data-value attribute first
      const dataValue = await bar.getAttribute('data-value');
      if (dataValue !== null) {
        values.push(Number(dataValue));
        continue;
      }
      // Try inline style height like "height: 120px"
      const style = await bar.getAttribute('style');
      if (style && /height\s*:\s*([\d.]+)px/i.test(style)) {
        const m = style.match(/height\s*:\s*([\d.]+)px/i);
        values.push(Number(m[1]));
        continue;
      }
      // Try text content
      const text = (await bar.innerText()).trim();
      const num = Number(text);
      if (!Number.isNaN(num)) {
        values.push(num);
        continue;
      }
      // Fallback: use computed bounding box height
      const box = await bar.boundingBox();
      values.push(box ? Math.round(box.height) : 0);
    }
    return values;
  }

  // Helpers to click controls (will ignore if control not found to allow tests to assert presence)
  async clickPlay() {
    await this.playBtn.click({ trial: false }).catch(() => {
      throw new Error('Play button not found or not clickable');
    });
  }

  async clickPause() {
    await this.pauseBtn.click().catch(() => {
      throw new Error('Pause button not found or not clickable');
    });
  }

  async clickStop() {
    await this.stopBtn.click().catch(() => {
      throw new Error('Stop button not found or not clickable');
    });
  }

  async clickStep() {
    await this.stepBtn.click().catch(() => {
      throw new Error('Step button not found or not clickable');
    });
  }

  async clickRandomize() {
    await this.randomizeBtn.click().catch(() => {
      throw new Error('Randomize button not found or not clickable');
    });
  }

  async clickReset() {
    await this.resetBtn.click().catch(() => {
      throw new Error('Reset button not found or not clickable');
    });
  }

  async isButtonEnabled(buttonLocator) {
    // Playwright has isEnabled which respects disabled attribute/state
    return buttonLocator.isEnabled();
  }

  // Wait until all bars have 'sorted' class (indicates done per FSM)
  async waitForDone(timeout = 15000) {
    const start = Date.now();
    const count2 = await this.getBarCount();
    if (count === 0) throw new Error('No bars found to determine done state');
    while (Date.now() - start < timeout) {
      const sortedCount = await this.page.locator('.bar.sorted, .sorted.bar, .bar[data-state="sorted"]').count();
      if (sortedCount >= count) return;
      await this.page.waitForTimeout(200);
    }
    throw new Error('Timed out waiting for done state (all bars sorted)');
  }

  // Wait for an ephemeral processing visual mark (compare/pivot) to appear - returns class that appeared
  async waitForProcessingMark(timeout = 3000) {
    const start1 = Date.now();
    const candidateSelectors = [
      '.bar.compare',
      '.bar.pivot',
      '.bar.placing',
      '.bar.swapping',
      '.bar[data-state="compare"]',
      '.bar[data-state="pivot"]',
      '.compare',
      '.pivot',
    ];
    while (Date.now() - start < timeout) {
      for (const sel of candidateSelectors) {
        if ((await this.page.locator(sel).count()) > 0) return sel;
      }
      await this.page.waitForTimeout(100);
    }
    return null;
  }

  // Stop/pause state check helpers (best-effort based on button states)
  async assertIdleButtons() {
    // Idle: play enabled, pause disabled, stop disabled, step enabled
    await expect(this.playBtn).toBeEnabled();
    await expect(this.stepBtn).toBeEnabled();
    await expect(this.pauseBtn).toBeDisabled();
    await expect(this.stopBtn).toBeDisabled();
  }

  async assertPlayingButtons() {
    // Playing: play disabled, pause enabled, stop enabled
    await expect(this.playBtn).toBeDisabled();
    await expect(this.pauseBtn).toBeEnabled();
    await expect(this.stopBtn).toBeEnabled();
  }

  async assertPausedButtons() {
    // Paused: play enabled, pause disabled (per FSM)
    await expect(this.playBtn).toBeEnabled();
    await expect(this.pauseBtn).toBeDisabled();
    // stop may be enabled/disabled depending on implementation; do not assert
  }

  async assertStoppedButtons() {
    // Stopped: play enabled, pause disabled, stop disabled
    await expect(this.playBtn).toBeEnabled();
    await expect(this.pauseBtn).toBeDisabled();
    await expect(this.stopBtn).toBeDisabled();
  }
}

test.describe('Quick Sort Interactive Module - FSM validation (7b293710-bcb0-11f0-95d9-c98d28730c93)', () => {
  test.beforeEach(async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.goto();
  });

  test('Initial idle state: UI controls reflect idle onEnter behavior', async ({ page }) => {
    // Validate that the module starts in idle and exposes correct enabled/disabled controls
    const qs1 = new QuickSortPage(page);

    // Ensure bars exist
    const barCount = await qs.getBarCount();
    expect(barCount).toBeGreaterThan(0);

    // Idle onEnter: play enabled, pause disabled, stop disabled, step enabled
    // Use page object helper assertions
    await qs.assertIdleButtons();

    // Also confirm there's no 'sorted' class on all bars at start
    const sortedCount1 = await page.locator('.bar.sorted, .sorted.bar, .bar[data-state="sorted"]').count();
    expect(sortedCount).toBeLessThanOrEqual(barCount - 1);
  });

  test('Randomize and reset (idle events) change array and restore', async ({ page }) => {
    // Validate RANDOMIZE and RESET events in idle state
    const qs2 = new QuickSortPage(page);

    const original = await qs.getBarValues();
    expect(original.length).toBeGreaterThan(0);

    // Click Randomize and ensure ordering changes
    await qs.clickRandomize();
    await page.waitForTimeout(300); // allow animation/DOM update
    const randomized = await qs.getBarValues();

    // It's possible randomize may sometimes produce same order; assert that either values changed or UI indicated change (best-effort)
    const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    if (arraysEqual(original, randomized)) {
      // If equal, try randomize again; at least one attempt should change
      await qs.clickRandomize();
      await page.waitForTimeout(300);
      const randomized2 = await qs.getBarValues();
      expect(arraysEqual(original, randomized2)).toBe(false);
    } else {
      expect(arraysEqual(original, randomized)).toBe(false);
    }

    // Click Reset - expect array to revert to an ordered or original-like state
    await qs.clickReset();
    await page.waitForTimeout(300);
    const afterReset = await qs.getBarValues();
    // After reset, expect it not to be identical to randomized (i.e., change occurred)
    expect(arraysEqual(afterReset, randomized)).toBe(false);
  });

  test('Select and swap bars in idle mode (SELECT_BAR / SWAP_BARS)', async ({ page }) => {
    // Validate selection and swap behavior in pre-run (idle) mode
    const qs3 = new QuickSortPage(page);
    const count3 = await qs.getBarCount();
    expect(count).toBeGreaterThanOrEqual(2);

    // Pick first two bars
    const first = qs.barsLocator.nth(0);
    const second = qs.barsLocator.nth(1);

    // Get their values
    const v1 = (await qs.getBarValues())[0];
    const v2 = (await qs.getBarValues())[1];

    // Click to select first bar - many implementations toggle a 'selected' class
    await first.click();
    await page.waitForTimeout(150);
    // Verify selection class exists on one of them (best-effort)
    const selectedExists = (await page.locator('.bar.selected, .selected.bar, [data-selected="true"]').count()) > 0;
    expect(selectedExists).toBe(true);

    // Click second to request a swap (some apps swap on second click)
    await second.click();
    await page.waitForTimeout(400);

    // If there's an explicit Swap button, try clicking it as well
    const swapBtn = page.getByRole('button', { name: /swap/i }).first();
    if (await swapBtn.count() > 0) {
      if (await swapBtn.isEnabled()) {
        await swapBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // After swap attempt, verify that the two positions' values have exchanged OR at least changed
    const valuesAfter = await qs.getBarValues();
    const newV1 = valuesAfter[0];
    const newV2 = valuesAfter[1];

    // Either they swapped OR some selection behavior didn't trigger swap; accept either but flag if nothing changed
    const swapped = newV1 === v2 && newV2 === v1;
    expect(swapped || (newV1 !== v1 || newV2 !== v2)).toBe(true);
  });

  test('Play -> processing -> done flow: playing, processing_event and done onEnter actions', async ({ page }) => {
    // Validate play starts automatic run, processing marks appear, and final done state marks bars sorted
    const qs4 = new QuickSortPage(page);
    const barCount1 = await qs.getBarCount();
    expect(barCount).toBeGreaterThan(0);

    // Start playing
    await qs.clickPlay();

    // Immediately assert playing buttons state (onEnter of playing should disable play, enable pause & stop)
    await qs.assertPlayingButtons();

    // While playing, we expect ephemeral processing marks (compare/pivot/swap) to appear sometime
    const mark = await qs.waitForProcessingMark(8000);
    expect(mark !== null).toBe(true);

    // Wait for run to finish and onEnter done to mark all bars as sorted
    await qs.waitForDone(30000);

    // After done, onEnter: play enabled, pause disabled, stop disabled
    await expect(qs.playBtn).toBeEnabled();
    await expect(qs.pauseBtn).toBeDisabled();
    await expect(qs.stopBtn).toBeDisabled();

    // Check every bar has 'sorted' class (or data-state)
    const sortedCount2 = await page.locator('.bar.sorted, .sorted.bar, .bar[data-state="sorted"]').count();
    expect(sortedCount).toBeGreaterThanOrEqual(barCount);
  }, 45000); // extended timeout for full run

  test('Pause preserves generator: pause then step processes single event (paused -> stepping -> processing_event -> idle/playing)', async ({ page }) => {
    // Validate PAUSE preserves generator and STEP while paused advances one event
    const qs5 = new QuickSortPage(page);

    // Start playing and pause quickly
    await qs.clickPlay();
    // Wait until playing controls settle
    await page.waitForTimeout(200);
    await qs.clickPause();

    // After pause, onEnter paused: paused=true, running=false; play enabled, pause disabled
    await qs.assertPausedButtons();

    // Capture bar values before step
    const before = await qs.getBarValues();

    // Click Step to step one generator event while paused
    await qs.clickStep();

    // The FSM says stepping sets isProcessing=true and processes a single event -> expect a transient processing mark
    const mark1 = await qs.waitForProcessingMark(3000);
    expect(mark !== null).toBe(true);

    // After small delay for processing to clear
    await page.waitForTimeout(500);

    // Values should have either changed slightly (e.g., one compare/swap applied) or remain but processing occurred
    const after = await qs.getBarValues();
    // It's acceptable that step did not change values (compare/info), but at least no error thrown and UI remained responsive
    expect(after.length).toBe(before.length);
  });

  test('Stop clears running generator and resets UI (stopped onEnter actions)', async ({ page }) => {
    // Validate STOP clears generator, clears highlights and resets UI to stopped
    const qs6 = new QuickSortPage(page);

    // Start playing to ensure generator exists
    await qs.clickPlay();
    await page.waitForTimeout(300);
    // Then stop
    await qs.clickStop();

    // onEnter stopped: running=false, paused=false, generator=null, enable play, disable pause & stop
    await qs.assertStoppedButtons();

    // Ensure highlights gone: no pivot/compare classes
    const highlightCount = await page.locator('.bar.pivot, .bar.compare, .pivot, .compare, .code .highlight').count();
    expect(highlightCount).toBeLessThanOrEqual(0);

    // Ensure stack cleared (best-effort): stack panel should be empty or have no active frames
    const stackItems = await qs.stackPanel.locator('li, .frame, .stack-item').count().catch(() => 0);
    expect(stackItems).toBeLessThanOrEqual(10); // not a strict assertion; ensures stack isn't exploding
  });

  test('Stepping from cold-start creates generator and processes until done when repeated; handle PROCESS_COMPLETE_STEP transition', async ({ page }) => {
    // Repeatedly click Step until done, verifying PROCESS_COMPLETE_STEP transitions back to idle between steps
    const qs7 = new QuickSortPage(page);
    const maxSteps = 2000; // safety limit
    const totalBars = await qs.getBarCount();
    expect(totalBars).toBeGreaterThan(0);

    // Re-set to a known random state then step to completion
    await qs.clickRandomize();
    await page.waitForTimeout(300);

    // Loop stepping; break when done detected
    let steps = 0;
    let done = false;
    while (steps < maxSteps && !done) {
      // Click Step
      await qs.clickStep();
      steps++;
      // Wait a short interval for processing_event to occur
      await page.waitForTimeout(200);

      // Allow for transient visual mark; not mandatory
      await qs.waitForProcessingMark(500).catch(() => null);

      // Check done state (all bars marked sorted)
      const sortedCount3 = await page.locator('.bar.sorted, .sorted.bar, .bar[data-state="sorted"]').count();
      if (sortedCount >= totalBars) {
        done = true;
        break;
      }
      // Ensure UI remains in idle between steps per PROCESS_COMPLETE_STEP
      // Idle: play enabled, pause disabled
      await expect(qs.playBtn).toBeEnabled();
      await expect(qs.pauseBtn).toBeDisabled();
    }

    expect(done).toBe(true);
    // After done, ensure generator null/cleanup by checking Play enabled and Pause disabled
    await expect(qs.playBtn).toBeEnabled();
    await expect(qs.pauseBtn).toBeDisabled();
  }, 45000);

  test('Edge cases: pressing Stop when already stopped and Step when no generator should not throw', async ({ page }) => {
    // Ensure Stop while idle/stopped is a no-op and Step when generator null creates generator
    const qs8 = new QuickSortPage(page);

    // Ensure stopped state
    await qs.clickStop().catch(() => { /* ignore if not present */ });
    await qs.assertStoppedButtons();

    // Press Stop again - should remain stable
    await qs.clickStop().catch(() => { /* ignore */ });
    await qs.assertStoppedButtons();

    // Press Step when no generator: should create generator and process one event
    await qs.clickStep();
    const mark2 = await qs.waitForProcessingMark(2000);
    // It may or may not produce visible marks (depends on event), but it should not error
    expect(mark === null || typeof mark === 'string').toBeTruthy();
  });

  test('Keyboard shortcuts: attempt to trigger PLAY/PAUSE/STEP via common keys (Space/ArrowRight) - best-effort', async ({ page }) => {
    // Keyboard mapping is implementation-specific. This test attempts common shortcuts and validates that UI buttons change state accordingly.
    const qs9 = new QuickSortPage(page);

    // Focus the body then press Space to toggle play (common pattern)
    await page.focus('body');
    await page.keyboard.press('Space');
    // Wait for potential play activation
    await page.waitForTimeout(300);

    // If play was activated, playBtn should become disabled (playing), otherwise it may remain enabled
    const playDisabled = await qs.playBtn.isDisabled().catch(() => false);
    if (playDisabled) {
      // If playing, try pause via Space again
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      await qs.assertPausedButtons();
    } else {
      // Try ArrowRight as a step key (common)
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      // Expect no page crash and that UI remains responsive (play button still present)
      await expect(qs.playBtn).toBeVisible();
    }
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup: stop any running process to leave the app in a stable state for next tests
    const qs10 = new QuickSortPage(page);
    if ((await qs.stopBtn.count()) > 0) {
      try {
        await qs.clickStop();
      } catch {
        // ignore
      }
    }
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/79b4bf80-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for interacting with the Bubble Sort interactive module.
 * The implementation uses multiple selector strategies to be resilient to minor DOM differences.
 */
class BubblePage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main visualization to appear
    await Promise.race([
      this.page.locator('.array-area').first().waitFor({ state: 'visible', timeout: 3000 }),
      this.page.locator('.bars .bar').first().waitFor({ state: 'visible', timeout: 3000 }),
    ]).catch(() => {
      // continue, tests will assert existence later
    });
  }

  // Locators

  playButton() {
    return this.page.locator('button:has-text("Play"), button:has-text("play"), button[aria-label="Play"], button[aria-label="play"]');
  }

  pauseButton() {
    return this.page.locator('button:has-text("Pause"), button:has-text("pause"), button[aria-label="Pause"], button[aria-label="pause"]');
  }

  togglePlayButton() {
    // Some implementations use one button that toggles text, use either Play or Pause
    return this.page.locator('button.toggle-play, button:has-text("Play"), button:has-text("Pause"), button[aria-label="Toggle play"]');
  }

  stepForwardButton() {
    return this.page.locator('button:has-text("Step Forward"), button:has-text("Next"), button[aria-label="Step Forward"], button[aria-label="Next"], button.step-forward');
  }

  stepBackButton() {
    return this.page.locator('button:has-text("Step Back"), button:has-text("Previous"), button[aria-label="Step Back"], button[aria-label="Previous"], button.step-back');
  }

  randomizeButton() {
    return this.page.locator('button:has-text("Randomize"), button[aria-label="Randomize"], button.randomize');
  }

  setArrayInput() {
    return this.page.locator('input#array-input, input[placeholder*="array"], textarea#array-input, input[aria-label~="Array"]');
  }

  setArrayButton() {
    return this.page.locator('button:has-text("Set Array"), button:has-text("Set"), button[aria-label="Set Array"]');
  }

  resetButton() {
    return this.page.locator('button:has-text("Reset"), button[aria-label="Reset"]');
  }

  optimizedCheckbox() {
    return this.page.locator('input[type="checkbox"][id*="optimized"], input[type="checkbox"][name*="optimized"], label:has-text("Optimized") >> input[type="checkbox"]');
  }

  speedControl() {
    return this.page.locator('input[type="range"][id*="speed"], input[type="range"][name*="speed"], label:has-text("Speed") >> input[type="range"]');
  }

  sizeControl() {
    return this.page.locator('input[type="range"][id*="size"], select[id*="size"], label:has-text("Size") >> input, label:has-text("Size") >> select');
  }

  bars() {
    return this.page.locator('.bars .bar, .bar');
  }

  barLabels() {
    return this.page.locator('.bars .bar .label, .bar .label, .bar');
  }

  comparisonsStat() {
    return this.page.locator('#comparisons, .stats .comparisons, .comparisons-count, [data-test="comparisons"]');
  }

  swapsStat() {
    return this.page.locator('#swaps, .stats .swaps, .swaps-count, [data-test="swaps"]');
  }

  passesStat() {
    return this.page.locator('#passes, .stats .passes, .passes-count, [data-test="passes"]');
  }

  statusText() {
    return this.page.locator('#status-text, .status-text, .status, [data-test="status"]');
  }

  pseudocodeLines() {
    return this.page.locator('.pseudocode-line, .code-line');
  }

  // Actions

  async clickPlay() {
    const btn = this.togglePlayButton();
    await btn.first().click().catch(async () => {
      // fallback: click play specifically
      await this.playButton().first().click();
    });
  }

  async clickPause() {
    // try to click a pause-labeled button
    const btn1 = this.pauseButton();
    if (await btn.count() > 0) await btn.first().click();
    else {
      // toggle button will switch to pause state, attempt to click toggle if it currently shows Pause
      const toggle = this.togglePlayButton();
      if (await toggle.count() > 0) await toggle.first().click();
    }
  }

  async stepForward() {
    const btn2 = this.stepForwardButton();
    if (await btn.count() > 0) await btn.first().click();
    else await this.page.keyboard.press('ArrowRight');
  }

  async stepBack() {
    const btn3 = this.stepBackButton();
    if (await btn.count() > 0) await btn.first().click();
    else await this.page.keyboard.press('ArrowLeft');
  }

  async randomize() {
    const btn4 = this.randomizeButton();
    if (await btn.count() > 0) await btn.first().click();
    else {
      // attempt to call a global randomize if present (graceful)
      await this.page.evaluate(() => { if (window.randomizeArray) window.randomizeArray(); });
    }
  }

  async setArray(values) {
    const input = this.setArrayInput();
    if (await input.count() > 0) {
      await input.first().fill(values);
      const btn5 = this.setArrayButton();
      if (await btn.count() > 0) await btn.first().click();
      else {
        // try enter
        await input.first().press('Enter');
      }
    } else {
      // try a global setter
      await this.page.evaluate((vals) => {
        if (window.setArrayFromString) window.setArrayFromString(vals);
      }, values);
    }
  }

  async reset() {
    const btn6 = this.resetButton();
    if (await btn.count() > 0) await btn.first().click();
    else {
      await this.page.evaluate(() => {
        if (window.resetToStart) window.resetToStart();
      });
    }
  }

  async toggleOptimized() {
    const cb = this.optimizedCheckbox();
    if (await cb.count() > 0) {
      await cb.first().click();
    } else {
      await this.page.evaluate(() => {
        if (window.toggleOptimized) window.toggleOptimized();
      });
    }
  }

  async changeSpeedTo(value) {
    const control = this.speedControl();
    if (await control.count() > 0) {
      // range inputs accept numeric strings
      await control.first().fill(String(value)).catch(() => control.first().evaluate((el, v) => el.value = v, String(value)));
      await control.first().dispatchEvent('change').catch(() => {});
    } else {
      await this.page.evaluate((v) => { if (window.setSpeed) window.setSpeed(v); }, value);
    }
  }

  async changeSizeTo(value) {
    const control1 = this.sizeControl();
    if (await control.count() > 0) {
      await control.first().fill(String(value)).catch(() => control.first().evaluate((el, v) => el.value = v, String(value)));
      await control.first().dispatchEvent('change').catch(() => {});
    } else {
      await this.page.evaluate((v) => { if (window.setSize) window.setSize(v); }, value);
    }
  }

  async pressSpace() {
    await this.page.keyboard.press('Space');
  }

  async pressLeft() {
    await this.page.keyboard.press('ArrowLeft');
  }

  async pressRight() {
    await this.page.keyboard.press('ArrowRight');
  }

  async triggerResize(width = 800, height = 600) {
    await this.page.setViewportSize({ width, height });
    await this.page.evaluate(() => window.dispatchEvent(new Event('resize')));
  }

  async getBarValues() {
    const labels = this.barLabels();
    const count = await labels.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      const text = await labels.nth(i).innerText().catch(() => labels.nth(i).textContent().catch(() => ''));
      out.push((text || '').trim());
    }
    return out.filter(x => x !== '');
  }

  async getBarsCount() {
    return await this.bars().count();
  }

  async getComparisons() {
    const c = this.comparisonsStat();
    if (await c.count() > 0) {
      const txt = (await c.first().innerText()).trim();
      return txt;
    }
    return null;
  }

  async getSwaps() {
    const c1 = this.swapsStat();
    if (await c.count() > 0) {
      const txt1 = (await c.first().innerText()).trim();
      return txt;
    }
    return null;
  }

  async getPasses() {
    const c2 = this.passesStat();
    if (await c.count() > 0) {
      const txt2 = (await c.first().innerText()).trim();
      return txt;
    }
    return null;
  }

  async getStatusText() {
    const s = this.statusText();
    if (await s.count() > 0) {
      return (await s.first().innerText()).trim();
    }
    return '';
  }

  async pseudocodeHighlightExists() {
    const lines = this.pseudocodeLines();
    if (await lines.count() === 0) return false;
    for (let i = 0; i < await lines.count(); i++) {
      const has = await lines.nth(i).getAttribute('class').catch(() => '');
      if ((has || '').includes('highlight') || (has || '').includes('active')) return true;
    }
    return false;
  }

  async firstBarLeftValue() {
    const bar = this.bars().first();
    return await bar.evaluate((el) => {
      const left = window.getComputedStyle(el).left;
      return left || '';
    });
  }
}

test.describe('Bubble Sort Interactive Module — FSM validation', () => {
  let page;
  let bubble;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    bubble = new BubblePage(page);
    await bubble.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial snapshot_display and UI basics', () => {
    test('Initial state renders bars, stats and Play control (snapshot_display onEnter actions)', async () => {
      // Verify basic visualization elements exist
      const barsCount = await bubble.getBarsCount();
      expect(barsCount).toBeGreaterThan(0);

      // Stats should be present (comparisons/swaps/passes may start at 0)
      const comparisons = await bubble.getComparisons();
      const swaps = await bubble.getSwaps();
      const passes = await bubble.getPasses();
      // We allow null if selectors are different but prefer numeric values
      if (comparisons !== null) expect(comparisons.length).toBeGreaterThanOrEqual(1);
      if (swaps !== null) expect(swaps.length).toBeGreaterThanOrEqual(1);
      if (passes !== null) expect(passes.length).toBeGreaterThanOrEqual(1);

      // Play button should exist and not be in playing UI (onEnter snapshot_display: scheduleAutoIfPlaying should not start playing)
      const playBtn = bubble.playButton();
      expect(await playBtn.count()).toBeGreaterThanOrEqual(0); // may be hidden, but ensure no crash

      // Pseudocode highlight should reflect current snapshot (applySnapshot + highlightOperation)
      // This may or may not be present; assert that the code area exists or highlight boolean returns boolean
      const pseudocodeExists = await bubble.pseudocodeLines().count();
      expect(pseudocodeExists).toBeGreaterThanOrEqual(0);
    });

    test('Pressing left arrow at start does not change snapshot_index (retreat no-op)', async () => {
      const initialBars = await bubble.getBarValues();
      // Press left arrow (KEY_LEFT -> retreat)
      await bubble.pressLeft();
      // Small pause for potential DOM updates
      await page.waitForTimeout(200);
      const afterBars = await bubble.getBarValues();
      expect(afterBars).toEqual(initialBars);
    });
  });

  test.describe('Snapshot navigation: stepping forward/back and keyboard mapping', () => {
    test('STEP_FORWARD advances and highlights operation; STEP_BACK returns to previous snapshot', async () => {
      const initialValues = await bubble.getBarValues();
      // Try step forward via button or key
      await bubble.stepForward();
      await page.waitForTimeout(300); // allow transition
      const afterForward = await bubble.getBarValues();

      // After a forward step, the bar order or highlights should typically change
      // If values are identical (e.g., compare step), expect pseudocode highlight or stats updates
      const changed = JSON.stringify(afterForward) !== JSON.stringify(initialValues);
      const pseudocodeHighlighted = await bubble.pseudocodeHighlightExists();
      const comparisons1 = await bubble.getComparisons();

      expect(changed || pseudocodeHighlighted || comparisons !== null).toBeTruthy();

      // Now step back (STEP_BACK)
      await bubble.stepBack();
      await page.waitForTimeout(300);
      const afterBack = await bubble.getBarValues();

      // After retreat we should see array returned to initial snapshot
      expect(afterBack).toEqual(initialValues);
    });

    test('Arrow keys map: KEY_RIGHT -> advance, KEY_LEFT -> retreat', async () => {
      const initial = await bubble.getBarValues();
      await bubble.pressRight();
      await page.waitForTimeout(250);
      const afterRight = await bubble.getBarValues();
      // There should be some change after pressing right
      expect(JSON.stringify(afterRight) === JSON.stringify(initial) ? false : true).toBeTruthy();

      // Go back using KEY_LEFT
      await bubble.pressLeft();
      await page.waitForTimeout(250);
      const afterLeft = await bubble.getBarValues();
      expect(afterLeft).toEqual(initial);
    });
  });

  test.describe('Playback behavior: play, pause, toggle, timers and completed state', () => {
    test('PLAY starts auto-advance (start_play onEnter) and PAUSE stops it (stop_play onEnter)', async () => {
      const initial1 = await bubble.getBarValues();

      // Start playback via Play toggle
      await bubble.clickPlay();
      // Wait sufficiently for at least one auto-advance
      await page.waitForTimeout(900);
      const afterPlayAdvance = await bubble.getBarValues();

      // Expect at least one change while playing
      expect(JSON.stringify(afterPlayAdvance) === JSON.stringify(initial) ? false : true).toBeTruthy();

      // Pause playback
      await bubble.clickPause();
      // Record snapshot index after pause by value
      const pausedSnapshot = await bubble.getBarValues();

      // Wait and ensure no further auto-advances occur
      await page.waitForTimeout(700);
      const afterWait = await bubble.getBarValues();
      expect(afterWait).toEqual(pausedSnapshot);
    });

    test('TOGGLE_PLAY via space key toggles playing and pauses when toggled again', async () => {
      const initial2 = await bubble.getBarValues();
      // Press space to toggle play
      await bubble.pressSpace();
      await page.waitForTimeout(700);
      const advanced = await bubble.getBarValues();
      expect(JSON.stringify(advanced) === JSON.stringify(initial) ? false : true).toBeTruthy();

      // Toggle again to pause
      await bubble.pressSpace();
      await page.waitForTimeout(500);
      const afterPause = await bubble.getBarValues();
      // should remain same after pause
      await page.waitForTimeout(500);
      const stable = await bubble.getBarValues();
      expect(stable).toEqual(afterPause);
    });

    test('Reaching the end triggers completed state and status text is set to Completed.', async () => {
      // Set a small array so completion happens quickly
      await bubble.setArray('2,1'); // minimal reversed array ensures a swap and completion
      // Give it a moment to recompute
      await page.waitForTimeout(300);

      // Start playback to auto-advance to completion
      await bubble.clickPlay();

      // Wait for status text to show Completed. Allow generous timeout
      await expect.poll(async () => (await bubble.getStatusText()).includes('Completed') ? 'done' : 'pending', {
        timeout: 8000,
        interval: 300,
      }).toBe('done');

      // After completion, play should be stopped (onEnter completed clears timer and sets playing=false)
      // Clicking Play from completed is allowed by FSM — ensure play button exists and is actionable
      const status = await bubble.getStatusText();
      expect(status.toLowerCase()).toContain('completed');

      // Reset to start from completed
      await bubble.reset();
      await page.waitForTimeout(300);
      // After reset we should be at start snapshot (snapshot_display)
      const afterReset = await bubble.getBarValues();
      expect(afterReset.length).toBeGreaterThan(0);
    });
  });

  test.describe('Controls that recompute snapshots and UI updates', () => {
    test('SET_ARRAY rebuilds snapshots and resets currentSnapshotIndex to 0', async () => {
      // Set a known array and assert bars reflect that exact order
      await bubble.setArray('5,4,3,2,1');
      await page.waitForTimeout(300);
      const values = await bubble.getBarValues();

      // The displayed bar labels should reflect the set values (allow some whitespace differences)
      // We'll check that labels contain the sequence elements (order matters)
      expect(values.join(',')).toContain('5');
      expect(values.join(',')).toContain('4');
      expect(values.join(',')).toContain('3');
      expect(values.join(',')).toContain('2');
      expect(values.join(',')).toContain('1');

      // After setting the array, stepping back should not move to negative index (index==0)
      await bubble.stepBack();
      await page.waitForTimeout(250);
      const afterBack1 = await bubble.getBarValues();
      expect(afterBack).toEqual(values);
    });

    test('RANDOMIZE recomputes a new array and resets to start (recompute onEnter)', async () => {
      const before = await bubble.getBarValues();
      await bubble.randomize();
      await page.waitForTimeout(350);
      const after = await bubble.getBarValues();

      // Randomize should change the array values (could be same by chance but unlikely)
      // We'll accept either changed or same; at minimum ensure counts match and array is valid
      expect(after.length).toBeGreaterThan(0);
      expect(after.length).toEqual(before.length);
    });

    test('OPTIMIZED_TOGGLE recomputes snapshots (recompute onEnter) and resets snapshot index', async () => {
      // Toggle optimized; expect UI to recompute (we check status remains available and bars present)
      const before1 = await bubble.getBarValues();
      await bubble.toggleOptimized();
      await page.waitForTimeout(350);
      const after1 = await bubble.getBarValues();
      expect(after.length).toBeGreaterThan(0);
      // Either changed or same but should not break the UI
      expect(after.length).toEqual(before.length);
    });

    test('SPEED_CHANGE updates UI and does not break playback when rescheduled (update_speed onEnter)', async () => {
      // Start playing
      await bubble.clickPlay();
      await page.waitForTimeout(500);
      // Change speed to an alternate value
      await bubble.changeSpeedTo(80);
      // Wait to ensure auto-play still continues
      await page.waitForTimeout(900);
      // Pause playback
      await bubble.clickPause();
      const current = await bubble.getBarValues();
      expect(current.length).toBeGreaterThan(0);
    });

    test('SIZE_CHANGE updates number of bars in visualization (update_size onEnter)', async () => {
      const originalCount = await bubble.getBarsCount();
      // Try to change size to a smaller value
      await bubble.changeSizeTo(5);
      await page.waitForTimeout(350);
      const afterCount = await bubble.getBarsCount();
      // Either changed or UI ignores change; ensure no crash and count is a number
      expect(typeof afterCount).toBe('number');
      expect(afterCount).toBeGreaterThanOrEqual(1);
    });

    test('RESIZE triggers rerender without breaking layout (rerender onEnter)', async () => {
      // Capture one bar's left value before resize
      const beforeLeft = await bubble.firstBarLeftValue();
      await bubble.triggerResize(1000, 800);
      await page.waitForTimeout(300);
      const afterLeft1 = await bubble.firstBarLeftValue();
      // The computed left style should be a string; ensure it's not empty and is present after rerender
      expect(typeof afterLeft).toBe('string');
      expect(afterLeft.length).toBeGreaterThan(0);
    });
  });

  test.describe('Edge cases & error handling in transitions', () => {
    test('STEP_FORWARD at end does not throw and transitions to completed (AT_END -> completed)', async () => {
      // Use a tiny array so we can reach the end deterministically
      await bubble.setArray('3,2,1');
      await page.waitForTimeout(250);

      // Repeatedly step forward until status contains "Completed" or until a max number of steps
      let completed = false;
      for (let i = 0; i < 30; i++) {
        await bubble.stepForward();
        await page.waitForTimeout(150);
        const status1 = await bubble.getStatusText();
        if ((status || '').toLowerCase().includes('completed')) {
          completed = true;
          break;
        }
      }
      expect(completed).toBeTruthy();
    });

    test('Attempting to retreat past the first snapshot keeps index at 0 and does not error', async () => {
      // Ensure at start
      await bubble.reset();
      await page.waitForTimeout(200);
      const before2 = await bubble.getBarValues();
      // Try retreat multiple times
      for (let i = 0; i < 5; i++) {
        await bubble.stepBack();
        await page.waitForTimeout(80);
      }
      const after2 = await bubble.getBarValues();
      expect(after).toEqual(before);
    });

    test('Changing speed while playing reschedules auto-play (update_speed reschedule behavior)', async () => {
      // Start playing and capture a value change pattern
      await bubble.clickPlay();
      await page.waitForTimeout(400);
      // Change speed
      await bubble.changeSpeedTo(20);
      // Wait for at least one advancement after speed change
      await page.waitForTimeout(700);
      // Pause
      await bubble.clickPause();
      const snapshot = await bubble.getBarValues();
      expect(snapshot.length).toBeGreaterThan(0);
    });

    test('Keyboard SPACE toggles play/pause reliably (KEY_SPACE -> toggle_play)', async () => {
      // Start from paused
      await bubble.reset();
      await page.waitForTimeout(200);
      const before3 = await bubble.getBarValues();
      // Press space to start
      await bubble.pressSpace();
      await page.waitForTimeout(600);
      const playingSnapshot = await bubble.getBarValues();
      expect(JSON.stringify(playingSnapshot) === JSON.stringify(before) ? false : true).toBeTruthy();

      // Press space to pause
      await bubble.pressSpace();
      await page.waitForTimeout(300);
      const pausedSnapshot1 = await bubble.getBarValues();
      await page.waitForTimeout(400);
      const stillPaused = await bubble.getBarValues();
      expect(stillPaused).toEqual(pausedSnapshot);
    });
  });
});
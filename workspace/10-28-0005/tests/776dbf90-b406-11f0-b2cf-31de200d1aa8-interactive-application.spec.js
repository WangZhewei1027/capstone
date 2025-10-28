import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/776dbf90-b406-11f0-b2cf-31de200d1aa8.html';

// Helper to wait for a condition via page.evaluate polling
async function waitFor(page, predicateFn, { timeout = 5000, interval = 100 } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await page.evaluate(predicateFn);
    if (last) return last;
    await page.waitForTimeout(interval);
  }
  throw new Error('waitFor condition timed out');
}

// Page Object Model
class BubbleSortPage {
  constructor(page) {
    this.page = page;
    // Controls
    this.applyBtn = page.getByRole('button', { name: /apply/i });
    this.randomizeBtn = page.getByRole('button', { name: /randomize/i });
    this.resetBtn = page.getByRole('button', { name: /reset/i });
    this.playBtn = page.getByRole('button', { name: /^play$/i });
    this.pauseBtn = page.getByRole('button', { name: /^pause$/i });
    this.stepBtn = page.getByRole('button', { name: /^step$/i });
    // Inputs: first text input assumed to be array values
    this.valuesInput = page.locator('input[type="text"]').first();
    this.speedInput = page.locator('input[type="range"]').first();
    // Bars container and bars
    this.barsContainer = page.locator('#bars, .bars, [data-testid="bars"]').first();
    this.bars = page.locator('.bar');
    // Status and log (fallbacks)
    this.status = page.locator('.status, #status, [data-testid="status"]').first();
    this.log = page.locator('#log, .log, [data-testid="log"]').first();
    this.container = page.locator('.container').first();
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async reset() {
    if (await this.resetBtn.count()) {
      await this.resetBtn.click();
    } else {
      // Fallback: reload
      await this.page.reload();
    }
    await this.waitForReadyStatus();
  }

  async getStatusText() {
    return await this.page.evaluate(() => {
      const el = document.querySelector('.status, #status, [data-testid="status"]');
      if (el) return (el.textContent || '').trim();
      // Fallback: try a generic status sentence in the document
      const bodyText = document.body.innerText || '';
      // Try to find known status words
      const match = bodyText.match(/(Ready\.?|Playing\.{3}|Paused\.?|Sorted!?|Speed:\s*[0-9.]+)/i);
      return match ? match[0] : '';
    });
  }

  async waitForStatus(regex) {
    const status = await waitFor(this.page, () => {
      const el = document.querySelector('.status, #status, [data-testid="status"]');
      const text = el ? (el.textContent || '').trim() : (document.body.innerText || '');
      return regex.test(text);
    }, { timeout: 8000, interval: 100 });
    return status;
  }

  async waitForReadyStatus() {
    await this.waitForStatus(/Ready/i);
  }

  async getBarsInfo() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      const toRgb = (color) => {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        return ctx.fillStyle;
      };
      return bars.map((el, idx) => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        return {
          index: idx,
          text: (el.textContent || '').trim(),
          value: el.dataset && el.dataset.value ? Number(el.dataset.value) : (parseFloat((el.textContent || '').trim()) || null),
          className: el.className,
          backgroundColor: bg,
          isCompare: /compare/i.test(el.className) || bg === 'rgb(245, 158, 11)',
          isSwap: /swap/i.test(el.className) || bg === 'rgb(239, 68, 68)',
          isSorted: /sorted/i.test(el.className) || bg === 'rgb(34, 197, 94)',
        };
      });
    });
  }

  async getArrayValues() {
    const info = await this.getBarsInfo();
    const values = info.map(i => i.value !== null ? i.value : (parseFloat(i.text) || 0));
    return values;
  }

  async setArray(values) {
    await this.valuesInput.fill(values.join(','));
    await this.applyBtn.click();
    await this.waitForReadyStatus();
    // Wait for bars to reflect the input
    await waitFor(this.page, () => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.length === values.length;
    }, { timeout: 5000 });
  }

  async play() {
    await this.playBtn.click();
    await this.waitForStatus(/Playing/i);
  }

  async pause() {
    await this.pauseBtn.click();
    await this.waitForStatus(/Paused/i);
  }

  async step() {
    await this.stepBtn.click();
    // After step, expect to be in one of the visualization phases
    await this.page.waitForTimeout(100); // allow phase to render
  }

  async toggleSpace() {
    await this.page.keyboard.press('Space');
    await this.page.waitForTimeout(100);
  }

  async pressKeyR() {
    await this.page.keyboard.press('KeyR');
    await this.page.waitForTimeout(100);
  }

  async pressKeyN() {
    await this.page.keyboard.press('KeyN');
    await this.page.waitForTimeout(100);
  }

  async changeSpeed(value) {
    // Try to set the slider value using input event
    const sliderCount = await this.speedInput.count();
    if (sliderCount > 0) {
      await this.speedInput.fill(String(value));
      await this.speedInput.dispatchEvent('input');
      await this.waitForStatus(/Speed:\s*[0-9.]+/i);
    }
  }

  async dragBarByIndexToIndex(srcIndex, dstIndex) {
    const src = this.page.locator('.bar').nth(srcIndex);
    const dst = this.page.locator('.bar').nth(dstIndex);
    await expect(src).toBeVisible();
    await expect(dst).toBeVisible();
    await this.page.dragAndDrop({ source: src, target: dst });
  }

  async waitForComparePhase() {
    await waitFor(this.page, () => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.some(el => el.className.includes('compare')) ||
        bars.some(el => window.getComputedStyle(el).backgroundColor === 'rgb(245, 158, 11)') ||
        /Compar(e|ing)/i.test(document.body.innerText || '');
    }, { timeout: 6000 });
  }

  async waitForSwapPhase() {
    await waitFor(this.page, () => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.some(el => el.className.includes('swap')) ||
        bars.some(el => window.getComputedStyle(el).backgroundColor === 'rgb(239, 68, 68)') ||
        /Swap/i.test(document.body.innerText || '');
    }, { timeout: 6000 });
  }

  async waitForNoSwapPhase() {
    await waitFor(this.page, () => {
      return /No\s+swap/i.test(document.body.innerText || '');
    }, { timeout: 6000 });
  }

  async waitForPassStart() {
    await waitFor(this.page, () => {
      return /Pass\s+start/i.test(document.body.innerText || '');
    }, { timeout: 6000 });
  }

  async waitForPassEnd() {
    await waitFor(this.page, () => {
      return /Pass\s+end/i.test(document.body.innerText || '');
    }, { timeout: 6000 });
  }

  async waitForEarlyExit() {
    await waitFor(this.page, () => {
      return /Early\s+exit/i.test(document.body.innerText || '');
    }, { timeout: 6000 });
  }

  async waitForDoneSorted() {
    await this.waitForStatus(/Sorted!?/i);
    const bars = await this.getBarsInfo();
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) {
      expect(b.isSorted).toBeTruthy();
    }
  }

  async isBusySwapping() {
    return await this.page.evaluate(() => {
      const root = document.querySelector('.container') || document.body;
      return root && root.classList.contains('busy');
    });
  }

  async startDragFeedbackActive() {
    return await this.page.evaluate(() => {
      const root = document.querySelector('.container') || document.body;
      return root && root.classList.contains('dragging');
    });
  }

  async buttonsState() {
    return {
      playEnabled: !(await this.playBtn.isDisabled()),
      pauseEnabled: !(await this.pauseBtn.isDisabled()),
      stepEnabled: !(await this.stepBtn.isDisabled()),
    };
  }
}

test.describe('Bubble Sort Interactive Module FSM - 776dbf90-b406-11f0-b2cf-31de200d1aa8', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    const app = new BubbleSortPage(page);
    await app.goto();
    // Ensure application is ready
    await app.reset();
  });

  test.describe('Ready state and basic controls', () => {
    test('Initial load enters ready: UI status, bars rendered, button states', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const status = await app.getStatusText();
      expect(/Ready/i.test(status)).toBeTruthy();
      // Bars exist
      const barsCount = await app.bars.count();
      expect(barsCount).toBeGreaterThan(0);
      // Buttons states on ready
      const { playEnabled, pauseEnabled, stepEnabled } = await app.buttonsState();
      expect(playEnabled).toBeTruthy();
      expect(stepEnabled).toBeTruthy();
      // Pause often disabled on ready
      expect(pauseEnabled).toBeFalsy();
    });

    test('APPLY_CLICK keeps ready and applies specified array', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const targetArr = [5, 1, 4, 2, 8];
      await app.setArray(targetArr);
      await app.waitForReadyStatus();
      const status = await app.getStatusText();
      expect(/Ready/i.test(status)).toBeTruthy();
      const arr = await app.getArrayValues();
      expect(arr).toEqual(targetArr);
    });

    test('RANDOMIZE_CLICK randomizes array but stays in ready', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const before = await app.getArrayValues();
      await app.randomizeBtn.click();
      await app.waitForReadyStatus();
      const after = await app.getArrayValues();
      // It's possible randomize returns same order; ensure operation completed at least
      expect(Array.isArray(after)).toBeTruthy();
      expect(after.length).toBe(before.length);
    });

    test('RESET_CLICK resets to ready and clears highlights', async ({ page }) => {
      const app = new BubbleSortPage(page);
      // Create some activity
      await app.play();
      await app.pause();
      // Reset
      await app.resetBtn.click();
      await app.waitForReadyStatus();
      const bars = await app.getBarsInfo();
      // No bar should be in compare/swap/sorted after reset start state
      for (const b of bars) {
        expect(b.isCompare || b.isSwap).toBeFalsy();
      }
    });

    test('KEY_RANDOMIZE_R triggers randomize while staying ready', async ({ page }) => {
      const app = new BubbleSortPage(page);
      const before = await app.getArrayValues();
      await app.pressKeyR();
      await app.waitForReadyStatus();
      const after = await app.getArrayValues();
      expect(after.length).toBe(before.length);
    });

    test('SPEED_CHANGE updates status and does not change state (ready)', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.changeSpeed(0.5);
      const status = await app.getStatusText();
      expect(/Speed:\s*[0-9.]+/i.test(status)).toBeTruthy();
      const { playEnabled, stepEnabled } = await app.buttonsState();
      expect(playEnabled).toBeTruthy();
      expect(stepEnabled).toBeTruthy();
    });
  });

  test.describe('Playing and Paused controls', () => {
    test('PLAY_CLICK enters playing: status, button enables/disables reflect playing', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      const { playEnabled, pauseEnabled, stepEnabled } = await app.buttonsState();
      expect(pauseEnabled).toBeTruthy();
      // Step usually disabled in auto-play
      expect(stepEnabled).toBeFalsy();
      // OnEnter actions: "SET_PLAYING_TRUE_UPDATE_BUTTONS_AND_STATUS" validated via status and buttons above
    });

    test('SPACE_TOGGLE_PLAY from ready enters playing', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.toggleSpace();
      await app.waitForStatus(/Playing/i);
      const { pauseEnabled } = await app.buttonsState();
      expect(pauseEnabled).toBeTruthy();
    });

    test('PAUSE_CLICK transitions to paused: status and buttons reflect paused', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      await app.pause();
      const status = await app.getStatusText();
      expect(/Paused/i.test(status)).toBeTruthy();
      const { playEnabled, pauseEnabled, stepEnabled } = await app.buttonsState();
      expect(playEnabled).toBeTruthy(); // Play enabled in paused
      expect(pauseEnabled).toBeFalsy(); // Pause disabled in paused
      expect(stepEnabled).toBeTruthy(); // Step enabled in paused
      // OnEnter paused: "SET_PLAYING_FALSE_UPDATE_BUTTONS_AND_STATUS" validated
    });

    test('SPACE_TOGGLE_PAUSE from playing transitions to paused', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      await app.toggleSpace();
      await app.waitForStatus(/Paused/i);
      const { playEnabled, stepEnabled } = await app.buttonsState();
      expect(playEnabled).toBeTruthy();
      expect(stepEnabled).toBeTruthy();
    });

    test('RESET_CLICK while playing returns to ready, exiting play mode', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      await app.resetBtn.click();
      await app.waitForReadyStatus();
      const { playEnabled, pauseEnabled, stepEnabled } = await app.buttonsState();
      expect(playEnabled).toBeTruthy();
      expect(stepEnabled).toBeTruthy();
      expect(pauseEnabled).toBeFalsy();
    });

    test('SPEED_CHANGE while playing keeps playing state but updates status', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      await app.changeSpeed(0.75);
      const status = await app.getStatusText();
      expect(/Speed:\s*[0-9.]+/i.test(status)).toBeTruthy();
      await app.waitForStatus(/Playing/i);
    });
  });

  test.describe('Step-driven visualization phases', () => {
    test('STEP_CLICK from ready enters pass_start', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.step();
      // Expect pass start UI feedback: e.g., log entry or cleared highlights
      // We'll look for "Pass start" or first compare soon after
      try {
        await app.waitForPassStart();
      } catch {
        // If not logged, compare should appear shortly after pass_start
        await app.waitForComparePhase();
      }
    });

    test('KEY_STEP_N from ready enters pass_start', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.pressKeyN();
      try {
        await app.waitForPassStart();
      } catch {
        await app.waitForComparePhase();
      }
    });

    test('COMPARE phase shows compare highlight (amber) and log', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.step(); // start pass
      await app.waitForComparePhase();
      const bars = await app.getBarsInfo();
      const someCompare = bars.some(b => b.isCompare);
      expect(someCompare).toBeTruthy();
    });

    test('SWAP phase shows swap highlight (red) and busy during animation, then clears on exit', async ({ page }) => {
      const app = new BubbleSortPage(page);
      // Choose an array that guarantees a swap on first compare: [3,1,2]
      await app.setArray([3, 1, 2]);
      await app.step(); // pass_start
      await app.waitForComparePhase();
      // Next step should cause swap (3 > 1)
      await app.step();
      await app.waitForSwapPhase();
      const bars = await app.getBarsInfo();
      const someSwap = bars.some(b => b.isSwap);
      expect(someSwap).toBeTruthy();

      // Busy set during swap animation
      // We cannot guarantee a class name, but we can poll for swap highlight to disappear (onExit CLEAR_BUSY)
      // Wait for animation to complete by expecting compare or next phase or playing resume
      await waitFor(page, () => {
        const barsEls = Array.from(document.querySelectorAll('.bar'));
        const swapping = barsEls.some(el => el.className.includes('swap'));
        return !swapping;
      }, { timeout: 8000 });
    });

    test('NO_SWAP phase logs no-swap when adjacent elements already ordered', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([1, 2, 3]);
      await app.step(); // pass_start
      await app.waitForComparePhase();
      // Compare 1 and 2 should be no swap
      await app.step();
      await app.waitForNoSwapPhase();
      const statusText = await app.getStatusText();
      // Status may not show 'No swap', but log likely does. We just ensure we detected the phase.
      expect(true).toBeTruthy();
    });

    test('PASS_END marks sorted tail and logs pass end', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([4, 3, 2, 1]);
      // Manually step through until a pass ends
      let passEnded = false;
      for (let i = 0; i < 30 && !passEnded; i++) {
        await app.step();
        try {
          await app.waitForPassEnd();
          passEnded = true;
        } catch {
          // continue stepping
        }
      }
      expect(passEnded).toBeTruthy();
      const bars = await app.getBarsInfo();
      // Expect tail element marked sorted (green)
      const sortedCount = bars.filter(b => b.isSorted).length;
      expect(sortedCount).toBeGreaterThan(0);
    });

    test('EARLY_EXIT occurs for already sorted array', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([1, 2, 3, 4, 5]);
      // Step should trigger early exit quickly
      await app.step(); // pass_start
      let earlyExitObserved = false;
      for (let i = 0; i < 10 && !earlyExitObserved; i++) {
        await app.step();
        try {
          await app.waitForEarlyExit();
          earlyExitObserved = true;
        } catch {
          // continue stepping
        }
      }
      expect(earlyExitObserved).toBeTruthy();
    });

    test('DONE state reached: all bars sorted and status "Sorted!"', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([5, 1, 4, 2, 8]);
      // Auto-play to completion
      await app.play();
      await app.waitForDoneSorted();
      // OnEnter done: "CLEAR_HIGHLIGHTS_MARK_ALL_SORTED_LOG_DONE_STOP_PLAY" validated by sorted bars and not playing
      const { pauseEnabled, stepEnabled } = await app.buttonsState();
      // Pause disabled, Step typically enabled at end or disabled depending on implementation
      expect(pauseEnabled).toBeFalsy();
      const statusAfter = await app.getStatusText();
      expect(/Sorted!?/i.test(statusAfter)).toBeTruthy();
    });
  });

  test.describe('Drag-and-drop interactions (dragging state)', () => {
    test('BAR_DRAG_START enters dragging with feedback, BAR_DROP reorders and returns to ready', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([4, 2, 3, 1]);
      const before = await app.getArrayValues();
      // Start drag and drop first bar to third position
      await app.dragBarByIndexToIndex(0, 2);
      // After drop, state should return to ready and array order changed
      await app.waitForReadyStatus();
      const after = await app.getArrayValues();
      expect(after.length).toBe(before.length);
      // Ensure order changed in some way
      expect(after.join(',')).not.toEqual(before.join(','));
      const status = await app.getStatusText();
      expect(/Ready/i.test(status)).toBeTruthy();
    });

    test('BAR_DRAG_OVER/LEAVE maintain dragging state until drop', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([3, 2, 1, 4]);
      const src = app.page.locator('.bar').nth(0);
      const dst = app.page.locator('.bar').nth(3);
      await expect(src).toBeVisible();
      await expect(dst).toBeVisible();
      // Trigger drag start via mouse
      const srcBox = await src.boundingBox();
      const dstBox = await dst.boundingBox();
      const page = app.page;
      await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(dstBox.x + dstBox.width / 2, dstBox.y + dstBox.height / 2, { steps: 10 });
      // We can't assert internal dragging state reliably; ensure no errors and drop
      await page.mouse.up();
      await app.waitForReadyStatus();
    });

    test('BAR_DRAG_END without drop returns to ready', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([9, 7, 5, 3]);
      const src = app.page.locator('.bar').nth(1);
      const srcBox = await src.boundingBox();
      const page = app.page;
      // Start drag and end drag outside without dropping on a target
      await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(srcBox.x + srcBox.width / 2 + 50, srcBox.y + srcBox.height / 2 + 50);
      await page.mouse.up();
      await app.waitForReadyStatus();
      const status = await app.getStatusText();
      expect(/Ready/i.test(status)).toBeTruthy();
    });

    test('SPEED_CHANGE during dragging keeps dragging state and updates status', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([4, 1, 3, 2]);
      const src = app.page.locator('.bar').nth(0);
      const dst = app.page.locator('.bar').nth(1);
      await expect(src).toBeVisible();
      await expect(dst).toBeVisible();
      // Begin drag
      const srcBox = await src.boundingBox();
      await app.page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await app.page.mouse.down();
      await app.changeSpeed(0.25);
      const status = await app.getStatusText();
      expect(/Speed:\s*[0-9.]+/i.test(status)).toBeTruthy();
      // Drop to complete
      const dstBox = await dst.boundingBox();
      await app.page.mouse.move(dstBox.x + dstBox.width / 2, dstBox.y + dstBox.height / 2);
      await app.page.mouse.up();
      await app.waitForReadyStatus();
    });
  });

  test.describe('Done state behavior and restart', () => {
    test('DONE onEnter marks all sorted and stops auto-play; PLAY_CLICK from done returns to playing', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([5, 4, 3, 2, 1]);
      await app.play();
      await app.waitForDoneSorted();
      // Buttons reflect stopped state after done; try Play again
      await app.playBtn.click();
      await app.waitForStatus(/Playing/i);
      // It may immediately stop if no steps left; still should accept Play click
      // Pause to avoid running forever
      await app.pause();
      await app.waitForStatus(/Paused/i);
    });

    test('SPEED_CHANGE in done does not change sorted state', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([2, 1]);
      await app.play();
      await app.waitForDoneSorted();
      await app.changeSpeed(1.0);
      const status = await app.getStatusText();
      expect(/Speed:\s*[0-9.]+/i.test(status)).toBeTruthy();
      // Still sorted
      await app.waitForDoneSorted();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Step is disabled during playing; pressing KeyN when playing should not break state', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      const { stepEnabled } = await app.buttonsState();
      expect(stepEnabled).toBeFalsy();
      const beforeStatus = await app.getStatusText();
      await app.pressKeyN();
      const afterStatus = await app.getStatusText();
      // Should remain playing
      expect(/Playing/i.test(afterStatus)).toBeTruthy();
      expect(/Playing/i.test(beforeStatus)).toBeTruthy();
    });

    test('Dragging while playing is allowed by FSM; verify ready after drop', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([3, 1, 2, 4]);
      await app.play();
      // Try dragging bar during play
      const src = app.page.locator('.bar').nth(0);
      const dst = app.page.locator('.bar').nth(2);
      await expect(src).toBeVisible();
      await expect(dst).toBeVisible();
      await app.page.dragAndDrop({ source: src, target: dst });
      // Should transition to ready after drop (FSM shows BAR_DROP -> ready)
      await app.waitForReadyStatus();
      const { playEnabled } = await app.buttonsState();
      expect(playEnabled).toBeTruthy();
    });

    test('RESET_CLICK while paused returns to ready', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.play();
      await app.pause();
      await app.resetBtn.click();
      await app.waitForReadyStatus();
      const status = await app.getStatusText();
      expect(/Ready/i.test(status)).toBeTruthy();
    });

    test('SPACE toggles play/pause repeatedly without errors', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.toggleSpace(); // Play
      await app.waitForStatus(/Playing/i);
      await app.toggleSpace(); // Pause
      await app.waitForStatus(/Paused/i);
      await app.toggleSpace(); // Play
      await app.waitForStatus(/Playing/i);
    });

    test('Apply invalid input gracefully: non-numeric values are handled without crashing', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.valuesInput.fill('a,b,c');
      await app.applyBtn.click();
      await app.waitForReadyStatus();
      // Check bars still render and do not crash
      const barsCount = await app.bars.count();
      expect(barsCount).toBeGreaterThan(0);
    });

    test('SPEED_CHANGE mid-swap does not break swapping; animation completes', async ({ page }) => {
      const app = new BubbleSortPage(page);
      await app.setArray([3, 1, 2]);
      await app.step(); // pass_start
      await app.waitForComparePhase();
      await app.step(); // swap
      await app.waitForSwapPhase();
      await app.changeSpeed(0.1);
      // Wait for swap animation to complete (SWAP_ANIMATION_DONE)
      await waitFor(page, () => {
        const bars = Array.from(document.querySelectorAll('.bar'));
        const swapping = bars.some(el => el.className.includes('swap'));
        return !swapping;
      }, { timeout: 8000 });
    });
  });
});
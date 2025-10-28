import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/c66e0a40-b402-11f0-bdbc-23fe6fc76a5e.html';

class AppPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for bars to be rendered
    const bars = this.getBars();
    await expect(bars.first()).toBeVisible();
  }

  // Generic helpers for finding common controls with resilient selectors
  playButton() {
    return this.page.getByRole('button', { name: /Play|Pause/i }).first();
  }
  stepButton() {
    return this.page.getByRole('button', { name: /Step|Next/i }).first();
  }
  randomizeButton() {
    return this.page.getByRole('button', { name: /Randomize|Shuffle/i }).first();
  }
  resetButton() {
    return this.page.getByRole('button', { name: /Reset/i }).first();
  }
  speedSlider() {
    // Try labeled slider first, fallback to any range input
    const labeled = this.page.getByLabel(/Speed/i).or(this.page.locator('input[type="range"]'));
    return labeled.first();
  }
  numbersInput() {
    // Try labeled field for custom dataset. Fallback to any text input in controls panel.
    const labeled = this.page.getByLabel(/Numbers|Dataset|Values|Array/i);
    const textInput = this.page.locator('input[type="text"]');
    return labeled.count().then(count => count > 0 ? labeled.first() : textInput.first());
  }
  countInput() {
    const labeled = this.page.getByLabel(/Count|Bars|Length|Size/i);
    const numberInput = this.page.locator('input[type="number"]');
    return labeled.count().then(count => count > 0 ? labeled.first() : numberInput.first());
  }
  statusRegion() {
    // Try ARIA status region first, fallback to aria-live or a known id/class.
    const status = this.page.getByRole('status').or(this.page.locator('[aria-live="polite"], [aria-live="assertive"], #status, .status').first());
    return status;
  }
  pseudoLine(n) {
    // Try common pseudo-code line element selectors
    const candidate = this.page.locator(
      `[data-line="${n}"], [data-pseudo-line="${n}"], [data-pseudo="${n}"], .pseudo li:nth-child(${n}), .pseudocode li:nth-child(${n}), .code li:nth-child(${n})`
    ).first();
    return candidate;
  }

  getBars() {
    // Resilient selector set for bars
    return this.page.locator(':is(.bar, .bars .bar, [data-bar], .bar-item)');
  }
  getBarValuesLocator() {
    // Values might exist as labels, aria-labels, data-value, or height. We'll read them via evaluate.
    return this.getBars();
  }

  async getBarValues() {
    return this.page.$$eval(':is(.bar, .bars .bar, [data-bar], .bar-item)', nodes => {
      const parseValue = (el) => {
        // Try data-value first
        const dv = el.getAttribute('data-value');
        if (dv && /^\d+$/.test(dv)) return parseInt(dv, 10);
        // Try aria-label containing value (e.g., "Value: 42")
        const al = el.getAttribute('aria-label');
        if (al) {
          const m = al.match(/(\d+)/);
          if (m) return parseInt(m[1], 10);
        }
        // Try innerText numeric content
        const txt = (el.textContent || '').trim();
        const m2 = txt.match(/(\d+)/);
        if (m2) return parseInt(m2[1], 10);
        // Fallback to height-based mapping (assume heights correlate to values)
        const h = el.offsetHeight || el.clientHeight;
        return Math.round(h);
      };
      return nodes.map(parseValue);
    });
  }

  barsWithClass(cls) {
    return this.page.locator(`:is(.bar, .bars .bar, [data-bar], .bar-item).${cls}`);
  }

  async isPlaying() {
    const btn = this.playButton();
    // aria-pressed or text 'Pause' indicates playing
    const pressed = await btn.getAttribute('aria-pressed');
    const txt = await btn.innerText();
    return (pressed === 'true') || /Pause/i.test(txt);
  }

  async togglePlay() {
    await this.playButton().click();
  }

  async pressSpace() {
    await this.page.keyboard.press('Space');
  }
  async pressArrowRight() {
    await this.page.keyboard.press('ArrowRight');
  }
  async pressKeyR() {
    await this.page.keyboard.press('KeyR');
  }
  async pressKeyS() {
    await this.page.keyboard.press('KeyS');
  }
  async setSpeedToMax() {
    const slider = await this.speedSlider();
    await slider.focus();
    // Try to set to max via keyboard; also direct set via evaluate if needed
    await slider.press('End').catch(() => {});
    // As a fallback, set value via evaluate
    try {
      const handle = await slider.elementHandle();
      await this.page.evaluate(el => { el.value = el.max || el.value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, handle);
    } catch {}
  }
  async getRootCSSVar(varName) {
    return await this.page.evaluate(name => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), varName);
  }

  async applyCustomDataset(value) {
    const input = await this.numbersInput();
    await input.fill(value);
    await input.press('Enter');
  }

  async waitForComparing(timeout = 3000) {
    await this.barsWithClass('comparing').first().waitFor({ state: 'visible', timeout });
  }

  async waitForToSwap(timeout = 3000) {
    await this.barsWithClass('to-swap').first().waitFor({ state: 'visible', timeout });
  }

  async waitForSwapping(timeout = 3000) {
    await this.barsWithClass('swapping').first().waitFor({ state: 'visible', timeout });
  }

  async waitForNoSwapping(timeout = 3000) {
    await this.page.waitForFunction(() => {
      const sel = document.querySelectorAll('.swapping, .bars .swapping, [data-bar].swapping, .bar-item.swapping');
      return sel.length === 0;
    }, { timeout });
  }

  async waitForReadyStatus(timeout = 3000) {
    const status = this.statusRegion();
    await expect(status).toBeVisible({ timeout });
    await expect(status).toHaveText(/Ready|Press Play|Step/i, { timeout });
  }

  async waitForDoneStatus(timeout = 10000) {
    const status = this.statusRegion();
    await expect(status).toBeVisible({ timeout });
    await expect(status).toHaveText(/Done|Array is sorted/i, { timeout });
  }

  async allBarsSorted() {
    const bars = this.getBars();
    const count = await bars.count();
    if (count === 0) return false;
    const sortedCount = await this.barsWithClass('sorted').count();
    return sortedCount === count;
  }

  async emulateReducedMotion(reduce = true) {
    await this.page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
  }
}

// Setup and teardown
test.describe('Bubble Sort — Hands-on Interactive Explorer E2E', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    // After init_app, INIT_COMPLETE → ready
    await app.waitForReadyStatus();
    // Ready state UI sanity checks
    await expect(app.playButton()).toHaveText(/Play/i);
    await expect(app.barsWithClass('comparing')).toHaveCount(0);
    await expect(app.barsWithClass('swapping')).toHaveCount(0);
  });

  // Initialization and Ready State
  test.describe('initializing → ready', () => {
    test('should initialize app with randomized dataset and show ready status', async () => {
      const statusText = await app.statusRegion().innerText();
      expect(statusText).toMatch(/Ready|Press Play|Step/i);

      const bars = app.getBars();
      const count = await bars.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(12);

      // OnEnter show_ready_status clears transient UI
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
      await expect(app.barsWithClass('to-swap')).toHaveCount(0);
      await expect(app.barsWithClass('swapping')).toHaveCount(0);
    });

    test('SPEED_CHANGE in ready should not change state but update CSS variables', async () => {
      const before = await app.getRootCSSVar('--compare-ms');
      await (await app.speedSlider()).focus();
      await app.setSpeedToMax();
      const after = await app.getRootCSSVar('--compare-ms');
      expect(after).not.toEqual('');
      expect(after).not.toEqual(before);
      // State remains ready: Play still Play
      await expect(app.playButton()).toHaveText(/Play/i);
    });
  });

  // Playing / Paused states
  test.describe('ready ↔ playing ↔ paused', () => {
    test('TOGGLE_PLAY from ready should start autoplay and compare', async () => {
      await app.togglePlay();
      expect(await app.isPlaying()).toBeTruthy();
      // OnEnter start_autoplay: status should indicate running or button shows Pause
      await app.waitForComparing();
      // Pseudocode line 3 during compare (soft assert)
      const line3 = app.pseudoLine(3);
      await expect.soft(line3).toHaveClass(/active|highlight/i);
    });

    test('ALGORITHM step loop should produce AUTOPLAY_TICK transitions', async () => {
      // Already in ready; start autoplay
      await app.togglePlay();
      await app.waitForComparing();
      // Move through comparing → checking_swap → swap or no_swap
      // We should see either to-swap or a no-swap announcement; check both paths dynamically
      const toSwapAppeared = await app.barsWithClass('to-swap').count().then(c => c > 0);
      if (toSwapAppeared) {
        await app.waitForSwapping();
        // OnExit swap clears transforms
        await app.waitForNoSwapping();
        await expect(app.barsWithClass('swapping')).toHaveCount(0);
      } else {
        // Announce no swap
        const statusText = await app.statusRegion().innerText();
        expect(statusText).toMatch(/No swap/i);
      }
    });

    test('TOGGLE_PLAY and KEY_SPACE should pause from playing → paused and announce paused', async () => {
      await app.togglePlay();
      expect(await app.isPlaying()).toBeTruthy();
      await app.playButton().click(); // TOGGLE_PLAY to paused
      expect(await app.isPlaying()).toBeFalsy();
      // OnEnter announce_paused, status should reflect paused
      const statusText = await app.statusRegion().innerText();
      expect(statusText).toMatch(/Paused|paused/i);

      // KEY_SPACE should resume to playing
      await app.pressSpace();
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('SPEED_CHANGE in playing should keep playing and update CSS vars', async () => {
      await app.togglePlay();
      expect(await app.isPlaying()).toBeTruthy();
      const beforeSwapMs = await app.getRootCSSVar('--swap-ms');
      await app.setSpeedToMax();
      const afterSwapMs = await app.getRootCSSVar('--swap-ms');
      expect(afterSwapMs).not.toEqual(beforeSwapMs);
      expect(await app.isPlaying()).toBeTruthy();
    });
  });

  // Step execution and core algorithm phases
  test.describe('step phases: pass_initializing → comparing → checking_swap → swapping/no_swap → step_cleanup', () => {
    test('STEP and KEY_ARROW_RIGHT from ready should initialize pass and highlight pseudocode lines 1 & 2', async () => {
      await app.stepButton().click(); // STEP
      await app.waitForComparing(); // After PASS_INIT_DONE → comparing
      // Pseudocode lines 1 & 2 soft asserts
      await expect.soft(app.pseudoLine(1)).toHaveClass(/active|highlight/i);
      await expect.soft(app.pseudoLine(2)).toHaveClass(/active|highlight/i);
      await expect.soft(app.pseudoLine(3)).toHaveClass(/active|highlight/i);

      // KEY_ARROW_RIGHT should step again and progress
      await app.pressArrowRight();
      // We may be in checking_swap with to-swap flag or no-swap
      const toSwap = await app.barsWithClass('to-swap').count().then(c => c > 0);
      // Pseudocode line 4 soft assert for condition check
      await expect.soft(app.pseudoLine(4)).toHaveClass(/active|highlight/i);
      if (toSwap) {
        await app.waitForSwapping();
        await expect.soft(app.pseudoLine(5)).toHaveClass(/active|highlight/i);
        await app.waitForNoSwapping();
      } else {
        const statusText = await app.statusRegion().innerText();
        expect(statusText).toMatch(/No swap/i);
      }
      // After step_cleanup, transient classes cleared
      await app.page.waitForTimeout(100); // allow cleanup
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
      await expect(app.barsWithClass('to-swap')).toHaveCount(0);
    });

    test('SWAP path: with descending dataset, swapping animation occurs and clears on end', async () => {
      await app.applyCustomDataset('5 4 3'); // Valid dataset 3 elements descending
      await app.waitForReadyStatus();
      // Step through to force a swap on first comparison
      await app.stepButton().click();
      await app.waitForComparing();
      await app.waitForToSwap();
      await app.stepButton().click(); // proceed to swap
      await app.waitForSwapping();
      // SWAP_ANIMATION_END → step_cleanup clears 'swapping'
      await app.waitForNoSwapping();
      await expect(app.barsWithClass('swapping')).toHaveCount(0);
      // Values should have changed order after swap
      const values = await app.getBarValues();
      expect(values[0]).toBeLessThan(values[1]);
    });

    test('NO_SWAP path: with ascending dataset, announce no swap and advance index', async () => {
      await app.applyCustomDataset('1 2 3'); // Already sorted
      await app.waitForReadyStatus();
      await app.stepButton().click();
      await app.waitForComparing();
      await app.stepButton().click(); // check swap condition
      const statusText = await app.statusRegion().innerText();
      expect(statusText).toMatch(/No swap/i);
      // STEP_ADVANCE → step_cleanup: no comparing/to-swap remain
      await app.page.waitForTimeout(100);
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
      await expect(app.barsWithClass('to-swap')).toHaveCount(0);
    });

    test('END_OF_PASS_WITH_SWAPS and pass_completed mark sorted boundary on the right', async () => {
      await app.applyCustomDataset('3 2 1 0'); // induces swaps
      await app.waitForReadyStatus();
      // Play through one full pass quickly
      await app.setSpeedToMax();
      await app.togglePlay();
      // Wait until at least one bar has 'sorted' class (right boundary)
      await app.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bar.sorted, .bars .bar.sorted, [data-bar].sorted, .bar-item.sorted');
        return bars.length >= 1;
      }, { timeout: 10000 });
      await app.playButton().click(); // pause
      expect(await app.isPlaying()).toBeFalsy();
      // OnEnter mark_sorted_boundary occurred
      const sortedCount = await app.barsWithClass('sorted').count();
      expect(sortedCount).toBeGreaterThanOrEqual(1);
      // PASS_NEXT → ready after boundary mark; Play button shows Play
      await expect(app.playButton()).toHaveText(/Play/i);
    });
  });

  // Done state and completion transitions
  test.describe('done state and completion', () => {
    test('ALGORITHM_DONE reached, finalize_done_state applies sorted class to all bars', async () => {
      await app.applyCustomDataset('3 1 2'); // small dataset for quick completion
      await app.waitForReadyStatus();
      await app.setSpeedToMax();
      await app.togglePlay();
      // Wait for done
      await app.waitForDoneStatus(10000);
      const allSorted = await app.allBarsSorted();
      expect(allSorted).toBeTruthy();
      // Playing false after done
      expect(await app.isPlaying()).toBeFalsy();
      // Pseudocode line 7 soft assert
      await expect.soft(app.pseudoLine(7)).toHaveClass(/active|highlight/i);
    });

    test('TOGGLE_PLAY while done should reset and start playing again (done → resetting → ready → playing)', async () => {
      await app.applyCustomDataset('4 3 2 1');
      await app.waitForReadyStatus();
      await app.setSpeedToMax();
      await app.togglePlay();
      await app.waitForDoneStatus(10000);
      expect(await app.isPlaying()).toBeFalsy();
      // Toggle play should trigger reset and autoplay
      await app.togglePlay();
      // It should end up playing (after resetting/ready)
      await app.page.waitForFunction(() => {
        const btn = document.querySelector('button');
        if (!btn) return false;
        const txt = btn.textContent || '';
        const pressed = btn.getAttribute('aria-pressed');
        return /Pause/i.test(txt) || pressed === 'true';
      }, { timeout: 5000 });
      expect(await app.isPlaying()).toBeTruthy();
    });
  });

  // Dataset randomizing and applying custom
  test.describe('dataset_randomizing and dataset_applying', () => {
    test('RANDOMIZE should rebuild bars and return to ready', async () => {
      const beforeValues = await app.getBarValues();
      await app.randomizeButton().click();
      await app.page.waitForTimeout(50);
      const afterValues = await app.getBarValues();
      // Likely changed (not guaranteed equal)
      const changed = JSON.stringify(beforeValues) !== JSON.stringify(afterValues);
      expect(changed).toBeTruthy();
      await app.waitForReadyStatus();
    });

    test('APPLY_CUSTOM_VALID via Enter should rebuild bars and go to ready', async () => {
      // Ensure paused state persists if paused path needed; start from ready now
      await app.applyCustomDataset('10 0 5 2');
      await app.waitForReadyStatus();
      const values = await app.getBarValues();
      expect(values.slice(0, 4)).toEqual([10, 0, 5, 2]);
    });

    test('APPLY_CUSTOM_INVALID should remain in ready/paused and show feedback', async () => {
      // From ready
      await app.applyCustomDataset('a b c');
      await app.waitForReadyStatus();
      const statusText = await app.statusRegion().innerText();
      expect(statusText).toMatch(/invalid|error|Enter valid/i);

      // From paused: go to paused then apply invalid and ensure paused stays
      await app.togglePlay();
      await app.playButton().click(); // pause
      expect(await app.isPlaying()).toBeFalsy();
      const input = await app.numbersInput();
      await input.fill('100 200'); // out of range
      await input.press('Enter');
      const statusText2 = await app.statusRegion().innerText();
      expect(statusText2).toMatch(/invalid|error|Enter valid/i);
      expect(await app.isPlaying()).toBeFalsy(); // still paused
    });

    test('APPLY_COMPLETE should land in ready state', async () => {
      await app.applyCustomDataset('1 9 3 7');
      await app.waitForReadyStatus();
      await expect(app.playButton()).toHaveText(/Play/i);
    });
  });

  // Resetting
  test.describe('resetting', () => {
    test('RESET from playing stops autoplay and returns to ready', async () => {
      await app.applyCustomDataset('9 8 7 6');
      await app.waitForReadyStatus();
      await app.togglePlay();
      expect(await app.isPlaying()).toBeTruthy();
      await app.resetButton().click();
      await app.waitForReadyStatus();
      expect(await app.isPlaying()).toBeFalsy();
      // RESET_COMPLETE handled
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
    });

    test('KEY_R triggers reset from any state', async () => {
      await app.togglePlay();
      await app.pressKeyR();
      await app.waitForReadyStatus();
    });
  });

  // Keyboard shortcuts
  test.describe('keyboard shortcuts', () => {
    test('KEY_SPACE toggles play/pause', async () => {
      await app.pressSpace();
      expect(await app.isPlaying()).toBeTruthy();
      await app.pressSpace();
      expect(await app.isPlaying()).toBeFalsy();
    });

    test('KEY_ARROW_RIGHT performs a step', async () => {
      await app.pressArrowRight();
      await app.waitForComparing();
      // Cleanup after step to be back ready
      await app.page.waitForTimeout(300);
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
    });

    test('KEY_S triggers dataset_randomizing', async () => {
      const beforeValues = await app.getBarValues();
      await app.pressKeyS();
      await app.page.waitForTimeout(50);
      const afterValues = await app.getBarValues();
      const changed = JSON.stringify(beforeValues) !== JSON.stringify(afterValues);
      expect(changed).toBeTruthy();
      await app.waitForReadyStatus();
    });

    test('ENTER_KEY_ON_NUMBERS maps to apply logic (valid and invalid)', async () => {
      const input = await app.numbersInput();
      await input.fill('2 1');
      await input.press('Enter');
      await app.waitForReadyStatus();
      let values = await app.getBarValues();
      expect(values.slice(0, 2)).toEqual([2, 1]);

      await input.fill('bad input');
      await input.press('Enter');
      const statusText = await app.statusRegion().innerText();
      expect(statusText).toMatch(/invalid|error|Enter valid/i);
    });
  });

  // Speed changes in different states
  test.describe('SPEED_CHANGE in various states', () => {
    test('SPEED_CHANGE in paused keeps paused', async () => {
      await app.togglePlay();
      await app.playButton().click(); // pause
      expect(await app.isPlaying()).toBeFalsy();
      const beforeHighlight = await app.getRootCSSVar('--highlight-ms');
      await app.setSpeedToMax();
      const afterHighlight = await app.getRootCSSVar('--highlight-ms');
      expect(afterHighlight).not.toEqual(beforeHighlight);
      expect(await app.isPlaying()).toBeFalsy();
    });

    test('SPEED_CHANGE in done does not change state', async () => {
      await app.applyCustomDataset('5 4 3');
      await app.waitForReadyStatus();
      await app.setSpeedToMax();
      await app.togglePlay();
      await app.waitForDoneStatus(10000);
      const beforeCompare = await app.getRootCSSVar('--compare-ms');
      await app.setSpeedToMax();
      const afterCompare = await app.getRootCSSVar('--compare-ms');
      // variables may remain same if max already set; state remains done
      await app.waitForDoneStatus();
      expect(await app.isPlaying()).toBeFalsy();
      expect(afterCompare).toBeTruthy();
    });
  });

  // Reduced motion edge case for swapping
  test.describe('prefers-reduced-motion edge case', () => {
    test('with reduced motion, swaps should apply without animated "swapping" state', async () => {
      await app.emulateReducedMotion(true);
      await app.applyCustomDataset('9 1'); // ensures swap
      await app.waitForReadyStatus();
      await app.stepButton().click();
      await app.waitForComparing();
      await app.stepButton().click(); // check swap and perform swap immediately
      // In reduced motion, class 'swapping' may be absent; order should still change
      const values = await app.getBarValues();
      expect(values[0]).toBeLessThan(values[1]);
      // No lingering swapping
      await expect(app.barsWithClass('swapping')).toHaveCount(0);
      await app.emulateReducedMotion(false);
    });
  });

  // Concurrency guard: busy prevents overlapping steps
  test.describe('concurrency guard', () => {
    test('spamming STEP should not overlap transitions or leave residual classes', async () => {
      await app.applyCustomDataset('5 2 4 1');
      await app.waitForReadyStatus();
      // Spam steps quickly
      const stepBtn = app.stepButton();
      for (let i = 0; i < 5; i++) {
        await stepBtn.click();
      }
      // Wait a bit for transitions to settle
      await app.page.waitForTimeout(800);
      // No duplicate transient classes left
      await expect(app.barsWithClass('swapping')).toHaveCount(0);
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
      await expect(app.barsWithClass('to-swap')).toHaveCount(0);
    });
  });

  // Early exit optimization
  test.describe('early exit: PASS_EARLY_EXIT', () => {
    test('already sorted dataset should hit early exit and transition to done quickly', async () => {
      await app.applyCustomDataset('0 1 2 3 4');
      await app.waitForReadyStatus();
      await app.setSpeedToMax();
      await app.togglePlay();
      // Expect Done quickly
      await app.waitForDoneStatus(5000);
      const allSorted = await app.allBarsSorted();
      expect(allSorted).toBeTruthy();
    });
  });

  // Visual cleanup and DOM changes
  test.describe('visual feedback and DOM changes', () => {
    test('compare highlights and then clear after step_cleanup', async () => {
      await app.applyCustomDataset('2 1 3');
      await app.waitForReadyStatus();
      await app.stepButton().click();
      await app.waitForComparing();
      // HIGHLIGHT_TIMEOUT triggers checking_swap; we wait a bit
      await app.page.waitForTimeout(450);
      await app.stepButton().click(); // advance through swap/no-swap
      await app.page.waitForTimeout(250);
      await expect(app.barsWithClass('comparing')).toHaveCount(0);
      await expect(app.barsWithClass('to-swap')).toHaveCount(0);
    });

    test('sorted boundary grows across passes', async () => {
      await app.applyCustomDataset('4 3 2 1');
      await app.waitForReadyStatus();
      await app.setSpeedToMax();
      await app.togglePlay();
      // Wait until at least 2 bars are sorted at boundary
      await app.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bar.sorted, .bars .bar.sorted, [data-bar].sorted, .bar-item.sorted');
        return bars.length >= 2;
      }, { timeout: 10000 });
      const sortedCount = await app.barsWithClass('sorted').count();
      expect(sortedCount).toBeGreaterThanOrEqual(2);
      await app.playButton().click(); // pause
    });
  });
});
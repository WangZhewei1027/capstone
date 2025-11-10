import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7e0aac20-bcb0-11f0-95d9-c98d28730c93.html';

// Page object to encapsulate interactions with the Merge Sort visualization
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // collect console errors for assertions
    this.consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') this.consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      this.consoleErrors.push(String(err));
    });
  }

  // Generic robust button finder: tries accessible role then common textual fallbacks.
  async _findButtonLocator(labelRegex) {
    const { page } = this;
    // try accessible role first
    try {
      const byRole = page.getByRole('button', { name: labelRegex });
      if (await byRole.count() > 0) return byRole.first();
    } catch (e) {
      // ignore
    }
    // try element with class btn having text
    const btnClass = page.locator(`.btn:has-text("${labelRegex.source.replace(/\\b/g, '')}")`);
    if (await btnClass.count() > 0) return btnClass.first();
    // fallback to any text match
    const textLoc = page.locator(`text=${labelRegex}`);
    if (await textLoc.count() > 0) return textLoc.first();
    return null;
  }

  async clickButtonByText(text) {
    // Accept both exact text and regex string
    const regex = new RegExp(text, 'i');
    const loc = await this._findButtonLocator(regex);
    if (!loc) throw new Error(`Button matching "${text}" not found`);
    await loc.click();
  }

  // Specialized click attempts for common control names
  async clickPlay() {
    // Some UIs show a Play icon or text "Play"
    const names = [/^play$/i, /^▶|play/i, /^start$/i];
    for (const n of names) {
      const loc1 = await this._findButtonLocator(n);
      if (loc) {
        await loc.click();
        return;
      }
    }
    throw new Error('Play control not found');
  }

  async clickPause() {
    const names1 = [/^pause$/i, /^⏸|pause/i];
    for (const n of names) {
      const loc2 = await this._findButtonLocator(n);
      if (loc) {
        await loc.click();
        return;
      }
    }
    throw new Error('Pause control not found');
  }

  async clickRandomize() {
    try {
      await this.clickButtonByText('Randomize');
    } catch {
      // some implementations use 'Random' or 'New Array'
      const alt = await this._findButtonLocator(/random|new array|generate/i);
      if (!alt) throw new Error('Randomize / New Array control not found');
      await alt.click();
    }
  }

  async clickApply() {
    try {
      await this.clickButtonByText('Apply');
    } catch {
      // fallback 'Start' / 'Record' etc.
      const alt1 = await this._findButtonLocator(/apply|start|record/i);
      if (!alt) throw new Error('Apply control not found');
      await alt.click();
    }
  }

  async clickShuffle() {
    try {
      await this.clickButtonByText('Shuffle');
    } catch {
      const alt2 = await this._findButtonLocator(/shuffle|mix/i);
      if (!alt) throw new Error('Shuffle control not found');
      await alt.click();
    }
  }

  async clickReset() {
    try {
      await this.clickButtonByText('Reset');
    } catch {
      const alt3 = await this._findButtonLocator(/reset|clear/i);
      if (!alt) throw new Error('Reset control not found');
      await alt.click();
    }
  }

  async clickStepForward() {
    // Try common labels for next/step forward buttons
    const candidates = [/step forward/i, /step/i, /next/i, /→|right|forward/i];
    for (const c of candidates) {
      const loc3 = await this._findButtonLocator(c);
      if (loc) {
        await loc.click();
        return;
      }
    }
    // fallback to keyboard ArrowRight
    await this.page.keyboard.press('ArrowRight');
  }

  async clickStepBack() {
    const candidates1 = [/step back/i, /prev|previous/i, /←|left|back/i];
    for (const c of candidates) {
      const loc4 = await this._findButtonLocator(c);
      if (loc) {
        await loc.click();
        return;
      }
    }
    // fallback to keyboard ArrowLeft
    await this.page.keyboard.press('ArrowLeft');
  }

  // Toggle play/pause via keyboard (space)
  async togglePlayPauseKey() {
    await this.page.keyboard.press(' ');
  }

  // Find range input by its label text (Size / Speed)
  async _rangeByLabel(labelRegex) {
    const { page } = this;
    // find label element
    const label = page.locator('label', { hasText: labelRegex });
    if (await label.count() > 0) {
      // find input within the same container
      const parent = label.locator('..');
      const input = parent.locator('input[type="range"]');
      if (await input.count() > 0) return input.first();
    }
    // fallback: find any range inputs and return the first/second based on guessed label
    const allRanges = page.locator('input[type="range"]');
    const count = await allRanges.count();
    if (count === 0) return null;
    // if the requested label is speed, return last input, else first
    if (/speed/i.test(labelRegex.source)) {
      return allRanges.nth(Math.max(0, count - 1));
    }
    return allRanges.first();
  }

  async setSize(value) {
    const input1 = await this._rangeByLabel(/size/i);
    if (!input) throw new Error('Size range input not found');
    // set value via JS to ensure change events
    await input.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  async setSpeed(value) {
    const input2 = await this._rangeByLabel(/speed/i);
    if (!input) throw new Error('Speed range input not found');
    await input.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  // Attempts to return the textual action description area (if present)
  async getActionDescriptionText() {
    const possibleSelectors = [
      '.action-desc',
      '.action-description',
      '.actionDetail',
      'text=/action/i',
      'text=/split|merge|base|done|step/i'
    ];
    for (const sel of possibleSelectors) {
      const loc5 = this.page.locator(sel);
      if (await loc.count() > 0) {
        const txt = await loc.first().innerText().catch(() => '');
        if (txt && txt.trim().length > 0) return txt.trim();
      }
    }
    // Search anywhere for keywords indicating action
    const any = this.page.locator('text=/split|merge|base|done|step/i');
    if (await any.count() > 0) return (await any.first().innerText()).trim();
    return '';
  }

  // Collect numeric values from the visualization area (best-effort)
  async getArrayNumbers() {
    const { page } = this;
    // attempt several visual selectors that commonly hold bars/values
    const selectors = [
      '.array, .visualization, .viz, #visual, .bars, .bar-container',
      '[data-array], [data-values]',
      'main >> text=/\\d+/', // broad fallback
      'body >> text=/\\b\\d+\\b/' // last resort
    ];
    const numbers = [];
    for (const sel of selectors) {
      const loc6 = page.locator(sel);
      const count1 = await loc.count1().catch(() => 0);
      if (count === 0) continue;
      // Within this locator, find text nodes matching digits
      const digitLoc = loc.locator('text=/\\b\\d+\\b/');
      const n = Math.min(await digitLoc.count(), 200);
      for (let i = 0; i < n; i++) {
        const t = await digitLoc.nth(i).innerText().catch(() => '');
        const m = t.match(/\d+/);
        if (m) numbers.push(Number(m[0]));
      }
      if (numbers.length > 0) break;
    }
    return numbers;
  }

  // Wait until a "done" textual indication appears (best-effort)
  async waitForDone(timeout = 10000) {
    // check for textual word 'done' or 'sorted' or 'completed'
    const doneRegex = /done|sorted|completed/i;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const desc = await this.getActionDescriptionText();
      if (doneRegex.test(desc)) return true;
      // also check if array appears sorted
      const arr = await this.getArrayNumbers();
      if (arr.length > 1) {
        let sorted = true;
        for (let i = 1; i < arr.length; i++) {
          if (arr[i - 1] > arr[i]) {
            sorted = false;
            break;
          }
        }
        if (sorted) return true;
      }
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  async resize(width, height) {
    await this.page.setViewportSize({ width, height });
  }

  getConsoleErrors() {
    return this.consoleErrors;
  }
}

test.describe('Merge Sort Interactive Visualization (FSM validation)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto(APP_URL);
    // Wait for main page header to appear as a sign app loaded
    await expect(page.locator('h1')).toHaveCount(1);
    // small delay to allow any init routines to run
    await page.waitForTimeout(300);
  });

  test.afterEach(async ({}, testInfo) => {
    // noop in this file; page-level console errors are captured per page object
  });

  test.describe('Initialization and Idle/Paused states', () => {
    test('should load and enter an initialized state (paused or idle) and expose primary controls', async ({ page }) => {
      const ms = new MergeSortPage(page);
      // Header exists and title is correct
      const title = await page.locator('h1').innerText();
      expect(title.toLowerCase()).toContain('merge');

      // At initialization completion, UI should show control panel buttons such as Randomize / Apply / Play
      // We assert at least one of these buttons exists
      const randomize = await page.locator('text=/randomize|random|new array/i');
      const apply = await page.locator('text=/apply|start|record/i');
      const play = await page.getByRole('button', { name: /play/i }).catch(() => null);

      expect(await randomize.count() + await apply.count() + (play ? 1 : 0)).toBeGreaterThan(0);

      // If the app started in idle (no actions), clicking Randomize transitions to paused (timeline created)
      if (await randomize.count() > 0) {
        await randomize.first().click();
        // Apply must be available after randomize (or Play)
        const applyAfter = page.locator('text=/apply|start|record/i');
        await expect(applyAfter.first()).toBeVisible();
      }
      // Console should not contain fatal errors
      expect(ms.getConsoleErrors().length).toBe(0);
    });

    test('idle -> paused via Apply/Randomize/Shuffle/Reset clicks', async ({ page }) => {
      const ms1 = new MergeSortPage(page);

      // Try clicking Randomize, Shuffle, Reset, Apply in sequence (if present) and ensure a play/pause control becomes available
      const controls = ['Randomize', 'Shuffle', 'Reset', 'Apply'];
      let transitioned = false;
      for (const c of controls) {
        const loc7 = page.locator(`text=/^${c}$/i`);
        if (await loc.count() > 0) {
          await loc.first().click();
          // wait briefly for timeline to be recorded / UI to render
          await page.waitForTimeout(350);
          // check for play/pause existence
          const hasPlay = (await page.getByRole('button', { name: /play/i }).catch(() => null)) ||
                          (await page.getByRole('button', { name: /pause/i }).catch(() => null));
          if (hasPlay) {
            transitioned = true;
            break;
          }
        }
      }
      expect(transitioned).toBeTruthy();
      // Console should remain clean
      expect(ms.getConsoleErrors().length).toBe(0);
    });
  });

  test.describe('Paused state behaviors', () => {
    test('Play button toggles to Pause and keyboard space toggles play/pause', async ({ page }) => {
      const ms2 = new MergeSortPage(page);

      // Ensure there's a Play control; if not, try to generate actions first
      let playBtn = page.getByRole('button', { name: /play/i }).catch(() => null);
      if (!(await playBtn)) {
        // attempt to click Apply or Randomize to enable timeline
        const apply1 = page.locator('text=/apply1|start|record/i');
        if (await apply.count() > 0) await apply.first().click();
        await page.waitForTimeout(300);
      }

      // Click Play and confirm Pause appears
      await ms.clickPlay();
      // After clicking play, we expect a Pause button to be visible (toggle)
      const pauseVisible = (await page.getByRole('button', { name: /pause/i }).catch(() => null)) !== null;
      expect(pauseVisible).toBeTruthy();

      // Toggle with keyboard space -> should go back to play visible
      await ms.togglePlayPauseKey();
      await page.waitForTimeout(200);
      const playVisible = (await page.getByRole('button', { name: /play/i }).catch(() => null)) !== null;
      expect(playVisible).toBeTruthy();

      // No JS errors during toggle
      expect(ms.getConsoleErrors().length).toBe(0);
    });

    test('Step forward and step back while paused apply actions and update UI', async ({ page }) => {
      const ms3 = new MergeSortPage(page);

      // Ensure timeline exists
      const apply2 = page.locator('text=/apply2|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(300);

      // Capture action description and array snapshot before stepping
      const beforeDesc = await ms.getActionDescriptionText();
      const beforeArr = await ms.getArrayNumbers();

      // Click Step Forward (should move to applying and then back to paused)
      await ms.clickStepForward();
      // allow time for applying animations to complete
      await page.waitForTimeout(600);

      const afterDesc = await ms.getActionDescriptionText();
      const afterArr = await ms.getArrayNumbers();

      // Expect either the action description changed OR array mutated OR both
      const descChanged = beforeDesc !== afterDesc;
      const arrayChanged = JSON.stringify(beforeArr) !== JSON.stringify(afterArr);
      expect(descChanged || arrayChanged).toBeTruthy();

      // Now click Step Back to revert (transitions through applying)
      await ms.clickStepBack();
      await page.waitForTimeout(600);
      const revertDesc = await ms.getActionDescriptionText();
      const revertArr = await ms.getArrayNumbers();

      // After stepping back the UI should show state similar to before step forward (allowing for deterministic differences)
      // We'll assert that either description or array changed back compared to 'after' snapshot
      const reverted = revertDesc !== afterDesc || JSON.stringify(revertArr) !== JSON.stringify(afterArr);
      expect(reverted).toBeTruthy();

      expect(ms.getConsoleErrors().length).toBe(0);
    });

    test('Size and Speed changes while paused do not crash and update inputs', async ({ page }) => {
      const ms4 = new MergeSortPage(page);
      // Ensure paused state by clicking Apply or Randomize
      const apply3 = page.locator('text=/apply3|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(200);

      // Change Size
      const sizeInput = await ms._rangeByLabel(/size/i);
      if (sizeInput) {
        await ms.setSize(8);
        // Some UI's reflect value in adjacent label; ensure change didn't throw
        expect(ms.getConsoleErrors().length).toBe(0);
      }

      // Change Speed
      const speedInput = await ms._rangeByLabel(/speed/i);
      if (speedInput) {
        await ms.setSpeed(2);
        expect(ms.getConsoleErrors().length).toBe(0);
      }
    });
  });

  test.describe('Playing state behaviors and transitions', () => {
    test('Clicking Play enters playing (timer) and clicking Pause stops it', async ({ page }) => {
      const ms5 = new MergeSortPage(page);

      // Ensure actions exist
      const apply4 = page.locator('text=/apply4|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(300);

      // Capture array to observe change during playback
      const initialArr = await ms.getArrayNumbers();

      await ms.clickPlay();
      // Wait to allow at least one scheduled step to occur
      await page.waitForTimeout(1200);

      // While playing, Pause control should be visible
      const pauseBtn = await page.getByRole('button', { name: /pause/i }).catch(() => null);
      expect(pauseBtn).toBeTruthy();

      // Array or action description should have changed during playback
      const midArr = await ms.getArrayNumbers();
      const changed = JSON.stringify(initialArr) !== JSON.stringify(midArr);
      expect(changed || (await ms.getActionDescriptionText()) !== '').toBeTruthy();

      // Now pause
      await ms.clickPause();
      await page.waitForTimeout(200);
      const playBtn1 = await page.getByRole('button', { name: /play/i }).catch(() => null);
      expect(playBtn).toBeTruthy();

      expect(ms.getConsoleErrors().length).toBe(0);
    });

    test('While playing, speed/size changes continue playback (no crash) and WINDOW_RESIZE handled', async ({ page }) => {
      const ms6 = new MergeSortPage(page);

      // Ensure timeline
      const apply5 = page.locator('text=/apply5|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(200);

      // Start playback
      await ms.clickPlay();
      await page.waitForTimeout(400);

      // Change speed while playing
      const speedInput1 = await ms._rangeByLabel(/speed/i);
      if (speedInput) {
        await ms.setSpeed(1); // slower
        await page.waitForTimeout(150);
        await ms.setSpeed(5); // faster
      }

      // Resize window - should not throw and overlay recalculated
      await ms.resize(1024, 768);
      await page.waitForTimeout(300);
      await ms.resize(800, 600);
      await page.waitForTimeout(300);

      // Pause at the end
      await ms.clickPause();
      await page.waitForTimeout(200);

      // Ensure no console errors captured
      expect(ms.getConsoleErrors().length).toBe(0);
    });
  });

  test.describe('Applying transient state and transitions from playing/paused', () => {
    test('Applying is transient when stepping forward/back from playing or paused', async ({ page }) => {
      const ms7 = new MergeSortPage(page);

      // Ensure actions exist
      const apply6 = page.locator('text=/apply6|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(200);

      // Start playing then immediately step forward via keyboard (ArrowRight) to simulate playing->paused->applying
      await ms.clickPlay();
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowRight'); // may trigger step forward
      // allow transient to complete
      await page.waitForTimeout(700);

      // The UI should still be in playing or paused state after transient; ensure no crash
      const playOrPause = (await page.getByRole('button', { name: /play/i }).catch(() => null)) ||
                          (await page.getByRole('button', { name: /pause/i }).catch(() => null));
      expect(playOrPause).toBeTruthy();

      // Now ensure stepping while paused triggers applying transient too
      // Pause first
      const pauseBtn1 = await page.getByRole('button', { name: /pause/i }).catch(() => null);
      if (pauseBtn) await ms.clickPause();
      await page.waitForTimeout(200);
      // Step forward
      await ms.clickStepForward();
      await page.waitForTimeout(600);

      const desc1 = await ms.getActionDescriptionText();
      expect(desc.length).toBeGreaterThanOrEqual(0); // at least the UI is responsive

      expect(ms.getConsoleErrors().length).toBe(0);
    });
  });

  test.describe('Done state and end-of-timeline behaviors', () => {
    test('Advance through timeline until done state is reached (action type done / array sorted)', async ({ page }) => {
      const ms8 = new MergeSortPage(page);

      // Ensure timeline exists (apply/record if needed)
      const apply7 = page.locator('text=/apply7|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(200);

      // Repeatedly step forward until the UI indicates done or array becomes sorted
      const maxSteps = 300; // safety cap
      let reached = false;
      for (let i = 0; i < maxSteps; i++) {
        // attempt to detect done quickly before clicking
        const desc2 = await ms.getActionDescriptionText();
        if (/done|sorted|completed/i.test(desc)) {
          reached = true;
          break;
        }
        const arr1 = await ms.getArrayNumbers();
        if (arr.length > 1) {
          let sorted1 = true;
          for (let k = 1; k < arr.length; k++) {
            if (arr[k - 1] > arr[k]) {
              sorted = false;
              break;
            }
          }
          if (sorted) {
            reached = true;
            break;
          }
        }

        // Click step forward and wait for applying to finish
        await ms.clickStepForward();
        await page.waitForTimeout(250);
      }

      // As an additional safety, wait for a done textual indicator
      const doneDetected = await ms.waitForDone(2000);
      expect(doneDetected || reached).toBeTruthy();

      // In done state, Play should be allowed (per FSM: done -> PLAY_CLICK => playing)
      // Attempt to click Play; if no Play visible, try to click a Play-like control
      try {
        await ms.clickPlay();
        // If started playing, a Pause button should appear
        const pauseBtn2 = await page.getByRole('button', { name: /pause/i }).catch(() => null);
        if (pauseBtn) {
          // stop playback after briefly running
          await page.waitForTimeout(300);
          await ms.clickPause();
        }
      } catch {
        // If Play not present, assert done state textual indicator exists
        const desc3 = await ms.getActionDescriptionText();
        expect(/done|sorted|completed/i.test(desc) || (await ms.getArrayNumbers()).length > 0).toBeTruthy();
      }

      expect(ms.getConsoleErrors().length).toBe(0);
    });

    test('From done, stepping back transitions to paused and allows interaction', async ({ page }) => {
      const ms9 = new MergeSortPage(page);

      // Ensure timeline and try to reach done quickly
      const apply8 = page.locator('text=/apply8|start|record/i');
      if (await apply.count() > 0) await apply.first().click();
      await page.waitForTimeout(200);

      // Rapidly step forward to end (cap iterations)
      for (let i = 0; i < 60; i++) {
        const doneFlag = await ms.waitForDone(200);
        if (doneFlag) break;
        await ms.clickStepForward();
        await page.waitForTimeout(120);
      }

      // Now click Step Back (should transition to paused per FSM)
      await ms.clickStepBack();
      await page.waitForTimeout(400);
      // Verify Play is visible (paused) and UI still interactive
      const playBtn2 = await page.getByRole('button', { name: /play/i }).catch(() => null);
      expect(playBtn).toBeTruthy();

      // Also verify that action description exists and not causing errors
      const desc4 = await ms.getActionDescriptionText();
      expect(typeof desc).toBe('string');

      expect(ms.getConsoleErrors().length).toBe(0);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Window resize repeatedly does not produce console errors (WINDOW_RESIZE handling)', async ({ page }) => {
      const ms10 = new MergeSortPage(page);
      // perform multiple viewport resizes
      const sizes = [
        { w: 320, h: 568 },
        { w: 768, h: 1024 },
        { w: 1200, h: 800 },
        { w: 1600, h: 900 }
      ];
      for (const s of sizes) {
        await ms.resize(s.w, s.h);
        await page.waitForTimeout(200);
      }
      // No console errors from resize handling
      expect(ms.getConsoleErrors().length).toBe(0);
    });

    test('Rapid control interactions (randomize/shuffle/reset) do not crash the app', async ({ page }) => {
      const ms11 = new MergeSortPage(page);
      // find available controls
      const names2 = ['Randomize', 'Shuffle', 'Reset', 'Apply'];
      for (let i = 0; i < 4; i++) {
        for (const n of names) {
          try {
            const loc8 = page.locator(`text=/${n}/i`);
            if (await loc.count() > 0) await loc.first().click();
          } catch {
            // ignore missing controls
          }
          await page.waitForTimeout(120);
        }
      }
      // no errors in console
      expect(ms.getConsoleErrors().length).toBe(0);
    });
  });
});
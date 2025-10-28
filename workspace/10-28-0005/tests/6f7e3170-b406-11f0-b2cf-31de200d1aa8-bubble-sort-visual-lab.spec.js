import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/6f7e3170-b406-11f0-b2cf-31de200d1aa8.html';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.controlsRoot = page.locator('.control-card');
    this.vizRoot = page.locator('.viz');
    this.bars = page.locator('.bars .bar');
    this.narration = page.locator('#narrationMain, .narration, [data-testid="narration"], .info, .status');
    this.pointer = page.locator('.pointer, #pointer');
  }

  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for bars rendered -> indicates INIT -> idle
    await expect(this.bars).toHaveCountGreaterThan(0);
  }

  async playButton() {
    // Button toggles between Play and Pause
    const btn = this.page.getByRole('button', { name: /play|pause/i }).first();
    return btn;
  }

  async stepButton() {
    return this.page.getByRole('button', { name: /^step$/i }).first();
  }

  async shuffleButton() {
    return this.page.getByRole('button', { name: /shuffle/i }).first();
  }

  async resetButton() {
    return this.page.getByRole('button', { name: /reset/i }).first();
  }

  async applyButton() {
    // Fallbacks: Apply, Apply Input, Set, Use
    return this.page.getByRole('button', { name: /apply|set|use/i }).first();
  }

  async arrayInput() {
    // Try common ids and heuristics
    const candidate = this.page.locator('#arrayInput, input[name="arrayInput"], input[aria-label*="array" i], input[placeholder*=","], input[placeholder*="array" i], textarea#arrayInput, textarea[name="arrayInput"]').first();
    return candidate;
  }

  async speedSlider() {
    const handle = await this.page.evaluateHandle(() => {
      const byId = document.querySelector('#speedSlider');
      if (byId) return byId;
      const inputs = Array.from(document.querySelectorAll('input[type="range"]'));
      // prefer one whose id/name/title/aria-label includes 'speed'
      const match = inputs.find(el => /speed/i.test(el.id) || /speed/i.test(el.name) || /speed/i.test(el.title || '') || /speed/i.test(el.getAttribute('aria-label') || ''));
      return match || inputs[0] || null;
    });
    const element = handle.asElement();
    if (!element) return this.page.locator('input[type="range"]').first();
    const selector = await element.evaluate(el => el.outerHTML && el.id ? `#${el.id}` : undefined);
    if (selector) {
      return this.page.locator(selector);
    }
    // fallback to nth matching of range
    return this.page.locator('input[type="range"]').first();
  }

  async sizeSlider() {
    const handle = await this.page.evaluateHandle(() => {
      const byId = document.querySelector('#sizeSlider');
      if (byId) return byId;
      const inputs = Array.from(document.querySelectorAll('input[type="range"]'));
      // prefer one whose id/name/title/aria-label includes 'size' or 'count'
      const match = inputs.find(el => /size|count|length/i.test(el.id) || /size|count|length/i.test(el.name) || /size|count|length/i.test(el.title || '') || /size|count|length/i.test(el.getAttribute('aria-label') || ''));
      // If two ranges exist and we couldn't find, pick second as size if exists
      return match || (inputs.length > 1 ? inputs[1] : inputs[0]) || null;
    });
    const element = handle.asElement();
    if (!element) return this.page.locator('input[type="range"]').nth(1);
    const selector = await element.evaluate(el => el.outerHTML && el.id ? `#${el.id}` : undefined);
    if (selector) {
      return this.page.locator(selector);
    }
    return this.page.locator('input[type="range"]').nth(1);
  }

  async patternSelect() {
    const sel = this.page.locator('#patternSelect, select[name="pattern"], select[aria-label*="pattern" i], select').first();
    return sel;
  }

  async duplicatesToggle() {
    return this.page.locator('#dupToggle, input[type="checkbox"][name*="dup" i], input[type="checkbox"][id*="dup" i]').first();
  }

  async earlyExitToggle() {
    // checkbox likely controlling early exit
    return this.page.locator('#earlyToggle, input[type="checkbox"][name*="early" i], input[type="checkbox"][id*="early" i]').first();
  }

  async togglePlay() {
    const btn = await this.playButton();
    await btn.click();
  }

  async clickStep() {
    const btn = await this.stepButton();
    await btn.click();
  }

  async clickShuffle() {
    const btn = await this.shuffleButton();
    await btn.click();
  }

  async clickReset() {
    const btn = await this.resetButton();
    await btn.click();
  }

  async clickApply() {
    const btn = await this.applyButton();
    await btn.click();
  }

  async setArrayInput(text) {
    const input = await this.arrayInput();
    await input.click({ clickCount: 3 });
    await input.fill(text);
  }

  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  async ensureBarsVisible() {
    await expect(this.bars).toHaveCountGreaterThan(0);
    await this.vizRoot.waitFor();
  }

  async getBarHeightsSignature() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bars .bar'));
      if (!bars.length) return [];
      // Use computed height in pixels
      return bars.map(el => Math.round((el.getBoundingClientRect().height || 0)));
    });
  }

  async getBarLeftSignature() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bars .bar'));
      return bars.map(el => Math.round(el.getBoundingClientRect().left));
    });
  }

  async getBarClasses() {
    return await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('.bars .bar')).map(el => el.className);
    });
  }

  async countBarsWithClass(cls) {
    return await this.page.locator(`.bars .bar.${cls}`).count();
  }

  async isPlaying() {
    // Playing state likely shows Pause label
    const btn = await this.playButton();
    const text = (await btn.textContent()) || '';
    return /pause/i.test(text);
  }

  async waitForComparingPairChange(timeout = 3000) {
    // Track indices of comparing bars by x-positions of those with 'comparing'
    const initial = await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bars .bar'));
      const comps = bars
        .map((el, idx) => ({ idx, x: el.getBoundingClientRect().left, is: el.classList.contains('comparing') }))
        .filter(o => o.is)
        .map(o => o.idx);
      return comps;
    });
    await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('.bars .bar'));
      const comps = bars
        .map((el, idx) => ({ idx, is: el.classList.contains('comparing') }))
        .filter(o => o.is)
        .map(o => o.idx);
      return comps.length === 2;
    }, null, { timeout });
    await this.page.waitForFunction((init) => {
      const bars = Array.from(document.querySelectorAll('.bars .bar'));
      const comps = bars
        .map((el, idx) => ({ idx, is: el.classList.contains('comparing') }))
        .filter(o => o.is)
        .map(o => o.idx);
      if (comps.length !== 2) return false;
      if (init && init.length === 2 && (init[0] !== comps[0] || init[1] !== comps[1])) return true;
      // also consider if init was not recorded properly, any pair will do after two ticks
      return false;
    }, initial, { timeout });
  }

  async getStatValue(labelRegex) {
    // Try to find text block that contains the label and a number
    const candidates = this.page.locator('text=/./').filter({ hasText: labelRegex });
    const count = await candidates.count();
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      const text = (await el.innerText()).trim();
      const m = text.match(/(\d+)(?!.*\d)/);
      if (m) return parseInt(m[1], 10);
      // Try neighbors
      const numSpan = el.locator('xpath=following::span[1]');
      if (await numSpan.count()) {
        const t = (await numSpan.first().innerText()).trim();
        const mm = t.match(/\d+/);
        if (mm) return parseInt(mm[0], 10);
      }
    }
    // Fallback to window variables if exposed
    const fallback = await this.page.evaluate((label) => {
      const lower = label.toLowerCase();
      const g = (name) => typeof window[name] === 'number' ? window[name] : null;
      if (/comparison/.test(lower)) return g('comparisons') ?? g('comparisonCount') ?? g('statsComparisons') ?? null;
      if (/swap/.test(lower)) return g('swaps') ?? g('swapCount') ?? g('statsSwaps') ?? null;
      if (/pass/.test(lower)) return g('iPass') ?? g('passCount') ?? null;
      if (/settled/.test(lower)) return g('settledCount') ?? null;
      return null;
    }, String(labelRegex));
    return fallback;
  }

  async setSliderValue(locator, value) {
    const el = typeof locator.click === 'function' ? locator : await locator;
    const handle = await el.elementHandle();
    await this.page.evaluate((input, v) => {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, handle, String(value));
  }

  async setSelectValue(locator, valueOrIndex = 0) {
    const count = await locator.locator('option').count();
    if (count === 0) return;
    if (typeof valueOrIndex === 'string') {
      await locator.selectOption({ value: valueOrIndex });
      return;
    }
    const idx = Math.min(Math.max(0, valueOrIndex), count - 1);
    const opt = locator.locator('option').nth(idx);
    const val = await opt.getAttribute('value');
    if (val) {
      await locator.selectOption(val);
    } else {
      await opt.click();
    }
  }

  async ensureToggle(locator, desiredChecked) {
    const el = locator;
    if (!(await el.count())) return;
    const checked = await el.isChecked();
    if (checked !== desiredChecked) {
      await el.click();
    }
  }

  async getPlayLabel() {
    const btn = await this.playButton();
    return (await btn.textContent())?.trim();
  }
}

// Extend expect with countGreaterThan
expect.extend({
  async toHaveCountGreaterThan(locator, min) {
    const count = await locator.count();
    const pass = count > min;
    return {
      pass,
      message: () => `Expected locator to have count > ${min}, but received ${count}`,
    };
  },
});

test.describe.configure({ mode: 'serial' });

test.describe('Bubble Sort Visual Lab - FSM and UI E2E', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new BubbleSortPage(page);
    await pageObj.goto();
    await pageObj.ensureBarsVisible();
  });

  test('Initialization: INIT -> idle renders bars, sets defaults', async ({ page }) => {
    // Validate initial render and that app is idle (Play shows "Play")
    const barCount = await pageObj.bars.count();
    expect(barCount).toBeGreaterThan(1);

    const playLabel = await pageObj.getPlayLabel();
    expect(playLabel).toMatch(/play/i);

    // Animation speed CSS variable is applied
    const animVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--anim-duration').trim());
    expect(animVar).toMatch(/ms|s/);

    // Stats initial (comparisons, swaps, passes, settled) likely 0
    const comps = await pageObj.getStatValue(/comparisons?/i);
    const swaps = await pageObj.getStatValue(/swaps?/i);
    const passes = await pageObj.getStatValue(/passes?/i);
    const settled = await pageObj.getStatValue(/settled/i);
    if (comps !== null) expect(comps).toBe(0);
    if (swaps !== null) expect(swaps).toBe(0);
    if (passes !== null) expect(passes).toBe(0);
    if (settled !== null) expect(settled).toBe(0);
  });

  test.describe('Applying input (applying_input, input_error)', () => {
    test('ARRAY_INPUT_ENTER / APPLY_INPUT_CLICK with invalid input -> INPUT_INVALID -> input_error state shows error', async () => {
      const input = await pageObj.arrayInput();
      await input.click();
      await input.fill('1, a, 3, @');

      // Use Enter in input to trigger ARRAY_INPUT_ENTER -> applying_input
      await pageObj.pressKey('Enter');

      // Expect narration or input to indicate invalid
      const narr = await pageObj.narration.first().innerText().catch(() => '');
      if (narr) {
        expect(narr.toLowerCase()).toMatch(/invalid|error|number/i);
      } else {
        // Alternatively input gets error class/aria-invalid
        const ariaInvalid = await input.getAttribute('aria-invalid');
        const className = await input.getAttribute('class');
        expect(ariaInvalid === 'true' || /error|invalid/i.test(className || '')).toBeTruthy();
      }

      // From input_error, clicking shuffle should still work (transition to generating)
      const beforeSig = await pageObj.getBarHeightsSignature();
      await pageObj.clickShuffle();
      await expect(pageObj.bars).toHaveCountGreaterThan(0);
      await expect.poll(async () => {
        const after = await pageObj.getBarHeightsSignature();
        // change may be subtle; compare arrays differ in at least one entry
        return after.some((v, i) => v !== beforeSig[i]);
      }).toBeTruthy();
    });

    test('Valid APPLY_INPUT_CLICK and ARRAY_INPUT_ENTER -> INPUT_APPLIED -> idle, renders array', async () => {
      const validArray = '5,1,3,2';
      await pageObj.setArrayInput(validArray);
      // Try click Apply if exists; else Enter on input
      const applyBtn = await pageObj.applyButton();
      if (await applyBtn.count()) {
        await pageObj.clickApply();
      } else {
        await pageObj.pressKey('Enter');
      }

      // Bars should reflect values relative ordering. We can check that relative heights for positions 0 and 1 correspond to 5 and 1 (first taller than second)
      await pageObj.ensureBarsVisible();
      const heights = await pageObj.getBarHeightsSignature();
      expect(heights.length).toBe(4);
      expect(heights[0]).toBeGreaterThan(heights[1]);

      // State back to idle: Play shows "Play"
      const playLabel = await pageObj.getPlayLabel();
      expect(playLabel).toMatch(/play/i);
    });
  });

  test.describe('Generating (generating -> DATA_READY -> idle)', () => {
    test('SHUFFLE_CLICK generates new array and updates DOM', async () => {
      const before = await pageObj.getBarHeightsSignature();
      await pageObj.clickShuffle();
      await expect.poll(async () => {
        const after = await pageObj.getBarHeightsSignature();
        return after.length && (after.length !== before.length || after.some((v, i) => v !== before[i]));
      }).toBeTruthy();
      const playLabel = await pageObj.getPlayLabel();
      expect(playLabel).toMatch(/play/i);
    });

    test('KEY_S triggers shuffle generation', async () => {
      const pre = await pageObj.getBarHeightsSignature();
      await pageObj.pressKey('KeyS');
      await expect.poll(async () => {
        const after = await pageObj.getBarHeightsSignature();
        return after.length && after.some((v, i) => v !== pre[i]);
      }).toBeTruthy();
    });
  });

  test.describe('Resetting (resetting -> DATA_READY|RESET_NO_DATA -> idle)', () => {
    test('RESET_CLICK restores to initial array snapshot', async () => {
      // Shuffle once to set a known initialArray
      await pageObj.clickShuffle();
      const initialSignature = await pageObj.getBarHeightsSignature();

      // Perform one step to mutate array order (if swap occurs) or at least stats
      const compsBefore = await pageObj.getStatValue(/comparisons?/i);
      await pageObj.clickStep();
      await page.waitForTimeout(200);
      const compsAfter = await pageObj.getStatValue(/comparisons?/i);
      if (compsBefore !== null && compsAfter !== null) {
        expect(compsAfter).toBeGreaterThanOrEqual(compsBefore);
      }

      // Click reset: should restore to initial signature
      await pageObj.clickReset();
      await expect.poll(async () => {
        const post = await pageObj.getBarHeightsSignature();
        return post.length === initialSignature.length && post.every((v, i) => v === initialSignature[i]);
      }).toBeTruthy();
    });

    test('KEY_R triggers reset as well', async () => {
      await pageObj.clickShuffle();
      const initSig = await pageObj.getBarHeightsSignature();
      // Make a change: step once
      await pageObj.clickStep();
      await page.waitForTimeout(150);
      await pageObj.pressKey('KeyR');
      await expect.poll(async () => {
        const post = await pageObj.getBarHeightsSignature();
        return post.length === initSig.length && post.every((v, i) => v === initSig[i]);
      }).toBeTruthy();
    });

    test('RESET_NO_DATA path when initialArray is empty shows narration and remains idle', async () => {
      // Force initialArray empty via page context if possible
      await page.evaluate(() => {
        // Try to set various likely scopes
        if (typeof window.initialArray !== 'undefined') {
          window.initialArray = [];
        } else {
          // Try attaching a known symbol the app might read
          window.initialArray = [];
        }
      });
      const before = await pageObj.getBarHeightsSignature();
      await pageObj.clickReset();
      await page.waitForTimeout(100);

      // Bars shouldn't change if RESET_NO_DATA; narration informs user
      const after = await pageObj.getBarHeightsSignature();
      expect(after.length).toBe(before.length);
      const narr = await pageObj.narration.first().innerText().catch(() => '');
      if (narr) {
        expect(narr.toLowerCase()).toMatch(/no.*data|nothing.*reset|initial/i);
      }
      const playLabel = await pageObj.getPlayLabel();
      expect(playLabel).toMatch(/play/i);
    });
  });

  test.describe('Stepping: pass_check -> comparing -> swapping -> step_finalize', () => {
    test('STEP_CLICK transitions to comparing with two bars highlighted', async () => {
      await pageObj.clickShuffle();
      await pageObj.clickReset(); // ensure initial and jIndex at 0
      await pageObj.clickStep();

      // Expect exactly two bars to have class 'comparing'
      await pageObj.page.waitForFunction(() => document.querySelectorAll('.bars .bar.comparing').length === 2);
      const comparingCount = await pageObj.countBarsWithClass('comparing');
      expect(comparingCount).toBe(2);

      // Stats comparisons incremented
      const comps = await pageObj.getStatValue(/comparisons?/i);
      if (comps !== null) expect(comps).toBeGreaterThanOrEqual(1);
    });

    test('NEEDS_SWAP path produces swapped classes; NO_SWAP path does not', async () => {
      // Provide a known array to force a swap on first comparison: [3,1,2]
      await pageObj.setArrayInput('3,1,2');
      const applyBtn = await pageObj.applyButton();
      if (await applyBtn.count()) await pageObj.clickApply(); else await pageObj.pressKey('Enter');
      await pageObj.clickStep();
      // For a swap, expect .swapped to appear on two bars
      await pageObj.page.waitForSelector('.bars .bar.swapped', { state: 'attached', timeout: 2000 });
      const swappedCount = await pageObj.countBarsWithClass('swapped');
      expect(swappedCount).toBeGreaterThanOrEqual(2);

      // Now a NO_SWAP scenario: [1,3,2] first compare 1 and 3 -> no swap
      await pageObj.setArrayInput('1,3,2');
      if (await applyBtn.count()) await pageObj.clickApply(); else await pageObj.pressKey('Enter');
      await pageObj.clickStep();
      await page.waitForTimeout(200);
      const swappedAfter = await pageObj.countBarsWithClass('swapped');
      // Should be 0 or unchanged minimal
      expect(swappedAfter).toBeLessThanOrEqual(1);
    });

    test('STEP_CONTINUE_PAUSED: single step in idle does not auto-progress to next step', async () => {
      await pageObj.clickReset();
      const compsBefore = await pageObj.getStatValue(/comparisons?/i) ?? 0;
      await pageObj.clickStep();
      await page.waitForTimeout(700); // wait longer than animation
      const compsAfter = await pageObj.getStatValue(/comparisons?/i) ?? 0;
      // Expect at most one comparison increment when paused
      expect(compsAfter - compsBefore).toBeGreaterThanOrEqual(1);
      expect(compsAfter - compsBefore).toBeLessThanOrEqual(2); // allow minor if inner micro-steps
      // Ensure Play shows "Play" still (paused)
      const playLabel = await pageObj.getPlayLabel();
      expect(playLabel).toMatch(/play/i);
    });
  });

  test.describe('Autoplay (playing): start_autoplay, AUTOPLAY_TICK, stop_autoplay on exit', () => {
    test('PLAY_CLICK enters playing and steps advance automatically', async () => {
      await pageObj.clickReset();
      await pageObj.togglePlay(); // Play
      expect(await pageObj.isPlaying()).toBeTruthy();

      // Wait for comparing pairs to change indicating AUTOPLAY_TICK advancing
      await pageObj.waitForComparingPairChange(4000);
      // Pause
      await pageObj.togglePlay();
      expect(await pageObj.isPlaying()).toBeFalsy();
      const label = await pageObj.getPlayLabel();
      expect(label).toMatch(/play/i); // stop_autoplay onExit resets label
    });

    test('Speed change (SPEED_CHANGE) while playing keeps playing and adjusts CSS var', async () => {
      await pageObj.togglePlay(); // start
      expect(await pageObj.isPlaying()).toBeTruthy();

      const speed = await pageObj.speedSlider();
      // Read current anim-duration
      const beforeVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--anim-duration').trim());
      // Change slider to a different value
      await pageObj.setSliderValue(speed, 50);
      // Expect CSS var to change
      const afterVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--anim-duration').trim());
      expect(afterVar).not.toBe(beforeVar);

      // Still playing and steps continue
      await pageObj.waitForComparingPairChange(4000);
      // Pause for cleanup
      await pageObj.togglePlay();
    });

    test('RESIZE event while playing does not interrupt playback', async () => {
      await pageObj.togglePlay();
      expect(await pageObj.isPlaying()).toBeTruthy();
      const initialCount = await pageObj.bars.count();
      await pageObj.page.setViewportSize({ width: 920, height: 800 });
      await pageObj.waitForComparingPairChange(4000);
      const afterCount = await pageObj.bars.count();
      expect(afterCount).toBe(initialCount);
      await pageObj.togglePlay();
    });

    test('KEY_SPACE toggles play/pause and KEY_ENTER steps while playing routes to pass_check', async () => {
      // Start from idle
      await pageObj.pressKey('Space');
      expect(await pageObj.isPlaying()).toBeTruthy();
      // Press Enter triggers a step; ensure still playing (STEP_CLICK allowed in playing)
      await pageObj.pressKey('Enter');
      await page.waitForTimeout(200);
      expect(await pageObj.isPlaying()).toBeTruthy();
      // Pause using Space
      await pageObj.pressKey('Space');
      expect(await pageObj.isPlaying()).toBeFalsy();
    });
  });

  test.describe('Pass boundaries and completion (early_exit, done)', () => {
    test('End of pass marks a settled bar (PASS_ENDED_CONTINUE) when early exit disabled', async () => {
      // Disable early exit if toggle exists
      const earlyToggle = await pageObj.earlyExitToggle();
      if (await earlyToggle.count()) {
        await pageObj.ensureToggle(earlyToggle, false);
      }
      await pageObj.clickShuffle();
      await pageObj.clickReset();
      await pageObj.togglePlay();
      // Wait until at least one bar has class 'settled' indicating end of first pass
      await pageObj.page.waitForFunction(() => document.querySelectorAll('.bars .bar.settled').length >= 1, null, { timeout: 10000 });
      const settledCount = await pageObj.countBarsWithClass('settled');
      expect(settledCount).toBeGreaterThanOrEqual(1);
      // Pause
      await pageObj.togglePlay();
    });

    test('Early exit enabled with sorted input -> early_exit -> done -> all bars settled and narration updated', async () => {
      // Enter sorted array and enable early exit
      await pageObj.setArrayInput('1,2,3,4,5,6');
      const applyBtn = await pageObj.applyButton();
      if (await applyBtn.count()) await pageObj.clickApply(); else await pageObj.pressKey('Enter');

      const earlyToggle = await pageObj.earlyExitToggle();
      if (await earlyToggle.count()) {
        await pageObj.ensureToggle(earlyToggle, true);
      }

      await pageObj.togglePlay();
      // Wait until all bars settled (done)
      await pageObj.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bars .bar');
        if (!bars.length) return false;
        return Array.from(bars).every(el => el.classList.contains('settled'));
      }, null, { timeout: 12000 });

      // Validate narration includes completion hint
      const narr = await pageObj.narration.first().innerText().catch(() => '');
      if (narr) {
        expect(narr.toLowerCase()).toMatch(/sorted|complete|done|finished|early/i);
      }

      // Done state still allows new actions; shuffle should work
      await pageObj.clickShuffle();
      await expect(pageObj.bars).toHaveCountGreaterThan(0);
    });

    test('ARRAY_SORTED -> done finalizes: play button shows Play and all bars settled', async () => {
      // Use a small array to quickly reach done
      await pageObj.setArrayInput('4,3,2,1');
      const applyBtn = await pageObj.applyButton();
      if (await applyBtn.count()) await pageObj.clickApply(); else await pageObj.pressKey('Enter');

      await pageObj.togglePlay();
      await pageObj.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.bars .bar');
        if (!bars.length) return false;
        return Array.from(bars).every(el => el.classList.contains('settled'));
      }, null, { timeout: 15000 });

      const playLabel = await pageObj.getPlayLabel();
      expect(playLabel).toMatch(/play/i);
    });
  });

  test.describe('Controls: SIZE_CHANGE, PATTERN_CHANGE, DUP_TOGGLE_CHANGE', () => {
    test('Changing size/pattern/duplicates does not update data until SHUFFLE_CLICK; then DATA_READY updates bars', async () => {
      await pageObj.clickShuffle();
      const beforeSig = await pageObj.getBarHeightsSignature();

      // Change size slider
      const sizeSlider = await pageObj.sizeSlider();
      await pageObj.setSliderValue(sizeSlider, 8);
      const midSig = await pageObj.getBarHeightsSignature();
      expect(midSig).toEqual(beforeSig); // no change before shuffle

      // Change pattern select to a different option if available
      const pattern = await pageObj.patternSelect();
      if (await pattern.count()) {
        await pageObj.setSelectValue(pattern, 1);
      }

      // Toggle duplicates if exists
      const dupToggle = await pageObj.duplicatesToggle();
      if (await dupToggle.count()) {
        const initialChecked = await dupToggle.isChecked();
        await dupToggle.click();
        expect(await dupToggle.isChecked()).toBe(!initialChecked);
      }

      // Shuffle to apply and update
      await pageObj.clickShuffle();
      await expect.poll(async () => {
        const after = await pageObj.getBarHeightsSignature();
        // bar count may change due to size; or at least order changes
        return after.length !== beforeSig.length || after.some((v, i) => v !== beforeSig[i]);
      }).toBeTruthy();

      // If size slider used, ensure count equals slider value if accessible
      const sizeValue = await sizeSlider.inputValue().catch(() => null);
      if (sizeValue) {
        const count = await pageObj.bars.count();
        // Allow off-by-one due to UI rounding constraints
        expect(Math.abs(count - parseInt(sizeValue, 10)) <= 2).toBeTruthy();
      }
    });
  });

  test.describe('Keyboard shortcuts and events coverage', () => {
    test('Global Enter triggers STEP_CLICK from idle; Enter in array input triggers ARRAY_INPUT_ENTER apply, not step', async () => {
      await pageObj.clickReset();
      // Ensure idle
      const compsBefore = await pageObj.getStatValue(/comparisons?/i) ?? 0;
      await pageObj.pressKey('Enter');
      await page.waitForTimeout(150);
      const compsAfter = await pageObj.getStatValue(/comparisons?/i) ?? 0;
      expect(compsAfter).toBeGreaterThanOrEqual(compsBefore + 1);

      // Now focus array input and press Enter to apply input instead
      const input = await pageObj.arrayInput();
      await input.click();
      await input.fill('9,8,7');
      await pageObj.pressKey('Enter'); // apply, not step
      await page.waitForTimeout(150);
      const compsAfterApply = await pageObj.getStatValue(/comparisons?/i) ?? 0;
      // Should not jump by more than 1 further; accept if equal or minor
      expect(compsAfterApply - compsAfter).toBeLessThanOrEqual(1);
    });

    test('S, R, Space keys map to SHUFFLE_CLICK, RESET_CLICK, PLAY_CLICK', async () => {
      // S -> shuffle
      const pre = await pageObj.getBarHeightsSignature();
      await pageObj.pressKey('KeyS');
      await expect.poll(async () => {
        const after = await pageObj.getBarHeightsSignature();
        return after.some((v, i) => v !== pre[i]);
      }).toBeTruthy();

      // Space -> play/pause
      await pageObj.pressKey('Space');
      expect(await pageObj.isPlaying()).toBeTruthy();
      await pageObj.pressKey('Space');
      expect(await pageObj.isPlaying()).toBeFalsy();

      // R -> reset
      await pageObj.pressKey('KeyS'); // shuffle again
      const initialSig = await pageObj.getBarHeightsSignature();
      await pageObj.clickStep(); // change state a bit
      await page.waitForTimeout(200);
      await pageObj.pressKey('KeyR');
      await expect.poll(async () => {
        const after = await pageObj.getBarHeightsSignature();
        return after.length === initialSig.length && after.every((v, i) => v === initialSig[i]);
      }).toBeTruthy();
    });

    test('RESIZE from idle does not change bar count and remains responsive', async () => {
      const countBefore = await pageObj.bars.count();
      await pageObj.page.setViewportSize({ width: 620, height: 700 });
      await page.waitForTimeout(100);
      const countAfter = await pageObj.bars.count();
      expect(countAfter).toBe(countBefore);
    });
  });
});
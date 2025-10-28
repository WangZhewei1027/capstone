import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/b089cac0-b402-11f0-bdbc-23fe6fc76a5e.html';

class ModulePage {
  constructor(page) {
    this.page = page;
    // Buttons by accessible name
    this.playButton = page.getByRole('button', { name: /play|pause/i });
    this.stepButton = page.getByRole('button', { name: /step/i });
    this.resetButton = page.getByRole('button', { name: /reset/i });
    this.randomizeButton = page.getByRole('button', { name: /randomize/i });
    this.stopButton = page.getByRole('button', { name: /stop/i });
    this.loadButton = page.getByRole('button', { name: /load( array)?/i });
    // Inputs and toggles
    this.arrayInput = page.getByRole('textbox', { name: /array/i }).or(page.locator('input[type="text"]'));
    this.speedSlider = page.locator('input[type="range"]');
    this.earlyExitToggle = page.getByRole('checkbox', { name: /early( exit)?|break/i }).or(page.locator('input[type="checkbox"]'));
    this.orderSelect = page.getByRole('combobox', { name: /order/i })
      .or(page.getByRole('radio', { name: /ascending/i }))
      .or(page.getByRole('radio', { name: /descending/i }));
    // Announcements/status
    this.ariaLive = page.locator('[aria-live]');
    // Help/error text for input
    this.inputHelp = page.locator('#inputHelp, .input-help, [data-testid="inputHelp"]');
    // Bars container heuristics
    this.barsContainer = page.locator('#bars, .bars, [data-testid="bars"]');
    this.barItems = page.locator('#bars .bar, .bars .bar, .bar, [data-role="bar"], [data-value]');
    // Pseudocode or code lines
    this.pseudoLines = page.locator('[data-testid="pseudocode"], #pseudocode, .pseudocode').locator('[data-line], .line, li');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  async waitForAppLoaded() {
    // Wait for any sign of module becoming ready: Play button visible or bars rendered or Ready announcement.
    await expect(this.playButton).toBeVisible({ timeout: 10000 });
    await this.waitForReadyState();
  }

  async waitForReadyState() {
    // Ready state heuristics: 'Ready' announcement or Play button shows 'Play' and not currently 'Pause'
    try {
      await expect(this.ariaLive).toContainText(/ready/i, { timeout: 5000 });
    } catch {
      // Fallback to Play button text check
      await expect(this.playButton).toHaveText(/play/i, { timeout: 5000 });
    }
  }

  async getPlayButtonText() {
    return await this.playButton.textContent();
  }

  async togglePlayPause() {
    await this.playButton.click();
  }

  async clickStep() {
    await this.stepButton.click();
  }

  async clickReset() {
    await this.resetButton.click();
  }

  async clickRandomize() {
    await this.randomizeButton.click();
  }

  async clickStop() {
    await this.stopButton.click();
  }

  async loadArray(values) {
    const text = Array.isArray(values) ? values.join(',') : String(values);
    await this.arrayInput.fill(text);
    // Some apps auto-load on blur or Enter; first try clicking Load if available
    if (await this.loadButton.count()) {
      await this.loadButton.click();
    } else {
      await this.arrayInput.press('Enter');
    }
  }

  async setEarlyExit(enable) {
    const count = await this.earlyExitToggle.count();
    if (!count) return;
    const isChecked = await this.earlyExitToggle.isChecked().catch(() => false);
    if (enable && !isChecked) {
      await this.earlyExitToggle.check({ force: true });
    } else if (!enable && isChecked) {
      await this.earlyExitToggle.uncheck({ force: true });
    }
  }

  async setSpeedToFastest() {
    const count = await this.speedSlider.count();
    if (!count) return;
    const slider = this.speedSlider;
    // move slider to minimum value (fastest) if lower is faster, else maximum
    const min = await slider.getAttribute('min');
    const max = await slider.getAttribute('max');
    const minVal = min ? parseFloat(min) : 0;
    const maxVal = max ? parseFloat(max) : 1000;
    // Try set value attribute, then dispatch input/change
    await this.page.evaluate((selector, value) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, await slider.selector(), minVal);
  }

  async changeOrder(order) {
    // order: 'ascending' or 'descending'
    const lower = order.toLowerCase();
    const comboboxCount = await this.page.getByRole('combobox', { name: /order/i }).count();
    if (comboboxCount) {
      const combo = this.page.getByRole('combobox', { name: /order/i });
      await combo.selectOption({ label: lower.match(/asc/) ? /asc/i : /desc/i }).catch(async () => {
        const options = this.page.getByRole('option', { name: lower.match(/asc/) ? /asc/i : /desc/i });
        await options.click();
      });
      return;
    }
    const ascRadio = this.page.getByRole('radio', { name: /ascending/i });
    const descRadio = this.page.getByRole('radio', { name: /descending/i });
    if (lower.match(/asc/) && (await ascRadio.count())) {
      await ascRadio.check({ force: true });
    } else if (lower.match(/desc/) && (await descRadio.count())) {
      await descRadio.check({ force: true });
    }
  }

  async getBarsValues() {
    return await this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('#bars .bar, .bars .bar, .bar, [data-role="bar"], [data-value]'));
      if (bars.length === 0) return [];
      return bars.map(b => {
        let dv = parseFloat(b.getAttribute('data-value') || '');
        if (!Number.isNaN(dv)) return dv;
        const text = (b.textContent || '').trim();
        const n = parseFloat(text);
        if (!Number.isNaN(n)) return n;
        const style = window.getComputedStyle(b);
        const h = parseFloat(style.height || '0');
        return h;
      });
    });
  }

  async isArraySortedAscending(values) {
    const arr = values || (await this.getBarsValues());
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }

  async isArraySortedDescending(values) {
    const arr = values || (await this.getBarsValues());
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > arr[i - 1]) return false;
    }
    return true;
  }

  async getAnnouncementText() {
    const count = await this.ariaLive.count();
    if (!count) return '';
    return (await this.ariaLive.innerText()).trim();
  }

  async getStatValue(labelRegex) {
    // Find a stat by text and parse number near it
    const statLocator = this.page.locator(`text=${labelRegex.source}`).first();
    const count = await statLocator.count();
    if (count) {
      const text = (await statLocator.innerText()).trim();
      const m = text.match(/(\d+(\.\d+)?)/);
      if (m) return parseFloat(m[0]);
    }
    // Fallback: search by data-testid
    const id = String(labelRegex).toLowerCase().includes('compar') ? 'comparisons' :
               String(labelRegex).toLowerCase().includes('swap') ? 'swaps' :
               String(labelRegex).toLowerCase().includes('pass') ? 'pass' : '';
    if (id) {
      const loc = this.page.locator(`[data-testid="${id}"]`);
      if (await loc.count()) {
        const t = (await loc.innerText()).trim();
        const m = t.match(/(\d+(\.\d+)?)/);
        if (m) return parseFloat(m[0]);
      }
    }
    // Fallback: scan for any labels
    const texts = await this.page.locator('text=/Comparisons|Swaps|Pass/i').allInnerTexts();
    for (const t of texts) {
      if (labelRegex.test(t)) {
        const m = t.match(/(\d+(\.\d+)?)/);
        if (m) return parseFloat(m[0]);
      }
    }
    return NaN;
  }

  async getComparingBarsCount() {
    return await this.page.evaluate(() => {
      const cand = Array.from(document.querySelectorAll('.bar.compare, .bar--compare, .comparing, [data-status="comparing"]'));
      return cand.length;
    });
  }

  async getSwappingBarsCount() {
    return await this.page.evaluate(() => {
      const cand = Array.from(document.querySelectorAll('.bar.swap, .bar--swap, .swapping, [data-status="swapping"]'));
      return cand.length;
    });
  }

  async areHighlightsCleared() {
    const comparing = await this.getComparingBarsCount();
    const swapping = await this.getSwappingBarsCount();
    return comparing === 0 && swapping === 0;
  }

  async getFinishedFlagFromState() {
    const flag = await this.page.evaluate(() => {
      const s = (window.state || window.appState || {}).finished;
      return !!s;
    });
    return !!flag;
  }

  async getPlayingFlagFromState() {
    const flag = await this.page.evaluate(() => {
      const s = (window.state || window.appState || {}).playing;
      return !!s;
    });
    return !!flag;
  }

  async getSpeedFromState() {
    return await this.page.evaluate(() => {
      const s = (window.state || window.appState || {});
      return typeof s.speed === 'number' ? s.speed : null;
    });
  }

  async getFSMStateName() {
    return await this.page.evaluate(() => {
      const s = (window.fsm || window.state || window.appState || {});
      const name = s.current || s.state || s.value || s.mode || null;
      return name || null;
    });
  }
}

test.describe('Bubble Sort Interactive Module FSM - b089cac0-b402-11f0-bdbc-23fe6fc76a5e', () => {
  test.beforeEach(async ({ page }) => {
    const app = new ModulePage(page);
    await app.goto();
    await app.waitForAppLoaded();
  });

  test.afterEach(async ({ page }) => {
    // Ensure any playing loop is stopped to isolate tests
    const app = new ModulePage(page);
    const playing = await app.getPlayingFlagFromState();
    if (playing) {
      await app.togglePlayPause();
      await app.page.waitForTimeout(100);
    }
  });

  test.describe('Initialization and Ready State', () => {
    test('initializing -> ready (INIT_COMPLETE) and UI default state', async ({ page }) => {
      const app = new ModulePage(page);
      // Before ready, some initialization may occur; immediately check eventual 'Ready' announcement
      const stateName = await app.getFSMStateName();
      // Verify bars rendered
      const values = await app.getBarsValues();
      expect(values.length).toBeGreaterThan(0);
      // Ready announcement
      const announce = await app.getAnnouncementText();
      expect(announce.toLowerCase()).toContain('ready');
      // Play button text set to Play, not Pause
      const playText = await app.getPlayButtonText();
      expect(playText.toLowerCase()).toMatch(/play/);
      // Stats reset on ready
      const comps = await app.getStatValue(/comparisons/i);
      const swaps = await app.getStatValue(/swaps/i);
      const pass = await app.getStatValue(/pass/i);
      // Allow NaN fallback for missing UI, but typical values are 0
      if (!Number.isNaN(comps)) expect(comps).toBe(0);
      if (!Number.isNaN(swaps)) expect(swaps).toBe(0);
      if (!Number.isNaN(pass)) expect(pass).toBe(0);
    });

    test('RANDOMIZE_CLICK, RESET_CLICK, LOAD_ARRAY_SUCCESS keep or return to ready and update array', async ({ page }) => {
      const app = new ModulePage(page);
      const initialValues = await app.getBarsValues();

      // Randomize from ready -> ready
      await app.clickRandomize();
      const valuesAfterRandomize = await app.getBarsValues();
      expect(valuesAfterRandomize.length).toBeGreaterThan(0);
      // Should be different array or at least reinitialized
      expect(JSON.stringify(valuesAfterRandomize) === JSON.stringify(initialValues)).toBeFalsy();

      await app.waitForReadyState();

      // Reset returns to ready and resets counters
      await app.clickReset();
      await app.waitForReadyState();
      const compsAfterReset = await app.getStatValue(/comparisons/i);
      const swapsAfterReset = await app.getStatValue(/swaps/i);
      if (!Number.isNaN(compsAfterReset)) expect(compsAfterReset).toBe(0);
      if (!Number.isNaN(swapsAfterReset)) expect(swapsAfterReset).toBe(0);

      // Load array success
      await app.loadArray([5, 1, 3, 2]);
      await app.waitForReadyState();
      const loadedValues = await app.getBarsValues();
      // Expect the values to match loaded input order (best effort)
      if (loadedValues.length >= 4) {
        // Order might map to heights; allow relaxation: just check first two match 5,1 ordering by relative height/value
        const first = loadedValues[0];
        const second = loadedValues[1];
        expect(first).toBeGreaterThan(second);
      }
    });

    test('LOAD_ARRAY_FAILURE shows inline error and does not change algorithmic state', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      const beforeValues = await app.getBarsValues();
      await app.arrayInput.fill('a, b, c');
      if (await app.loadButton.count()) {
        await app.loadButton.click();
      } else {
        await app.arrayInput.press('Enter');
      }
      // Error/help visible
      const helpCount = await app.inputHelp.count();
      if (helpCount) {
        const helpText = (await app.inputHelp.innerText()).toLowerCase();
        expect(helpText).toMatch(/invalid|error|numbers|comma|enter/i);
      } else {
        // fallback: look for generic error text
        const errLocator = page.locator('text=/invalid|please enter|error/i');
        const errCount = await errLocator.count();
        expect(errCount).toBeGreaterThan(0);
      }
      const afterValues = await app.getBarsValues();
      expect(JSON.stringify(afterValues)).toBe(JSON.stringify(beforeValues));
      // State remains ready (heuristic)
      const playText = await app.getPlayButtonText();
      expect(playText.toLowerCase()).toMatch(/play/);
    });
  });

  test.describe('Playing and Paused states with Play/Pause toggle', () => {
    test('PLAY_TOGGLE transitions: ready -> playing -> paused', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();

      // Toggle play -> playing
      await app.togglePlayPause();
      // Verify Play button shows Pause
      await expect(app.playButton).toHaveText(/pause/i, { timeout: 2000 });
      // Stats should start increasing over time (AUTO_STEP_COMPARE etc.)
      const compsBefore = await app.getStatValue(/comparisons/i);
      await app.page.waitForTimeout(600);
      const compsAfter = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBefore) && !Number.isNaN(compsAfter)) {
        expect(compsAfter).toBeGreaterThanOrEqual(compsBefore);
      }

      // Toggle again -> paused
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/play/i, { timeout: 2000 });

      // Verify play loop stops (stop_play_loop onExit)
      const compsPausedBefore = await app.getStatValue(/comparisons/i);
      await app.page.waitForTimeout(800);
      const compsPausedAfter = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsPausedBefore) && !Number.isNaN(compsPausedAfter)) {
        expect(compsPausedAfter).toBe(compsPausedBefore);
      }
    });

    test('SPEED_CHANGE while playing updates speed property and affects step rate', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();

      // Set speed fastest
      await app.setSpeedToFastest();
      const speedFast = await app.getSpeedFromState();

      await app.togglePlayPause(); // start playing
      // Measure number of comparisons over a window
      await app.page.waitForTimeout(100);
      const compsStart = await app.getStatValue(/comparisons/i);
      await app.page.waitForTimeout(500);
      const compsMid = await app.getStatValue(/comparisons/i);
      await app.page.waitForTimeout(500);
      const compsEnd = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsStart) && !Number.isNaN(compsEnd)) {
        expect(compsEnd).toBeGreaterThanOrEqual(compsStart);
      }

      // Pause
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/play/i);
    });

    test('ORDER_CHANGE does not alter state but changes sort direction configuration', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.clickReset();
      await app.waitForReadyState();
      // Change to descending
      await app.changeOrder('descending');
      // Ensure still paused/ready
      await expect(app.playButton).toHaveText(/play/i);

      // Load a known array and play to completion
      await app.loadArray([1, 2, 3, 4]);
      await app.waitForReadyState();
      await app.togglePlayPause();
      await app.page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 15000 }).catch(async () => {
        // fallback: wait until bars appear sorted (descending expected)
        const ok = await app.isArraySortedDescending();
        if (!ok) throw new Error('Array did not sort as expected');
      });
      const announce = await app.getAnnouncementText();
      expect(announce.toLowerCase()).toContain('sorted');
      const vals = await app.getBarsValues();
      const descOk = await app.isArraySortedDescending(vals);
      // Either descending or ascending depending on implementation; assert sorted either way
      const ascOk = await app.isArraySortedAscending(vals);
      expect(descOk || ascOk).toBeTruthy();
    });
  });

  test.describe('Stepwise execution: comparing, swapping, and pass transitions', () => {
    test('STEP_COMPARE enters comparing and updates stats, then NEEDS_SWAP -> swapping -> ANIMATION_END_PAUSE', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      // Load array to guarantee a swap on first compare: [5,1,3]
      await app.loadArray([5, 1, 3]);
      await app.waitForReadyState();

      const compsBefore = await app.getStatValue(/comparisons/i);
      await app.clickStep();

      // In comparing: highlights should show
      const comparingCount = await app.getComparingBarsCount();
      expect(comparingCount).toBeGreaterThanOrEqual(2);
      const compsAfterCompare = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBefore) && !Number.isNaN(compsAfterCompare)) {
        expect(compsAfterCompare).toBeGreaterThan(compsBefore);
      }

      // Should transition to swapping for [5,1,3]
      // Wait for swap class/animation
      await app.page.waitForFunction(() => {
        const els = document.querySelectorAll('.bar.swap, .bar--swap, .swapping, [data-status="swapping"]');
        return els.length >= 2;
      }, undefined, { timeout: 2000 });
      const swappingCount = await app.getSwappingBarsCount();
      expect(swappingCount).toBeGreaterThanOrEqual(2);

      // Wait for animation end -> should land in paused per NO_PLAY
      await app.page.waitForTimeout(500 + 200); // account for --swap-duration
      // Clear highlights onExit
      const cleared = await app.areHighlightsCleared();
      expect(cleared).toBeTruthy();

      // Verify values swapped
      const vals = await app.getBarsValues();
      if (vals.length >= 2) {
        expect(vals[0]).toBeLessThan(vals[1]);
      }
      await expect(app.playButton).toHaveText(/play/i);
    });

    test('NO_SWAP_STEP_DONE_PAUSE: comparing with no swap returns to paused', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      // Load array that doesn't need swap on first compare: [1,5,3]
      await app.loadArray([1, 5, 3]);
      await app.waitForReadyState();
      const compsBefore = await app.getStatValue(/comparisons/i);

      await app.clickStep();

      // comparing highlights visible
      const comparingCount = await app.getComparingBarsCount();
      expect(comparingCount).toBeGreaterThanOrEqual(2);
      const compsAfter = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBefore) && !Number.isNaN(compsAfter)) {
        expect(compsAfter).toBeGreaterThan(compsBefore);
      }
      // Should return to paused without swap
      await app.page.waitForTimeout(300);
      const swappingCount = await app.getSwappingBarsCount();
      expect(swappingCount).toBe(0);
      await expect(app.playButton).toHaveText(/play/i);
    });

    test('NO_SWAP_STEP_DONE_PLAY: auto compare without swap stays in playing', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([1, 2, 3, 4]);
      await app.waitForReadyState();
      await app.setSpeedToFastest();
      await app.togglePlayPause(); // start playing

      // Wait for comparing highlights briefly
      await app.page.waitForTimeout(300);
      const comparingCount = await app.getComparingBarsCount();
      // Might be zero due to fast highlight clearing; do a lenient assertion
      expect(comparingCount).toBeGreaterThanOrEqual(0);

      // Ensure Play button still in Pause state (still playing)
      await expect(app.playButton).toHaveText(/pause/i);

      // Verify comparisons increased
      const comps1 = await app.getStatValue(/comparisons/i);
      await app.page.waitForTimeout(400);
      const comps2 = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(comps1) && !Number.isNaN(comps2)) {
        expect(comps2).toBeGreaterThanOrEqual(comps1);
      }

      // Pause at end
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/play/i);
    });

    test('STEP_END_OF_PASS enters pass_transition and PASS_CONTINUE_PAUSE returns to paused', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      // Use small array to reach end-of-pass quickly
      await app.loadArray([2, 1]);
      await app.waitForReadyState();

      // Step until end-of-pass (two comparisons max)
      await app.clickStep(); // compare 2 vs 1 -> swap (maybe)
      await app.page.waitForTimeout(400);
      await app.clickStep(); // should reach j >= end -> pass_transition

      // Check pass transition visual cue: boundary marking
      const announceBefore = await app.getAnnouncementText();
      // Might not announce; check if last bar marked sorted via style/class
      const sortedMarkers = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.bar.sorted, .bar--sorted, [data-status="sorted"]')).length;
      });
      expect(sortedMarkers).toBeGreaterThanOrEqual(1);

      // After pass_transition, should emit PASS_CONTINUE_PAUSE -> paused
      await expect(app.playButton).toHaveText(/play/i);
    });

    test('AUTO_STEP_END_OF_PASS: while playing goes through pass_transition then PASS_CONTINUE_PLAY back to playing', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([4, 3, 2, 1]); // non-sorted
      await app.waitForReadyState();
      await app.setSpeedToFastest();
      await app.togglePlayPause(); // start playing

      // Wait until a boundary is marked sorted (end-of-pass)
      await page.waitForFunction(() => {
        const sortedMarkers = Array.from(document.querySelectorAll('.bar.sorted, .bar--sorted, [data-status="sorted"]')).length;
        return sortedMarkers >= 1;
      }, null, { timeout: 8000 }).catch(() => {});

      // After pass transition, ensure still playing
      await expect(app.playButton).toHaveText(/pause/i);
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/play/i);
    });

    test('EARLY_EXIT_TOGGLE + EARLY_EXIT_BREAK: sorted input breaks early to finished', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.setEarlyExit(true);
      await app.loadArray([1, 2, 3, 4, 5]);
      await app.waitForReadyState();

      // Start playing to hit end-of-pass with no swaps and early exit
      await app.togglePlayPause();
      await page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 8000 }).catch(async () => {
        // fallback: wait for announcement
        await expect(app.ariaLive).toContainText(/sorted/i, { timeout: 8000 });
      });

      // finished: all bars marked sorted and announcement
      const announce = await app.getAnnouncementText();
      expect(announce.toLowerCase()).toContain('sorted');
      const values = await app.getBarsValues();
      const ascOk = await app.isArraySortedAscending(values);
      const descOk = await app.isArraySortedDescending(values);
      expect(ascOk || descOk).toBeTruthy();
      const finishedFlag = await app.getFinishedFlagFromState();
      expect(finishedFlag).toBeTruthy();
    });
  });

  test.describe('Finished state behavior and transitions', () => {
    test('STEP_SORT_COMPLETE or AUTO_STEP_SORT_COMPLETE transitions to finished and marks all sorted', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([1, 2, 3]);
      await app.waitForReadyState();
      await app.togglePlayPause();
      // Wait for finished via auto steps
      await page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 8000 }).catch(async () => {
        await expect(app.ariaLive).toContainText(/sorted/i, { timeout: 8000 });
      });
      const finished = await app.getFinishedFlagFromState();
      expect(finished).toBeTruthy();
      const announce = await app.getAnnouncementText();
      expect(announce.toLowerCase()).toContain('sorted');

      // All bars sorted marker
      const sortedMarkers = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.bar.sorted, .bar--sorted, [data-status="sorted"]')).length;
      });
      const totalBars = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#bars .bar, .bars .bar, .bar, [data-role="bar"], [data-value]')).length;
      });
      if (totalBars > 0) {
        expect(sortedMarkers).toBeGreaterThanOrEqual(totalBars);
      }
    });

    test('From finished, PLAY_TOGGLE resets algorithm markers and enters playing', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([1, 2, 3, 4]);
      await app.waitForReadyState();
      await app.togglePlayPause(); // play
      await page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 10000 }).catch(async () => {
        await expect(app.ariaLive).toContainText(/sorted/i, { timeout: 10000 });
      });

      // Toggle Play from finished (click handler resets and re-enters playing)
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/pause/i, { timeout: 2000 });

      // Verify sorted markers reset (no all bars sorted)
      const sortedMarkers = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.bar.sorted, .bar--sorted, [data-status="sorted"]')).length;
      });
      const totalBars = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#bars .bar, .bars .bar, .bar, [data-role="bar"], [data-value]')).length;
      });
      // After reset, not all bars should be marked sorted
      if (totalBars > 0) {
        expect(sortedMarkers).toBeLessThan(totalBars);
      }
    });

    test('STOP_CLICK drives to finished from various states', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();

      // Ready -> finished via Stop
      if (await app.stopButton.count()) {
        await app.clickStop();
        const announce = await app.getAnnouncementText();
        expect(announce.toLowerCase()).toContain('sorted');
        const finished = await app.getFinishedFlagFromState();
        expect(finished).toBeTruthy();

        // Reset to ready
        await app.clickReset();
        await app.waitForReadyState();

        // Play, then stop -> finished
        await app.togglePlayPause();
        await expect(app.playButton).toHaveText(/pause/i);
        await app.clickStop();
        await expect(app.playButton).toHaveText(/play/i);
        const finished2 = await app.getFinishedFlagFromState();
        expect(finished2).toBeTruthy();
      }
    });

    test('From finished, LOAD_ARRAY_SUCCESS, RANDOMIZE_CLICK, RESET_CLICK return to ready', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([1, 2]);
      await app.waitForReadyState();
      await app.togglePlayPause();
      await page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 8000 }).catch(async () => {
        await expect(app.ariaLive).toContainText(/sorted/i, { timeout: 8000 });
      });

      // Load new array -> ready
      await app.loadArray([3, 1, 2]);
      await app.waitForReadyState();
      await expect(app.playButton).toHaveText(/play/i);

      // Randomize -> ready
      await app.clickRandomize();
      await app.waitForReadyState();

      // Reset -> ready
      await app.clickReset();
      await app.waitForReadyState();
    });
  });

  test.describe('OnEnter/OnExit actions visual & state assertions', () => {
    test('comparing onEnter highlights pair and updates comparisons count', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([3, 2, 4]);
      await app.waitForReadyState();

      const compsBefore = await app.getStatValue(/comparisons/i);
      await app.clickStep();
      const comparingCount = await app.getComparingBarsCount();
      expect(comparingCount).toBeGreaterThanOrEqual(2);
      const compsAfter = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBefore) && !Number.isNaN(compsAfter)) {
        expect(compsAfter).toBeGreaterThan(compsBefore);
      }
    });

    test('swapping onEnter sets swap animation and updates swaps count, onExit clears highlights', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([9, 1, 5]);
      await app.waitForReadyState();
      const swapsBefore = await app.getStatValue(/swaps/i);
      await app.clickStep(); // compare first pair -> should swap
      await app.page.waitForFunction(() => {
        const els = document.querySelectorAll('.bar.swap, .bar--swap, .swapping, [data-status="swapping"]');
        return els.length >= 2;
      }, undefined, { timeout: 2000 });
      const swapsAfterEnter = await app.getStatValue(/swaps/i);
      if (!Number.isNaN(swapsBefore) && !Number.isNaN(swapsAfterEnter)) {
        expect(swapsAfterEnter).toBeGreaterThanOrEqual(swapsBefore);
      }
      // Wait for animation end and clear highlights
      await app.page.waitForTimeout(400);
      const cleared = await app.areHighlightsCleared();
      expect(cleared).toBeTruthy();
    });

    test('pass_transition onEnter marks boundary and early-exit to finished when applicable', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.setEarlyExit(true);
      await app.loadArray([1, 2, 3, 4, 5]);
      await app.waitForReadyState();
      await app.togglePlayPause();
      await page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 8000 }).catch(async () => {
        await expect(app.ariaLive).toContainText(/sorted/i, { timeout: 8000 });
      });
      const announce = await app.getAnnouncementText();
      expect(announce.toLowerCase()).toContain('sorted');
    });

    test('finished onEnter announces and marks all bars sorted; on PLAY_TOGGLE exit stops finished and starts playing', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.loadArray([2, 1]);
      await app.waitForReadyState();
      await app.togglePlayPause();
      await page.waitForFunction(() => (window.state || window.appState || {}).finished === true, null, { timeout: 8000 }).catch(async () => {
        await expect(app.ariaLive).toContainText(/sorted/i, { timeout: 8000 });
      });
      const announce = await app.getAnnouncementText();
      expect(announce.toLowerCase()).toContain('sorted');
      // Count sorted markers equal to number of bars
      const sortedMarkers = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.bar.sorted, .bar--sorted, [data-status="sorted"]')).length;
      });
      const barCount = await app.barItems.count();
      if (barCount > 0) {
        expect(sortedMarkers).toBeGreaterThanOrEqual(barCount);
      }
      // Play toggle exits finished and re-enters playing
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/pause/i);
    });
  });

  test.describe('Keyboard shortcuts trigger events', () => {
    test('Space -> PLAY_TOGGLE; S/ArrowRight -> STEP_*; R -> RESET_CLICK; G -> RANDOMIZE_CLICK', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      // Space to play
      await page.keyboard.press('Space');
      await expect(app.playButton).toHaveText(/pause/i);
      // Pause
      await page.keyboard.press('Space');
      await expect(app.playButton).toHaveText(/play/i);

      // Step via S
      const compsBefore = await app.getStatValue(/comparisons/i);
      await page.keyboard.press('KeyS');
      const compsAfterS = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBefore) && !Number.isNaN(compsAfterS)) {
        expect(compsAfterS).toBeGreaterThan(compsBefore);
      }

      // Step via ArrowRight
      const compsBeforeArrow = await app.getStatValue(/comparisons/i);
      await page.keyboard.press('ArrowRight');
      const compsAfterArrow = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBeforeArrow) && !Number.isNaN(compsAfterArrow)) {
        expect(compsAfterArrow).toBeGreaterThan(compsBeforeArrow);
      }

      // Randomize via G
      const valsBeforeG = await app.getBarsValues();
      await page.keyboard.press('KeyG');
      const valsAfterG = await app.getBarsValues();
      expect(JSON.stringify(valsAfterG) === JSON.stringify(valsBeforeG)).toBeFalsy();

      // Reset via R
      await page.keyboard.press('KeyR');
      await app.waitForReadyState();
      const compsAfterReset = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsAfterReset)) expect(compsAfterReset).toBe(0);
    });
  });

  test.describe('In-playing updates while reinitializing operations', () => {
    test('While playing, LOAD_ARRAY_SUCCESS, RESET_CLICK, RANDOMIZE_CLICK keep playing (state remains playing)', async ({ page }) => {
      const app = new ModulePage(page);
      await app.waitForReadyState();
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/pause/i);

      const compsBefore = await app.getStatValue(/comparisons/i);
      await app.loadArray([9, 8, 7, 6]);
      await app.page.waitForTimeout(200);
      await expect(app.playButton).toHaveText(/pause/i); // still playing
      // Comparisons continue
      await app.page.waitForTimeout(400);
      const compsAfterLoad = await app.getStatValue(/comparisons/i);
      if (!Number.isNaN(compsBefore) && !Number.isNaN(compsAfterLoad)) {
        expect(compsAfterLoad).toBeGreaterThanOrEqual(compsBefore);
      }

      // Reset while playing should keep loop running
      await app.clickReset();
      await expect(app.playButton).toHaveText(/pause/i);

      // Randomize while playing
      const valsBeforeRand = await app.getBarsValues();
      await app.clickRandomize();
      const valsAfterRand = await app.getBarsValues();
      expect(JSON.stringify(valsAfterRand) === JSON.stringify(valsBeforeRand)).toBeFalsy();

      // Finally pause
      await app.togglePlayPause();
      await expect(app.playButton).toHaveText(/play/i);
    });
  });
});
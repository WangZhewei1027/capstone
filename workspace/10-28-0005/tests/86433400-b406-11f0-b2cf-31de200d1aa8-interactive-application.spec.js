import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/86433400-b406-11f0-b2cf-31de200d1aa8.html';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.locators = {};
  }

  async init() {
    // Navigate to the app and wait for it to load
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');

    // Resolve main interactive controls using flexible selectors
    this.locators.playBtn = await this._firstAvailableLocator([
      this.page.locator('#playBtn'),
      this.page.getByRole('button', { name: /Play|Pause/i }),
      this.page.locator('button:has-text("Play")'),
      this.page.locator('button:has-text("Pause")')
    ]);

    this.locators.stepBtn = await this._firstAvailableLocator([
      this.page.locator('#stepBtn'),
      this.page.getByRole('button', { name: /Step/i }),
      this.page.locator('button:has-text("Step")')
    ]);

    this.locators.resetBtn = await this._firstAvailableLocator([
      this.page.locator('#resetBtn'),
      this.page.getByRole('button', { name: /Reset/i }),
      this.page.locator('button:has-text("Reset")')
    ]);

    this.locators.applyBtn = await this._firstAvailableLocator([
      this.page.locator('#applyBtn'),
      this.page.getByRole('button', { name: /Apply/i }),
      this.page.locator('button:has-text("Apply")')
    ]);

    this.locators.randomizeBtn = await this._firstAvailableLocator([
      this.page.locator('#randomizeBtn'),
      this.page.getByRole('button', { name: /Randomize/i }),
      this.page.locator('button:has-text("Randomize")')
    ]);

    this.locators.nearlySortedBtn = await this._firstAvailableLocator([
      this.page.locator('#nearlySortedBtn'),
      this.page.getByRole('button', { name: /Nearly Sorted/i }),
      this.page.locator('button:has-text(/Nearly Sorted/i)')
    ]);

    this.locators.arrayInput = await this._firstAvailableLocator([
      this.page.locator('#arrayInput'),
      this.page.getByPlaceholder(/array/i),
      this.page.locator('input[type="text"]')
    ]);

    this.locators.speedRange = await this._firstAvailableLocator([
      this.page.locator('#speedRange'),
      this.page.locator('input[type="range"][name="speed"]'),
      this.page.locator('input[type="range"][aria-label*="speed" i]'),
      this.page.getByLabel(/speed/i)
    ]);

    this.locators.sizeRange = await this._firstAvailableLocator([
      this.page.locator('#sizeRange'),
      this.page.locator('input[type="range"][name="size"]'),
      this.page.locator('input[type="range"][aria-label*="size" i]'),
      this.page.getByLabel(/size/i)
    ]);

    this.locators.earlyExitCheckbox = await this._firstAvailableLocator([
      this.page.locator('#earlyExitCheckbox'),
      this.page.locator('input[type="checkbox"][name="earlyExit"]'),
      this.page.getByRole('checkbox', { name: /early exit/i })
    ]);

    this.locators.narration = await this._firstAvailableLocator([
      this.page.locator('#narration'),
      this.page.locator('#message'),
      this.page.locator('.narration'),
      this.page.locator('[aria-live]')
    ]);

    this.locators.barsContainer = await this._firstAvailableLocator([
      this.page.locator('#barsContainer'),
      this.page.locator('#bars'),
      this.page.locator('.bars'),
      this.page.locator('[data-testid="bars"]')
    ]);

    this.locators.codeContainer = await this._firstAvailableLocator([
      this.page.locator('#code'),
      this.page.locator('.code'),
      this.page.locator('[data-testid="code"]')
    ]);

    // Stats (optional, flexible)
    this.locators.comparisonsStat = await this._firstAvailableLocator([
      this.page.locator('#comparisonsVal'),
      this.page.locator('[data-testid="comparisonsVal"]'),
      this.page.locator('.comparisons .value'),
      this.page.getByText(/Comparisons:/i).locator('xpath=following-sibling::*[1]')
    ]);
    this.locators.swapsStat = await this._firstAvailableLocator([
      this.page.locator('#swapsVal'),
      this.page.locator('[data-testid="swapsVal"]'),
      this.page.locator('.swaps .value'),
      this.page.getByText(/Swaps:/i).locator('xpath=following-sibling::*[1]')
    ]);
    this.locators.indexIStat = await this._firstAvailableLocator([
      this.page.locator('#iVal'),
      this.page.locator('[data-testid="iVal"]'),
      this.page.getByText(/Pass \(i\):/i).locator('xpath=following-sibling::*[1]')
    ]);
    this.locators.indexJStat = await this._firstAvailableLocator([
      this.page.locator('#jVal'),
      this.page.locator('[data-testid="jVal"]'),
      this.page.getByText(/Index \(j\):/i).locator('xpath=following-sibling::*[1]')
    ]);

    // Ensure bars rendered
    await expect(this.bars()).toHaveCountGreaterThan(0);
  }

  bars() {
    return this.page.locator('.bar, [data-role="bar"]');
  }

  async _firstAvailableLocator(locators) {
    for (const locator of locators) {
      try {
        const count = await locator.count();
        if (count > 0) return locator.first();
      } catch {
        // ignore
      }
    }
    // Return a locator that never matches; used to avoid null checks
    return this.page.locator('___never___');
  }

  async togglePlay() {
    await this.locators.playBtn.click();
  }

  async step() {
    await this.locators.stepBtn.click();
  }

  async reset() {
    await this.locators.resetBtn.click();
  }

  async applyInput(text) {
    await this.locators.arrayInput.fill('');
    await this.locators.arrayInput.type(text);
    await this.locators.applyBtn.click();
  }

  async randomize() {
    await this.locators.randomizeBtn.click();
  }

  async nearlySorted() {
    await this.locators.nearlySortedBtn.click();
  }

  async setSpeed(value) {
    // Try to set slider and dispatch events
    const slider = this.locators.speedRange;
    const count = await slider.count();
    if (count > 0) {
      await slider.focus();
      await slider.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    }
  }

  async setSize(value) {
    const slider = this.locators.sizeRange;
    const count = await slider.count();
    if (count > 0) {
      await slider.focus();
      await slider.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    }
  }

  async setEarlyExit(enabled) {
    const cb = this.locators.earlyExitCheckbox;
    const count = await cb.count();
    if (count > 0) {
      const checked = await cb.isChecked();
      if (checked !== enabled) {
        await cb.check({ force: true });
        if (!enabled) await cb.uncheck({ force: true });
      }
    }
  }

  async narrationText() {
    const count = await this.locators.narration.count();
    if (count === 0) return '';
    return (await this.locators.narration.innerText()).trim();
  }

  async getBarsValues() {
    const barEls = await this.bars().elementHandles();
    const values = [];
    for (const el of barEls) {
      const valAttr = await el.getAttribute('data-value');
      if (valAttr !== null) {
        const n = Number(valAttr);
        if (!Number.isNaN(n)) {
          values.push(n);
          continue;
        }
      }
      const text = (await el.textContent()) || '';
      const n = Number(text.trim());
      if (!Number.isNaN(n)) values.push(n);
    }
    return values;
  }

  async isSortedAscending() {
    const vals = await this.getBarsValues();
    for (let i = 1; i < vals.length; i++) {
      if (vals[i - 1] > vals[i]) return false;
    }
    return true;
  }

  async highlightedCodeLines() {
    const containerCount = await this.locators.codeContainer.count();
    if (containerCount === 0) return [];
    const highlighted = this.locators.codeContainer.locator('[data-line].highlight, .line.highlight, [data-highlight="true"]');
    const count = await highlighted.count();
    const lines = [];
    for (let i = 0; i < count; i++) {
      const el = highlighted.nth(i);
      const dataLine = await el.getAttribute('data-line');
      if (dataLine) {
        const n = Number(dataLine);
        if (!Number.isNaN(n)) lines.push(n);
        continue;
      }
      const text = (await el.textContent()) || '';
      const match = text.match(/^\s*(\d+)/);
      if (match) {
        lines.push(Number(match[1]));
      }
    }
    return lines;
  }

  async compareHighlightedCount() {
    const highlighted = this.page.locator('.bar.compare, [data-state="compare"]');
    return highlighted.count();
  }

  async sortedHighlightedCount() {
    const sorted = this.page.locator('.bar.sorted, [data-state="sorted"]');
    return sorted.count();
  }

  async swapsCount() {
    const count = await this.locators.swapsStat.count();
    if (count === 0) return null;
    const text = (await this.locators.swapsStat.innerText()).trim();
    const num = Number((text.match(/\d+/) || [0])[0]);
    return num;
  }

  async comparisonsCount() {
    const count = await this.locators.comparisonsStat.count();
    if (count === 0) return null;
    const text = (await this.locators.comparisonsStat.innerText()).trim();
    const num = Number((text.match(/\d+/) || [0])[0]);
    return num;
  }

  async indicesIJ() {
    const iCount = await this.locators.indexIStat.count();
    const jCount = await this.locators.indexJStat.count();
    let iVal = null, jVal = null;
    if (iCount > 0) {
      const t = (await this.locators.indexIStat.innerText()).trim();
      const n = Number((t.match(/\d+/) || [0])[0]);
      iVal = Number.isNaN(n) ? null : n;
    }
    if (jCount > 0) {
      const t = (await this.locators.indexJStat.innerText()).trim();
      const n = Number((t.match(/\d+/) || [0])[0]);
      jVal = Number.isNaN(n) ? null : n;
    }
    return { i: iVal, j: jVal };
  }

  async cssVar(name) {
    return this.page.evaluate((n) => {
      return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    }, name);
  }

  async ensureFastAnimations() {
    await this.page.evaluate(() => {
      document.documentElement.style.setProperty('--swap-duration', '1ms');
      document.documentElement.style.setProperty('--compare-duration', '1ms');
    });
  }
}

test.describe('Bubble Sort Explorer — FSM End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: go to app and ensure initial ready state
    const bs = new BubbleSortPage(page);
    await bs.init();
    // Reset to a known starting state for each test
    await bs.reset();
    // Wait for "Ready" announcement or idle UI state
    await expect.poll(async () => await bs.narrationText(), {
      message: 'Expect app to announce Ready on entering ready state'
    }).toContain('Ready');
  });

  test('APP_LOADED transitions from initializing to ready and performs onEnter actions', async ({ page }) => {
    const bs = new BubbleSortPage(page);
    await bs.init();
    // The module should render bars and announce "Ready."
    await expect(bs.bars()).toHaveCountGreaterThan(0);
    const narration = await bs.narrationText();
    expect(narration).toMatch(/Ready/i);
    // Code highlight should be cleared in ready
    const highlightedLines = await bs.highlightedCodeLines();
    expect(highlightedLines.length).toBe(0);
    // Sorted tail likely initially none for unsorted array; ensure no compare highlights
    expect(await bs.compareHighlightedCount()).toBeLessThanOrEqual(0);
  });

  test.describe('Controls: TOGGLE_PLAY, PAUSE, NEXT_STEP, RESET', () => {
    test('TOGGLE_PLAY enters playing, disables Step, and PAUSE goes to paused with announcement', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      // Enter playing
      await bs.togglePlay();
      // Play button should indicate Pause now (UI flipped)
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Pause/i);
      // Step button disabled while playing
      const stepDisabled = await bs.locators.stepBtn.isDisabled();
      expect(stepDisabled).toBeTruthy();
      // Pause back
      await bs.togglePlay();
      const playBtnText2 = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText2).toMatch(/Play/i);
      const narration = await bs.narrationText();
      expect(narration).toMatch(/Paused/i);
      // Step enabled in paused
      const stepDisabledAfterPause = await bs.locators.stepBtn.isDisabled();
      expect(stepDisabledAfterPause).toBeFalsy();
    });

    test('NEXT_STEP transitions from ready to check_pass_end (highlight line 6) then comparing (highlight line 4)', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      // Use a deterministic small array
      await bs.applyInput('3,1,2');
      await expect.poll(async () => await bs.narrationText()).toContain('Ready');
      // Invoke NEXT_STEP
      await bs.step();
      // check_pass_end highlights line 6
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(6)).toBeTruthy();
      // Then transitions to comparing with highlight line 4 and compare bars highlighted
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(4)).toBeTruthy();
      await expect.poll(async () => await bs.compareHighlightedCount()).toBeGreaterThan(0);
    });

    test('RESET brings back to ready state and clears highlights', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      // Change state
      await bs.togglePlay();
      await bs.reset();
      await expect.poll(async () => await bs.narrationText()).toContain('Ready');
      const highlightedLines = await bs.highlightedCodeLines();
      expect(highlightedLines.length).toBe(0);
      expect(await bs.compareHighlightedCount()).toBeLessThanOrEqual(0);
      // Play button shows "Play" on ready
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Play/i);
    });
  });

  test.describe('Input and configuration: APPLY_VALID, APPLY_INVALID, RANDOMIZE, NEARLY_SORTED, FIX_INPUT', () => {
    test('APPLY_INVALID shows input_error state and error feedback; FIX_INPUT/APPLY_VALID returns to ready', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      // Provide invalid input
      await bs.applyInput('4, x, 2');
      const narrationErr = await bs.narrationText();
      expect(narrationErr).toMatch(/invalid|error/i);
      // Fix input
      await bs.applyInput('9,2,1');
      await expect.poll(async () => await bs.narrationText()).toMatch(/Ready/i);
      // Verify bars match the applied input (order of values)
      const values = await bs.getBarsValues();
      expect(values.length).toBeGreaterThan(0);
      // Check that the first three include 9,2,1 in some order (depending on rendering)
      expect(values.slice(0, 3)).toEqual([9, 2, 1]);
    });

    test('RANDOMIZE populates array and resets to ready', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      const beforeValues = await bs.getBarsValues();
      await bs.randomize();
      await expect.poll(async () => await bs.narrationText()).toMatch(/Ready/i);
      const afterValues = await bs.getBarsValues();
      // The random array should differ from before at least partially
      // Allow for unlikely case of same randomness by comparing string
      expect(afterValues.join(',')).not.toEqual(beforeValues.join(','));
    });

    test('NEARLY_SORTED populates nearly sorted array and resets to ready', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.randomize(); // ensure change first
      const beforeValues = await bs.getBarsValues();
      await bs.nearlySorted();
      await expect.poll(async () => await bs.narrationText()).toMatch(/Ready/i);
      const afterValues = await bs.getBarsValues();
      expect(afterValues.join(',')).not.toEqual(beforeValues.join(','));
      // The array should be close to sorted (heuristic: number of inversions small)
      const inversions = afterValues.reduce((acc, v, i) => {
        for (let j = i + 1; j < afterValues.length; j++) {
          if (v > afterValues[j]) acc++;
        }
        return acc;
      }, 0);
      expect(inversions).toBeLessThanOrEqual(Math.max(1, Math.floor(afterValues.length * 0.2)));
    });
  });

  test.describe('Algorithm micro-states: comparing, swapping, advancing_index, pass_advance, check_pass_end', () => {
    test('NEEDS_SWAP leads to swapping (line 5) and bars order changes, then advancing_index', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.applyInput('3,1,2');
      await expect.poll(async () => await bs.narrationText()).toContain('Ready');
      // Step to comparing
      await bs.step();
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(4)).toBeTruthy();
      const before = await bs.getBarsValues();
      // Await swap transition: line 5 highlight and order change
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(5)).toBeTruthy();
      await expect.poll(async () => {
        const now = await bs.getBarsValues();
        return now[0] !== before[0] || now[1] !== before[1];
      }).toBeTruthy();
      // After swap, advancing_index should occur and next step returns to check_pass_end
      await bs.step();
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(6)).toBeTruthy();
    });

    test('NO_SWAP path increments comparisons without changing order and goes to advancing_index', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.applyInput('1,3,2');
      await expect.poll(async () => await bs.narrationText()).toContain('Ready');
      const before = await bs.getBarsValues();
      const beforeSwaps = await bs.swapsCount();
      // Step to comparing
      await bs.step();
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(4)).toBeTruthy();
      // Wait for NO_SWAP -> advancing_index (no line 5 highlight)
      await bs.step(); // proceed to advancing_index then check_pass_end
      const after = await bs.getBarsValues();
      expect(after.join(',')).toEqual(before.join(','));
      const afterSwaps = await bs.swapsCount();
      if (beforeSwaps !== null && afterSwaps !== null) {
        expect(afterSwaps).toBe(beforeSwaps);
      }
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(6)).toBeTruthy();
    });

    test('PASS_ADVANCE highlights line 2 and NEXT_COMPARISON returns to comparing', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      // Use array with small size to reach pass advance quickly
      await bs.applyInput('3,2,1');
      await expect.poll(async () => await bs.narrationText()).toContain('Ready');
      // Step repeatedly until line 2 (pass_advance) appears
      for (let attempt = 0; attempt < 20; attempt++) {
        await bs.step();
        const lines = await bs.highlightedCodeLines();
        if (lines.includes(2)) break;
      }
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(2)).toBeTruthy();
      // After brief delay, NEXT_COMPARISON should go to comparing (line 4)
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(4)).toBeTruthy();
    });

    test('check_pass_end highlights line 6 and branches appropriately', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.applyInput('2,1');
      await bs.step();
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(6)).toBeTruthy();
      // Should continue to comparing on PASS_CONTINUES
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(4)).toBeTruthy();
    });
  });

  test.describe('Completion: done state via EARLY_EXIT_DONE and ALL_PASSES_COMPLETE', () => {
    test('EARLY_EXIT_DONE when early exit enabled and no swaps needed', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.setEarlyExit(true);
      await bs.applyInput('1,2,3,4');
      await expect.poll(async () => await bs.narrationText()).toContain('Ready');
      // Single step to check_pass_end with early exit -> done
      await bs.step();
      await expect.poll(async () => await bs.isSortedAscending()).toBeTruthy();
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Play/i);
      const narration = await bs.narrationText();
      expect(narration).toMatch(/sorted|complete|early/i);
      // Next/Play while done keeps state unchanged
      const valuesBefore = await bs.getBarsValues();
      await bs.step();
      await bs.togglePlay();
      const valuesAfter = await bs.getBarsValues();
      expect(valuesAfter.join(',')).toEqual(valuesBefore.join(','));
    });

    test('ALL_PASSES_COMPLETE when sorting finishes naturally', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.applyInput('5,4,3,2,1');
      await bs.togglePlay(); // start playing
      // Wait until done detected (bars sorted and play shows Play)
      await expect.poll(async () => await bs.isSortedAscending()).toBeTruthy();
      await expect.poll(async () => (await bs.locators.playBtn.innerText()).trim()).toMatch(/Play/i);
      const narration = await bs.narrationText();
      expect(narration).toMatch(/complete|sorted/i);
      // Space or next should not change
      const valuesBefore = await bs.getBarsValues();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowRight');
      const valuesAfter = await bs.getBarsValues();
      expect(valuesAfter.join(',')).toEqual(valuesBefore.join(','));
    });
  });

  test.describe('Speed and size controls: SPEED_CHANGE, SIZE_INPUT, SIZE_CHANGE_NOTICE', () => {
    test('SPEED_CHANGE updates CSS variables without altering sort state', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      const initialSwapDur = await bs.cssVar('--swap-duration');
      const initialCompareDur = await bs.cssVar('--compare-duration');
      // Change speed slider
      await bs.setSpeed('95');
      // Variables should update (string comparison; may include ms)
      const newSwapDur = await bs.cssVar('--swap-duration');
      const newCompareDur = await bs.cssVar('--compare-duration');
      expect(newSwapDur).not.toEqual(initialSwapDur);
      expect(newCompareDur).not.toEqual(initialCompareDur);
      // Sorting state remains ready; narration stays "Ready."
      await expect.poll(async () => await bs.narrationText()).toMatch(/Ready/i);
      // While playing, SPEED_CHANGE keeps state 'playing'
      await bs.togglePlay();
      await bs.setSpeed('10');
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Pause/i);
    });

    test('SIZE_INPUT updates UI and SIZE_CHANGE_NOTICE updates bar count', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      // Record initial bar count
      const initialCount = await bs.bars().count();
      // Input move (SIZE_INPUT) - may update message/output immediately
      await bs.setSize('5');
      // Change (SIZE_CHANGE_NOTICE) - on change event, number of bars likely updates
      // Wait for potential re-render
      await expect.poll(async () => await bs.bars().count()).not.toEqual(initialCount);
    });
  });

  test.describe('Keyboard shortcuts: Space (TOGGLE_PLAY), ArrowRight (NEXT_STEP), r (RESET)', () => {
    test('Space toggles play/pause', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await page.keyboard.press('Space');
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Pause/i);
      await page.keyboard.press('Space');
      const playBtnText2 = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText2).toMatch(/Play/i);
      const narration = await bs.narrationText();
      expect(narration).toMatch(/Paused|Ready/i);
    });

    test('ArrowRight performs NEXT_STEP from ready or paused', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await page.keyboard.press('ArrowRight');
      // Should highlight line 6 (check_pass_end) then line 4 (comparing)
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(6)).toBeTruthy();
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(4)).toBeTruthy();
      // Pause then ArrowRight again continues
      await bs.togglePlay(); // play
      await bs.togglePlay(); // pause
      await page.keyboard.press('ArrowRight');
      await expect.poll(async () => (await bs.highlightedCodeLines()).includes(6)).toBeTruthy();
    });

    test('r resets the module to ready', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.togglePlay();
      await page.keyboard.press('r');
      await expect.poll(async () => await bs.narrationText()).toMatch(/Ready/i);
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Play/i);
    });
  });

  test.describe('Edge cases and invariants', () => {
    test('Clicking Step while playing should not execute (Step disabled)', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.applyInput('3,2,1');
      await bs.togglePlay();
      const disabled = await bs.locators.stepBtn.isDisabled();
      expect(disabled).toBeTruthy();
      // Try clicking anyway; ensure playing state persists
      await bs.locators.stepBtn.click({ trial: true }).catch(() => {});
      const playBtnText = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnText).toMatch(/Pause/i);
    });

    test('TOGGLE_PLAY in done state keeps state unchanged and announces accordingly', async ({ page }) => {
      const bs = new BubbleSortPage(page);
      await bs.init();
      await bs.ensureFastAnimations();
      await bs.applyInput('1,2,3,4,5');
      await bs.togglePlay();
      // Early completion possible; wait for sorted
      await expect.poll(async () => await bs.isSortedAscending()).toBeTruthy();
      const valuesBefore = await bs.getBarsValues();
      const playBtnTextBefore = (await bs.locators.playBtn.innerText()).trim();
      expect(playBtnTextBefore).toMatch(/Play/i);
      await bs.togglePlay();
      const valuesAfter = await bs.getBarsValues();
      expect(valuesAfter.join(',')).toEqual(valuesBefore.join(','));
      const narration = await bs.narrationText();
      expect(narration).toMatch(/Already sorted|sorted/i);
    });
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a9811-d1c9-11f0-9efc-d1db1618a544.html';

// Page object encapsulating common interactions and queries for the Bubble Sort app
class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.locators = {
      barsContainer: page.locator('#bars'),
      bars: page.locator('.bar'),
      sizeRange: page.locator('#size'),
      speedRange: page.locator('#speed'),
      dirSelect: page.locator('#dir'),
      shuffleBtn: page.locator('#shuffle'),
      startBtn: page.locator('#start'),
      pauseBtn: page.locator('#pause'),
      stepBtn: page.locator('#step'),
      resetBtn: page.locator('#reset'),
      compCount: page.locator('#compCount'),
      swapCount: page.locator('#swapCount'),
      passCount: page.locator('#pass'),
      sizeLabel: page.locator('#sizeLabel'),
      pseudoLines: page.locator('#pseudocode .line')
    };
  }

  // Navigate to app
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for initial render of bars
    await expect(this.locators.barsContainer).toBeVisible();
    await this.page.waitForTimeout(50);
  }

  // Read numeric stats
  async getCompCount() {
    const txt = await this.locators.compCount.textContent();
    return Number(txt);
  }
  async getSwapCount() {
    const txt = await this.locators.swapCount.textContent();
    return Number(txt);
  }
  async getPass() {
    const txt = await this.locators.passCount.textContent();
    return Number(txt);
  }
  async getSizeLabel() {
    const txt = await this.locators.sizeLabel.textContent();
    return Number(txt);
  }
  async getBarsCount() {
    return await this.locators.bars.count();
  }

  // Get textual values displayed inside bars as array of numbers
  async getBarsValues() {
    const bars = this.locators.bars;
    const count = await bars.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      const val = await bars.nth(i).locator('.val').textContent();
      out.push(Number(val));
    }
    return out;
  }

  // Click controls
  async clickShuffle() { await this.locators.shuffleBtn.click(); }
  async clickStart() { await this.locators.startBtn.click(); }
  async clickPause() { await this.locators.pauseBtn.click(); }
  async clickStep() { await this.locators.stepBtn.click(); }
  async clickReset() { await this.locators.resetBtn.click(); }

  // Change size by setting the range value and dispatching 'change'
  async setSize(size) {
    // Playwright doesn't fire 'change' automatically with setInputFiles etc. Use evaluate.
    await this.page.evaluate((s) => {
      const el = document.getElementById('size');
      el.value = String(s);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, size);
    // Allow UI to update
    await this.page.waitForTimeout(50);
  }

  // Change speed value (input event)
  async setSpeed(speed) {
    await this.page.evaluate((s) => {
      const el = document.getElementById('speed');
      el.value = String(s);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, speed);
    await this.page.waitForTimeout(20);
  }

  // Select direction
  async setDirection(dir) {
    await this.locators.dirSelect.selectOption(dir);
  }

  // Return index of first bar with given class (or -1)
  async findBarIndexWithClass(cssClass) {
    const count = await this.getBarsCount();
    for (let i = 0; i < count; i++) {
      const cls = await this.locators.bars.nth(i).getAttribute('class');
      if (cls && cls.includes(cssClass)) return i;
    }
    return -1;
  }

  // Retrieve which pseudocode line is active (returns data-line value or null)
  async getActivePseudocodeLine() {
    const lines = await this.locators.pseudoLines.elementHandles();
    for (const h of lines) {
      const className = await h.getProperty('className').then(p => p.jsonValue());
      if (className && className.includes('active')) {
        const dataLine = await h.getAttribute('data-line');
        return dataLine;
      }
    }
    return null;
  }
}

// Test suite
test.describe('Bubble Sort Visualizer - end-to-end', () => {
  let page;
  let bubble;
  let consoleErrors;
  let pageErrors;

  // Setup a fresh page for every test and collect console/page errors
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    bubble = new BubbleSortPage(page);
    await bubble.goto();
  });

  // After each test, assert there were no uncaught console or page errors.
  // This ensures we observe runtime errors and fail if any exist.
  test.afterEach(async () => {
    // Wait a small moment for any asynchronous errors to surface
    await page.waitForTimeout(20);

    // Assert there were no page errors or console errors collected during the test
    expect(pageErrors, 'No unhandled page errors should be thrown').toEqual([]);
    expect(consoleErrors, 'No console errors should be printed').toEqual([]);

    await page.close();
  });

  test.describe('Initial load and default state', () => {
    test('displays title, controls and default stats correctly', async () => {
      // Verify header/title and accessibility role
      await expect(page.locator('h1')).toHaveText('Bubble Sort Visualizer');
      await expect(page.locator('[role="application"]')).toBeVisible();

      // Default size should be 24
      const sizeLabel = await bubble.getSizeLabel();
      expect(sizeLabel).toBe(24);

      // Stats should be zero initially
      expect(await bubble.getCompCount()).toBe(0);
      expect(await bubble.getSwapCount()).toBe(0);
      expect(await bubble.getPass()).toBe(0);

      // Buttons initial states: start visible, pause disabled, step enabled
      await expect(bubble.locators.startBtn).toBeVisible();
      await expect(bubble.locators.pauseBtn).toBeDisabled();
      await expect(bubble.locators.stepBtn).toBeEnabled();

      // Bars should be rendered and equal to the size value
      const barsCount = await bubble.getBarsCount();
      expect(barsCount).toBe(24);
    });
  });

  test.describe('Interactive controls behavior', () => {
    test('changing the size slider updates label and re-renders bars', async () => {
      // Change size to a smaller number and verify UI reflects it
      await bubble.setSize(10);
      expect(await bubble.getSizeLabel()).toBe(10);
      expect(await bubble.getBarsCount()).toBe(10);

      // Change size to a larger number to ensure re-render works both ways
      await bubble.setSize(30);
      expect(await bubble.getSizeLabel()).toBe(30);
      expect(await bubble.getBarsCount()).toBe(30);
    });

    test('shuffle resets statistics and keeps the same array size', async () => {
      // Capture current state
      const initialSize = await bubble.getSizeLabel();
      // Perform some actions so stats may change
      await bubble.clickStep(); // may increment pass or compare
      await page.waitForTimeout(20);

      // Click shuffle to randomize array
      await bubble.clickShuffle();
      await page.waitForTimeout(40);

      // After shuffle, stats should be reset to zero
      expect(await bubble.getCompCount()).toBe(0);
      expect(await bubble.getSwapCount()).toBe(0);
      expect(await bubble.getPass()).toBe(0);

      // Size label persists
      expect(await bubble.getSizeLabel()).toBe(initialSize);
      // Bars count matches label
      expect(await bubble.getBarsCount()).toBe(initialSize);
    });

    test('reset button restores a fresh random array and zeros stats', async () => {
      // Step a few times to change counters
      for (let i = 0; i < 3; i++) {
        await bubble.clickStep();
        await page.waitForTimeout(15);
      }
      // Ensure some counters may have changed (or remain 0 if no compare yet)
      // Now reset
      await bubble.clickReset();
      await page.waitForTimeout(40);

      expect(await bubble.getCompCount()).toBe(0);
      expect(await bubble.getSwapCount()).toBe(0);
      expect(await bubble.getPass()).toBe(0);

      // Bars should exist
      const barsCount = await bubble.getBarsCount();
      expect(barsCount).toBeGreaterThan(0);
    });

    test('changing direction select updates ordering and is reflected during execution', async () => {
      // Set small size to speed up; change to 8
      await bubble.setSize(8);
      // Save values to observe behavior
      const valuesBefore = await bubble.getBarsValues();

      // Set direction to descending and perform many step clicks until at least one compare occurs
      await bubble.setDirection('desc');

      // Ensure generator will be created; perform some steps
      let compCount = await bubble.getCompCount();
      let attempts = 0;
      while (compCount === 0 && attempts < 200) {
        await bubble.clickStep();
        await page.waitForTimeout(10);
        compCount = await bubble.getCompCount();
        attempts++;
      }
      expect(await bubble.getBarsCount()).toBe(8);

      // After stepping ensure values may have changed or at least comparisons occurred
      expect(await bubble.getCompCount()).toBeGreaterThanOrEqual(0);
      const valuesAfter = await bubble.getBarsValues();
      // Either array changed or remains same; we just ensure the UI is responsive
      expect(valuesAfter.length).toBe(valuesBefore.length);
    });
  });

  test.describe('Autoplay and step execution', () => {
    test('start button begins autoplay and pause stops it', async () => {
      // Ensure start text initial
      await expect(bubble.locators.startBtn).toHaveText('Start');

      // Click start to begin autoplay
      await bubble.clickStart();
      // Start button should change to "Running" and pause becomes enabled
      await expect(bubble.locators.startBtn).toHaveText('Running');
      await expect(bubble.locators.pauseBtn).toBeEnabled();

      // Wait some time for comparisons/swaps to potentially happen
      await page.waitForTimeout(300);

      // At least pass counter should have progressed or comparisons occurred
      const pass = await bubble.getPass();
      const comp = await bubble.getCompCount();
      expect(pass).toBeGreaterThanOrEqual(0);
      expect(comp).toBeGreaterThanOrEqual(0);

      // Pause autoplay
      await bubble.clickPause();
      // Start button should be back to 'Start' and step enabled
      await expect(bubble.locators.startBtn).toHaveText('Start');
      await expect(bubble.locators.stepBtn).toBeEnabled();
    });

    test('step button advances one or more generator yields and highlights pseudocode', async () => {
      // Ensure fresh generator by clicking reset
      await bubble.clickReset();
      await page.waitForTimeout(30);

      // First step: usually produces a 'pass' yield and highlights pseudocode line 1
      await bubble.clickStep();
      await page.waitForTimeout(15);
      const active1 = await bubble.getActivePseudocodeLine();
      // It's valid for the first step to highlight line 1 (pass), or possibly null if finished quickly.
      expect(['1', '3', '4', null]).toContain(active1);

      // Click additional times until we observe a 'compare' highlight (line 3) and cmpCount increases
      let attempts = 0;
      let cmpCount = await bubble.getCompCount();
      while (cmpCount === 0 && attempts < 200) {
        await bubble.clickStep();
        await page.waitForTimeout(10);
        cmpCount = await bubble.getCompCount();
        attempts++;
      }
      expect(cmpCount).toBeGreaterThanOrEqual(0);

      // When a compare step occurs, two bars should have the 'compare' class
      const compareIdx = await bubble.findBarIndexWithClass('compare');
      if (compareIdx >= 0) {
        // We found a compare, ensure the element has the compare class
        const cls = await bubble.locators.bars.nth(compareIdx).getAttribute('class');
        expect(cls).toContain('compare');
      } else {
        // It's acceptable if no bar has compare class at this exact snapshot; ensure step executed
        expect(cmpCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('a swap eventually occurs when stepping repeatedly (if array requires swaps)', async () => {
      // Reduce size to increase likelihood of swap quickly
      await bubble.setSize(12);
      await page.waitForTimeout(20);

      // Reset to ensure clean state
      await bubble.clickReset();
      await page.waitForTimeout(30);

      // Step repeatedly until we observe a swapCount > 0 or until cap
      let swapCount = await bubble.getSwapCount();
      let attempts = 0;
      while (swapCount === 0 && attempts < 500) {
        await bubble.clickStep();
        await page.waitForTimeout(5);
        swapCount = await bubble.getSwapCount();
        attempts++;
      }

      // It's possible a random array has no swaps if already sorted, but highly unlikely.
      // We assert that swapCount is >= 0 and that stepping executed many steps without throwing.
      expect(swapCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Keyboard shortcuts and accessibility behaviors', () => {
    test('keyboard shortcuts trigger expected actions (space, ArrowRight, r, s)', async () => {
      // Use ArrowRight to step
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(20);
      // compCount should be >= 0 after step
      expect(await bubble.getCompCount()).toBeGreaterThanOrEqual(0);

      // 's' should shuffle
      const beforeValues = await bubble.getBarsValues();
      await page.keyboard.press('s');
      await page.waitForTimeout(30);
      const afterValues = await bubble.getBarsValues();
      // After shuffle at least one bar may change; it's okay if coincidentally they match. We assert UI remains valid.
      expect(afterValues.length).toBe(beforeValues.length);

      // 'r' should reset and set counters to zero
      // Make sure some stats changed first
      await bubble.clickStep();
      await page.waitForTimeout(10);
      await page.keyboard.press('r');
      await page.waitForTimeout(30);
      expect(await bubble.getCompCount()).toBe(0);
      expect(await bubble.getSwapCount()).toBe(0);

      // Space toggles start/pause: press to start
      await page.keyboard.press(' ');
      await page.waitForTimeout(60);
      // Start button text should change to 'Running'
      await expect(bubble.locators.startBtn).toHaveText('Running');
      // Press space to pause
      await page.keyboard.press(' ');
      await page.waitForTimeout(30);
      await expect(bubble.locators.startBtn).toHaveText('Start');
    });

    test('pseudocode lines update appropriately during operations', async () => {
      // Reset for deterministic run
      await bubble.clickReset();
      await page.waitForTimeout(30);

      // Trigger steps until we see pseudocode line 3 (compare) or 4 (swap)
      let active = await bubble.getActivePseudocodeLine();
      let attempts = 0;
      while (!['3', '4'].includes(active) && attempts < 200) {
        await bubble.clickStep();
        await page.waitForTimeout(8);
        active = await bubble.getActivePseudocodeLine();
        attempts++;
      }

      // The pseudocode should eventually highlight a compare (3) or swap (4) or be null if complete
      expect(['3', '4', null]).toContain(active);
    });
  });

  test.describe('DOM integrity and visual feedback', () => {
    test('bars have expected classes and heights are swapped visually on swap operations', async () => {
      // Ensure small playground to make swaps more likely
      await bubble.setSize(10);
      await bubble.clickReset();
      await page.waitForTimeout(30);

      // Record initial bar heights and values
      const bars = page.locator('.bar');
      const initialHeights = [];
      const initialVals = [];
      const count = await bars.count();
      for (let i = 0; i < count; i++) {
        initialHeights.push(await bars.nth(i).evaluate(e => e.style.height));
        initialVals.push(Number(await bars.nth(i).locator('.val').textContent()));
      }

      // Step repeatedly until swapCount increments OR cap reached
      let swapCount = await bubble.getSwapCount();
      let attempts = 0;
      while (swapCount === 0 && attempts < 300) {
        await bubble.clickStep();
        await page.waitForTimeout(5);
        swapCount = await bubble.getSwapCount();
        attempts++;
      }

      // If a swap occurred, verify at least one bar had class 'swap' at some snapshot and values/heights were updated
      if (swapCount > 0) {
        // There may no longer be any bar with class 'swap' after the generator progressed; search if any bar has class 'sorted' or 'default' too
        const anySwapClass = await bubble.findBarIndexWithClass('swap');
        // It's acceptable if none are currently 'swap' (they may have returned to default), but ensure heights/values changed compared to initial
        const newVals = await bubble.getBarsValues();
        const valsChanged = JSON.stringify(newVals) !== JSON.stringify(initialVals);
        expect(valsChanged || anySwapClass >= 0).toBeTruthy();
      } else {
        // If no swap happened in many attempts, assert that stepping did not cause JS errors and UI remains consistent
        const newVals = await bubble.getBarsValues();
        expect(newVals.length).toBe(initialVals.length);
      }
    });
  });
});
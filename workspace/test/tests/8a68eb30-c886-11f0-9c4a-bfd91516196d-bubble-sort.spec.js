import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/test/html/8a68eb30-c886-11f0-9c4a-bfd91516196d.html';

test.describe('Bubble Sort Visualization - FSM validation (Application ID: 8a68eb30-c886-11f0-9c4a-bfd91516196d)', () => {
  // Helper utilities used across tests
  const selectors = {
    btnGenerate: '#btn-generate',
    btnStart: '#btn-start',
    btnPause: '#btn-pause',
    btnStep: '#btn-step',
    btnReset: '#btn-reset',
    size: '#size',
    sizeVal: '#size-val',
    speed: '#speed',
    speedVal: '#speed-val',
    order: '#order',
    bars: '#bars',
    bar: '.bar',
    comp: '#comp',
    swaps: '#swaps',
    steps: '#steps',
    nsize: '#nsize',
    curI: '#cur-i',
    curJ: '#cur-j',
    passes: '#passes',
    pseudocodeLines: '.pseudocode .line'
  };

  // Set up before each test: navigate to app
  test.beforeEach(async ({ page }) => {
    await page.goto(APP);
    // Wait for initial bars to be rendered
    await page.locator(selectors.bars + ' ' + selectors.bar).first().waitFor();
  });

  // Teardown not necessary; Playwright isolates pages per test

  // Utility functions executed in page context
  async function setSize(page, value) {
    await page.evaluate((sel, v) => {
      const el = document.querySelector(sel);
      el.value = String(v);
      // 'change' handler triggers new array generation
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selectors.size, value);
    // wait for bars to re-render
    await page.locator(selectors.bars + ' ' + selectors.bar).first().waitFor();
  }

  async function setSpeed(page, value) {
    await page.evaluate((sel, v) => {
      const el = document.querySelector(sel);
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, selectors.speed, value);
    // allow UI to update speed label
    await page.waitForTimeout(5);
  }

  async function getInlineBackgroundOfBar(page, index = 0) {
    return page.evaluate((sel, idx) => {
      const bars = Array.from(document.querySelectorAll(sel));
      if (!bars[idx]) return null;
      return bars[idx].style.background || '';
    }, selectors.bar, index);
  }

  async function getBarsCount(page) {
    return page.evaluate((sel) => document.querySelectorAll(sel).length, selectors.bar);
  }

  async function getTextContent(page, sel) {
    return page.locator(sel).textContent();
  }

  async function pressSpace(page) {
    await page.keyboard.press('Space');
    // slight delay for handlers
    await page.waitForTimeout(10);
  }

  async function pressArrowRight(page) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(10);
  }

  async function firstBarValue(page) {
    return page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if(!el) return null;
      const span = el.querySelector('span');
      return span ? span.textContent : null;
    }, selectors.bar);
  }

  // Tests start here

  test.describe('Idle state validations', () => {
    test('Initial load is idle: controls available, stats reset, pseudocode not highlighted', async ({ page }) => {
      // Counters should be zero
      await expect(page.locator(selectors.comp)).toHaveText('0');
      await expect(page.locator(selectors.swaps)).toHaveText('0');
      await expect(page.locator(selectors.steps)).toHaveText('0');
      // Current indices should be '-'
      await expect(page.locator(selectors.curI)).toHaveText('-');
      await expect(page.locator(selectors.curJ)).toHaveText('-');
      // Start and generate should be enabled in idle state
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
      expect(await page.locator(selectors.btnGenerate).isDisabled()).toBeFalsy();
      // pseudocode: no active line (none has 'active' class)
      const activeCount = await page.evaluate((sel) => {
        return document.querySelectorAll(sel + '.active').length;
      }, selectors.pseudocodeLines);
      expect(activeCount).toBe(0);
    });

    test('Clicking a bar in idle changes its value', async ({ page }) => {
      // Ensure a small size to make assertions faster and deterministic
      await setSize(page, 8);
      const before = await firstBarValue(page);
      await page.locator(selectors.bar).first().click();
      // Clicking in idle should change the value
      const after = await firstBarValue(page);
      expect(after).not.toBeNull();
      expect(after).not.toEqual(before);
    });

    test('Changing size input updates displayed size and generates a new array', async ({ page }) => {
      const initialCount = await getBarsCount(page);
      // Change to smaller size
      await setSize(page, 6);
      const newCount = await getBarsCount(page);
      expect(newCount).toBe(6);
      // UI size value label should match
      await expect(page.locator(selectors.sizeVal)).toHaveText('6');
      // Stats reset on generation
      await expect(page.locator(selectors.comp)).toHaveText('0');
      await expect(page.locator(selectors.swaps)).toHaveText('0');
    });
  });

  test.describe('Running / Paused / Stepping states and controls', () => {
    test('Start transitions to running: controls disabled while running, pause returns to paused', async ({ page }) => {
      // Use small array and fast speed to progress quickly
      await setSize(page, 7);
      await setSpeed(page, 5);

      // Start sorting
      await page.locator(selectors.btnStart).click();
      // Immediately after starting, controls for generation and size should be disabled
      await page.waitForTimeout(10);
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeTruthy();
      expect(await page.locator(selectors.btnGenerate).isDisabled()).toBeTruthy();
      expect(await page.locator(selectors.size).isDisabled()).toBeTruthy();

      // Pause the sorting -> should enter paused state
      await page.locator(selectors.btnPause).click();
      // After pausing, controls should be re-enabled
      await page.waitForTimeout(10);
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
      expect(await page.locator(selectors.btnGenerate).isDisabled()).toBeFalsy();
      expect(await page.locator(selectors.size).isDisabled()).toBeFalsy();
      // Current i should have been set during run (not '-')
      const curI = (await getTextContent(page, selectors.curI))?.trim();
      expect(curI).not.toBe('-');
    });

    test('Space key toggles start/pause as described in FSM', async ({ page }) => {
      await setSize(page, 6);
      await setSpeed(page, 5);

      // Ensure we are idle; press space to start
      await pressSpace(page);
      await page.waitForTimeout(10);
      // Now running: start button disabled
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeTruthy();

      // Press space to pause
      await pressSpace(page);
      await page.waitForTimeout(10);
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
    });

    test('Step button in idle performs a single step and then pauses (stepping state)', async ({ page }) => {
      await setSize(page, 6);
      // Use very small speed for rapid step
      await setSpeed(page, 1);

      // Click Step when not sorting yet -> should start algorithm but pause after one step
      await page.locator(selectors.btnStep).click();
      // Wait slightly longer than speed to allow step to finish
      await page.waitForTimeout(30);

      // After single step: steps counter should be >= 1
      const stepsText = (await getTextContent(page, selectors.steps))?.trim();
      expect(Number(stepsText)).toBeGreaterThanOrEqual(1);

      // After stepping we should be in paused state (start is enabled)
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
    });

    test('ArrowRight key triggers stepping behavior', async ({ page }) => {
      await setSize(page, 6);
      await setSpeed(page, 1);

      // Press ArrowRight to trigger single step
      await pressArrowRight(page);
      await page.waitForTimeout(30);

      const stepsText = (await getTextContent(page, selectors.steps))?.trim();
      expect(Number(stepsText)).toBeGreaterThanOrEqual(1);
    });

    test('Clicking a bar while paused allows editing the value (sorting true but running false allowed)', async ({ page }) => {
      await setSize(page, 7);
      await setSpeed(page, 5);

      // Start and then immediately pause to ensure sorting is active but running is false
      await page.locator(selectors.btnStart).click();
      await page.waitForTimeout(10);
      await page.locator(selectors.btnPause).click();
      await page.waitForTimeout(10);

      // Capture first bar value and click it to change while paused
      const before = await firstBarValue(page);
      await page.locator(selectors.bar).first().click();
      await page.waitForTimeout(5);
      const after = await firstBarValue(page);
      // Clicking while paused should change value
      expect(after).not.toEqual(before);
    });
  });

  test.describe('Completion (done) state and transitions', () => {
    test('Sorting completes -> done state: bars marked sorted, pseudocode reset, controls enabled', async ({ page }) => {
      // Make tiny array to finish quickly
      await setSize(page, 5);
      await setSpeed(page, 1);

      // Start sorting and wait for completion: detect completion by cur-i '-' and cur-j '-'
      await page.locator(selectors.btnStart).click();

      // Wait until cur-i and cur-j become '-' indicating done, with a generous timeout
      await page.waitForFunction(() => {
        const ci = document.getElementById('cur-i');
        const cj = document.getElementById('cur-j');
        return ci && cj && ci.textContent.trim() === '-' && cj.textContent.trim() === '-';
      }, null, { timeout: 5000 });

      // When done, bars should be colored as sorted: inline background should be 'var(--good)' for first bar
      const bg = await getInlineBackgroundOfBar(page, 0);
      expect(bg).toContain('var(--good)');

      // Pseudocode should not have an active line (setPseudoline(0))
      const activeCount = await page.evaluate(() => document.querySelectorAll('.pseudocode .line.active').length);
      expect(activeCount).toBe(0);

      // Controls should be enabled (setControlsDuringRun(false))
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
      expect(await page.locator(selectors.size).isDisabled()).toBeFalsy();
    });

    test('From done: clicking START begins a new run (done -> running)', async ({ page }) => {
      await setSize(page, 5);
      await setSpeed(page, 1);

      // Start and wait for done
      await page.locator(selectors.btnStart).click();
      await page.waitForFunction(() => {
        const ci = document.getElementById('cur-i');
        const cj = document.getElementById('cur-j');
        return ci && cj && ci.textContent.trim() === '-' && cj.textContent.trim() === '-';
      }, null, { timeout: 5000 });

      // Click start again to transition from done to running
      await page.locator(selectors.btnStart).click();
      await page.waitForTimeout(10);

      // Controls should be disabled while running
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeTruthy();
      expect(await page.locator(selectors.btnGenerate).isDisabled()).toBeTruthy();
    });

    test('ORDER changed while in done remains in done (no crash and UI stays stable)', async ({ page }) => {
      await setSize(page, 5);
      await setSpeed(page, 1);

      // Start and wait for done
      await page.locator(selectors.btnStart).click();
      await page.waitForFunction(() => {
        const ci = document.getElementById('cur-i');
        const cj = document.getElementById('cur-j');
        return ci && cj && ci.textContent.trim() === '-' && cj.textContent.trim() === '-';
      }, null, { timeout: 5000 });

      // Change order select (should not break or start sorting)
      await page.selectOption(selectors.order, 'desc');
      // Small timeout to let any handlers run
      await page.waitForTimeout(10);

      // Still in done: cur-i remains '-' and start button should be enabled
      await expect(page.locator(selectors.curI)).toHaveText('-');
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
    });

    test('Space key in done triggers a start (done -> running)', async ({ page }) => {
      await setSize(page, 5);
      await setSpeed(page, 1);

      // Start and wait for done
      await page.locator(selectors.btnStart).click();
      await page.waitForFunction(() => {
        const ci = document.getElementById('cur-i');
        const cj = document.getElementById('cur-j');
        return ci && cj && ci.textContent.trim() === '-' && cj.textContent.trim() === '-';
      }, null, { timeout: 5000 });

      // Press Space to start again
      await pressSpace(page);
      await page.waitForTimeout(10);
      expect(await page.locator(selectors.btnStart).isDisabled()).toBeTruthy();
    });
  });

  test.describe('Abort / generate / reset interactions and edge cases', () => {
    test('Clicking Generate during running aborts sorting, resets stats and generates new array', async ({ page }) => {
      await setSize(page, 8);
      await setSpeed(page, 50);

      // Capture first bar before start to compare after abort/generate
      const beforeFirst = await firstBarValue(page);

      // Start sorting
      await page.locator(selectors.btnStart).click();
      await page.waitForTimeout(20); // let it run a small bit

      // Now click generate to abort and generate a new array
      await page.locator(selectors.btnGenerate).click();

      // After generate, sorting should be false and stats reset
      await page.waitForTimeout(10);
      await expect(page.locator(selectors.comp)).toHaveText('0');
      await expect(page.locator(selectors.swaps)).toHaveText('0');
      await expect(page.locator(selectors.steps)).toHaveText('0');

      const afterFirst = await firstBarValue(page);
      // The new array should have different content (most likely different)
      expect(afterFirst).not.toBe(beforeFirst);
    });

    test('Reset behaves like generate: stops running sort and resets state', async ({ page }) => {
      await setSize(page, 8);
      await setSpeed(page, 50);

      // Start sorting
      await page.locator(selectors.btnStart).click();
      await page.waitForTimeout(20);

      // Click reset to abort and regenerate
      await page.locator(selectors.btnReset).click();
      await page.waitForTimeout(10);

      // Stats should be reset and pseudoline reset
      await expect(page.locator(selectors.comp)).toHaveText('0');
      await expect(page.locator(selectors.swaps)).toHaveText('0');
      const activeCount = await page.evaluate(() => document.querySelectorAll('.pseudocode .line.active').length);
      expect(activeCount).toBe(0);
    });

    test('Changing size while running aborts sort and generates new array (ABORT trigger)', async ({ page }) => {
      await setSize(page, 8);
      await setSpeed(page, 50);

      const beforeFirst = await firstBarValue(page);
      // Start sort
      await page.locator(selectors.btnStart).click();
      await page.waitForTimeout(20);

      // Change slider directly (simulate user sliding and releasing)
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        el.value = '5';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, selectors.size);

      // Wait for regenerate to complete
      await page.waitForTimeout(20);

      // Stats reset
      await expect(page.locator(selectors.comp)).toHaveText('0');
      // Bars count should match new size
      const count = await getBarsCount(page);
      expect(count).toBe(5);
      const afterFirst = await firstBarValue(page);
      expect(afterFirst).not.toBe(beforeFirst);
    });
  });

  test.describe('Pseudocode highlighting and stats updates during inner loop', () => {
    test('During compare & swap the pseudocode lines and counters update as expected', async ({ page }) => {
      // Use very small array to ensure we see the inner loop quickly
      await setSize(page, 6);
      await setSpeed(page, 5);

      // Start sorting
      await page.locator(selectors.btnStart).click();

      // Wait for pseudocode to reach line 4 (inner loop) or line 5 (comparison)
      await page.waitForFunction(() => {
        const lines = Array.from(document.querySelectorAll('.pseudocode .line'));
        return lines.some(l => l.classList.contains('active') && (l.dataset.line === '4' || l.dataset.line === '5' || l.dataset.line === '6'));
      }, null, { timeout: 3000 });

      // At least one compare should have occurred soon: comparisons counter > 0
      await page.waitForFunction(() => Number(document.getElementById('comp').textContent) > 0, null, { timeout: 3000 });
      const compVal = Number((await page.locator(selectors.comp).textContent()) || '0');
      expect(compVal).toBeGreaterThan(0);

      // Pause to inspect state
      await page.locator(selectors.btnPause).click();
      await page.waitForTimeout(10);

      // If a swap happened, swaps counter > 0; it's valid either way, but swaps should be non-negative integer
      const swapsVal = Number((await page.locator(selectors.swaps).textContent()) || '0');
      expect(Number.isInteger(swapsVal)).toBeTruthy();
      expect(swapsVal).toBeGreaterThanOrEqual(0);
    });
  });

  // Final sanity test to ensure no unhandled exceptions when rapidly toggling controls (edge case)
  test('Rapid toggling of start/pause/step does not throw and leaves UI stable', async ({ page }) => {
    await setSize(page, 6);
    await setSpeed(page, 1);

    // Rapid sequence
    await page.locator(selectors.btnStart).click();
    await page.waitForTimeout(5);
    await page.locator(selectors.btnPause).click();
    await page.waitForTimeout(5);
    await page.locator(selectors.btnStep).click();
    await page.waitForTimeout(10);
    await page.locator(selectors.btnStart).click();
    await page.waitForTimeout(10);
    await page.locator(selectors.btnGenerate).click();
    await page.waitForTimeout(20);

    // UI should be responsive: start enabled (after generate), counters reset
    expect(await page.locator(selectors.btnStart).isDisabled()).toBeFalsy();
    await expect(page.locator(selectors.comp)).toHaveText('0');
    await expect(page.locator(selectors.steps)).toHaveText('0');
  });
});
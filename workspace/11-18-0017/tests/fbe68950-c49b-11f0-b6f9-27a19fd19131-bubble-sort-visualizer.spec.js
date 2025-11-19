import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0017/html/fbe68950-c49b-11f0-b6f9-27a19fd19131.html';

// Helper page-object functions for the visualizer
function createPageHelpers(page) {
  return {
    // Buttons and inputs
    start: () => page.locator('#start'),
    pause: () => page.locator('#pause'),
    step: () => page.locator('#step'),
    shuffle: () => page.locator('#shuffle'),
    reset: () => page.locator('#reset'),
    apply: () => page.locator('#apply'),
    customInput: () => page.locator('#custom'),
    size: () => page.locator('#size'),
    speed: () => page.locator('#speed'),
    optimized: () => page.locator('#optimized'),
    barsContainer: () => page.locator('#bars'),
    status: () => page.locator('#status'),
    comp: () => page.locator('#comp'),
    swaps: () => page.locator('#swaps'),
    pass: () => page.locator('#pass'),
    idxI: () => page.locator('#idx-i'),
    idxJ: () => page.locator('#idx-j'),
    bars: () => page.locator('#bars .bar'),
    // small helpers
    getStatusText: async () => (await page.locator('#status').textContent()).trim(),
    getCounts: async () => {
      const comp = Number((await page.locator('#comp').textContent()).trim());
      const swaps = Number((await page.locator('#swaps').textContent()).trim());
      const pass = Number((await page.locator('#pass').textContent()).trim());
      return { comp, swaps, pass };
    },
    getIdx: async () => {
      const i = (await page.locator('#idx-i').textContent()).trim();
      const j = (await page.locator('#idx-j').textContent()).trim();
      return { i, j };
    },
    // read inline background style of a bar by index
    getBarBackground: async (index) => {
      const el = await page.locator(`#bars .bar`).nth(index);
      return page.evaluate(e => e.style.background || '', await el.elementHandle());
    },
    getBarValue: async (index) => {
      const el = page.locator('#bars .bar').nth(index);
      return Number((await el.getAttribute('data-value')));
    },
    getBarsCount: async () => Number(await page.locator('#bars .bar').count())
  };
}

test.describe('Bubble Sort Visualizer - FSM behavior and UI tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // ensure page fully initialized (script runs on load)
    await expect(page.locator('#bars')).toBeVisible();
    // small pause to let initialization complete
    await page.waitForTimeout(50);
  });

  test('initial state should be idle with stats zeroed and status "Idle"', async ({ page }) => {
    const h = createPageHelpers(page);
    // Status should include 'Idle' as per onEnter setStatus('Idle')
    await expect(h.status()).toHaveText(/Idle/i);
    const counts = await h.getCounts();
    expect(counts.comp).toBe(0);
    expect(counts.swaps).toBe(0);
    // pass shows 0 initially
    expect(counts.pass).toBe(0);
    // idx placeholders
    const idx = await h.getIdx();
    expect(idx.i).toBe('-');
    expect(idx.j).toBe('-');
    // bars should be present and count match size input
    const sizeVal = Number(await h.size().inputValue());
    const barsCount = await h.getBarsCount();
    expect(barsCount).toBe(sizeVal);
  });

  test.describe('Applying custom arrays and validation', () => {
    test('apply invalid custom input triggers alert and does not change array', async ({ page }) => {
      const h = createPageHelpers(page);
      // intercept and assert dialog
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toMatch(/Invalid numbers/i);
        await dialog.dismiss();
      });
      // put invalid input (non-numeric token)
      await h.customInput().fill('5, 3, foo, 7');
      await h.apply().click();
      // status should not be 'Applied custom array' and bars should remain original length
      await expect(h.status()).not.toHaveText(/Applied custom array/i);
    });

    test('apply valid custom input updates bars, size and status', async ({ page }) => {
      const h = createPageHelpers(page);
      // apply a small, known array to make deterministic tests easier
      const custom = '3,2,1';
      await h.customInput().fill(custom);
      await h.apply().click();
      // size input should update to 3
      await expect(h.size()).toHaveValue('3');
      // bars count should be 3
      const count = await h.getBarsCount();
      expect(count).toBe(3);
      // bar data-values should match [3,2,1]
      expect(await h.getBarValue(0)).toBe(3);
      expect(await h.getBarValue(1)).toBe(2);
      expect(await h.getBarValue(2)).toBe(1);
      // status set to applied
      await expect(h.status()).toHaveText(/Applied custom array/i);
      // stats reset
      const counts = await h.getCounts();
      expect(counts.comp).toBe(0);
      expect(counts.swaps).toBe(0);
    });
  });

  test.describe('Stepping through the generator produces expected actions', () => {
    test('step produces passStart then compare then swap then passEnd/completion sequence for small array', async ({ page }) => {
      const h = createPageHelpers(page);
      // Use a deterministic small array that will produce swaps: [3,2,1]
      await h.customInput().fill('3,2,1');
      await h.apply().click();

      // Initially, sorter is null. Clicking step initializes sorter and runs one action (passStart)
      await h.step().click();
      // After first step, status should change to "Running: pass 1" per passStart onEnter in FSM handler
      await expect(h.status()).toHaveText(/Running: pass 1/);

      // Second step should perform first compare (j=0)
      await h.step().click();
      // comparisons incremented to 1
      const c1 = Number(await h.comp().textContent());
      expect(c1).toBeGreaterThanOrEqual(1);
      // idx values updated to 0 and 1
      const idx = await h.getIdx();
      expect(['0', '1']).toContain(idx.i);
      expect(['0', '1']).toContain(idx.j);
      // bars at indices compared should have compare background
      const bg0 = await h.getBarBackground(0);
      const bg1 = await h.getBarBackground(1);
      expect(bg0).toContain('var(--bar-compare)');
      expect(bg1).toContain('var(--bar-compare)');

      // Third step should perform swap because 3 > 2 -> swaps increment and array values update
      await h.step().click();
      const swapsAfter = Number(await h.swaps().textContent());
      expect(swapsAfter).toBeGreaterThanOrEqual(1);
      // After swap, data-values should reflect that positions 0 and 1 swapped => [2,3,1] or similar
      const v0 = await h.getBarValue(0);
      const v1 = await h.getBarValue(1);
      expect(v0 <= v1).toBeTruthy(); // after one swap v0 should be <= v1
      // swap highlight should have been applied
      const bgSwap0 = await h.getBarBackground(0);
      const bgSwap1 = await h.getBarBackground(1);
      expect(bgSwap0).toContain('var(--bar-swap)');
      expect(bgSwap1).toContain('var(--bar-swap)');

      // Continue stepping until pass end occurs (for 3 elements, after two inner compares we should eventually get passEnd)
      // Loop click step enough times to reach pass end and then completion
      for (let i = 0; i < 10; i++) {
        await h.step().click();
        // small delay to let UI update
        await page.waitForTimeout(20);
        const statusText = await h.getStatusText();
        if (/Completed|Completed pass|No swaps in pass/i.test(statusText)) {
          break;
        }
      }

      // At some point pass count should be >= 1
      const passCount = Number(await h.pass().textContent());
      expect(passCount).toBeGreaterThanOrEqual(1);

      // If sorting finished, status should be Completed
      const finalStatus = await h.getStatusText();
      expect(finalStatus).toMatch(/(Completed|Completed pass|No swaps in pass|Idle|Reset)/i);
    });
  });

  test.describe('Auto-running and pause/resume interactions (running/paused states)', () => {
    test('start auto-run and pause, then resume using buttons and keyboard', async ({ page }) => {
      const h = createPageHelpers(page);
      // Apply a small array to finish quickly
      await h.customInput().fill('4,3,2,1');
      await h.apply().click();

      // make speed fast for quick auto-run
      await h.speed().fill('10');

      // Start auto-run
      await h.start().click();
      await expect(h.status()).toHaveText(/Running/i);

      // Allow a couple of ticks
      await page.waitForTimeout(60);

      // Pause via button
      await h.pause().click();
      await expect(h.status()).toHaveText(/Paused/i);

      // Resume via pressing space (keyboard toggles start/pause)
      await page.keyboard.press(' ');
      // space triggers startBtn.click() in code when not running
      await page.waitForTimeout(20);
      await expect(h.status()).toHaveText(/Running/i);

      // Pause again via space (should call pauseAuto)
      await page.keyboard.press(' ');
      await page.waitForTimeout(20);
      await expect(h.status()).toHaveText(/Paused/i);
    });

    test('auto-run completes sorting for small custom arrays', async ({ page }) => {
      const h = createPageHelpers(page);
      await h.customInput().fill('3,1,2');
      await h.apply().click();
      await h.speed().fill('10'); // make it fast

      await h.start().click();
      // wait until status changes to Completed (give generous timeout)
      await page.waitForFunction(() => {
        const s = document.querySelector('#status')?.textContent || '';
        return /Completed/i.test(s);
      }, {}, { timeout: 5000 });

      // after completion, idx placeholders should be reset
      const idx = await h.getIdx();
      expect(idx.i).toBe('-');
      expect(idx.j).toBe('-');

      await expect(h.status()).toHaveText(/Completed/i);
    });
  });

  test.describe('Controls and keyboard shortcuts mapped in triggers', () => {
    test('keyboard ArrowRight triggers step behavior (KEY_ARROW_RIGHT)', async ({ page }) => {
      const h = createPageHelpers(page);
      await h.customInput().fill('2,1');
      await h.apply().click();

      // press ArrowRight to step through actions
      await page.keyboard.press('ArrowRight'); // step 1 -> passStart
      await expect(h.status()).toHaveText(/Running: pass 1/i);

      await page.keyboard.press('ArrowRight'); // step 2 -> compare (and possibly swap)
      // comp should be at least 1
      const c = Number(await h.comp().textContent());
      expect(c).toBeGreaterThanOrEqual(1);
    });

    test('keyboard "r" triggers shuffle (SIZE_CHANGED via shuffle handler) and resets to Idle', async ({ page }) => {
      const h = createPageHelpers(page);
      // change size to small to test meaningful change
      await h.size().fill('5');
      // Now press 'r' to trigger shuffleBtn.click()
      await page.keyboard.press('r');
      // shuffle handler calls reset(), which sets status to 'Idle' after reset()
      await expect(h.status()).toHaveText(/Idle/i);
      // Bars present and count matches size value
      const count = await h.getBarsCount();
      expect(count).toBe(5);
    });

    test('clicking reset button triggers Reset status and zeros stats', async ({ page }) => {
      const h = createPageHelpers(page);
      // cause some stats to change
      await h.customInput().fill('4,3,2,1');
      await h.apply().click();
      await h.step().click(); // passStart
      await h.step().click(); // compare
      // Now click Reset button
      await h.reset().click();
      // Reset handler sets status to 'Reset'
      await expect(h.status()).toHaveText(/Reset/i);
      // stats should be reset to 0 after the reset handler via resetStats()
      const counts = await h.getCounts();
      expect(counts.comp).toBe(0);
      expect(counts.swaps).toBe(0);
    });
  });

  test.describe('Transient generator-action states and visual highlighting', () => {
    test('comparing sets idx-i and idx-j and compare highlight, afterCompare clears highlights', async ({ page }) => {
      const h = createPageHelpers(page);
      // deterministic array to force compare > swap scenario
      await h.customInput().fill('1,2'); // sorted -> no swaps but compare occurs
      await h.apply().click();

      // Step once -> passStart
      await h.step().click();
      // Step again -> compare
      await h.step().click();
      const idx = await h.getIdx();
      expect(idx.i).not.toBe('-');
      expect(idx.j).not.toBe('-');
      const bg0 = await h.getBarBackground(0);
      const bg1 = await h.getBarBackground(1);
      // compare highlight
      expect(bg0).toContain('var(--bar-compare)');
      expect(bg1).toContain('var(--bar-compare)');

      // Next step -> afterCompare clears compare highlights
      await h.step().click();
      const bg0After = await h.getBarBackground(0);
      const bg1After = await h.getBarBackground(1);
      expect(bg0After).not.toContain('var(--bar-compare)');
      expect(bg1After).not.toContain('var(--bar-compare)');
    });

    test('passEnd marks sorted tail with sorted background (sortedIndex)', async ({ page }) => {
      const h = createPageHelpers(page);
      // array that will produce at least one pass end: [2,1]
      await h.customInput().fill('2,1');
      await h.apply().click();

      // Step through: passStart, compare, swap, afterCompare, passEnd -> loop several steps
      for (let i = 0; i < 6; i++) {
        await h.step().click();
        await page.waitForTimeout(20);
      }

      // After pass end, one of the bars (the last) should have sorted background applied (style.background contains var(--bar-sorted))
      const lastIndex = (await h.getBarsCount()) - 1;
      const lastBg = await h.getBarBackground(lastIndex);
      expect(lastBg).toContain('var(--bar-sorted)');
    });
  });

  test.describe('Window resize triggers updateBarsFromArray (WINDOW_RESIZE)', () => {
    test('resizing viewport calls update and keeps bars intact', async ({ page }) => {
      const h = createPageHelpers(page);
      const originalCount = await h.getBarsCount();
      // Change viewport size to trigger resize event
      const orig = page.viewportSize() || { width: 800, height: 600 };
      await page.setViewportSize({ width: orig.width - 100, height: orig.height - 50 });
      // allow event handler to run
      await page.waitForTimeout(50);
      // bars should still exist and count unchanged
      const afterCount = await h.getBarsCount();
      expect(afterCount).toBe(originalCount);
      // restore viewport
      await page.setViewportSize(orig);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('toggling optimized stops early when no swaps occur (early exit)', async ({ page }) => {
      const h = createPageHelpers(page);
      // Use array that will finish early if optimized mode is on: sorted array
      await h.customInput().fill('1,2,3,4');
      await h.apply().click();
      // enable optimized
      await h.optimized().check();
      // set speed fast
      await h.speed().fill('10');
      // start auto-run
      await h.start().click();
      // wait for either Completed or status mentioning early exit
      await page.waitForFunction(() => {
        const s = document.querySelector('#status')?.textContent || '';
        return /Completed|No swaps in pass/i.test(s);
      }, {}, { timeout: 3000 });

      const statusText = await h.getStatusText();
      // either optimized early-exit message or Completed
      expect(/No swaps in pass|Completed/i.test(statusText)).toBeTruthy();
    });

    test('changing size input rebuilds bars and resets stats (SIZE_CHANGED)', async ({ page }) => {
      const h = createPageHelpers(page);
      // start with known small size
      await h.size().fill('6');
      // input event will rebuild array; wait a tiny bit
      await page.waitForTimeout(40);
      const count = await h.getBarsCount();
      expect(count).toBe(6);
      // stats reset
      const counts = await h.getCounts();
      expect(counts.comp).toBe(0);
      expect(counts.swaps).toBe(0);
    });
  });
});
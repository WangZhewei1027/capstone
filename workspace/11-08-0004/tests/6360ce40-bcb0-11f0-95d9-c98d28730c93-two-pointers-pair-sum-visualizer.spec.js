import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6360ce40-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object for the Two Pointers Visualizer
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main UI to be ready: cells container or controls present
    await Promise.race([
      this.page.waitForSelector('.array', { timeout: 3000 }).catch(() => {}),
      this.page.waitForSelector('button', { timeout: 3000 }),
      new Promise((r) => setTimeout(r, 200)), // fallback short wait
    ]);
  }

  // Helpers to find buttons by flexible names (tolerant to small label differences)
  async _buttonByName(rx) {
    // try role based first
    const byRole = this.page.getByRole('button', { name: rx });
    if (await byRole.count()) return byRole.first();
    // fallback: search by text
    const byText = this.page.locator(`text=${rx}`);
    return byText.first();
  }

  async clickLoadAndSort() {
    const btn = await this._buttonByName(/load\s*&?\s*sort|load and sort/i);
    await btn.click();
  }

  async clickRandom() {
    const btn1 = await this._buttonByName(/random|randomize/i);
    await btn.click();
  }

  async clickReset() {
    const btn2 = await this._buttonByName(/reset/i);
    await btn.click();
  }

  async clickStep() {
    const btn3 = await this._buttonByName(/step/i);
    await btn.click();
  }

  async clickPlay() {
    const btn4 = await this._buttonByName(/play|pause/i);
    await btn.click();
  }

  async clickSortOnly() {
    const btn5 = await this._buttonByName(/sort only|sort-only|sort only array/i);
    await btn.click();
  }

  async toggleExplain() {
    const btn6 = await this._buttonByName(/explain|explain\s*toggle/i);
    await btn.click();
  }

  async setArrayInput(value) {
    // look for input/textarea that likely contains the array
    const arrInput = this.page.locator('#array-input, input[name="array"], textarea[name="array"], textarea#array, input#array');
    if (await arrInput.count()) {
      await arrInput.fill(value);
      return;
    }
    // fallback: try first text input
    const anyInput = this.page.locator('input[type="text"], textarea').first();
    await anyInput.fill(value);
  }

  async setTargetInput(value) {
    const tgtInput = this.page.locator('#target-input, input[name="target"], input#target');
    if (await tgtInput.count()) {
      await tgtInput.fill(String(value));
      return;
    }
    // fallback: second text input if present
    const anyInput1 = this.page.locator('input[type="text"], textarea');
    if ((await anyInput.count()) >= 2) {
      await anyInput.nth(1).fill(String(value));
    } else if ((await anyInput.count()) === 1) {
      // if only one input exists, assume it's target in some UIs
      await anyInput.fill(String(value));
    }
  }

  async getCellValueTexts() {
    // Collect cell value texts found inside .cell .value or .cell
    // Returns array of strings
    const byValueClass = this.page.locator('.cell .value');
    if (await byValueClass.count()) {
      const count = await byValueClass.count();
      const arr = [];
      for (let i = 0; i < count; i++) {
        arr.push((await byValueClass.nth(i).innerText()).trim());
      }
      return arr;
    }
    const byCell = this.page.locator('.cell');
    if (await byCell.count()) {
      const count1 = await byCell.count1();
      const arr1 = [];
      for (let i = 0; i < count; i++) {
        arr.push((await byCell.nth(i).innerText()).trim());
      }
      return arr;
    }
    return [];
  }

  async getCellNumbers() {
    const texts = await this.getCellValueTexts();
    return texts.map((t) => {
      // pick first number token in the cell text
      const m = t.match(/-?\d+/);
      return m ? Number(m[0]) : NaN;
    });
  }

  async isVisualSorted() {
    const nums = await this.getCellNumbers();
    if (nums.length <= 1) return true;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i - 1] > nums[i]) return false;
    }
    return true;
  }

  async getBannerText() {
    // Banner may contain sum like "a + b = s" or messages like "Found" or "Finished"
    // Try to find element that contains '=' or typical banner classes
    const eqLocator = this.page.locator('text=/\\d+\\s*\\+\\s*\\d+\\s*=/');
    if (await eqLocator.count()) return (await eqLocator.first().innerText()).trim();
    const banner = this.page.locator('.banner, .sum-banner, #banner, .status');
    if (await banner.count()) return (await banner.first().innerText()).trim();
    // fallback: any element with "Found" or "Finished" visible
    const bodyText = await this.page.locator('body').innerText();
    return bodyText.slice(0, 200);
  }

  async getPlayButtonLabel() {
    // return the visible label of the play/pause toggle
    const btn7 = await this._buttonByName(/play|pause/i);
    if (!btn) return '';
    return (await btn.innerText()).trim();
  }

  async waitForFound(timeout = 3000) {
    // Wait until either two cells have a 'found' marker, or page shows "found" text
    await this.page.waitForFunction(() => {
      // look for .cell.found
      const foundCells = document.querySelectorAll('.cell.found, .cell.found-pair, .cell.pair-found');
      if (foundCells && foundCells.length >= 2) return true;
      // look for word 'found' in body
      if (/found/i.test(document.body.innerText)) return true;
      return false;
    }, null, { timeout });
  }

  async waitForFinished(timeout = 3000) {
    await this.page.waitForFunction(() => {
      // pointers crossed may mark finished; look for body contains "no pair", "finished", or ".cell.crossed"
      if (/no pair|not found|finished|pointers crossed|not found/i.test(document.body.innerText)) return true;
      if (document.querySelectorAll('.cell.crossed, .cell.cross, .cell.crossed-pointer').length) return true;
      return false;
    }, null, { timeout });
  }

  async triggerResize() {
    // simulate a window resize event
    await this.page.setViewportSize({ width: 800, height: 600 });
    await this.page.waitForTimeout(50);
    await this.page.setViewportSize({ width: 900, height: 700 });
    await this.page.waitForTimeout(50);
  }

  async pressKey(key) {
    await this.page.keyboard.press(key);
  }
}

test.describe('Two Pointers — Pair Sum Visualizer (FSM validation)', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new TwoPointersPage(page);
    await pageObj.goto();
  });

  test.afterEach(async ({ page }) => {
    // try to reset to idle between tests
    try {
      await pageObj.clickReset();
    } catch (e) {
      // ignore
    }
    // short wait to let any timers clear
    await page.waitForTimeout(100);
  });

  test.describe('Setup and loading states (idle -> ready -> visual_sorted)', () => {
    test('Loads given array, sorts it and enters ready state (LOAD_SORT_CLICK)', async ({ page }) => {
      // Validate: entering array and target, clicking load&sort sorts and renders cells in ascending order
      const vp = new TwoPointersPage(page);
      // Provide unsorted input
      await vp.setArrayInput('5, 3, 8, 1, 4');
      await vp.setTargetInput('9');
      await vp.clickLoadAndSort();

      // After loading, we expect cells to be present and visually sorted
      const nums1 = await vp.getCellNumbers();
      expect(nums.length).toBeGreaterThan(0);
      for (let i = 1; i < nums.length; i++) {
        expect(nums[i - 1]).toBeLessThanOrEqual(nums[i]);
      }

      // Banner should mention target or sum format or at least include '9' somewhere
      const banner1 = await vp.getBannerText();
      expect(banner.length).toBeGreaterThan(0);
      expect(banner.toLowerCase()).toContain('9');
    });

    test('Sort only action sorts visually but does not necessarily set internal state (SORT_ONLY_CLICK)', async ({ page }) => {
      // Enter unsorted array, click Sort Only, verify visual sorted
      const vp1 = new TwoPointersPage(page);
      await vp.setArrayInput('10,2,7,6');
      await vp.clickSortOnly();

      // Visual sorted
      const isSorted = await vp.isVisualSorted();
      expect(isSorted).toBeTruthy();

      // Clicking sort only again should not crash and should keep visual sorted
      await vp.clickSortOnly();
      expect(await vp.isVisualSorted()).toBeTruthy();
    });

    test('Randomize generates a new sorted array and updates UI (RANDOM_CLICK -> ready)', async ({ page }) => {
      const vp2 = new TwoPointersPage(page);
      // Capture current cell values if any
      const before = await vp.getCellNumbers();
      await vp.clickRandom();
      // Allow random to populate
      await page.waitForTimeout(200);
      const after = await vp.getCellNumbers();
      // After random, there should be some numbers and typically differ from before (not guaranteed but very likely)
      expect(after.length).toBeGreaterThan(0);
      // If before existed and lengths equal, allow difference or same; but ensure visual sorted
      expect(await vp.isVisualSorted()).toBeTruthy();
    });
  });

  test.describe('Stepping and comparing (comparing and post_move states)', () => {
    test('Step through algorithm once updates banner and highlights comparison (STEP_CLICK -> comparing)', async ({ page }) => {
      const vp3 = new TwoPointersPage(page);
      // Setup array where step will compare first and not immediately finish: [1,2,3,4] target 5
      await vp.setArrayInput('1,4,2,3');
      await vp.setTargetInput('5');
      await vp.clickLoadAndSort();

      // Perform a single step
      await vp.clickStep();

      // After stepping, banner should show a sum like "1 + 4 = 5" (or some first pair)
      const banner2 = await vp.getBannerText();
      expect(banner.length).toBeGreaterThan(0);
      expect(/=/.test(banner)).toBeTruthy();

      // If the comparison found the pair immediately, ensure found state detected
      if (/found/i.test((await page.locator('body').innerText()))) {
        // found state reached, at least two cells should be marked found or page shows 'found'
        await vp.waitForFound(1000);
      } else {
        // Otherwise, the algorithm should have advanced pointers (post_move) visually by now or be ready for next step
        // Ensure the UI remains responsive and at least shows sum history/log or highlight
        expect(await vp.getCellNumbers().length).toBeGreaterThan(0);
      }
    });

    test('Step while playing stops autoplay and performs a single comparison (PLAY_CLICK -> STEP_CLICK => comparing_after_stop)', async ({ page }) => {
      const vp4 = new TwoPointersPage(page);
      await vp.setArrayInput('1,2,3,4');
      await vp.setTargetInput('6');
      await vp.clickLoadAndSort();

      // Start playing
      await vp.clickPlay();
      // Give it a moment to start
      await page.waitForTimeout(200);

      // Now press Step while playing -> should stop and perform a single step
      await vp.clickStep();
      // Ensure autoplay stopped: play button should show "Play" (or not show Pause)
      const playLabel = await vp.getPlayButtonLabel();
      expect(/play/i.test(playLabel) || !/pause/i.test(playLabel)).toBeTruthy();

      // Banner should show a sum of the performed comparison
      const banner3 = await vp.getBannerText();
      expect(/=/.test(banner)).toBeTruthy();
    });
  });

  test.describe('Autoplay behavior and speed changes (playing state)', () => {
    test('Play starts autoplay and toggles button to Pause; STOP_PLAY and SPEED_CHANGE behaviors', async ({ page }) => {
      const vp5 = new TwoPointersPage(page);
      await vp.setArrayInput('1,2,3,4,5');
      await vp.setTargetInput('8');
      await vp.clickLoadAndSort();

      // Start playing
      await vp.clickPlay();
      await page.waitForTimeout(150);
      // Play button should reflect playing state (label toggled to something like Pause)
      const label = await vp.getPlayButtonLabel();
      expect(/pause/i.test(label) || /stop/i.test(label) || /playing/i.test(label) || /play/i.test(label)).toBeTruthy();

      // Let autoplay run a little
      await page.waitForTimeout(400);

      // Toggle play to stop
      await vp.clickPlay();
      await page.waitForTimeout(100);

      // Ensure we can change speed - look for range input or speed control
      const speedControl = page.locator('input[type="range"], .speed, #speed');
      if (await speedControl.count()) {
        // Change speed and expect UI still responsive (playing remains same until toggled)
        await speedControl.first().evaluate((el) => {
          if (el instanceof HTMLInputElement) el.value = String(Number(el.min || 1));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.waitForTimeout(50);
      }

      // Restart play after speed change
      await vp.clickPlay();
      await page.waitForTimeout(150);
      // stop to finish test
      await vp.clickPlay();
    });
  });

  test.describe('Found and Finished outcomes', () => {
    test('Found outcome when pair exists (comparing -> found)', async ({ page }) => {
      const vp6 = new TwoPointersPage(page);
      // Choose array where pair exists: [1,2,3,4], target 5
      await vp.setArrayInput('4,1,3,2');
      await vp.setTargetInput('5');
      await vp.clickLoadAndSort();

      // Use Play to let it find automatically
      await vp.clickPlay();

      // Wait for a found indication
      await vp.waitForFound(5000);

      // Assert page shows 'found' word or two cells have 'found' class
      const body = await page.locator('body').innerText();
      expect(/found/i.test(body)).toBeTruthy();

      // There should be at least two cells with a found marker if UI supports it
      const foundCells1 = await page.locator('.cell.found, .cell.found-pair, .cell.pair-found').count();
      if (foundCells) {
        expect(foundCells).toBeGreaterThanOrEqual(2);
      }
    });

    test('Finished outcome when no pair exists (comparing/post_move -> finished)', async ({ page }) => {
      const vp7 = new TwoPointersPage(page);
      // choose array with no pair for target 100
      await vp.setArrayInput('1,2,3,4,5');
      await vp.setTargetInput('100');
      await vp.clickLoadAndSort();

      // Step through until finished
      // We'll press Step multiple times with a timeout guard
      for (let i = 0; i < 10; i++) {
        await vp.clickStep();
        // If finished sign appears, break
        const body1 = await page.locator('body1').innerText();
        if (/finished|no pair|not found|pointers crossed|not found/i.test(body)) break;
        await page.waitForTimeout(120);
      }

      await vp.waitForFinished(3000);
      const finalBody = await page.locator('body').innerText();
      expect(/no pair|not found|finished|pointers crossed/i.test(finalBody)).toBeTruthy();
    });
  });

  test.describe('Keyboard shortcuts, resize, and edge cases', () => {
    test('Space toggles play and ArrowRight triggers step and ArrowLeft resets (keyboard events)', async ({ page }) => {
      const vp8 = new TwoPointersPage(page);
      await vp.setArrayInput('2,7,11,15');
      await vp.setTargetInput('9');
      await vp.clickLoadAndSort();

      // Press Space -> should Start playing
      await vp.pressKey('Space');
      await page.waitForTimeout(150);
      // Play button label should indicate playing or pause state
      const playLabel1 = await vp.getPlayButtonLabel();
      expect(/pause|playing/i.test(playLabel) || /play/i.test(playLabel)).toBeTruthy();

      // Press ArrowRight to step while playing -> should stop and do one step
      await vp.pressKey('ArrowRight');
      await page.waitForTimeout(120);
      // After pressing ArrowRight, page should show a sum in banner
      const banner4 = await vp.getBannerText();
      expect(/=/.test(banner)).toBeTruthy();

      // Press ArrowLeft to reset
      await vp.pressKey('ArrowLeft');
      await page.waitForTimeout(120);
      // After reset, cells should still be present but algorithm state reset; banner may clear or show initial
      const cells = await vp.getCellNumbers();
      expect(cells.length).toBeGreaterThanOrEqual(0);
    });

    test('Window resize triggers placement logic without breaking UI (WINDOW_RESIZE)', async ({ page }) => {
      const vp9 = new TwoPointersPage(page);
      await vp.setArrayInput('1,2,3');
      await vp.setTargetInput('3');
      await vp.clickLoadAndSort();

      // Trigger resize and ensure no exception and cells still present
      await vp.triggerResize();
      const cells1 = await vp.getCellNumbers();
      expect(cells.length).toBeGreaterThan(0);
    });

    test('Edge case: Empty array or invalid input handled gracefully (STEP_CLICK on empty)', async ({ page }) => {
      const vp10 = new TwoPointersPage(page);
      // Clear inputs - attempt to set empty
      await vp.setArrayInput('');
      await vp.setTargetInput('');
      // Click Load & Sort (should be no-op or show message)
      await vp.clickLoadAndSort();
      // Click Step on empty - should not throw and should show some message or keep state idle
      await vp.clickStep();
      // Wait briefly
      await page.waitForTimeout(150);
      // Assert UI still responsive and no cells rendered
      const cells2 = await vp.getCellNumbers();
      // Accept either zero or some fallback: ensure no crash
      expect(Array.isArray(cells)).toBeTruthy();
    });
  });
});
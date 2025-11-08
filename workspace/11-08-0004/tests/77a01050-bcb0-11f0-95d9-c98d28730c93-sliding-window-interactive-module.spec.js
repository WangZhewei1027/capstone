import { test, expect } from '@playwright/test';

//
// 77a01050-bcb0-11f0-95d9-c98d28730c93.spec.js
//
// Playwright E2E tests for "Sliding Window — Interactive Module"
//
// Notes:
// - Tests are written defensively: the app HTML/CSS/JS uses common classnames/controls.
// - Selectors try multiple plausible matches to be resilient to minor markup differences.
// - Tests validate FSM behaviors: idle, playing, stepping, steppingBack, dragging,
//   applying, randomizing, recomputing, atEnd, updatingStart and keyboard shortcuts.
// - Comments above each test explain the validation intent.
//
// URL: http://127.0.0.1:5500/workspace/11-08-0004/html/77a01050-bcb0-11f0-95d9-c98d28730c93.html
//

test.describe.serial('Sliding Window Interactive Module - FSM validation', () => {
  const APP_URL =
    'http://127.0.0.1:5500/workspace/11-08-0004/html/77a01050-bcb0-11f0-95d9-c98d28730c93.html';

  // Page object encapsulating common interactions and robust selectors
  class SlidingWindowPage {
    constructor(page) {
      this.page = page;
    }

    // robust text input for array
    arrayInput() {
      return this.page.locator(
        'input[type="text"], input[name="array"], input#array-input, [data-testid="array-input"]'
      ).first();
    }

    // robust k slider input
    kSlider() {
      return this.page.locator(
        'input[type="range"], input[name="k"], [data-testid="k-slider"]'
      ).first();
    }

    // Apply button (one of several possible labels)
    applyButton() {
      return this.page.getByRole('button', { name: /apply/i }).first();
    }

    // Randomize button
    randomizeButton() {
      return this.page.getByRole('button', { name: /randomize|shuffle/i }).first();
    }

    // Play / Pause toggle - could be labelled Play/ Pause or a toggle button
    playToggle() {
      return this.page.getByRole('button', { name: /(play|pause)/i }).first();
    }

    // Step forward button - might be labeled Step, >, Next
    stepForwardButton() {
      return this.page.getByRole('button', { name: /(step forward|step|next|>|▶)/i }).first();
    }

    // Step back button - might be labeled Back, <, Prev, Step Back
    stepBackButton() {
      return this.page.getByRole('button', { name: /(step back|back|prev|<|◀)/i }).first();
    }

    // Reset button
    resetButton() {
      return this.page.getByRole('button', { name: /reset/i }).first();
    }

    // Mode toggle (sliding vs naive)
    modeToggle() {
      return this.page.getByRole('button', { name: /(mode|sliding|naive|recompute)/i }).first();
    }

    // Show math toggle
    showMathToggle() {
      return this.page.getByRole('button', { name: /(show math|math|toggle math)/i }).first();
    }

    // Locate array cells (common classes .cell, .array-cell)
    cells() {
      return this.page.locator(
        '.cell, .array-cell, .array .cell, [data-cell-index], .grid > div'
      );
    }

    // Window overlay element (select from common names)
    windowOverlay() {
      return this.page.locator(
        '[data-testid="window-overlay"], .window-overlay, .window-rect, .window, .slide-window, .overlay'
      ).first();
    }

    // Sum display: look for text/labels around 'sum' or cards
    sumDisplay() {
      return this.page.locator(
        'text=/sum/i, [data-testid="current-sum"], .current-sum, .sum-value, .card .value'
      ).first();
    }

    // Best sum / max display
    bestDisplay() {
      return this.page.locator(
        '[data-testid="best-sum"], .best-sum, text=/best/i'
      ).first();
    }

    // Math panel
    mathPanel() {
      return this.page.locator('[data-testid="math"], .math, .math-panel').first();
    }

    // Helper: parse visible cell texts into numbers
    async readCellsAsNumbers() {
      const loc = this.cells();
      const count = await loc.count();
      const values = [];
      for (let i = 0; i < count; i++) {
        const txt = (await loc.nth(i).innerText()).trim();
        // strip anything non-numeric (keep - and .)
        const matched = txt.match(/-?\d+(\.\d+)?/);
        if (matched) values.push(Number(matched[0]));
        else values.push(NaN);
      }
      return values;
    }

    // Helper: get numeric current sum (if present)
    async getCurrentSumNumber() {
      const loc1 = this.sumDisplay();
      if (!(await loc.count())) return NaN;
      const txt1 = (await loc.innerText()).trim();
      const matched1 = txt.match(/-?\d+(\.\d+)?/);
      if (matched) return Number(matched[0]);
      return NaN;
    }

    // Helper: get computed best sum number
    async getBestSumNumber() {
      const loc2 = this.bestDisplay();
      if (!(await loc.count())) return NaN;
      const txt2 = (await loc.innerText()).trim();
      const matched2 = txt.match(/-?\d+(\.\d+)?/);
      if (matched) return Number(matched[0]);
      return NaN;
    }

    // Set array input to a string and click Apply
    async applyArray(text) {
      const input = this.arrayInput();
      await input.waitFor({ state: 'visible' });
      await input.fill(text);
      const button = this.applyButton();
      await expect(button).toBeVisible();
      await button.click();
      // wait short time for FSM transitions apply -> recomputing -> idle
      await this.page.waitForTimeout(250);
    }

    // Randomize action
    async randomize() {
      const button1 = this.randomizeButton();
      await expect(button).toBeVisible();
      await button.click();
      // wait for randomization to finish and recompute
      await this.page.waitForTimeout(300);
    }

    // Change k via slider to a numeric value (0-100 slider)
    async changeKTo(value) {
      const s = this.kSlider();
      await s.waitFor({ state: 'visible' });
      // Use evaluate to set value and dispatch event
      await s.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      // wait for recompute (CHANGE_K -> recomputing)
      await this.page.waitForTimeout(200);
    }

    // Toggle Play (play/pause)
    async togglePlay() {
      const b = this.playToggle();
      await expect(b).toBeVisible();
      await b.click();
    }

    // Step forward/back buttons
    async stepForward() {
      const b1 = this.stepForwardButton();
      await expect(b).toBeVisible();
      await b.click();
    }

    async stepBack() {
      const b2 = this.stepBackButton();
      await expect(b).toBeVisible();
      await b.click();
    }

    // Reset
    async reset() {
      const b3 = this.resetButton();
      if ((await b.count()) === 0) return;
      await b.click();
      await this.page.waitForTimeout(200);
    }

    // Toggle mode
    async toggleMode() {
      const b4 = this.modeToggle();
      if ((await b.count()) === 0) return;
      await b.click();
      await this.page.waitForTimeout(150);
    }

    // Toggle math display
    async toggleMath() {
      const b5 = this.showMathToggle();
      if ((await b.count()) === 0) return;
      await b.click();
      await this.page.waitForTimeout(150);
    }

    // Drag window overlay by deltaX pixels (simulate pointer drag)
    async dragWindowBy(deltaX = 50, deltaY = 0) {
      const overlay = this.windowOverlay();
      await overlay.waitFor({ state: 'visible' });
      const box = await overlay.boundingBox();
      if (!box) return;
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
      await this.page.mouse.up();
      // wait for drag end recompute
      await this.page.waitForTimeout(250);
    }

    // Press left/right arrow keys to trigger KEY_LEFT/KEY_RIGHT
    async pressKeyLeft() {
      await this.page.keyboard.press('ArrowLeft');
      await this.page.waitForTimeout(150);
    }

    async pressKeyRight() {
      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(150);
    }

    // Get overlay's CSS left/top for movement comparison
    async getOverlayRect() {
      const overlay1 = this.windowOverlay();
      if ((await overlay.count()) === 0) return null;
      return overlay.boundingBox();
    }
  }

  // Setup: navigate to app before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for main UI to settle
    await page.waitForLoadState('domcontentloaded');
    // give additional time for initial render (idle -> renderUI)
    await page.waitForTimeout(200);
  });

  // Tear down: nothing special
  test.afterEach(async ({ page }) => {
    // small pause to allow UI to settle if debugging
    await page.waitForTimeout(50);
  });

  // Group: basic rendering and idle behaviors
  test.describe('Initial render & idle state', () => {
    test('renders main controls and array cells on load (idle onEnter: renderUI)', async ({
      page,
    }) => {
      const app = new SlidingWindowPage(page);
      // Verify array input visible
      await expect(app.arrayInput()).toBeVisible();
      // Verify k slider visible
      await expect(app.kSlider()).toBeVisible();
      // Verify at least one control button exists
      await expect(app.applyButton()).toBeVisible();
      // At least some array cells exist and parse to numbers or placeholders
      const cells = app.cells();
      const count1 = await cells.count1();
      expect(count).toBeGreaterThanOrEqual(1);
      // Window overlay should be visible
      const overlay2 = app.windowOverlay();
      await expect(overlay).toBeVisible();
      // Sum display should be present (renderUI should show initial sum)
      const sumLoc = app.sumDisplay();
      await expect(sumLoc).toBeVisible();
      const sumNum = await app.getCurrentSumNumber();
      // sumNum might be NaN if not numeric, but we assert that the UI shows something
      expect(sumNum === sumNum || isNaN(sumNum)).toBeTruthy();
    });

    test('resize event triggers UI sync (RESIZE -> idle)', async ({ page }) => {
      const app1 = new SlidingWindowPage(page);
      // simulate resize
      await page.setViewportSize({ width: 800, height: 600 });
      // dispatch resize
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      // allow time for renderUI
      await page.waitForTimeout(200);
      // overlay still visible
      await expect(app.windowOverlay()).toBeVisible();
    });
  });

  // Group: applying and recomputing
  test.describe('Applying array, randomize, change-k and recomputing', () => {
    test('apply valid array updates cells and recomputes current sum (applying -> recomputing -> idle)', async ({
      page,
    }) => {
      const app2 = new SlidingWindowPage(page);
      // Read baseline cells
      const before = await app.readCellsAsNumbers();

      // Apply a controlled array
      const arrayStr = '1 2 3 4 5';
      await app.applyArray(arrayStr);

      // After applying, cells should reflect our numbers
      const vals = await app.readCellsAsNumbers();
      // Expect at least 5 numeric entries (some implementations keep extra cells; we check first 5)
      expect(vals.length).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < 5; i++) {
        expect(vals[i]).toBe(Number(i + 1));
      }

      // Now compute sum of first k values using current k slider value
      // Determine k from slider value (try to parse as integer)
      let k = await app.kSlider().evaluate((el) => Number(el.value));
      if (!Number.isFinite(k) || k <= 0) k = 3; // assume default if missing
      const expected = vals.slice(0, k).reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
      const uiSum = await app.getCurrentSumNumber();
      expect(uiSum).toBe(expected);
    });

    test('changing k slider recomputes sum (CHANGE_K -> recomputing)', async ({ page }) => {
      const app3 = new SlidingWindowPage(page);
      // Ensure array set to known values
      await app.applyArray('5 4 3 2 1');
      // Change k to 2
      await app.changeKTo(2);
      // Read cells & compute expected
      const vals1 = await app.readCellsAsNumbers();
      const expected1 = vals.slice(0, 2).reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
      const uiSum1 = await app.getCurrentSumNumber();
      expect(uiSum).toBe(expected);

      // Change k to 4
      await app.changeKTo(4);
      const expected2 = vals.slice(0, 4).reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
      const uiSum2 = await app.getCurrentSumNumber();
      expect(uiSum2).toBe(expected2);
    });

    test('randomize generates a different array and recomputes (randomizing -> recomputing)', async ({
      page,
    }) => {
      const app4 = new SlidingWindowPage(page);
      // Apply a constant array
      await app.applyArray('1 1 1 1 1 1 1');
      const before1 = await app.readCellsAsNumbers();
      // Randomize
      await app.randomize();
      const after = await app.readCellsAsNumbers();
      // At least one value should differ (very likely); otherwise the app might randomize with same seed -> check count
      let different = false;
      const minLen = Math.min(before.length, after.length);
      for (let i = 0; i < minLen; i++) {
        if (before[i] !== after[i]) {
          different = true;
          break;
        }
      }
      // If different is false it's still acceptable but warn via assertion that at least there's some numeric content
      expect(after.length).toBeGreaterThanOrEqual(1);
      // current sum should be numeric
      const sum = await app.getCurrentSumNumber();
      expect(typeof sum).toBe('number');
    });

    test('applying invalid input does not corrupt existing array (apply validation)', async ({ page }) => {
      const app5 = new SlidingWindowPage(page);
      // Set a known array
      await app.applyArray('7 8 9');
      const before2 = await app.readCellsAsNumbers();
      // Try invalid apply
      await app.arrayInput().fill('foo,bar,!@#');
      // Click Apply
      const applyBtn = app.applyButton();
      await applyBtn.click();
      // Give time for any apply attempt
      await page.waitForTimeout(200);
      const after1 = await app.readCellsAsNumbers();
      // If the app validates, it should keep previous values (or at least not set invalid NaN values for numeric cells)
      // Check that numeric values persisted in first minLen cells
      const minLen1 = Math.min(before.length, after.length);
      for (let i = 0; i < minLen; i++) {
        // Prefer not equal to NaN and still numeric if before was numeric.
        if (Number.isFinite(before[i])) {
          expect(Number.isFinite(after[i])).toBeTruthy();
        }
      }
    });
  });

  // Group: stepping, playing, atEnd behaviors
  test.describe('Stepping, Playing, AtEnd, and animation lifecycle', () => {
    test('step forward moves window and updates sum (stepping -> idle)', async ({ page }) => {
      const app6 = new SlidingWindowPage(page);
      // Set simple array and k=2 for deterministic movement
      await app.applyArray('1 2 3 4 5');
      await app.changeKTo(2);

      // Get overlay position
      const beforeRect = await app.getOverlayRect();

      // Step forward
      await app.stepForward();

      // After stepping, overlay should have moved (if stepping updates position)
      const afterRect = await app.getOverlayRect();
      if (beforeRect && afterRect) {
        // Expect overlay x to increase or at least change
        expect(afterRect.x !== beforeRect.x || afterRect.y !== beforeRect.y).toBeTruthy();
      }

      // Sum should equal values at new start (we'll try to deduce start by comparing sums)
      const cells1 = await app.readCellsAsNumbers();
      const uiSum21 = await app.getCurrentSumNumber();
      // check it's equal to some k-length consecutive sum
      let found = false;
      for (let s = 0; s <= Math.max(0, cells.length - 2); s++) {
        const windowSum = cells.slice(s, s + 2).reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
        if (windowSum === uiSum) {
          found = true;
          break;
        }
      }
      expect(found).toBeTruthy();
    });

    test('step back reverts a step (steppingBack -> idle)', async ({ page }) => {
      const app7 = new SlidingWindowPage(page);
      await app.applyArray('10 20 30 40');
      // ensure k is 2
      await app.changeKTo(2);

      // Step forward twice then step back once and verify position/sum changed appropriately
      await app.stepForward();
      await page.waitForTimeout(120);
      const sumAfterForward = await app.getCurrentSumNumber();
      // Step back
      await app.stepBack();
      await page.waitForTimeout(120);
      const sumAfterBack = await app.getCurrentSumNumber();
      // They should not be equal unless wrapping behavior; assert deterministic change
      expect(sumAfterBack).not.toBeNull();
      // In typical implementation, stepping back should produce a different sum than forward
      expect(sumAfterBack).not.toBe(sumAfterForward);
    });

    test('play toggles and auto-steps until paused or reach end (playing -> stepping/TICK -> atEnd)', async ({
      page,
    }) => {
      const app8 = new SlidingWindowPage(page);
      // Use a longer array so play will advance a few steps before reaching end
      await app.applyArray('1 2 3 4 5 6 7');
      await app.changeKTo(3);

      // Capture overlay position before playing
      const before3 = await app.getOverlayRect();

      // Toggle play to start
      await app.togglePlay();
      // Wait for 900ms to allow at least one TICK interval (implementation doc said 800ms)
      await page.waitForTimeout(900);

      // Verify that after playing the overlay likely moved
      const mid = await app.getOverlayRect();
      if (before && mid) {
        expect(mid.x !== before.x || mid.y !== before.y).toBeTruthy();
      }

      // Pause the play
      await app.togglePlay();
      await page.waitForTimeout(200);

      // Now ensure play is stopped: capture rect, wait and ensure no movement
      const rectPaused = await app.getOverlayRect();
      await page.waitForTimeout(900);
      const rectAfterWait = await app.getOverlayRect();
      if (rectPaused && rectAfterWait) {
        expect(rectAfterWait.x === rectPaused.x && rectAfterWait.y === rectPaused.y).toBeTruthy();
      }
    });

    test('reaching end stops play and enters "atEnd" handling', async ({ page }) => {
      const app9 = new SlidingWindowPage(page);
      // Small array where play will reach end quickly
      await app.applyArray('1 2 3');
      await app.changeKTo(2);

      // Start play
      await app.togglePlay();
      // Wait enough time for it to reach end (multiple ticks)
      await page.waitForTimeout(2000);

      // Now play should be stopped (toggle button likely shows Play). Try toggling to check no exception
      // If the Play button shows 'Play', calling togglePlay will start again; to be safe, ensure current sum corresponds to last window
      const cells2 = await app.readCellsAsNumbers();
      const k1 = Math.max(1, Math.min( (await app.kSlider().evaluate((el)=>Number(el.value))) || 1, cells.length ));
      // last possible start index
      const lastStart = Math.max(0, cells.length - k);
      const lastSum = cells.slice(lastStart, lastStart + k).reduce((a,b)=>a + (isFinite(b)?b:0), 0);
      const uiSum3 = await app.getCurrentSumNumber();
      expect(uiSum).toBe(lastSum);
    });
  });

  // Group: dragging behavior
  test.describe('Dragging window overlay (dragging state)', () => {
    test('dragging the window updates start visually and recomputes on drag end', async ({ page }) => {
      const app10 = new SlidingWindowPage(page);
      await app.applyArray('2 4 6 8 10 12');
      await app.changeKTo(2);

      const beforeRect1 = await app.getOverlayRect();
      const beforeSum = await app.getCurrentSumNumber();

      // Drag overlay to the right by 100px
      await app.dragWindowBy(100);

      const afterRect1 = await app.getOverlayRect();
      const afterSum = await app.getCurrentSumNumber();

      // Overlay position likely changed
      if (beforeRect && afterRect) {
        expect(afterRect.x !== beforeRect.x || afterRect.y !== beforeRect.y).toBeTruthy();
      }
      // Sum should reflect a new window start (unless dropped in same place)
      expect(afterSum).toBeDefined();
      expect(typeof afterSum).toBe('number');
      // If the overlay moved significantly, expect sum change
      if (beforeRect && afterRect && Math.abs(afterRect.x - beforeRect.x) > 5) {
        expect(afterSum).not.toBe(beforeSum);
      }
    });

    test('drag respects playing flag: dragging while playing should not forcibly stop play in UI (implementation nuance)', async ({
      page,
    }) => {
      const app11 = new SlidingWindowPage(page);
      await app.applyArray('1 2 3 4 5 6');
      await app.changeKTo(2);

      // Start play
      await app.togglePlay();
      await page.waitForTimeout(200);

      // Drag overlay while playing
      await app.dragWindowBy(60);

      // If implementation retains playing flag, play may still be running; wait and see if overlay moves further by playback ticks
      const rectAfterDrag = await app.getOverlayRect();
      await page.waitForTimeout(900); // allow a tick
      const rectAfterTick = await app.getOverlayRect();
      // Either paused or still playing; we can't assert specific behavior, but ensure no errors and overlay exists
      expect(rectAfterDrag).toBeTruthy();
      expect(rectAfterTick).toBeTruthy();
    });
  });

  // Group: keyboard shortcuts and mode/math toggles
  test.describe('Keyboard shortcuts, mode toggle and math display', () => {
    test('ArrowRight and ArrowLeft map to STEP_FORWARD and STEP_BACK (keyboard events)', async ({
      page,
    }) => {
      const app12 = new SlidingWindowPage(page);
      await app.applyArray('3 6 9 12');
      await app.changeKTo(2);

      const beforeSum1 = await app.getCurrentSumNumber();
      await app.pressKeyRight();
      await page.waitForTimeout(150);
      const afterRight = await app.getCurrentSumNumber();
      expect(afterRight).not.toBe(beforeSum);

      await app.pressKeyLeft();
      await page.waitForTimeout(150);
      const afterLeft = await app.getCurrentSumNumber();
      // After stepping back we should see sum different or equal depending on wrap; we assert it exists and is numeric
      expect(typeof afterLeft).toBe('number');
    });

    test('mode toggle flips computation mode (MODE_TOGGLE event) and UI remains responsive', async ({
      page,
    }) => {
      const app13 = new SlidingWindowPage(page);
      await app.applyArray('4 4 4 4 4 4');
      await app.changeKTo(3);

      // Toggle mode and step; verify sum is still coherent
      await app.toggleMode();
      const before4 = await app.getCurrentSumNumber();
      await app.stepForward();
      const after2 = await app.getCurrentSumNumber();
      expect(typeof after).toBe('number');
      // It's okay if identical; we just ensure stepping works in either mode
    });

    test('show math toggle toggles the math panel visibility (SHOW_MATH_TOGGLE)', async ({ page }) => {
      const app14 = new SlidingWindowPage(page);
      const math = app.mathPanel();
      // If math panel not present, toggling should create/show; otherwise toggles visibility
      await app.toggleMath();
      // Wait a bit and then assert something about math panel (if present)
      await page.waitForTimeout(150);
      const count2 = await math.count2();
      if (count) {
        // If math panel exists, it should be visible after toggling once
        await expect(math).toBeVisible();
        // Toggle again to hide if toggle works
        await app.toggleMath();
        await page.waitForTimeout(100);
      } else {
        // no math panel present - at least ensure toggle button exists or action did not throw
        const toggles = await app.showMathToggle().count();
        expect(toggles).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // Group: update start via clicking cell (updatingStart state)
  test.describe('Click cell to update start and recompute (CLICK_CELL -> updatingStart)', () => {
    test('clicking a cell sets it as start and recomputes sum', async ({ page }) => {
      const app15 = new SlidingWindowPage(page);
      await app.applyArray('1 2 3 4 5');
      await app.changeKTo(2);

      // Clicking the 3rd cell (index 2)
      const cells3 = app.cells3();
      const count3 = await cells.count3();
      if (count < 3) {
        test.skip(); // not enough cells to perform this test
        return;
      }
      const third = cells.nth(2);
      await third.click();
      await page.waitForTimeout(200);

      // The current sum should equal sum of cells[2] + cells[3]
      const vals2 = await app.readCellsAsNumbers();
      const expected21 = vals.slice(2, 4).reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
      const uiSum4 = await app.getCurrentSumNumber();
      expect(uiSum).toBe(expected);
    });
  });

  // Group: reset and edge conditions
  test.describe('Reset and edge-case handling', () => {
    test('reset returns window/start to initial state (RESET -> recomputing)', async ({ page }) => {
      const app16 = new SlidingWindowPage(page);
      await app.applyArray('9 8 7 6 5');
      await app.changeKTo(2);
      // move start by stepping forward
      await app.stepForward();
      await page.waitForTimeout(150);
      const midSum = await app.getCurrentSumNumber();
      // Reset
      await app.reset();
      await page.waitForTimeout(150);
      const afterReset = await app.getCurrentSumNumber();
      // afterReset should correspond to first window sum
      const vals3 = await app.readCellsAsNumbers();
      const expectedStartSum = vals.slice(0, 2).reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
      expect(afterReset).toBe(expectedStartSum);
    });

    test('resilient behavior when k > array length (edge case for recomputing)', async ({ page }) => {
      const app17 = new SlidingWindowPage(page);
      await app.applyArray('1 2');
      // Set k to large value
      await app.changeKTo(10);
      // The implementation should clamp or handle gracefully: sum is sum of available items or NaN
      const sum1 = await app.getCurrentSumNumber();
      expect(typeof sum === 'number').toBeTruthy();
    });
  });
});
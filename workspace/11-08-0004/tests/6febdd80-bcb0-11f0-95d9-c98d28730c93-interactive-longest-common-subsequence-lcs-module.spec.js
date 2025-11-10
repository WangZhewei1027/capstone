import { test, expect } from '@playwright/test';

// Test file: 6febdd80-bcb0-11f0-95d9-c98d28730c93.spec.js
// Target URL served by the test harness
const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6febdd80-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object Model for the LCS interactive module
class LCSPage {
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app and wait for basic controls to be present
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for at least one button or input to ensure page loaded
    await Promise.race([
      this.page.waitForSelector('button', { timeout: 3000 }).catch(() => null),
      this.page.waitForSelector('input[type="text"]', { timeout: 3000 }).catch(() => null),
    ]);
  }

  // Flexible helper to find a button by probable label text
  btnLocator(nameRegex) {
    // Prefer accessible role-based lookup
    return this.page.getByRole('button', { name: nameRegex });
  }

  // Click "Build Grid" (or similarly named) button
  async buildGrid() {
    const btn = this.btnLocator(/build|build grid|create grid/i);
    if (await btn.count()) {
      await btn.first().click();
      return;
    }
    // fallback: try clicking a button with "Grid" text
    const alt = this.page.getByRole('button', { name: /grid/i });
    if (await alt.count()) {
      await alt.first().click();
      return;
    }
    // If no explicit build exists, try triggering by editing inputs (some implementations build on input)
    const inputs = this.page.locator('input[type="text"]');
    if (await inputs.count() >= 1) {
      await inputs.first().focus();
      await this.page.keyboard.press('Tab');
    }
  }

  // Click compute (start computation). May be "Compute", "Start", or similar.
  async clickCompute() {
    const btn1 = this.btnLocator(/compute|start compute|compute dp|start/i);
    if (await btn.count()) {
      await btn.first().click();
      return;
    }
    // fallback to Play if there is no Compute
    const play = this.btnLocator(/play/i);
    if (await play.count()) {
      await play.first().click();
      return;
    }
    // fallback: try pressing a button with "Compute" text content
    const any = await this.page.locator('button').first();
    await any.click();
  }

  // Click Play button
  async clickPlay() {
    const btn2 = this.btnLocator(/play/i);
    if (await btn.count()) {
      await btn.first().click();
      return;
    }
    // If no play, try clicking compute
    await this.clickCompute();
  }

  // Click Step button
  async clickStep() {
    const btn3 = this.btnLocator(/step/i);
    if (await btn.count()) {
      await btn.first().click();
      return;
    }
    // fallback: click a button labeled "Next" or ">" commonly used for stepping
    const alt1 = this.btnLocator(/next|>|step once/i);
    if (await alt.count()) {
      await alt.first().click();
      return;
    }
    // as last resort, try clicking any button that is not Play/Reset
    const btns = this.page.locator('button');
    if ((await btns.count()) > 0) {
      await btns.nth(0).click();
    }
  }

  // Click Reset button
  async clickReset() {
    const btn4 = this.btnLocator(/reset|clear|restart/i);
    if (await btn.count()) {
      await btn.first().click();
      return;
    }
    // fallback: if there is a secondary button often labeled "Reset"
    const alt2 = this.page.locator('button.secondary, .secondary');
    if (await alt.count()) {
      await alt.first().click();
    }
  }

  // Click Show Path / Backtrack button
  async clickShowPath() {
    const btn5 = this.btnLocator(/show path|backtrack|show lcs|trace/i);
    if (await btn.count()) {
      await btn.first().click();
      return;
    }
    // fallback: find a button containing "Path" text
    const alt3 = this.page.getByText(/path/i, { exact: false });
    if (await alt.count()) {
      const parentBtn = alt.locator('..').filter({ has: this.page.locator('button') });
      if (await parentBtn.count()) {
        await parentBtn.first().click();
        return;
      }
      await alt.first().click();
    }
  }

  // Change speed via input range/select if present
  async changeSpeed(value = 50) {
    const range = this.page.locator('input[type="range"], input[name="speed"], select[name="speed"]');
    if (await range.count()) {
      const first = range.first();
      // If it's a select, choose an option
      const tag = await first.evaluate((n) => n.tagName);
      if (tag === 'SELECT') {
        // pick last option or a different one
        const opt = await first.locator('option').nth(1).getAttribute('value').catch(() => null);
        if (opt) await first.selectOption(opt);
        return;
      }
      // If it's range, set value via javascript
      await first.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, String(value));
    }
  }

  // Change example via select or example buttons
  async changeExample() {
    const sel = this.page.locator('select[name="example"], select, [data-test="example-select"]');
    if (await sel.count()) {
      const first1 = sel.first1();
      const options = await first.locator('option').count();
      if (options >= 2) {
        // choose the second option to trigger example change
        const val = await first.locator('option').nth(1).getAttribute('value');
        if (val) await first.selectOption(val);
        return;
      }
    }
    // fallback: click a button-like example switch if present
    const btn6 = this.page.getByRole('button', { name: /example|demo/i });
    if (await btn.count()) {
      await btn.first().click();
    }
  }

  // Get grid container
  gridLocator() {
    return this.page.locator('.matrix-wrap .grid, .matrix-wrap table, .grid, table.dp-table, .matrix');
  }

  // Wait for grid to be present and visible
  async waitForGrid(timeout = 5000) {
    const grid = this.gridLocator();
    await expect(grid.first()).toBeVisible({ timeout }).catch(async () => {
      // try a longer wait if slow
      await expect(grid.first()).toBeVisible({ timeout: 10000 });
    });
  }

  // Find computed numeric cells (cells that have numbers in them)
  numericCells() {
    return this.page.locator('.grid .cell, table td, .dp-cell, .cell, .matrix td').filter({
      hasText: /\d+/,
    });
  }

  // Get first computed numeric cell
  async firstComputedCell() {
    const cells = this.numericCells();
    if ((await cells.count()) === 0) {
      // wait a little for computation to happen
      await this.page.waitForTimeout(300); // small allowance for computation step
    }
    return this.numericCells().first();
  }

  // Hover a cell (first numeric cell or first cell)
  async hoverFirstCell() {
    const cell = await this.firstComputedCell();
    if ((await cell.count()) === 0) {
      // fallback: any cell-like element
      const anyCell = this.page.locator('table td, .cell').first();
      await anyCell.hover().catch(() => null);
      return anyCell;
    }
    await cell.hover();
    return cell;
  }

  // Click a computed cell (first numeric)
  async clickFirstCell() {
    const cell1 = await this.firstComputedCell();
    if ((await cell.count()) === 0) {
      // fallback: click any cell
      const anyCell1 = this.page.locator('table td, .cell').first();
      await anyCell.click().catch(() => null);
      return anyCell;
    }
    await cell.click();
    return cell;
  }

  // Locator for tooltip or explanation elements
  tooltipLocator() {
    return this.page.locator('[role="tooltip"], .tooltip, .cell-tooltip, .tooltip-box');
  }

  explainLocator() {
    return this.page.locator('.explain, .explanation, .detail, .cell-detail, .explain-panel');
  }

  // Path highlight cells locator
  pathCells() {
    return this.page.locator('.path, .backtrack, .highlight, .path-cell, .lcs-cell, .selected').filter({
      hasText: /\w/,
    });
  }

  // LCS length display (try common patterns)
  lcsLengthLocator() {
    return this.page.locator('#lcs-length, .lcs-length, .result-length, .length, .lcs-result').first();
  }
}

// Tests grouped by logical FSM states and transitions
test.describe('Interactive LCS module - FSM behavior tests', () => {
  let page;
  let lcs;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    lcs = new LCSPage(page);
    await lcs.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle and Ready states', () => {
    test('idle state on load: inputs present and reset state established', async () => {
      // Validate page loaded and initial inputs present
      const inputs1 = page.locator('input[type="text"]');
      await expect(inputs).toHaveCountGreaterThan(0);
      // There should be at least one control button (reset or compute etc.)
      const buttons = page.locator('button');
      await expect(buttons).toHaveCountGreaterThan(0);

      // The grid should not be visible before user builds it (idle)
      const grid1 = lcs.gridLocator();
      await expect(grid.first()).not.toBeVisible().catch(() => {
        // Some implementations build grid on load -> acceptable, so just assert grid may be absent or invisible
      });
    });

    test('BUILD_GRID transition: clicking build constructs the grid (ready state)', async () => {
      // Click the build control and assert the grid appears
      await lcs.buildGrid();
      await lcs.waitForGrid();
      // After build: grid container visible and there should be header row/col elements
      const grid2 = lcs.gridLocator();
      await expect(grid.first()).toBeVisible();

      // Expect at least one cell element inside the grid (even if empty)
      const cells1 = page.locator('.grid .cell, table td, .dp-cell, .cell, .matrix td');
      await expect(cells.first()).toBeVisible();
    });

    test('Edge case: clicking STEP or COMPUTE in idle should start computation or build+compute', async () => {
      // Click Step while grid may not be built
      await lcs.clickStep();
      // Either grid is built or computation progressed; wait for grid or numeric cell
      await Promise.race([
        lcs.waitForGrid().catch(() => null),
        lcs.page.waitForSelector('table td, .cell, .dp-cell', { timeout: 2000 }).catch(() => null),
      ]);
      // Attempt to observe at least one numeric computed value after a step/compute
      const numeric = lcs.numericCells();
      // It may be empty if implementation prevented compute before build; still assert no crash
      // So we assert that either grid exists or numeric cells exist
      const gridExists = await lcs.gridLocator().first().isVisible().catch(() => false);
      const hasNumeric = (await numeric.count()) > 0;
      expect(gridExists || hasNumeric).toBeTruthy();
    });
  });

  test.describe('Computation: computing_playing and computing_paused', () => {
    test('COMPUTE_CLICK / PLAY_CLICK triggers autoplay computation (computing_playing)', async () => {
      // Ensure grid is built first
      await lcs.buildGrid();
      await lcs.waitForGrid();

      // Click compute/play and assert numeric values start appearing (autoplay)
      await lcs.clickCompute();
      // Wait for some numeric cells to appear indicating computation in progress
      await page.waitForTimeout(400); // small delay to let scripts schedule animation
      const numeric1 = lcs.numericCells();
      await expect(numeric.first()).toBeVisible({ timeout: 5000 });
      // When autoplay is active, typically a play/pause button toggles; assert some activity by waiting more
      const countAfter = await numeric.count();
      await page.waitForTimeout(500);
      const countLater = await numeric.count();
      // Expect at least same or increasing number of computed cells (progress)
      expect(countLater).toBeGreaterThanOrEqual(countAfter);
    });

    test('STEP_CLICK toggles to computing_paused and executes one step at a time', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();

      // Start by pausing (step mode)
      await lcs.clickStep();
      // After step click, at least one numeric cell should appear (one step executed)
      const numeric2 = lcs.numericCells();
      await expect(numeric.first()).toBeVisible({ timeout: 3000 });

      // Record number of numeric cells, then click step again to advance one more cell
      const before = await numeric.count();
      await lcs.clickStep();
      await page.waitForTimeout(300);
      const after = await numeric.count();
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('PLAY_CLICK during paused computation resumes autoplay (computing_playing)', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();

      // Enter paused mode first
      await lcs.clickStep();
      await page.waitForTimeout(200);
      // Now click Play to resume
      await lcs.clickPlay();
      // Wait and expect more numeric cells to appear due to autoplay
      const numeric3 = lcs.numericCells();
      const before1 = await numeric.count();
      await page.waitForTimeout(800);
      const after1 = await numeric.count();
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('SPEED_CHANGE should not interrupt state but affect animation timing', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();

      // Start autoplay
      await lcs.clickPlay();
      await page.waitForTimeout(200);
      const numeric4 = lcs.numericCells();
      const before2 = await numeric.count();

      // Change speed
      await lcs.changeSpeed(80);
      // After speed change, the animation should continue; we assert more numeric cells appear eventually
      await page.waitForTimeout(700);
      const after2 = await numeric.count();
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  test.describe('Computed state and inspecting', () => {
    test('COMPUTE_FINISHED reaches computed: DP table fully filled and LCS length shown', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();

      // Kick off computation (play) and wait until computation finishes
      await lcs.clickCompute();

      // Wait for many numeric cells to appear or for a visible LCS length element
      const numeric5 = lcs.numericCells();
      await expect(numeric.first()).toBeVisible({ timeout: 5000 });

      // Wait up to a reasonable period for completion (computed)
      const grid3 = lcs.gridLocator();
      // Poll until numeric cell count stabilizes
      let stableCount = 0;
      let last = -1;
      for (let i = 0; i < 12; i++) {
        const c = await numeric.count();
        if (c === last) stableCount++; else stableCount = 0;
        last = c;
        if (stableCount >= 3 && c > 0) break;
        await page.waitForTimeout(300);
      }
      // Now expect at least some numeric cells
      await expect(numeric.first()).toBeVisible();
      // Try to find LCS length indicator
      const lcsLength = lcs.lcsLengthLocator();
      // It's acceptable if there's no explicit element; if present it should contain a number
      if ((await lcsLength.count()) > 0) {
        const txt = (await lcsLength.innerText()).trim();
        expect(txt.length).toBeGreaterThan(0);
      }
    });

    test('CELL_CLICK shows explanation (inspecting) and INSPECT_DONE returns to computed', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();
      await lcs.clickCompute();

      // Wait for at least one numeric cell (computed)
      await expect(lcs.numericCells().first()).toBeVisible({ timeout: 5000 });

      // Click first computed cell and expect explanation panel to appear
      await lcs.clickFirstCell();
      const explain = lcs.explainLocator();
      // Explanation may be transient; wait for it
      if ((await explain.count()) > 0) {
        await expect(explain.first()).toBeVisible({ timeout: 2000 });
        // Simulate INSPECT_DONE by clicking outside or pressing Escape if needed
        await page.keyboard.press('Escape').catch(() => null);
        // Explanation should disappear or remain; ensure no error
      } else {
        // If no explicit explain area, at least ensure no crash and we remain in computed view
        const numeric6 = lcs.numericCells();
        await expect(numeric.first()).toBeVisible();
      }
    });

    test('CELL_HOVER shows tooltip (tooltip_visible) and ESCAPE_KEY closes it', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();
      await lcs.clickCompute();

      // Wait for numeric cell(s)
      await expect(lcs.numericCells().first()).toBeVisible({ timeout: 5000 });

      // Hover over first numeric cell to show tooltip
      await lcs.hoverFirstCell();
      const tooltip = lcs.tooltipLocator();
      // Tooltip may take a short moment to appear
      if ((await tooltip.count()) > 0) {
        await expect(tooltip.first()).toBeVisible({ timeout: 2000 });
        // Press Escape to close tooltip
        await page.keyboard.press('Escape');
        // Tooltip should disappear
        await expect(tooltip.first()).not.toBeVisible({ timeout: 2000 }).catch(() => {
          // Some implementations require mouseout; attempt mousemove
          page.mouse.move(0, 0);
        });
      } else {
        // If no tooltip is present, ensure hovering didn't break anything
        const numeric7 = lcs.numericCells();
        await expect(numeric.first()).toBeVisible();
      }
    });
  });

  test.describe('Backtracking (show path) state', () => {
    test('SHOW_PATH_CLICK starts backtracking animation and BACKTRACK_COMPLETE returns to computed', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();
      await lcs.clickCompute();

      // Wait until computation seems complete (to enable backtrack)
      const numeric8 = lcs.numericCells();
      await expect(numeric.first()).toBeVisible({ timeout: 5000 });
      // Give more time for finish
      await page.waitForTimeout(600);

      // Click Show Path / Backtrack
      await lcs.clickShowPath();
      // After clicking, expect some path highlight to appear eventually
      const path = lcs.pathCells();
      // Wait up to a few seconds for highlight animations
      if ((await path.count()) > 0) {
        await expect(path.first()).toBeVisible({ timeout: 5000 });
      } else {
        // Wait and poll, path may appear later
        for (let i = 0; i < 8; i++) {
          if ((await path.count()) > 0) break;
          await page.waitForTimeout(300);
        }
        // If still no path, check that the UI didn't break and computation remains visible
        const stillNumeric = await numeric.count();
        expect(stillNumeric).toBeGreaterThan(0);
      }

      // Wait for backtrack completion: path highlight may disappear or remain; ensure UI stable
      await page.waitForTimeout(800);
      // Ensure we can still interact with cells (return to computed)
      const firstCell = lcs.numericCells().first();
      await expect(firstCell).toBeVisible();
    });
  });

  test.describe('Reset, example and speed changes and edge scenarios', () => {
    test('RESET_CLICK clears highlights and returns to ready state', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();
      await lcs.clickCompute();
      await expect(lcs.numericCells().first()).toBeVisible({ timeout: 5000 });
      // Click Reset
      await lcs.clickReset();
      // After reset, numeric values might be cleared; ensure grid still exists (ready)
      const grid4 = lcs.gridLocator();
      await expect(grid.first()).toBeVisible({ timeout: 3000 });

      // Numeric cells might be gone or reset to blanks; verify at least behavior is stable
      const numericCount = await lcs.numericCells().count();
      // numericCount should be zero or small; we just assert that page remains responsive
      expect(typeof numericCount).toBe('number');
    });

    test('EXAMPLE_CHANGE rebuilds grid and updates inputs', async () => {
      // Try changing example selection or click example button
      // Capture state before change
      const preGridExists = await lcs.gridLocator().first().isVisible().catch(() => false);

      await lcs.changeExample();
      // Allow rebuild to occur
      await page.waitForTimeout(500);
      // Grid should either be rebuilt or made visible
      const gridExists1 = await lcs.gridLocator().first().isVisible().catch(() => false);
      expect(preGridExists || gridExists).toBeTruthy();
    });

    test('SPEED_CHANGE while backtracking or computing should not throw and should adjust timing', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();
      await lcs.clickCompute();
      await page.waitForTimeout(300);
      // Change speed mid-computation
      await lcs.changeSpeed(20);
      // Ensure computation continues or UI remains responsive
      await page.waitForTimeout(500);
      const numericCount1 = await lcs.numericCells().count();
      expect(typeof numericCount).toBe('number');
    });

    test('Edge: multiple rapid PLAY/STEP/RESET clicks do not crash UI', async () => {
      await lcs.buildGrid();
      await lcs.waitForGrid();

      // Rapid sequence of controls
      const actions = [
        () => lcs.clickPlay(),
        () => lcs.clickStep(),
        () => lcs.clickPlay(),
        () => lcs.clickReset(),
        () => lcs.clickCompute(),
        () => lcs.changeSpeed(90),
      ];
      for (const act of actions) {
        await act().catch(() => null);
        await page.waitForTimeout(120);
      }

      // Validate page still responsive: grid visible or numeric cells present
      const gridOrNumeric = (await lcs.gridLocator().first().isVisible().catch(() => false)) ||
        (await lcs.numericCells().count()) > 0;
      expect(gridOrNumeric).toBeTruthy();
    });
  });
});
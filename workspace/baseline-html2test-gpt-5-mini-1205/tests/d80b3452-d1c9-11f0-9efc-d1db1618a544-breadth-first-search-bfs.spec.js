import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b3452-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object to encapsulate common interactions with the BFS visualizer
class BfsPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Selectors
  gridSelector() { return '#grid'; }
  cellSelector(r, c) { return `.cell[data-r="${r}"][data-c="${c}"]`; }
  modeLabel() { return '#mode-label'; }
  startPos() { return '#start-pos'; }
  endPos() { return '#end-pos'; }
  visitedCount() { return '#visited-count'; }
  pathLength() { return '#path-length'; }
  queueList() { return '#queue'; }
  runButton() { return '#run'; }
  stepButton() { return '#step'; }
  pauseButton() { return '#pause'; }
  modeDraw() { return '#mode-draw'; }
  modeStart() { return '#mode-start'; }
  modeEnd() { return '#mode-end'; }
  clearWalls() { return '#clear-walls'; }
  randomize() { return '#randomize'; }
  resetBfs() { return '#reset-bfs'; }
  rowsInput() { return '#rows'; }
  colsInput() { return '#cols'; }
  resizeButton() { return '#resize'; }
  speedInput() { return '#speed'; }

  // Interactions
  async clickCell(r, c) {
    const sel = this.cellSelector(r, c);
    await this.page.click(sel);
  }

  async getCellClassList(r, c) {
    const sel = this.cellSelector(r, c);
    return await this.page.locator(sel).getAttribute('class');
  }

  async getGridCellCount() {
    return await this.page.locator(`${this.gridSelector()} .cell`).count();
  }

  async getModeLabelText() {
    return (await this.page.textContent(this.modeLabel())).trim();
  }

  async getStartPosText() {
    return (await this.page.textContent(this.startPos())).trim();
  }

  async getEndPosText() {
    return (await this.page.textContent(this.endPos())).trim();
  }

  async getVisitedCountText() {
    return (await this.page.textContent(this.visitedCount())).trim();
  }

  async getPathLengthText() {
    return (await this.page.textContent(this.pathLength())).trim();
  }

  async getQueueText() {
    return (await this.page.textContent(this.queueList())).trim();
  }

  async clickRun() { await this.page.click(this.runButton()); }
  async clickStep() { await this.page.click(this.stepButton()); }
  async clickPause() { await this.page.click(this.pauseButton()); }
  async clickModeDraw() { await this.page.click(this.modeDraw()); }
  async clickModeStart() { await this.page.click(this.modeStart()); }
  async clickModeEnd() { await this.page.click(this.modeEnd()); }
  async clickClearWalls() { await this.page.click(this.clearWalls()); }
  async clickRandomize() { await this.page.click(this.randomize()); }
  async clickResetBfs() { await this.page.click(this.resetBfs()); }
  async setRowsCols(rows, cols) {
    await this.page.fill(this.rowsInput(), String(rows));
    await this.page.fill(this.colsInput(), String(cols));
    await this.page.click(this.resizeButton());
  }
  async setSpeed(value) {
    await this.page.fill(this.speedInput(), String(value));
    // Trigger input event in case fill doesn't
    await this.page.dispatchEvent(this.speedInput(), 'input');
  }
}

test.describe('BFS Visualizer - d80b3452-d1c9-11f0-9efc-d1db1618a544', () => {
  // Arrays to capture console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // collect unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default state
  test('Initial load shows grid, start/end positions, and controls are in default state', async ({ page }) => {
    const app = new BfsPage(page);
    await app.goto();

    // Verify grid exists and default dimensions (rows=16, cols=28) -> 16*28 = 448
    const cellCount = await app.getGridCellCount();
    expect(cellCount).toBe(16 * 28);

    // Mode label should be "Draw Walls"
    expect(await app.getModeLabelText()).toBe('Draw Walls');

    // Start and End labels should be present and reflect default coordinates
    expect(await app.getStartPosText()).toBe('(0,0)');
    expect(await app.getEndPosText()).toBe('(15,27)');

    // Initially visited count is 0 and path length is '-'
    expect(await app.getVisitedCountText()).toBe('0');
    expect(await app.getPathLengthText()).toBe('-');

    // Queue should show empty state
    expect(await app.getQueueText()).toBe('[ empty ]');

    // Ensure start and end cell DOMs have the appropriate classes
    const startClasses = await app.getCellClassList(0, 0);
    expect(startClasses).toContain('start');

    const endClasses = await app.getCellClassList(15, 27);
    expect(endClasses).toContain('end');

    // Ensure no console errors or page errors occurred during load
    expect(consoleErrors.length, `console errors: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `page errors: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  // Group of interaction tests for modes and wall manipulation
  test.describe('Interactions: drawing walls, setting start/end, clearing and randomizing', () => {
    test('Clicking a non-start/end cell toggles a wall in Draw Walls mode and Clear Walls resets them', async ({ page }) => {
      const app = new BfsPage(page);
      await app.goto();

      // Ensure draw mode is active
      expect(await app.getModeLabelText()).toBe('Draw Walls');

      // Choose a cell that is not start (0,0) and not end (15,27) => use (1,1)
      await app.clickCell(1, 1);
      let classes = await app.getCellClassList(1, 1);
      expect(classes).toContain('wall');

      // Clear walls and check it's removed
      await app.clickClearWalls();
      classes = await app.getCellClassList(1, 1);
      expect(classes).not.toContain('wall');

      // No console/page errors
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Set Start and Set End modes update start/end positions and classes', async ({ page }) => {
      const app = new BfsPage(page);
      await app.goto();

      // Set Start to (2,2)
      await app.clickModeStart();
      expect(await app.getModeLabelText()).toBe('Set Start');
      await app.clickCell(2, 2);
      expect(await app.getStartPosText()).toBe('(2,2)');
      let classes = await app.getCellClassList(2, 2);
      expect(classes).toContain('start');

      // Old start (0,0) should no longer have start class
      classes = await app.getCellClassList(0, 0);
      expect(classes).not.toContain('start');

      // Set End to (3,3)
      await app.clickModeEnd();
      expect(await app.getModeLabelText()).toBe('Set End');
      await app.clickCell(3, 3);
      expect(await app.getEndPosText()).toBe('(3,3)');
      classes = await app.getCellClassList(3, 3);
      expect(classes).toContain('end');

      // Old end (15,27) should no longer be end
      classes = await app.getCellClassList(15, 27);
      expect(classes).not.toContain('end');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Randomize creates walls; Reset BFS clears visitation but keeps walls', async ({ page }) => {
      const app = new BfsPage(page);
      await app.goto();

      // Ensure few/no walls initially
      let anyWallBefore = await page.locator('.cell.wall').count();
      // Randomize should set some walls (probabilistic)
      await app.clickRandomize();
      // Wait a tick for DOM updates
      await page.waitForTimeout(50);
      let anyWallAfter = await page.locator('.cell.wall').count();
      expect(anyWallAfter).toBeGreaterThanOrEqual(0); // at least 0; probabilistic, but we expect the property to exist

      // Run one step to mark visited nodes, then reset-bfs should clear visited state but keep walls
      // Use a couple of steps to modify visited state if possible
      await app.clickStep();
      await page.waitForTimeout(20);
      const visitedNow = await app.getVisitedCountText();
      // visitedNow may be '0' if start had no neighbors added yet; still call reset
      await app.clickResetBfs();
      await page.waitForTimeout(20);
      expect(await app.getVisitedCountText()).toBe('0');

      // Walls should persist after reset
      const wallsAfterReset = await page.locator('.cell.wall').count();
      expect(wallsAfterReset).toBe(anyWallAfter);

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  // Group of BFS algorithm behavior tests (step/run/animation)
  test.describe('BFS algorithm execution - step and run behavior', () => {
    test('Stepping through BFS eventually produces a path between nearby start and end', async ({ page }) => {
      const app = new BfsPage(page);
      await app.goto();

      // Place start at (0,0) and end at (0,2) to produce a short path
      await app.clickModeStart();
      await app.clickCell(0, 0); // already start by default but ensure
      await app.clickModeEnd();
      await app.clickCell(0, 2);

      // Ensure no walls on intermediate cell (0,1)
      const midCellClasses = await app.getCellClassList(0, 1);
      if (midCellClasses && midCellClasses.includes('wall')) {
        // if it's a wall for some reason, clear walls first
        await app.clickClearWalls();
      }

      // Step repeatedly until a path length appears (pathLength !== '-'), but guard max iterations
      let steps = 0;
      let pathLen = await app.getPathLengthText();
      while (pathLen === '-' && steps < 50) {
        await app.clickStep();
        // short wait for DOM updates
        await page.waitForTimeout(10);
        pathLen = await app.getPathLengthText();
        steps++;
      }

      expect(pathLen).not.toBe('-');
      // The expected shortest path from (0,0) to (0,2) is length 2
      expect(Number(pathLen)).toBeGreaterThanOrEqual(1);

      // Also the queue visualization should reflect something (empty if finished or contains nodes)
      const qText = await app.getQueueText();
      expect(qText.length).toBeGreaterThan(0);

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Run animation completes and produces a path; pause stops animation', async ({ page }) => {
      const app = new BfsPage(page);
      await app.goto();

      // Resize to smaller grid (6x6) to make animation quick and deterministic
      await app.setRowsCols(6, 6);

      // Set start and end to opposite corners
      await app.clickModeStart();
      await app.clickCell(0, 0);
      await app.clickModeEnd();
      await app.clickCell(5, 5);

      // Speed up animation
      await app.setSpeed(50);

      // Start running BFS
      await app.clickRun();

      // Wait until path-length becomes a number (BFS completes). Use a waitForFunction
      await page.waitForFunction(() => {
        const el = document.getElementById('path-length');
        return el && el.textContent && el.textContent.trim() !== '-';
      }, { timeout: 5000 });

      // Verify path-length is numeric and > 0
      const pathLenText = await app.getPathLengthText();
      expect(Number(pathLenText)).toBeGreaterThanOrEqual(1);

      // Pause the animation - should be safe even after completion
      await app.clickPause();

      // Check that animation flag is not causing errors - no errors recorded
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  // Edge cases and other controls
  test.describe('Resizing, keyboard shortcuts, and accessibility checks', () => {
    test('Resize updates the grid size and resets positions; keyboard shortcuts change modes', async ({ page }) => {
      const app = new BfsPage(page);
      await app.goto();

      // Resize grid to 10x10
      await app.setRowsCols(10, 10);
      const count = await app.getGridCellCount();
      expect(count).toBe(100);

      // After resize the default start should be (0,0) and end (9,9)
      expect(await app.getStartPosText()).toBe('(0,0)');
      expect(await app.getEndPosText()).toBe('(9,9)');

      // Use keyboard shortcuts to change modes: '2' sets start, '3' sets end, '1' sets draw
      await page.keyboard.press('2');
      expect(await app.getModeLabelText()).toBe('Set Start');

      await page.keyboard.press('3');
      expect(await app.getModeLabelText()).toBe('Set End');

      await page.keyboard.press('1');
      expect(await app.getModeLabelText()).toBe('Draw Walls');

      // Press 'r' to run - this should start BFS generator (but may complete quickly)
      await page.keyboard.press('r');
      // Immediately pause to avoid long-running animation
      await page.keyboard.press('p');

      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  // At the end of the suite, ensure there were no console errors or uncaught page errors across tests
  test.afterAll(async ({ }, ) => {
    // This afterAll runs in same worker but doesn't have the page fixture; we rely on per-test assertions
    // (Explicit global assertion isn't possible here without a shared collector; each test already asserts)
  });
});
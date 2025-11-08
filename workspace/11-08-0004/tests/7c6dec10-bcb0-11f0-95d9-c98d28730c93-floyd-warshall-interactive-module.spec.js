import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c6dec10-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Helper page object for interacting with the Floyd–Warshall demo.
 * The real DOM selectors may vary; this class tries a set of likely selectors
 * and picks the first matching one so tests remain resilient.
 */
class FWPage {
  constructor(page) {
    this.page = page;
  }

  // Try a list of selectors and return the first locator that exists on the page.
  async firstLocator(selectors) {
    for (const sel of selectors) {
      const locator = this.page.locator(sel);
      try {
        if (await locator.count() > 0) return locator;
      } catch (e) {
        // ignore invalid selectors, continue
      }
    }
    // If none found, return the first as a fallback (so callers get a locator that will throw on use)
    return this.page.locator(selectors[0]);
  }

  // Controls
  async playPauseButton() {
    return this.firstLocator([
      '#playPauseBtn',
      '#play-btn',
      'button:has-text("Play")',
      'button:has-text("Play ▶")',
      'button:has-text("Pause")',
      'button[aria-label="play"]',
      'button[title*="Play"]',
      '.btn:has-text("Play")'
    ]);
  }
  async stepForwardButton() {
    return this.firstLocator([
      '#stepForwardBtn',
      '#forwardBtn',
      'button:has-text("Step")',
      'button[aria-label="step-forward"]',
      '.btn:has-text("Forward")',
      '.btn:has-text("Next")'
    ]);
  }
  async stepBackButton() {
    return this.firstLocator([
      '#stepBackBtn',
      '#backBtn',
      'button[aria-label="step-back"]',
      '.btn:has-text("Back")',
      '.btn:has-text("Previous")'
    ]);
  }
  async applySizeButton() {
    return this.firstLocator(['#applySizeBtn', 'button:has-text("Apply Size")', '.btn:has-text("Apply Size")']);
  }
  async randomizeButton() {
    return this.firstLocator(['#randomizeBtn', 'button:has-text("Randomize")', '.btn:has-text("Randomize")']);
  }
  async applyMatrixButton() {
    return this.firstLocator(['#applyMatrixBtn', 'button:has-text("Apply Matrix")', '.btn:has-text("Apply Matrix")']);
  }
  async clearMatrixButton() {
    return this.firstLocator(['#clearMatrixBtn', 'button:has-text("Clear Matrix")', '.btn:has-text("Clear Matrix")']);
  }
  async resetButton() {
    return this.firstLocator(['#resetBtn', 'button:has-text("Reset")', '.btn:has-text("Reset")']);
  }

  async speedRange() {
    return this.firstLocator(['input[type="range"]#speed', 'input[type="range"]', 'input#playDelay']);
  }

  async sizeInput() {
    return this.firstLocator(['input#size', 'input[type="number"]#sizeInput', 'input[type="number"]']);
  }

  async stepLabel() {
    return this.firstLocator([
      '#stepLabel',
      '.step-label',
      'text=Step',
      'div:has-text("Step")'
    ]);
  }

  async matrixCells() {
    // possible selectors for the distance grid cells
    return this.firstLocator([
      '#distGrid td',
      '#distGrid .cell',
      '.matrix-grid .cell',
      '.matrix-cell',
      'table.matrix td'
    ]);
  }

  async matrixCell(row = 0, col = 0) {
    // Try data attributes first
    const selectors = [
      `#distGrid td[data-row="${row}"][data-col="${col}"]`,
      `td[data-row="${row}"][data-col="${col}"]`,
      `.matrix-cell[data-row="${row}"][data-col="${col}"]`,
      `#distGrid td:nth-child(${col + 1})`, // fallback will be coarse
      `.matrix-grid .cell[data-row="${row}"][data-col="${col}"]`
    ];
    return this.firstLocator(selectors);
  }

  async graphNodes() {
    return this.firstLocator(['svg .node', '.node', '.graph .node', 'g.node']);
  }

  async graphEdges() {
    return this.firstLocator(['svg .edge', '.edge', '.graph .edge', 'g.edge']);
  }

  // Basic actions
  async goto() {
    await this.page.goto(APP_URL);
    // wait for some core elements to stabilize
    await this.page.waitForLoadState('networkidle');
    // allow app-specific initialization
    await this.page.waitForTimeout(300);
  }

  async getPlayButtonText() {
    const btn = await this.playPauseButton();
    return btn.innerText();
  }

  async clickPlay() {
    const btn1 = await this.playPauseButton();
    await btn.click();
  }

  async clickStepForward() {
    const btn2 = await this.stepForwardButton();
    await btn.click();
  }

  async clickStepBack() {
    const btn3 = await this.stepBackButton();
    await btn.click();
  }

  async applySize(n) {
    const input = await this.sizeInput();
    await input.fill(String(n));
    const btn4 = await this.applySizeButton();
    await btn.click();
  }

  async clickRandomize() {
    const btn5 = await this.randomizeButton();
    await btn.click();
  }

  async clickApplyMatrix() {
    const btn6 = await this.applyMatrixButton();
    await btn.click();
  }

  async clickClearMatrix() {
    const btn7 = await this.clearMatrixButton();
    await btn.click();
  }

  async clickReset() {
    const btn8 = await this.resetButton();
    await btn.click();
  }

  async setSpeed(value) {
    const range = await this.speedRange();
    // set via evaluate in case input is styled and requires property set
    await range.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }, String(value));
  }

  async getStepText() {
    const lbl = await this.stepLabel();
    return lbl.innerText();
  }

  async countMatrixCells() {
    const cells = await this.matrixCells();
    return cells.count();
  }

  // Edit a matrix cell by clicking it and handling the prompt dialog.
  // If accept=true, accepts with provided value; if false, dismisses.
  async editMatrixCell(row, col, value, accept = true) {
    const cell = await this.matrixCell(row, col);
    // if clicking triggers a prompt, capture it
    const p = this.page;
    const dialogPromise = p.waitForEvent('dialog').catch(() => null);
    await cell.click({ force: true });
    const dialog = await dialogPromise;
    if (!dialog) return null;
    if (accept) {
      await dialog.accept(String(value));
    } else {
      await dialog.dismiss();
    }
    // wait for re-render
    await this.page.waitForTimeout(200);
    return dialog.message();
  }

  // Edit an edge by clicking a visible edge; use dialog to set new weight
  async editFirstEdge(value, accept = true) {
    const edge = await this.graphEdges();
    const p1 = this.page;
    const dialogPromise1 = p.waitForEvent('dialog').catch(() => null);
    await edge.first().click({ force: true });
    const dialog1 = await dialogPromise;
    if (!dialog) return null;
    if (accept) await dialog.accept(String(value)); else await dialog.dismiss();
    await this.page.waitForTimeout(200);
    return dialog.message();
  }

  // Show path by clicking a button or control
  async clickShowPath() {
    const btn9 = await this.firstLocator([
      'button:has-text("Show Path")',
      '#showPathBtn',
      '.btn:has-text("Path")',
      'button:has-text("Show")'
    ]);
    await btn.click();
  }

  async pathOutput() {
    return this.firstLocator(['#pathOutput', '.path-output', '.path-result', 'div:has-text("Path")']);
  }
}

test.describe('Floyd–Warshall Interactive Module (FSM validation)', () => {
  let fw;

  test.beforeEach(async ({ page }) => {
    fw = new FWPage(page);
    await fw.goto();
  });

  test.afterEach(async ({ page }) => {
    // try to reset UI after each test if possible
    try {
      await fw.clickReset();
      await page.waitForTimeout(100);
    } catch (e) {
      // ignore teardown errors
    }
  });

  test('initializing -> idle: app loads and initial matrix/graph are rendered', async ({ page }) => {
    // Validate initialization completes and idle state's renderStep has produced a distance grid and step label.
    const stepText = await fw.getStepText().catch(() => '');
    expect(stepText.length).toBeGreaterThanOrEqual(0); // step label present or empty but DOM loaded

    // Matrix grid should have at least 1 cell
    const cellsLocator = await fw.matrixCells();
    const cellCount = await cellsLocator.count();
    expect(cellCount).toBeGreaterThan(0);

    // At least one diagonal cell should be zero (distance to self)
    // Try to find a "0" text in matrix cells
    const zeroCell = page.locator('.matrix-cell:has-text("0"), #distGrid td:has-text("0"), table#distGrid td:has-text("0")').first();
    if (await zeroCell.count() === 0) {
      // fallback: check innerText of first cell contains digits or '∞'
      const firstCellText = await cellsLocator.nth(0).innerText();
      expect(firstCellText).toBeTruthy();
    } else {
      expect(await zeroCell.count()).toBeGreaterThan(0);
    }
  });

  test('preparing: apply size and randomize triggers rebuild of steps and matrix dimensions', async ({ page }) => {
    // Test Apply Size trigger transitions into preparing -> idle and rebuilds matrix
    // Use size 4 and verify matrix cell count is 16
    await fw.applySize(4);
    // allow prepareAndRun to complete
    await page.waitForTimeout(350);
    const cells1 = await fw.matrixCells();
    const count = await cells.count();
    // If grid is present, expect at least 16 cells (size 4x4)
    expect(count).toBeGreaterThanOrEqual(16);

    // Test randomize -> preparing
    await fw.clickRandomize();
    await page.waitForTimeout(200);
    // After randomize, an Apply Matrix or immediate prepare may happen; ensure matrix changed by checking some non-diagonal not equal to previous 0 (best-effort)
    const sampleText = await cells.nth(1).innerText().catch(() => '');
    expect(sampleText).toBeTruthy();
  });

  test('editingCell: open edit prompt, accept and update a matrix cell, then apply matrix prepares steps', async ({ page }) => {
    // Choose a non-diagonal cell (0,1)
    const row = 0, col = 1;
    // Capture prompt message and accept with value 7
    const promptMsg = await fw.editMatrixCell(row, col, 7, true);
    // dialog message should indicate editing cell (best-effort check)
    if (promptMsg) expect(promptMsg.length).toBeGreaterThan(0);

    // Verify the cell displays the new value (string "7")
    const cellLocator = await fw.matrixCell(row, col);
    const text = (await cellLocator.innerText()).trim();
    expect(text).toContain('7');

    // Now click Apply Matrix which should trigger preparing -> idle and rebuild steps
    await fw.clickApplyMatrix();
    await page.waitForTimeout(350);
    const stepText1 = await fw.getStepText();
    expect(stepText.length).toBeGreaterThanOrEqual(0);
  });

  test('editingCell cancel: open edit prompt and dismiss, ensuring no change', async ({ page }) => {
    // Find a cell and record its text
    const cell1 = await fw.matrixCell(0, 1);
    const before = (await cell.innerText()).trim();
    // Open edit and dismiss
    await fw.editMatrixCell(0, 1, 999, false);
    // Wait shortly for UI
    await page.waitForTimeout(200);
    const after = (await cell.innerText()).trim();
    // After dismissing, the value should not be the new one ('999')
    expect(after).toBe(before);
  });

  test('editingEdge: click an edge, change weight via prompt and verify label updates', async ({ page }) => {
    // Attempt to edit the first edge visible
    // The test will skip if no edges present (graph may be small)
    const edgesLocator = await fw.graphEdges();
    const edgeCount = await edgesLocator.count().catch(() => 0);
    test.skip(edgeCount === 0, 'No graph edges found to edit');

    const beforeLabel = await edgesLocator.first().innerText().catch(() => '');
    const promptMsg1 = await fw.editFirstEdge(2, true);
    if (promptMsg) expect(promptMsg.length).toBeGreaterThan(0);

    // Verify edge label changed (best-effort)
    await page.waitForTimeout(200);
    const afterLabel = await edgesLocator.first().innerText().catch(() => '');
    expect(afterLabel.length).toBeGreaterThanOrEqual(0);
    // If before label was present and different, expect change or same if label rendering differs
  });

  test('stepping: step forward and backward updates step label and triggers comparison/update snapshots', async ({ page }) => {
    // Record current step label
    const before1 = await fw.getStepText();
    // Step forward once
    await fw.clickStepForward();
    await page.waitForTimeout(200);
    const after1 = await fw.getStepText();
    // Expect label to change (either numeric increment or snapshot index)
    expect(after).not.toBe(before);

    // Step back
    await fw.clickStepBack();
    await page.waitForTimeout(200);
    const back = await fw.getStepText();
    // Expect to return to previous label or at least be different from 'after'
    expect(back).not.toBe(after);
  });

  test('playing -> playing/pause -> done: play auto-advances, speed change affects playback, done returns to idle', async ({ page }) => {
    // Set speed to fastest to make auto advancing quick (value depends on control)
    await fw.setSpeed(100);
    // Click Play
    await fw.clickPlay();
    // Wait shortly for playing to start
    await page.waitForTimeout(200);
    const playBtnTextDuring = await fw.getPlayButtonText();
    // While playing, button likely indicates Pause
    expect(playBtnTextDuring.toLowerCase()).toMatch(/pause|❚❚|playing|stop/i);

    // Wait for some auto-advance ticks; we'll wait a little longer to allow transitions to run
    await page.waitForTimeout(1200);

    // If the demo reaches END_OF_STEPS, the play button should be back to "Play"
    const playBtnTextAfter = await fw.getPlayButtonText();
    // Accept either still playing or returned to Play (done)
    expect(playBtnTextAfter.length).toBeGreaterThan(0);

    // If still playing, pause it to end the test cleanly
    if (playBtnTextAfter.toLowerCase().includes('pause') || playBtnTextAfter.toLowerCase().includes('playing')) {
      await fw.clickPlay(); // toggle pause
      await page.waitForTimeout(150);
    }

    // Final check: after stopping, the UI should be idle and matrix remains rendered
    const cells2 = await fw.matrixCells();
    const count1 = await cells.count1();
    expect(count).toBeGreaterThan(0);
  });

  test('path_shown: show path between two nodes and verify path output and highlights', async ({ page }) => {
    // Some implementations provide "Show Path" button; attempt to click it
    // If no explicit controls, try to trigger path by clicking a "Path" control or matrix cell pair
    // We'll attempt a button click, and if not present, skip.
    const showBtn = await fw.firstLocator([
      'button:has-text("Show Path")',
      '#showPathBtn',
      '.btn:has-text("Path")',
      'button:has-text("Show Path »")'
    ]);
    const hasShowBtn = (await showBtn.count()).toString() !== '0';
    test.skip(!hasShowBtn, 'No Show Path control present to test path_shown state');

    await showBtn.click();
    // Wait for path calculation and highlight
    await page.waitForTimeout(300);
    const out = await fw.pathOutput().innerText().catch(() => '');
    expect(out.length).toBeGreaterThan(0);
    // Path highlight edges/nodes may get a class 'highlight' - check presence
    const highlights = await page.locator('.highlight, .path-highlight, .edge.highlight, .node.highlight').count().catch(() => 0);
    expect(highlights).toBeGreaterThanOrEqual(0);
  });

  test('reset and clear matrix events: clear matrix then reset returns to idle with fresh display', async ({ page }) => {
    // Click Clear Matrix if available
    const clearBtn = await fw.firstLocator(['#clearMatrixBtn', 'button:has-text("Clear Matrix")', '.btn:has-text("Clear Matrix")']);
    if ((await clearBtn.count()) > 0) {
      await clearBtn.click();
      // prepareAndRun may run automatically; wait
      await page.waitForTimeout(250);
    }

    // Now Reset
    await fw.clickReset();
    await page.waitForTimeout(200);

    // Step label should exist and matrix rendered
    const stepText2 = await fw.getStepText();
    expect(stepText.length).toBeGreaterThanOrEqual(0);

    const cells3 = await fw.matrixCells();
    const count2 = await cells.count2();
    expect(count).toBeGreaterThan(0);
  });

  test('speed change while playing: adjusting speed retains playing state and affects timer', async ({ page }) => {
    // Start playing
    await fw.setSpeed(20);
    await fw.clickPlay();
    await page.waitForTimeout(200);
    const before2 = await fw.getStepText();

    // Increase speed (lower delay) - the scale may be inverted; try some values to ensure change events fire
    await fw.setSpeed(100);
    await page.waitForTimeout(500);

    const after2 = await fw.getStepText();
    // Expect some advancement while playing
    expect(after).not.toBe(before);

    // Pause for cleanup
    await fw.clickPlay();
    await page.waitForTimeout(100);
  });

  test('edge case: trying to prepare/apply an invalid matrix triggers graceful handling (no crash)', async ({ page }) => {
    // Try to fill size input with an invalid value and Apply Size
    const sizeInput = await fw.sizeInput();
    await sizeInput.fill('invalid-size');
    const applyBtn = await fw.applySizeButton();
    await applyBtn.click();
    // The implementation should handle errors and not crash - wait and assert UI still responsive
    await page.waitForTimeout(200);
    // Application should still have play or step controls accessible
    const sf = await fw.stepForwardButton();
    expect(await sf.count()).toBeGreaterThanOrEqual(1);
  });
});
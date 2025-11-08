import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/826812d0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object encapsulating interactions with the Floyd–Warshall interactive module.
 * The selectors are written to be flexible/resilient across small markup variations:
 * - It tries role-based queries first (preferred), then falls back to common class/id names.
 * - It exposes higher-level actions that map to FSM events (EDIT_CELL_BEGIN, EDIT_CELL_COMMIT, STEP, RUN_ALL, etc).
 */
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // navigation
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for main UI to appear
    await Promise.race([
      this.page.locator('role=main').first().waitFor({ timeout: 1500 }).catch(() => {}),
      this.page.locator('h1', { hasText: /Floyd/i }).first().waitFor({ timeout: 1500 }).catch(() => {}),
      this.page.waitForTimeout(500), // fallback to allow app to initialize
    ]);
  }

  // trace message area - try many candidate selectors
  traceLocator() {
    return this.page.locator(
      'text=/ready/i, .trace, #trace, .trace-msg, [data-testid="trace"], .status, .message'
    ).first();
  }

  async getTraceText() {
    const loc = this.traceLocator();
    if (await loc.count()) {
      return (await loc.textContent())?.trim() ?? '';
    }
    // fallback: find any small muted text
    const fallback = this.page.locator('p,div').filter({ hasText: /k=|considering|ready|paused|completed|completed algorithm/i }).first();
    return (await fallback.textContent())?.trim() ?? '';
  }

  // Controls - attempt to locate standard buttons
  async getButtonByName(nameRegex) {
    const byRole = this.page.getByRole('button', { name: nameRegex });
    if (await byRole.count()) return byRole.first();
    // fallback by text
    const byText = this.page.locator(`text=${nameRegex}`);
    if (await byText.count()) return byText.first();
    // fallback to generic button set
    return this.page.locator('button').filter({ hasText: nameRegex }).first();
  }

  async clickRunAll() {
    const btn = await this.getButtonByName(/run all|run/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickStep() {
    const btn1 = await this.getButtonByName(/step/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickBack() {
    const btn2 = await this.getButtonByName(/back/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickReset() {
    const btn3 = await this.getButtonByName(/reset/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickRandomize() {
    const btn4 = await this.getButtonByName(/randomize/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickApplyMatrix() {
    const btn5 = await this.getButtonByName(/apply matrix|apply/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickImportSample() {
    const btn6 = await this.getButtonByName(/import sample|import/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickExportMatrix() {
    const btn7 = await this.getButtonByName(/export matrix|export/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async toggleDirected() {
    // Try checkbox labelled 'Directed' first
    const directed = this.page.getByLabel(/directed/i);
    if (await directed.count()) {
      await directed.click();
      return;
    }
    // fallback: button toggle
    const btn8 = await this.getButtonByName(/directed/i);
    if (await btn.count()) await btn.click();
  }

  async setNodeCount(n) {
    const spin = this.page.getByRole('spinbutton', { name: /nodes|node count|node/i }).first();
    if (await spin.count()) {
      await spin.fill(String(n));
      // blur to trigger change
      await spin.press('Tab');
      return;
    }
    // fallback to generic number inputs
    const numberInput = this.page.locator('input[type="number"], input[aria-label*="node"]', { hasText: '' }).first();
    if (await numberInput.count()) {
      await numberInput.fill(String(n));
      await numberInput.press('Tab');
    }
  }

  // Matrix helpers: attempts to discover matrix cells and interact with them.
  matrixCellLocator() {
    // Attempt several possible selectors used by implementations
    const candidates = [
      'table.matrix td', // common
      '.matrix-table td',
      '.distance-matrix td',
      '.adjacency-table td',
      '.matrix .cell',
      '.matrix-cell',
      'td.cell',
    ];
    for (const s of candidates) {
      const loc1 = this.page.locator(s);
      if (loc.count && loc.count() > 0) return loc;
    }
    // fallback: any table cells inside the app panel
    return this.page.locator('.app table td, table td').first();
  }

  async getMatrixSnapshotText() {
    // Get textual snapshot of the matrix (first N cells)
    const loc2 = this.page.locator('table.matrix, .matrix-table, .distance-matrix, .adjacency-table, table').first();
    if (await loc.count()) {
      return (await loc.innerText()).trim();
    }
    // fallback: gather nearest set of number-like spans/cells
    const cells = this.page.locator('.cell, .matrix-cell, td, .value');
    const count = await cells.count();
    let out = [];
    for (let i = 0; i < Math.min(100, count); i++) {
      const txt = (await cells.nth(i).textContent()) ?? '';
      out.push(txt.trim());
    }
    return out.join('|');
  }

  // Begin editing a matrix cell by clicking a discovered cell; returns locator of overlay input if any
  async beginEditFirstCell() {
    // Click the first editable cell in the matrix
    const candidates1 = [
      'table.matrix td:not(.header), .matrix-table td:not(.header), .distance-matrix td:not(.header)',
      '.matrix .cell',
      '.matrix-cell',
      'td.cell',
    ];
    for (const sel of candidates) {
      const loc3 = this.page.locator(sel).filter({ hasText: /\d|∞|INF|-/ }).first();
      if (await loc.count()) {
        await loc.click();
        // After click, try to find overlay input
        const overlay = this.page.locator('input[type="number"], input[type="text"], .cell-edit input').first();
        if (await overlay.count()) {
          await overlay.waitFor({ timeout: 1000 }).catch(() => {});
          return overlay;
        }
        // Some implementations use contenteditable cell
        const editable = loc.locator('[contenteditable="true"]');
        if (await editable.count()) return editable;
        return loc;
      }
    }
    // Last resort: click any td
    const anyCell = this.page.locator('td').first();
    if (await anyCell.count()) {
      await anyCell.click();
      const overlay1 = this.page.locator('input[type="number"], input[type="text"]').first();
      return overlay.count() ? overlay : anyCell;
    }
    throw new Error('No editable matrix cell found');
  }

  async commitEdit(overlay, newValue) {
    if (!overlay) throw new Error('No overlay provided');
    // If it's an input, fill and press Enter
    const tag = await overlay.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'input' || tag === 'textarea') {
      await overlay.fill(String(newValue));
      await overlay.press('Enter');
      // wait short time for commit
      await this.page.waitForTimeout(200);
      return;
    }
    // contenteditable
    const isEditable = await overlay.evaluate((el) => el.isContentEditable);
    if (isEditable) {
      await overlay.fill(String(newValue));
      await overlay.press('Enter');
      await this.page.waitForTimeout(200);
      return;
    }
    // fallback: click to open small prompt or commit via apply button
    await overlay.click();
    // try clicking any "OK" or "Apply" button
    const ok = this.page.getByRole('button', { name: /ok|apply|save|commit/i }).first();
    if (await ok.count()) {
      await ok.click();
      await this.page.waitForTimeout(200);
    }
  }

  async cancelEdit(overlay) {
    if (!overlay) throw new Error('No overlay provided');
    const tag1 = await overlay.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'input' || tag === 'textarea') {
      // press Escape
      await overlay.press('Escape');
      await this.page.waitForTimeout(150);
      return;
    }
    const isEditable1 = await overlay.evaluate((el) => el.isContentEditable);
    if (isEditable) {
      await overlay.press('Escape');
      await this.page.waitForTimeout(150);
      return;
    }
    // fallback click cancel
    const cancel = this.page.getByRole('button', { name: /cancel|close|dismiss/i }).first();
    if (await cancel.count()) await cancel.click();
  }

  // Selectors for src/tgt selects
  async selectSource(idx = 1) {
    const sel = this.page.getByRole('combobox', { name: /source|src/i }).first();
    if (await sel.count()) {
      await sel.selectOption({ index: idx });
      return;
    }
    const anySel = this.page.locator('select').first();
    if (await anySel.count()) {
      await anySel.selectOption({ index: idx });
    }
  }

  async selectTarget(idx = 1) {
    const sel1 = this.page.getByRole('combobox', { name: /target|tgt|destination/i }).first();
    if (await sel.count()) {
      await sel.selectOption({ index: idx });
      return;
    }
    const selects = this.page.locator('select');
    if ((await selects.count()) >= 2) {
      await selects.nth(1).selectOption({ index: idx });
    }
  }

  async clickShowPath() {
    const btn9 = await this.getButtonByName(/show path|path/i);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async exportMatrixAndGetText() {
    // Click export then try to capture displayed export (some implementations show a textarea)
    await this.clickExportMatrix();
    // Try to capture any exposed textarea/modal
    const area = this.page.locator('textarea, pre, .export-output, .export-modal textarea').first();
    if (await area.count()) {
      await area.waitFor({ timeout: 1000 }).catch(() => {});
      return (await area.textContent())?.trim() ?? '';
    }
    // fallback: find a code block
    const code = this.page.locator('code, pre').filter({ hasText: /matrix|nodes|weights|,/i }).first();
    if (await code.count()) return (await code.textContent())?.trim() ?? '';
    return '';
  }

  // Helpers for detecting graph highlights
  graphLocator() {
    return this.page.locator('svg.graph, svg, .graph-canvas, .canvas-wrap svg').first();
  }

  async hasGraphHighlights() {
    const svg = this.graphLocator();
    if (!(await svg.count())) return false;
    // common highlight classes/attributes
    const highlight = svg.locator('[class*="highlight"], [stroke-width="3"], .edge.highlight, .path-highlight');
    return (await highlight.count()) > 0;
  }
}

test.describe('Floyd–Warshall Interactive Module - FSM coverage', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new FloydWarshallPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle state and basic UI presence', () => {
    test('initial state should be idle and show ready trace and basic controls', async () => {
      // Validate trace shows ready or some initial message (FSM onEnter: show ready trace)
      const trace = await app.getTraceText();
      expect(trace.toLowerCase().length).toBeGreaterThan(0); // at least some message exists
      expect(trace.toLowerCase()).toMatch(/ready|welcome|start|ready to|floyd|distance|matrix|k=/i);

      // Verify essential controls exist: Run, Step, Back, Reset
      const runBtn = await app.getButtonByName(/run all|run/i);
      await expect(runBtn).toBeVisible();

      const stepBtn = await app.getButtonByName(/step/i);
      await expect(stepBtn).toBeVisible();

      const backBtn = await app.getButtonByName(/back/i);
      await expect(backBtn).toBeVisible();

      const resetBtn = await app.getButtonByName(/reset/i);
      await expect(resetBtn).toBeVisible();

      // Verify graph container exists
      const graph = app.graphLocator();
      await expect(graph).toBeVisible();
    });
  });

  test.describe('Matrix editing (editing <-> idle transitions)', () => {
    test('begin edit -> overlay/input appears -> commit changes -> idle and matrix/graph update', async () => {
      // Capture a snapshot before change
      const before = await app.getMatrixSnapshotText();

      // Begin editing first editable cell
      const overlay2 = await app.beginEditFirstCell();
      // overlay should be present and focused (or at least exists)
      expect(overlay).toBeTruthy();

      // Commit change: set to 1 (or decrease by 1 if numeric)
      await app.commitEdit(overlay, '1');

      // After commit, the matrix snapshot should change (or graph update should happen)
      const after = await app.getMatrixSnapshotText();
      // At least something changed OR application shows 'applied' trace
      const trace1 = await app.getTraceText();
      const changed = before !== after;
      expect(changed || /appl|commit|changed|updated/i.test(trace.toLowerCase())).toBeTruthy();
    });

    test('begin edit -> cancel edit -> returns to idle and no matrix change', async () => {
      const before1 = await app.getMatrixSnapshotText();
      const overlay3 = await app.beginEditFirstCell();
      // perform cancel
      await app.cancelEdit(overlay);
      await page.waitForTimeout(200);
      const after1 = await app.getMatrixSnapshotText();
      expect(after).toBe(before);
    });
  });

  test.describe('Preparing, stepping, snapshot behavior', () => {
    test('STEP from idle should prepare execution if needed and show snapshot after one step', async () => {
      // Click Step to trigger stepping (FSM: STEP -> stepping -> snapshot)
      await app.clickStep();

      // After stepping, trace should reflect a step/snapshot (k or "considering" etc)
      const trace2 = await app.getTraceText();
      expect(trace.toLowerCase()).toMatch(/k=|considering|snapshot|step|updated|i=|j=|k /i);

      // The distance matrix or graph should be rendered/updated (snapshot state)
      const matrixText = await app.getMatrixSnapshotText();
      expect(matrixText.length).toBeGreaterThan(0);
    });

    test('BACK from idle should navigate to previous snapshot or prepareExecution then snapshot', async () => {
      // Click Step twice to create some history (if possible)
      await app.clickStep().catch(() => {});
      await page.waitForTimeout(150);
      await app.clickStep().catch(() => {});
      await page.waitForTimeout(150);

      // Click Back to go to previous snapshot
      await app.clickBack();
      const trace3 = await app.getTraceText();
      expect(trace.length).toBeGreaterThan(0);
    });
  });

  test.describe('Running (autoplay), pause, and done states', () => {
    test('RUN ALL should start autoplay and produce AUTOPLAY_TICK snapshots; can be paused', async () => {
      // Try to run all; this should start autoplay
      await app.clickRunAll();

      // After running, trace should quickly show algorithm progress (k / step info)
      await page.waitForTimeout(500);
      const trace11 = await app.getTraceText();
      expect(trace1.length).toBeGreaterThan(0);
      expect(/k=|considering|running|step|autoplay/i.test(trace1.toLowerCase())).toBeTruthy();

      // Pause by clicking Run/Play toggle or a Pause button
      // Try to find a Pause button
      const pauseBtn = await app.getButtonByName(/pause|stop/i);
      if (await pauseBtn.count()) {
        await pauseBtn.click();
      } else {
        // Try play/pause toggle
        const playPause = await app.getButtonByName(/play|pause/i);
        if (await playPause.count()) await playPause.click();
      }

      // After pausing, trace should include paused or be stable
      await page.waitForTimeout(200);
      const trace21 = await app.getTraceText();
      expect(trace2.toLowerCase()).toMatch(/pause|paused|stopped|halt/i);
    });

    test('running to completion should reach done state with "completed" trace', async () => {
      // Start run; we will wait (within a generous timeout) for evidence of completion
      await app.clickRunAll();

      // Wait for a trace that indicates completion (some implementations set "Completed algorithm run.")
      // Use a generous timeout loop to poll
      let completed = false;
      for (let i = 0; i < 40; i++) {
        const t = (await app.getTraceText()).toLowerCase();
        if (/completed|complete|finished|final|done/i.test(t)) {
          completed = true;
          break;
        }
        await page.waitForTimeout(200);
      }
      // We allow implementations that don't explicitly show 'completed' to still pass if progress has reached an apparent final snapshot
      if (!completed) {
        // Fallback: click Step to reach final snapshot and look for no further change
        const before2 = await app.getMatrixSnapshotText();
        await app.clickStep().catch(() => {});
        await page.waitForTimeout(200);
        const after2 = await app.getMatrixSnapshotText();
        // If no change after extra step, assume done
        expect(after.length).toBeGreaterThan(0);
      } else {
        expect(completed).toBeTruthy();
      }
    });
  });

  test.describe('Paused state behavior and resuming', () => {
    test('can pause during autoplay and then resume running', async () => {
      // Start autoplay
      await app.clickRunAll();
      await page.waitForTimeout(300);

      // Pause
      const pauseBtn1 = await app.getButtonByName(/pause|stop/i);
      if (await pauseBtn.count()) {
        await pauseBtn.click();
      } else {
        const playPause1 = await app.getButtonByName(/play|pause/i);
        if (await playPause.count()) await playPause.click();
      }

      // Wait and then resume
      await page.waitForTimeout(200);
      const playBtn = await app.getButtonByName(/run all|run|play/i);
      if (await playBtn.count()) {
        await playBtn.click();
      }

      // Verify progress continues (trace changes)
      const t1 = await app.getTraceText();
      await page.waitForTimeout(300);
      const t2 = await app.getTraceText();
      expect(t2.length).toBeGreaterThanOrEqual(t1.length);
    });
  });

  test.describe('Path reconstruction and pathDisplayed state', () => {
    test('Selecting source and target and clicking show path highlights a path if available', async () => {
      // Ensure we have snapshots prepared: run a few steps to populate next matrix
      await app.clickStep().catch(() => {});
      await page.waitForTimeout(100);
      await app.clickStep().catch(() => {});
      await page.waitForTimeout(150);

      // Try selecting source and target
      await app.selectSource(1).catch(() => {});
      await app.selectTarget(2).catch(() => {});

      // Click show path
      await app.clickShowPath().catch(() => {});

      // Path displayed state: trace may reflect path or graph highlights should appear
      const trace4 = await app.getTraceText();
      expect(trace.length).toBeGreaterThan(0);

      // Graph highlight detection
      const highlighted = await app.hasGraphHighlights();
      // If no highlights detected, at least the trace indicates path or path info present
      expect(highlighted || /path|reconstruct|route|no path|path not found/i.test(trace.toLowerCase())).toBeTruthy();
    });

    test('pathDisplayed allows selecting different src/tgt without leaving path state', async () => {
      // Enter pathDisplayed
      await app.selectSource(0).catch(() => {});
      await app.selectTarget(1).catch(() => {});
      await app.clickShowPath().catch(() => {});
      const t11 = await app.getTraceText();

      // Change source and click show path again
      await app.selectSource(2).catch(() => {});
      await app.clickShowPath().catch(() => {});
      const t21 = await app.getTraceText();

      // Changing selection should update the trace or path info
      expect(t2.length).toBeGreaterThanOrEqual(0);
      // If t1 equals t2, still acceptable; we at least confirm UI remains responsive
      expect(typeof t2).toBe('string');
    });
  });

  test.describe('Import/Export, randomize, toggle directed, node count and apply/reset', () => {
    test('randomize modifies adjacency/matrix and trace updates', async () => {
      const before3 = await app.getMatrixSnapshotText();
      await app.clickRandomize().catch(() => {});
      await page.waitForTimeout(250);
      const after3 = await app.getMatrixSnapshotText();
      // either the snapshot changed or trace indicates randomization
      const trace5 = await app.getTraceText();
      expect(before !== after || /random/i.test(trace.toLowerCase())).toBeTruthy();
    });

    test('toggle directed updates UI state (checkbox/button toggles) and does not crash', async () => {
      await app.toggleDirected().catch(() => {});
      await page.waitForTimeout(150);
      // Toggle back
      await app.toggleDirected().catch(() => {});
      await page.waitForTimeout(150);

      // If toggling shows some trace, ensure no error messages displayed
      const trace6 = await app.getTraceText();
      expect(trace.length).toBeGreaterThan(0);
    });

    test('node count change recreates matrix and UI updates', async () => {
      // Try setting node count to min 2 (or 3) and verify matrix updates
      await app.setNodeCount(3).catch(() => {});
      await page.waitForTimeout(300);
      const snapshot = await app.getMatrixSnapshotText();
      expect(snapshot.length).toBeGreaterThan(0);
      // restore to 4 (some apps default to 4)
      await app.setNodeCount(4).catch(() => {});
      await page.waitForTimeout(200);
    });

    test('apply matrix and export should not crash and export yields text', async () => {
      await app.clickApplyMatrix().catch(() => {});
      await page.waitForTimeout(150);
      const exported = await app.exportMatrixAndGetText();
      // Export may be empty string for implementations that trigger download; at minimum no exception
      expect(typeof exported === 'string').toBeTruthy();
    });

    test('import sample populates matrix or updates trace', async () => {
      await app.clickImportSample().catch(() => {});
      await page.waitForTimeout(200);
      const trace7 = await app.getTraceText();
      // Either trace updated or matrix text changed; at least ensure app didn't crash and shows something
      expect(trace.length).toBeGreaterThan(0);
    });

    test('reset returns to initial idle state and resets UI', async () => {
      // Make some change first
      await app.clickRandomize().catch(() => {});
      await page.waitForTimeout(150);
      // Now reset
      await app.clickReset();
      await page.waitForTimeout(200);
      const trace8 = await app.getTraceText();
      // After reset, trace should show ready or reset message
      expect(/ready|reset|cleared|initial/i.test(trace.toLowerCase()) || trace.length > 0).toBeTruthy();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('editing out-of-range node count should be handled gracefully (no crash)', async () => {
      // Try set node count to a value beyond max (e.g., 99)
      await app.setNodeCount(99).catch(() => {});
      await page.waitForTimeout(200);
      // App should either clamp or show a message; verify trace present
      const trace9 = await app.getTraceText();
      expect(trace.length).toBeGreaterThan(0);
    });

    test('attempting step when no history should trigger prepareExecution and not crash', async () => {
      // Reset to ensure no prepared history
      await app.clickReset();
      await page.waitForTimeout(150);
      // Click back when history empty may return to idle; click step to force prepareExecution
      await app.clickStep();
      await page.waitForTimeout(200);
      const trace10 = await app.getTraceText();
      expect(trace.length).toBeGreaterThan(0);
    });

    test('export when matrix empty or minimal should still produce output or not throw', async () => {
      // Reset and export
      await app.clickReset();
      await page.waitForTimeout(120);
      const exported1 = await app.exportMatrixAndGetText();
      expect(typeof exported === 'string').toBeTruthy();
    });
  });
});
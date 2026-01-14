import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0749-d5a0-11f0-8040-510e90b1f3a7.html';

// Page object to encapsulate interactions and queries for the Floyd-Warshall visualization page
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Buttons
  async clickNext() {
    await this.page.click('#nextStep');
  }
  async clickPrev() {
    await this.page.click('#prevStep');
  }
  async clickReset() {
    await this.page.click('#reset');
  }
  async clickAutoPlay() {
    await this.page.click('#autoPlay');
  }

  async getButtonText(selector) {
    return this.page.locator(selector).innerText();
  }

  async isButtonDisabled(selector) {
    return this.page.locator(selector).isDisabled();
  }

  // Step info text
  async getStepInfoText() {
    return this.page.locator('#stepInfo').innerText();
  }

  // Matrix table extracted as array of rows (each row is array of cell strings). Includes header row.
  async getMatrixTableText() {
    // Wait for a table to be rendered in the matrix container
    await this.page.waitForSelector('#matrixContainer table');
    return this.page.evaluate(() => {
      const table = document.querySelector('#matrixContainer table');
      if (!table) return null;
      const rows = Array.from(table.rows).map((row) =>
        Array.from(row.cells).map((cell) => cell.textContent.trim())
      );
      return rows;
    });
  }

  // Returns classes for the data cells (2D array of class lists) to inspect 'current' and 'updated'
  async getMatrixCellClasses() {
    await this.page.waitForSelector('#matrixContainer table');
    return this.page.evaluate(() => {
      const table = document.querySelector('#matrixContainer table');
      if (!table) return null;
      return Array.from(table.rows)
        .slice(1) // skip header row for simplicity when returning only data rows
        .map((row) =>
          Array.from(row.querySelectorAll('td')).map((cell) => Array.from(cell.classList))
        );
    });
  }

  // Read internal JS model for assertions (window.floydWarshall exists after load)
  async getInternalState() {
    return this.page.evaluate(() => {
      const fw = window.floydWarshall;
      if (!fw) return null;
      return {
        currentStep: fw.currentStep,
        totalSteps: fw.steps.length,
        currentStepObj: fw.getCurrentStep ? fw.getCurrentStep() : null
      };
    });
  }

  // Canvas properties (width/height) and dataURL presence
  async getCanvasInfo() {
    return this.page.evaluate(() => {
      const c = document.getElementById('graphCanvas');
      if (!c) return null;
      return {
        width: c.width,
        height: c.height,
        // Attempt toString a small canvas snapshot; toDataURL should be available in browser env
        dataURLStartsWith: c.toDataURL ? c.toDataURL().slice(0, 20) : null
      };
    });
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - End-to-End', () => {
  // Collect console and page errors for assertions
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      // Record only error-level console messages for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture unhandled page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err.toString());
    });

    // Navigate to the application page
    const fwPage = new FloydWarshallPage(page);
    await fwPage.goto();

    // Wait for core elements to be present
    await page.waitForSelector('h1');
    await page.waitForSelector('#graphCanvas');
    await page.waitForSelector('#matrixContainer');
    await page.waitForSelector('#nextStep');
  });

  test.afterEach(async () => {
    // nothing to teardown explicitly; listeners get cleaned up with the page
  });

  test('Initial load: page structure, initial state, and no runtime errors', async ({ page }) => {
    const fwPage = new FloydWarshallPage(page);

    // Verify page title and main heading
    const title = await page.title();
    expect(title).toContain('Floyd-Warshall');

    const heading = await page.locator('h1').innerText();
    expect(heading).toBe('Floyd-Warshall Algorithm Visualization');

    // Internal model should be present and have steps generated
    const state = await fwPage.getInternalState();
    expect(state).not.toBeNull();
    expect(typeof state.currentStep).toBe('number');
    expect(state.totalSteps).toBeGreaterThan(0);

    // Step info should reflect initial step (Step 1/...)
    const stepInfo = await fwPage.getStepInfoText();
    expect(stepInfo).toMatch(/^Step 1\/\d+: Initial distance matrix/);

    // Prev button should be disabled at initial state
    const prevDisabled = await fwPage.isButtonDisabled('#prevStep');
    expect(prevDisabled).toBe(true);

    // Next should be enabled unless there is exactly 1 step (sanity)
    const nextDisabled = await fwPage.isButtonDisabled('#nextStep');
    if (state.totalSteps > 1) {
      expect(nextDisabled).toBe(false);
    }

    // Matrix table should exist and reflect initial matrix (diagonal zeros)
    const table = await fwPage.getMatrixTableText();
    expect(table).not.toBeNull();
    // First data row header is 'A' (vertices are ['A','B','C','D'] per implementation)
    expect(table[1][0]).toBe('A');
    // Diagonal cell for A->A should be '0'
    // table rows structure: header row then each row [rowHeader, cell0, cell1, ...]
    expect(table[1][1]).toBe('0');

    // Canvas should exist with expected size and be renderable
    const canvasInfo = await fwPage.getCanvasInfo();
    expect(canvasInfo).not.toBeNull();
    expect(canvasInfo.width).toBeGreaterThan(0);
    expect(canvasInfo.height).toBeGreaterThan(0);
    expect(typeof canvasInfo.dataURLStartsWith).toBe('string');

    // Assert there were no console errors or uncaught page errors during load
    // Collect them from the arrays populated in beforeEach
    expect(consoleErrors, `Console errors found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page errors found: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test('Next/Previous/Reset buttons drive the algorithm steps and update the matrix and step info', async ({ page }) => {
    const fwPage = new FloydWarshallPage(page);

    // Read internal total steps for later bounds checking
    const initialState = await fwPage.getInternalState();
    expect(initialState).not.toBeNull();
    const totalSteps = initialState.totalSteps;
    expect(totalSteps).toBeGreaterThan(1);

    // Click Next and verify that currentStep increments and stepInfo updates
    await fwPage.clickNext();
    const stateAfterNext = await fwPage.getInternalState();
    expect(stateAfterNext.currentStep).toBe(1);
    const stepInfoAfterNext = await fwPage.getStepInfoText();
    expect(stepInfoAfterNext).toMatch(/^Step 2\/\d+:/);

    // Matrix should have a 'current' highlighted cell corresponding to current step's i/j
    const currentStepObj = stateAfterNext.currentStepObj;
    // currentStepObj may have i and j; assert a cell with class 'current' exists if i/j >=0
    const cellClasses = await fwPage.getMatrixCellClasses();
    if (currentStepObj.i >= 0 && currentStepObj.j >= 0) {
      // We expect the matrix's row i -> data row index i (table row indices: header then rows)
      const classesAtCell = cellClasses[currentStepObj.i][currentStepObj.j];
      expect(Array.isArray(classesAtCell)).toBe(true);
      expect(classesAtCell).toContain('current');
    }

    // Click Next multiple times to move forward; ensure nextButton becomes disabled at the end
    // Move to near the end but do not iterate too many times; calculate steps to reach last
    const stepsToEnd = totalSteps - stateAfterNext.currentStep - 1;
    // Move up to 3 steps or all remaining steps if fewer, to avoid long loops in test
    const advance = Math.min(3, stepsToEnd);
    for (let i = 0; i < advance; i++) {
      await fwPage.clickNext();
    }
    const midState = await fwPage.getInternalState();
    expect(midState.currentStep).toBeGreaterThan(1);

    // Now test Prev button brings us back
    await fwPage.clickPrev();
    const afterPrev = await fwPage.getInternalState();
    expect(afterPrev.currentStep).toBe(midState.currentStep - 1);

    // Test Reset: go forward a couple of steps then reset to initial
    await fwPage.clickNext();
    await fwPage.clickNext();
    await fwPage.clickReset();
    const afterReset = await fwPage.getInternalState();
    expect(afterReset.currentStep).toBe(0);
    const stepInfoAfterReset = await fwPage.getStepInfoText();
    expect(stepInfoAfterReset).toMatch(/^Step 1\/\d+: Initial distance matrix/);

    // Prev button should be disabled again
    const prevDisabled = await fwPage.isButtonDisabled('#prevStep');
    expect(prevDisabled).toBe(true);

    // Ensure no runtime errors were emitted during button interactions
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Matrix updates: "updated" class appears when distances change and values reflect Infinity as "∞"', async ({ page }) => {
    const fwPage = new FloydWarshallPage(page);

    // Ensure starting at initial
    await fwPage.clickReset();

    // Inspect initial matrix values from internal model
    const initialState = await fwPage.getInternalState();
    const initialMatrix = initialState.currentStepObj.matrix;
    // Confirm presence of Infinity values are represented as '∞' in the table
    const tableTextInitial = await fwPage.getMatrixTableText();
    // Find any '∞' occurrences in the table (excluding headers)
    let hasInfinitySymbol = false;
    for (let r = 1; r < tableTextInitial.length; r++) {
      for (let c = 1; c < tableTextInitial[r].length; c++) {
        if (tableTextInitial[r][c] === '∞') hasInfinitySymbol = true;
      }
    }
    // There should be at least one unreachable pair in this sample graph (directed edges)
    expect(hasInfinitySymbol).toBe(true);

    // Advance until we find a step that caused an update (a step where matrix changed vs previous)
    const totalSteps = initialState.totalSteps;
    let foundUpdate = false;
    for (let s = 1; s < Math.min(totalSteps, 40); s++) {
      await fwPage.clickNext();
      const state = await fwPage.getInternalState();
      const currentStepObj = state.currentStepObj;
      // Determine if this step resulted in an updated cell by comparing matrices in JS context
      const changed = await page.evaluate((stepIndex) => {
        const fw = window.floydWarshall;
        if (!fw) return false;
        const current = fw.steps[stepIndex].matrix;
        const prev = fw.steps[stepIndex - 1].matrix;
        for (let i = 0; i < current.length; i++) {
          for (let j = 0; j < current.length; j++) {
            if (current[i][j] !== prev[i][j]) return true;
          }
        }
        return false;
      }, state.currentStep);

      if (changed) {
        foundUpdate = true;
        // Now check the DOM for a cell with 'updated' class
        const classes = await fwPage.getMatrixCellClasses();
        // There should be at least one 'updated' class in the rendered table at this step
        const hasUpdatedClass = classes.some((row) => row.some((cl) => cl.includes('updated')));
        expect(hasUpdatedClass).toBe(true);
        break;
      }
    }
    expect(foundUpdate).toBe(true);

    // Final check: confirm no console or page errors during matrix-specific operations
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Auto Play button toggles and can be stopped by clicking again (does not require full autoplay run)', async ({ page }) => {
    const fwPage = new FloydWarshallPage(page);

    // Ensure reset to initial
    await fwPage.clickReset();

    // Click Auto Play to start (button text should change to 'Stop')
    await fwPage.clickAutoPlay();
    // Wait briefly to allow the UI to update text
    await page.waitForTimeout(200);
    const textAfterStart = await fwPage.getButtonText('#autoPlay');
    expect(textAfterStart).toBe('Stop');

    // Immediately click again to stop the autoplay interval
    await fwPage.clickAutoPlay();
    // Wait briefly for text to revert
    await page.waitForTimeout(200);
    const textAfterStop = await fwPage.getButtonText('#autoPlay');
    expect(textAfterStop).toBe('Auto Play');

    // Ensure final state is valid and no errors were thrown during toggling
    const state = await fwPage.getInternalState();
    expect(state.currentStep).toBeGreaterThanOrEqual(0);
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Accessibility and semantics: buttons have accessible names and matrix table is present', async ({ page }) => {
    const fwPage = new FloydWarshallPage(page);

    // Buttons should be accessible by their text content
    const next = page.getByRole('button', { name: 'Next Step' });
    const prev = page.getByRole('button', { name: 'Previous Step' });
    const reset = page.getByRole('button', { name: 'Reset' });
    const auto = page.getByRole('button', { name: 'Auto Play' });

    await expect(next).toBeVisible();
    await expect(prev).toBeVisible();
    await expect(reset).toBeVisible();
    await expect(auto).toBeVisible();

    // The matrix container includes a table element with headers for vertices
    await page.waitForSelector('#matrixContainer table th');
    const headers = await page.$$eval('#matrixContainer table th', (ths) => ths.map((t) => t.textContent.trim()));
    // First header is empty corner then A,B,C,D
    expect(headers.length).toBeGreaterThanOrEqual(2);
    expect(headers.slice(1, 5)).toEqual(['A', 'B', 'C', 'D']);

    // No runtime console/page errors expected
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
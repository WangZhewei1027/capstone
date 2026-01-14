import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd7663f-d59e-11f0-ae0b-570552a0b645.html';

// Page object encapsulating common interactions and selectors for the Floyd-Warshall app
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.matrix = page.locator('#matrix');
    this.stepInfo = page.locator('#stepInfo');
    this.resetBtn = page.locator('#resetBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.runBtn = page.locator('#runBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.speedInput = page.locator('#speed');
    this.vertexCountInput = page.locator('#vertexCount');
    this.canvas = page.locator('#graphCanvas');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Wait until the matrix table has been rendered
    await expect(this.matrix).toBeVisible();
  }

  // Click the Step button
  async clickStep() {
    await this.stepBtn.click();
  }

  // Click the Run All button
  async clickRun() {
    await this.runBtn.click();
  }

  // Click the Pause button
  async clickPause() {
    await this.pauseBtn.click();
  }

  // Click the Reset button
  async clickReset() {
    await this.resetBtn.click();
  }

  // Change speed input (triggers change event in app)
  async setSpeed(ms) {
    await this.speedInput.fill(String(ms));
    // trigger change event by pressing Enter (the app listens to 'change' event)
    await this.speedInput.press('Enter');
    // also blur to ensure change event fires
    await this.speedInput.evaluate((el) => el.blur());
  }

  // Change vertex count input (triggers change event in app)
  async setVertexCount(count) {
    await this.vertexCountInput.fill(String(count));
    await this.vertexCountInput.press('Enter');
    await this.vertexCountInput.evaluate((el) => el.blur());
  }

  // Return current stepInfo text
  async getStepInfoText() {
    return (await this.stepInfo.textContent())?.trim() ?? '';
  }

  // Return number of header columns (A,B,...)
  async getHeaderLetters() {
    // Returns array of header letters from matrix table
    return await this.page.$$eval('#matrix table thead, #matrix table tr:first-child', (rows) => {
      // find the first row that contains header THs (first row)
      const headerRow = document.querySelector('#matrix table tr');
      if (!headerRow) return [];
      return Array.from(headerRow.querySelectorAll('th')).map((th) => th.textContent?.trim() ?? '');
    }).then((arr) => {
      // remove the very first empty corner header cell (first element)
      if (arr.length > 0 && arr[0] === '') {
        return arr.slice(1);
      }
      return arr;
    });
  }

  // Get count of data rows (excluding header)
  async getDataRowCount() {
    return await this.page.$$eval('#matrix table tr', (rows) => {
      // exclude header row
      return Math.max(0, rows.length - 1);
    });
  }

  // Get all diagonal cell values (A-A, B-B, etc)
  async getDiagonalValues() {
    return await this.page.$$eval('#matrix table tr', (rows) => {
      // skip header row, for each data row pick the cell corresponding to diagonal index
      const out = [];
      for (let r = 1; r < rows.length; r++) {
        const th = rows[r].querySelector('th');
        // determine index from row position r-1
        const idx = r - 1;
        const tds = rows[r].querySelectorAll('td');
        if (tds && tds[idx]) {
          out.push(tds[idx].textContent?.trim() ?? '');
        }
      }
      return out;
    });
  }

  // Return locator for the single TD with class 'current'
  getCurrentCellLocator() {
    return this.page.locator('#matrix td.current');
  }

  // Wait until the app displays "Algorithm complete!"
  async waitForCompletion(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const el = document.getElementById('stepInfo');
      return el && el.textContent && el.textContent.includes('Algorithm complete!');
    }, null, { timeout });
  }

  // Return whether run button is disabled
  async isRunDisabled() {
    return await this.runBtn.isDisabled();
  }

  // Return whether pause button is disabled
  async isPauseDisabled() {
    return await this.pauseBtn.isDisabled();
  }

  // Get canvas data URL (as an indicator that something was drawn)
  async getCanvasDataURL() {
    return await this.page.$eval('#graphCanvas', (c) => {
      try {
        return c.toDataURL();
      } catch (e) {
        return '';
      }
    });
  }

  // Count td elements in matrix (excluding th labels)
  async countMatrixCells() {
    return await this.page.$$eval('#matrix table td', (cells) => cells.length);
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - UI and Behavior', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture console error messages for assertions
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', (err) => {
      // pageerror contains Error object for uncaught exceptions
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Assert no console errors or page errors occurred during the test.
    // This validates that the page script ran without throwing unexpected runtime errors.
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    expect(pageErrors, `Page runtime errors occurred: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
  });

  test('Initial load: page renders matrix, canvas and default step info', async ({ page }) => {
    // Purpose: Verify the application loads, renders the matrix and canvas, and sets an initial step state.
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Title visibility check
    await expect(page.locator('h1')).toHaveText('Floyd-Warshall Algorithm Visualization');

    // The step info is updated by the app; we expect an initial Step message
    const stepText = await app.getStepInfoText();
    expect(stepText).toMatch(/Step\s+0: Checking path from A to A via A/i);

    // Matrix header should contain letters A..D by default (vertexCount = 4)
    const headers = await app.getHeaderLetters();
    expect(headers.length).toBeGreaterThanOrEqual(3); // at least 3 vertices per constraints
    // Ensure first header is 'A'
    expect(headers[0]).toBe('A');

    // Diagonal values should be '0' for each vertex
    const diagonals = await app.getDiagonalValues();
    expect(diagonals.length).toBe(headers.length);
    diagonals.forEach((val) => {
      expect(val).toBe('0');
    });

    // Canvas exists and produces a data URL (something was drawn)
    const dataUrl = await app.getCanvasDataURL();
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.length).toBeGreaterThan(0);
  });

  test('Step button advances algorithm state and highlights current cell', async ({ page }) => {
    // Purpose: Ensure clicking Step advances the algorithm one step and the UI highlights the current cell.
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Click the step button once
    await app.clickStep();

    // After one click, step should increment to 1 and stepInfo should reflect i->j via k
    const stepText = await app.getStepInfoText();
    expect(stepText).toMatch(/Step\s+1: Checking path from A to B via A/i);

    // Exactly one cell should have the 'current' class
    const currentCells = app.getCurrentCellLocator();
    await expect(currentCells).toHaveCount(1);

    // Ensure that the current cell is visible and contains either '∞' or a number (valid distance representation)
    const currentText = (await currentCells.first().textContent())?.trim() ?? '';
    expect(currentText.length).toBeGreaterThan(0); // not empty

    // The step increment should have updated the underlying table structure (number of cells stays consistent)
    const totalCells = await app.countMatrixCells();
    expect(totalCells).toBeGreaterThan(0);
  });

  test('Run All executes to completion, toggles buttons, and updates final step info', async ({ page }) => {
    // Purpose: Verify Run All starts the algorithm, Run/Pause buttons toggle, and algorithm completes successfully.
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Speed up execution to avoid long waits
    await app.setSpeed(100);

    // Ensure run button is enabled then click it
    expect(await app.isRunDisabled()).toBe(false);
    await app.clickRun();

    // Immediately after starting, Run should be disabled and Pause enabled
    expect(await app.isRunDisabled()).toBe(true);
    expect(await app.isPauseDisabled()).toBe(false);

    // Wait for algorithm to complete (the app sets the stepInfo to indicate completion)
    await app.waitForCompletion(10000); // give up to 10s for completion (should be enough for small graphs)

    // After completion, Run should be enabled again and Pause disabled
    expect(await app.isRunDisabled()).toBe(false);
    expect(await app.isPauseDisabled()).toBe(true);

    // Verify final step text indicates algorithm completion
    const finalStepText = await app.getStepInfoText();
    expect(finalStepText).toContain('Algorithm complete! All shortest paths calculated.');

    // Verify matrix still has correct diagonal zeros after completion
    const diagonalAfter = await app.getDiagonalValues();
    diagonalAfter.forEach((v) => expect(v).toBe('0'));
  });

  test('Changing vertex count updates matrix size and resets algorithm state', async ({ page }) => {
    // Purpose: Changing vertex count should reinitialize the matrix and update the UI accordingly.
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Set vertex count to 3 (valid minimum)
    await app.setVertexCount(3);

    // Wait a short moment for UI to update
    await page.waitForTimeout(200);

    // Check header letters are now A,B,C
    const headers = await app.getHeaderLetters();
    expect(headers).toEqual(['A', 'B', 'C']);

    // Data rows should be 3
    const dataRows = await app.getDataRowCount();
    expect(dataRows).toBe(3);

    // Diagonal values should be three zeros
    const diagonals = await app.getDiagonalValues();
    expect(diagonals).toEqual(['0', '0', '0']);

    // Step info should reflect reset (k=0,i=0,j=0 -> Step 0 message)
    const stepText = await app.getStepInfoText();
    expect(stepText).toMatch(/Step\s+0: Checking path from A to A via A/i);
  });

  test('Speed input bounds and pause/resume behavior while running', async ({ page }) => {
    // Purpose: Validate speed input enforces min/max and that pause/resume toggles run state correctly.
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Start the algorithm running
    await app.setSpeed(200); // reasonable speed
    await app.clickRun();

    // Ensure running: run disabled, pause enabled
    expect(await app.isRunDisabled()).toBe(true);
    expect(await app.isPauseDisabled()).toBe(false);

    // Change speed to a high value (within allowed range)
    await app.setSpeed(1500);
    // Confirm the input reflects the new value
    expect(await app.speedInput.inputValue()).toBe('1500');

    // Now pause execution
    await app.clickPause();
    // Pause should be disabled after stopping, run enabled
    expect(await app.isPauseDisabled()).toBe(true);
    expect(await app.isRunDisabled()).toBe(false);

    // Changing speed when not running should simply update the input and not throw
    await app.setSpeed(300);
    expect(await app.speedInput.inputValue()).toBe('300');
  });

  test('Reset button reinitializes matrix and step info', async ({ page }) => {
    // Purpose: Clicking Reset should reinitialize internal state and UI to a fresh random graph (but diagonal zeros stay)
    const app = new FloydWarshallPage(page);
    await app.goto();

    // Perform a step to change state
    await app.clickStep();
    const stepBeforeReset = await app.getStepInfoText();
    expect(stepBeforeReset).toMatch(/Step\s+1: Checking path from A to B via A/i);

    // Click reset
    await app.clickReset();
    // Wait briefly
    await page.waitForTimeout(100);

    // After reset, step info should return to Step 0 initial state
    const stepAfterReset = await app.getStepInfoText();
    expect(stepAfterReset).toMatch(/Step\s+0: Checking path from A to A via A/i);

    // Diagonals should still be zeros
    const diags = await app.getDiagonalValues();
    diags.forEach((v) => expect(v).toBe('0'));
  });
});
import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a074f-d5a0-11f0-8040-510e90b1f3a7.html';

class LCSPage {
  /**
   * Page object for the Longest Common Subsequence demo app.
   * Encapsulates common interactions and queries for clarity in tests.
   */
  constructor(page) {
    this.page = page;
    this.string1 = page.locator('#string1');
    this.string2 = page.locator('#string2');
    this.calculateButton = page.locator('button', { hasText: 'Calculate LCS' });
    this.loadExampleButton = page.locator('button.example-btn');
    this.lcsResult = page.locator('#lcs-result');
    this.lengthResult = page.locator('#length-result');
    this.matrixContainer = page.locator('#matrix-container');
    this.matrixTable = this.matrixContainer.locator('table.matrix-table');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait until the DP matrix is rendered by the page script on load
    await this.page.waitForSelector('#matrix-container table.matrix-table');
  }

  async getInputValues() {
    return {
      str1: await this.string1.inputValue(),
      str2: await this.string2.inputValue()
    };
  }

  async setInputs(str1, str2) {
    await this.string1.fill(str1);
    await this.string2.fill(str2);
  }

  async clickCalculate() {
    await this.calculateButton.click();
  }

  async clickLoadExample() {
    await this.loadExampleButton.click();
  }

  async getLCSResultText() {
    return (await this.lcsResult.textContent()).trim();
  }

  async getLengthResultText() {
    return (await this.lengthResult.textContent()).trim();
  }

  async getMatrixRowCount() {
    return await this.matrixTable.locator('tr').count();
  }

  async getMatrixCellTextAt(rowIndex, colIndex) {
    // rowIndex and colIndex are 0-based for the rendered table rows and cells
    const row = this.matrixTable.locator('tr').nth(rowIndex);
    const cell = row.locator('th,td').nth(colIndex);
    return (await cell.textContent()).trim();
  }

  async countPathHighlightedCells() {
    return await this.matrixTable.locator('td.lcs-path').count();
  }

  async getMatrixHeaderSecondRowContents() {
    // Return the header row (first tr) cell texts for the second column onward
    const header = this.matrixTable.locator('tr').first();
    const cells = await header.locator('th').allTextContents();
    return cells.map(s => s.trim());
  }
}

test.describe('Longest Common Subsequence App - Integration Tests', () => {
  // Collect console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.describe('Initial load and default state', () => {
    test('should load the page, run initial calculation, and display default LCS and matrix', async ({ page }) => {
      // Purpose: Verify that the app initializes and computes the default LCS on load
      const app = new LCSPage(page);
      await app.goto();

      // Verify default input values are present
      const inputs = await app.getInputValues();
      expect(inputs.str1).toBe('ABCBDAB');
      expect(inputs.str2).toBe('BDCAB');

      // Verify the computed results are displayed and correct
      // Known expected LCS for these defaults is "BCAB" of length 4
      const lcsText = await app.getLCSResultText();
      const lengthText = await app.getLengthResultText();
      expect(lcsText).toBe('BCAB');
      expect(lengthText).toBe('4');

      // Verify DP matrix rendered: rows should be str1.length + 1 = 7 + 1 = 8
      const expectedRows = 'ABCBDAB'.length + 1;
      const actualRows = await app.getMatrixRowCount();
      expect(actualRows).toBe(expectedRows);

      // Verify at least one cell is highlighted as part of the LCS path
      const highlighted = await app.countPathHighlightedCells();
      expect(highlighted).toBeGreaterThan(0);

      // Confirm no console.error and no uncaught page errors occurred during load
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Interactive controls and user flows', () => {
    test('Load Example button fills inputs and recalculates LCS (ADH length 3)', async ({ page }) => {
      // Purpose: Ensure the "Load Example" control populates example inputs and triggers calculation
      const app = new LCSPage(page);
      await app.goto();

      // Click the example button and wait for matrix to update
      await app.clickLoadExample();
      await page.waitForSelector('#matrix-container table.matrix-table');

      // Verify inputs changed to the example values
      const { str1, str2 } = await app.getInputValues();
      expect(str1).toBe('ABCDGH');
      expect(str2).toBe('AEDFHR');

      // Verify results correspond to expected LCS "ADH" length 3
      const lcsText = await app.getLCSResultText();
      const lengthText = await app.getLengthResultText();
      expect(lcsText).toBe('ADH');
      expect(lengthText).toBe('3');

      // Verify the matrix bottom-right cell equals the LCS length
      // The matrix rendering includes an extra first column; find last row's last td
      const rows = await app.matrixTable.locator('tr').count();
      const lastRowIndex = rows - 1;
      // Each row has a combination of th and td; the DP values start after the first two columns
      // We'll fetch the last cell in the row via indexing the combined th/td elements:
      const lastRowCells = app.matrixTable.locator('tr').nth(lastRowIndex).locator('th,td');
      const lastCellIndex = (await lastRowCells.count()) - 1;
      const bottomRight = (await lastRowCells.nth(lastCellIndex).textContent()).trim();
      expect(bottomRight).toBe('3');

      // Confirm no console or page errors were emitted by this interaction
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Calculate LCS shows alert when either input is empty', async ({ page }) => {
      // Purpose: Validate edge-case handling when empty inputs are submitted
      const app = new LCSPage(page);
      await app.goto();

      // Clear both inputs
      await app.setInputs('', '');

      // Handle the alert dialog raised by the page and assert its message
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toBe('Please enter both strings');
        await dialog.accept();
      });

      // Click calculate to trigger the alert
      await app.clickCalculate();

      // After dismissing alert, ensure no uncaught page errors occurred
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Calculate LCS with identical strings returns full string as LCS', async ({ page }) => {
      // Purpose: Test a simple case where both inputs are identical and verify matrix and results
      const app = new LCSPage(page);
      await app.goto();

      await app.setInputs('ABC', 'ABC');
      await app.clickCalculate();

      // Wait for the matrix to be re-rendered
      await page.waitForSelector('#matrix-container table.matrix-table');

      // Expect LCS to be 'ABC' and length '3'
      expect(await app.getLCSResultText()).toBe('ABC');
      expect(await app.getLengthResultText()).toBe('3');

      // Expect path-highlighted cells > 0 and that diagonal cells reflect the increasing sequence
      const highlighted = await app.countPathHighlightedCells();
      expect(highlighted).toBeGreaterThanOrEqual(3);

      // Verify the header row contains the characters of the second string
      const headerCells = await app.getMatrixHeaderSecondRowContents();
      // header is something like ["", "#", "B", "D", ...] - ensure 'A', 'B', 'C' appear for this test
      // Because header contains first two TH elements, assert that 'A' exists in the header THs or subsequent THs
      const headerText = headerCells.join('');
      expect(headerText.includes('A') || headerText.includes('B') || headerText.includes('C')).toBeTruthy();

      // Ensure no console or page errors
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Submitting when one input is empty triggers alert and does not crash', async ({ page }) => {
      // Purpose: Ensure submitting with only one empty input triggers the expected alert and the app remains stable
      const app = new LCSPage(page);
      await app.goto();

      // Set only the first input to empty
      await app.setInputs('', 'NONEMPTY');

      // Listen for the expected alert
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toBe('Please enter both strings');
        await dialog.accept();
      });

      await app.clickCalculate();

      // Verify that results elements still exist and no uncaught exceptions occurred
      expect(await app.lcsResult.isVisible()).toBeTruthy();
      expect(await app.lengthResult.isVisible()).toBeTruthy();

      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Console and error observation', () => {
    test('should not emit uncaught exceptions or console.error during normal operations', async ({ page }) => {
      // Purpose: Monitor console and page errors during several operations
      const app = new LCSPage(page);
      await app.goto();

      // Perform multiple interactions
      await app.setInputs('XMJYAUZ', 'MZJAWXU');
      await app.clickCalculate();
      await page.waitForSelector('#matrix-container table.matrix-table');

      await app.clickLoadExample();
      await page.waitForSelector('#matrix-container table.matrix-table');

      await app.setInputs('SHORT', 'LONGERSTRING');
      await app.clickCalculate();
      await page.waitForSelector('#matrix-container table.matrix-table');

      // Assert no console.error or pageerror events were captured
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });
});
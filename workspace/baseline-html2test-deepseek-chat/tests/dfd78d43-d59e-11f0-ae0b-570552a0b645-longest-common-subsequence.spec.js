import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d43-d59e-11f0-ae0b-570552a0b645.html';

// Page object to encapsulate common interactions with the LCS page
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.str1 = page.locator('#str1');
    this.str2 = page.locator('#str2');
    this.calculateButton = page.locator('button', { hasText: 'Calculate LCS' });
    this.results = page.locator('#results');
    this.lcsString = page.locator('.lcs-string');
    this.matrix = page.locator('#matrix');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getInputValues() {
    return {
      str1: await this.str1.inputValue(),
      str2: await this.str2.inputValue()
    };
  }

  async setInputs(s1, s2) {
    await this.str1.fill(s1);
    await this.str2.fill(s2);
  }

  async clickCalculate() {
    await this.calculateButton.click();
  }

  async getLCS() {
    return (await this.lcsString.textContent())?.trim();
  }

  async getLengthText() {
    // The length is inside a <p> tag within results; find the <p> that contains 'Length:' and extract strong text
    const lengthStrong = this.results.locator('p >> strong').first();
    if (await lengthStrong.count() === 0) {
      return null;
    }
    return (await lengthStrong.textContent())?.trim();
  }

  async getMatrixCellCount() {
    return await this.matrix.locator('.matrix-cell').count();
  }

  async getDiagonalCellsCount() {
    return await this.matrix.locator('.matrix-cell.diagonal').count();
  }

  async getPathCellsCount() {
    return await this.matrix.locator('.matrix-cell.path').count();
  }

  async getMatrixGridTemplateColumns() {
    // read inline style set in script
    return await this.page.$eval('#matrix', el => el.style.gridTemplateColumns);
  }

  async getResultsText() {
    return (await this.results.textContent())?.trim();
  }
}

test.describe('Longest Common Subsequence Visualization - LCS Page tests', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Attach listeners to capture runtime errors and console error messages.
  // We assert later that there were no unexpected errors during load and interactions.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // Collect page errors (uncaught exceptions from the page)
      pageErrors.push(err);
    });

    page.on('console', msg => {
      // Collect console messages of type 'error' for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });
  });

  // Test initial page load with default values and that no runtime errors occurred.
  test('Initial load computes default LCS and shows matrix without runtime errors', async ({ page }) => {
    const lcsPage = new LCSPage(page);

    // Navigate to the application page
    await lcsPage.goto();

    // Ensure results container is present
    await expect(lcsPage.results).toBeVisible();

    // Verify default input values are present (as defined in HTML)
    const inputs = await lcsPage.getInputValues();
    expect(inputs.str1).toBe('ABCDGH');
    expect(inputs.str2).toBe('AEDFHR');

    // Because the page calls calculateLCS on window.onload, we expect results to be rendered.
    // Check the displayed LCS value and length match the expected values for the default strings.
    const lcs = await lcsPage.getLCS();
    expect(lcs).toBe('ADH'); // Expected LCS for ABCDGH vs AEDFHR is "ADH"

    const length = await lcsPage.getLengthText();
    expect(length).toBe('3');

    // The matrix should exist and have some cells; check there are matrix cells rendered
    const totalCells = await lcsPage.getMatrixCellCount();
    expect(totalCells).toBeGreaterThan(0);

    // There should be at least one diagonal 'matching' cell and at least one path (backtracking) cell
    const diagCount = await lcsPage.getDiagonalCellsCount();
    expect(diagCount).toBeGreaterThanOrEqual(1);

    const pathCount = await lcsPage.getPathCellsCount();
    expect(pathCount).toBeGreaterThanOrEqual(1);

    // Check that the inline grid template columns style is set according to str2 length: repeat(n+2, 1fr)
    const gridTemplate = await lcsPage.getMatrixGridTemplateColumns();
    // For default str2 length 6 -> n+2 = 8 -> gridTemplate should be "repeat(8, 1fr)"
    expect(gridTemplate.replace(/\s/g, '')).toBe('repeat(8,1fr)');

    // Assert that no uncaught page errors or console.error messages occurred during load
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.map(m => m.text()).join('; ')}`).toBe(0);
  });

  // Test that modifying inputs and clicking the Calculate button updates the results synchronously
  test('Clicking Calculate after changing inputs updates LCS, length and matrix classes', async ({ page }) => {
    const lcsPage = new LCSPage(page);
    await lcsPage.goto();

    // Change inputs to identical strings to create a clear expected LCS
    await lcsPage.setInputs('ABC', 'ABC');

    // Click calculate and wait a short moment for DOM updates
    await lcsPage.clickCalculate();

    // Verify the lcs value updates to the entire string and length equals 3
    await expect(lcsPage.lcsString).toHaveText('ABC');
    const length = await lcsPage.getLengthText();
    expect(length).toBe('3');

    // For identical strings of length 3 we expect three diagonal matches
    const diagCount = await lcsPage.getDiagonalCellsCount();
    expect(diagCount).toBe(3);

    // Path should highlight the backtracking path; there should be at least one path cell
    const pathCount = await lcsPage.getPathCellsCount();
    expect(pathCount).toBeGreaterThanOrEqual(1);

    // Ensure there were no new page errors or console.error messages during this interaction
    expect(pageErrors.length, `Unexpected page errors after interaction: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages after interaction: ${consoleErrors.map(m => m.text()).join('; ')}`).toBe(0);
  });

  // Test edge case when one or both inputs are empty -> application should show friendly message
  test('Entering empty inputs shows an informative error message', async ({ page }) => {
    const lcsPage = new LCSPage(page);
    await lcsPage.goto();

    // Clear one input and click calculate
    await lcsPage.setInputs('', '');
    await lcsPage.clickCalculate();

    // The results pane should show the message "Please enter both strings."
    const resultsText = await lcsPage.getResultsText();
    expect(resultsText).toContain('Please enter both strings.');

    // No matrix should be present when inputs are empty (matrix div may be absent or empty)
    const matrixExists = await page.$('#matrix');
    if (matrixExists) {
      // If the matrix is present, ensure it has no meaningful matrix cells
      const cellCount = await lcsPage.getMatrixCellCount();
      // It may still have header placeholders — assert that there are not many filled matrix number cells
      expect(cellCount).toBeLessThanOrEqual(4);
    }

    // Ensure no runtime errors occurred while handling the invalid input case
    expect(pageErrors.length, `Page errors on empty input scenario: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Console errors on empty input scenario: ${consoleErrors.map(m => m.text()).join('; ')}`).toBe(0);
  });

  // Test with longer strings to verify matrix sizing and that the visualization scales accordingly
  test('Visualization updates grid template columns for different lengths', async ({ page }) => {
    const lcsPage = new LCSPage(page);
    await lcsPage.goto();

    // Use a 4-character str2 so we can validate gridTemplateColumns equals repeat(4+2,1fr)=repeat(6,1fr)
    await lcsPage.setInputs('WXYZ', 'PQRS');
    await lcsPage.clickCalculate();

    const gridTemplate = await lcsPage.getMatrixGridTemplateColumns();
    expect(gridTemplate.replace(/\s/g, '')).toBe('repeat(6,1fr)');

    // Ensure at least one result item (LCS container) is visible
    await expect(lcsPage.results).toBeVisible();

    // No runtime errors should have been emitted
    expect(pageErrors.length, `Page errors on grid template test: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Console errors on grid template test: ${consoleErrors.map(m => m.text()).join('; ')}`).toBe(0);
  });

  // Test to ensure header and explanation sections are present and contain expected static text
  test('Static explanatory content and headings are present', async ({ page }) => {
    const lcsPage = new LCSPage(page);
    await lcsPage.goto();

    // Check main heading
    await expect(page.locator('h1')).toHaveText(/Longest Common Subsequence/i);

    // Check explanation block and its steps are present
    await expect(page.locator('.explanation')).toBeVisible();
    await expect(page.locator('.explanation .step')).toHaveCount(4);

    // The explanation steps contain the expected keywords
    const explanationText = (await page.locator('.explanation').textContent()) || '';
    expect(explanationText).toContain('Create a 2D table');
    expect(explanationText).toContain('Fill the table');
    expect(explanationText).toContain('Yellow cells show the backtracking path');
    expect(explanationText).toContain('Green diagonal cells indicate matching characters');

    // Confirm no runtime errors or console errors emitted
    expect(pageErrors.length, `Page errors on static content test: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Console errors on static content test: ${consoleErrors.map(m => m.text()).join('; ')}`).toBe(0);
  });
});
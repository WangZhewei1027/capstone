import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6cb-cd33-11f0-bdf9-b3d97e91273d.html';

/**
 * Page Object for the LCS application
 * Encapsulates common interactions and queries to keep tests readable.
 */
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input1 = page.locator('#string1');
    this.input2 = page.locator('#string2');
    this.computeBtn = page.locator('#computeBtn');
    this.output = page.locator('#output');
    this.matrix = this.output.locator('.matrix');
    this.table = this.matrix.locator('table');
    this.lcsSequence = this.output.locator('.lcs-sequence');
  }

  async navigateAndCaptureErrors(consoleErrors, pageErrors) {
    // Attach listeners BEFORE navigation to capture errors produced during load/onload
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    this.page.on('pageerror', err => {
      pageErrors.push(String(err.message || err));
    });

    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // The app triggers compute on window.onload; wait for the output area to populate
    await this.output.waitFor({ state: 'visible' });
  }

  async setStrings(s1, s2) {
    await this.input1.fill(s1);
    await this.input2.fill(s2);
  }

  async clickCompute() {
    await Promise.all([
      // clicking may trigger DOM updates; wait for potential network/DOM stability
      this.page.waitForTimeout(50), // small pause to allow synchronous JS to run reliably
      this.computeBtn.click()
    ]);
  }

  async getOutputText() {
    return (await this.output.innerText()).trim();
  }

  async getLengthText() {
    const lengthLocator = this.output.locator('p').first();
    return (await lengthLocator.innerText()).trim();
  }

  async getSequenceText() {
    // sequence is inside .lcs-sequence
    if (await this.lcsSequence.count() === 0) return null;
    return (await this.lcsSequence.innerText()).trim();
  }

  async hasMatrix() {
    return (await this.table.count()) > 0;
  }

  async getMatrixDimensions() {
    // Returns { rows: number of tbody rows, cols: number of td cells per row (excluding the leading th) }
    if (!await this.hasMatrix()) return { rows: 0, cols: 0 };
    const tbodyRows = this.table.locator('tbody tr');
    const rows = await tbodyRows.count();
    // count number of td in the first row
    const firstRowTds = tbodyRows.nth(0).locator('td');
    const cols = await firstRowTds.count();
    return { rows, cols };
  }

  async getBottomRightDpValue() {
    if (!await this.hasMatrix()) return null;
    const tbodyRows1 = this.table.locator('tbody tr');
    const lastRow = tbodyRows.last();
    const lastTd = lastRow.locator('td').last();
    return (await lastTd.innerText()).trim();
  }

  async countHighlightedCells() {
    if (!await this.hasMatrix()) return 0;
    return await this.table.locator('tbody td.highlight').count();
  }

  async getFirstColumnHeaderTexts() {
    // return array of th textContent for tbody rows first column
    if (!await this.hasMatrix()) return [];
    const rows1 = await this.table.locator('tbody tr').count();
    const out = [];
    for (let i = 0; i < rows; i++) {
      const th = this.table.locator('tbody tr').nth(i).locator('th').first();
      out.push((await th.innerText()).trim());
    }
    return out;
  }
}

/**
 * Group tests related to the LCS application behavior and UI.
 */
test.describe('Longest Common Subsequence (LCS) Demo - UI and behavior', () => {

  // Basic smoke test for initial load and default computation
  test('Initial page load computes default example and shows expected LCS result', async ({ page }) => {
    // Collect console and page errors
    const consoleErrors = [];
    const pageErrors = [];

    const app = new LCSPage(page);
    // Navigate and capture any console/page errors produced during load and onload compute
    await app.navigateAndCaptureErrors(consoleErrors, pageErrors);

    // Verify inputs are populated with default values from the HTML
    await expect(app.input1).toHaveValue('AGGTAB');
    await expect(app.input2).toHaveValue('GXTXAYB');

    // Verify output area contains the expected length and sequence for the default inputs
    const lengthText = await app.getLengthText();
    expect(lengthText).toContain('Length of LCS:'); // descriptive text present
    // The known LCS of AGGTAB and GXTXAYB is "GTAB" of length 4
    expect(lengthText).toMatch(/4$/); // ends with 4

    const sequenceText = await app.getSequenceText();
    expect(sequenceText).toBe('GTAB');

    // Verify dp matrix is rendered and bottom-right dp value equals the LCS length (4)
    expect(await app.hasMatrix()).toBe(true);
    const bottomRight = await app.getBottomRightDpValue();
    expect(bottomRight).toBe('4');

    // There should be at least one highlighted cell showing the LCS path
    const highlightCount = await app.countHighlightedCells();
    expect(highlightCount).toBeGreaterThan(0);

    // Accessibility: output region should have aria-live attribute set
    const ariaLive = await page.locator('#output').getAttribute('aria-live');
    expect(ariaLive).toBe('polite');

    // Ensure no console errors or uncaught page errors occurred during load and computation
    expect(consoleErrors, `Console errors encountered: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors encountered: ${pageErrors.join('\n')}`).toHaveLength(0);
  });

  // Test interactive computation with custom strings
  test('Updating input strings and clicking Compute updates result and dp matrix accordingly', async ({ page }) => {
    const consoleErrors1 = [];
    const pageErrors1 = [];

    const app1 = new LCSPage(page);
    await app.navigateAndCaptureErrors(consoleErrors, pageErrors);

    // Set new strings with a known LCS
    await app.setStrings('ABC', 'AC');
    await app.clickCompute();

    // Expect the LCS length to be 2 and sequence "AC"
    const lengthText1 = await app.getLengthText();
    expect(lengthText).toContain('Length of LCS:');
    expect(lengthText).toMatch(/2$/);

    const seq = await app.getSequenceText();
    expect(seq).toBe('AC');

    // Matrix dimensions should be m+1 rows (3+1=4) and n+1 columns (2+1=3)
    const dims = await app.getMatrixDimensions();
    expect(dims.rows).toBe(4); // rows = m+1 = 3+1
    expect(dims.cols).toBe(3); // cols = n+1 = 2+1

    // First column header texts should be ['0','A','B','C']
    const firstColHeaders = await app.getFirstColumnHeaderTexts();
    expect(firstColHeaders).toEqual(['0', 'A', 'B', 'C']);

    // Ensure at least one highlighted cell exists for non-empty LCS
    expect(await app.countHighlightedCells()).toBeGreaterThan(0);

    // No console or page errors
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test edge case: one or both inputs empty
  test('Clicking Compute with empty inputs shows error message and does not render matrix', async ({ page }) => {
    const consoleErrors2 = [];
    const pageErrors2 = [];

    const app2 = new LCSPage(page);
    await app.navigateAndCaptureErrors(consoleErrors, pageErrors);

    // Clear one input and click
    await app.setStrings('', 'ABC');
    await app.clickCompute();

    // Output should contain the prompt asking to enter both strings
    const outputText = await app.getOutputText();
    expect(outputText).toBe('Please enter both strings.');

    // Matrix should not be present
    expect(await app.hasMatrix()).toBe(false);

    // Now clear both inputs to ensure same behavior
    await app.setStrings('', '');
    await app.clickCompute();
    const outputText2 = await app.getOutputText();
    expect(outputText2).toBe('Please enter both strings.');

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test case: no common subsequence
  test('When there is no common subsequence, length is 0 and sequence is shown as "(empty string)"', async ({ page }) => {
    const consoleErrors3 = [];
    const pageErrors3 = [];

    const app3 = new LCSPage(page);
    await app.navigateAndCaptureErrors(consoleErrors, pageErrors);

    await app.setStrings('ABC', 'DEF');
    await app.clickCompute();

    // Expect length 0
    const lengthText2 = await app.getLengthText();
    expect(lengthText).toMatch(/0$/);

    // Sequence element should display "(empty string)"
    const seq1 = await app.getSequenceText();
    expect(seq).toBe('(empty string)');

    // Matrix should still be present (dp table valid) and bottom-right value should be 0
    expect(await app.hasMatrix()).toBe(true);
    const bottom = await app.getBottomRightDpValue();
    expect(bottom).toBe('0');

    // Highlights might include the [0,0] cell pushed by the algorithm; ensure highlight count >= 1
    const highlights = await app.countHighlightedCells();
    expect(highlights).toBeGreaterThanOrEqual(1);

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Additional DOM and visual checks
  test('UI elements are present and styled containers render expected child elements', async ({ page }) => {
    const consoleErrors4 = [];
    const pageErrors4 = [];

    const app4 = new LCSPage(page);
    await app.navigateAndCaptureErrors(consoleErrors, pageErrors);

    // Check title is present
    const title = page.locator('h1');
    await expect(title).toHaveText('Longest Common Subsequence (LCS) Calculator');

    // Check compute button is visible and enabled
    await expect(app.computeBtn).toBeVisible();
    await expect(app.computeBtn).toBeEnabled();

    // Output container should contain at least two paragraphs (length and sequence) and a caption explanatory paragraph
    const paragraphs = app.output.locator('p');
    // After initial compute, expect at least 3 paragraphs (length, sequence, caption)
    await expect(paragraphs).toHaveCountGreaterThan(1);

    // Validate that the footer text is present
    const footer = page.locator('footer');
    await expect(footer).toContainText('Longest Common Subsequence Demo');

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

});
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed130-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object encapsulating interactions with the LCS demo page
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.str1 = page.locator('#str1');
    this.str2 = page.locator('#str2');
    this.calculateBtn = page.locator('#calculateBtn');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(BASE_URL, { waitUntil: 'load' });
  }

  // Fill both input fields
  async fillStrings(s1, s2) {
    await this.str1.fill(s1);
    await this.str2.fill(s2);
  }

  // Click the calculate button
  async clickCalculate() {
    await this.calculateBtn.click();
  }

  // Return the visible textContent of the result element
  async getResultText() {
    return (await this.result.textContent()) || '';
  }

  // Return HTML inside result (useful to inspect highlighted spans and table)
  async getResultHTML() {
    return this.result.evaluate(node => node.innerHTML);
  }

  // Count number of highlighted LCS character spans within the result (class lcs-char)
  async countLCSCharSpans() {
    return this.result.locator('.lcs-char').count();
  }

  // Check presence of table inside result
  async hasDPTable() {
    return this.result.locator('table').count().then(n => n > 0);
  }

  // Count highlighted cells in the DP table
  async countHighlightedCells() {
    return this.result.locator('table td.highlight').count();
  }
}

test.describe('Longest Common Subsequence (LCS) Demo - End-to-End', () => {
  // Collect console messages and page errors for each test so we can assert on them
  test.beforeEach(async ({ page }) => {
    // No-op: individual tests will attach their own listeners and navigate
  });

  // Test initial page load and default state: inputs present, button present, result empty
  test('Initial load: inputs, button and empty result are visible', async ({ page }) => {
    // Attach listeners to observe console and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const lcs = new LCSPage(page);
    await lcs.goto();

    // Verify title and key interactive elements are present
    await expect(page.locator('h1')).toHaveText(/Longest Common Subsequence/i);
    await expect(lcs.str1).toBeVisible();
    await expect(lcs.str2).toBeVisible();
    await expect(lcs.calculateBtn).toBeVisible();

    // Inputs should be empty initially
    await expect(lcs.str1).toHaveValue('');
    await expect(lcs.str2).toHaveValue('');

    // Result area should be empty (no text)
    const resultText = await lcs.getResultText();
    expect(resultText.trim()).toBe('');

    // Assert no runtime ReferenceError, SyntaxError or TypeError occurred on load
    const fatalErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length, `No ReferenceError/SyntaxError/TypeError on initial load. console: ${JSON.stringify(consoleMessages)}`).toBe(0);
  });

  // Test validation: clicking calculate with empty inputs should show the error message
  test('Validation: shows message when one or both inputs are empty', async ({ page }) => {
    const pageErrors1 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const lcs1 = new LCSPage(page);
    await lcs.goto();

    // Case 1: both empty
    await lcs.fillStrings('', '');
    await lcs.clickCalculate();
    await expect(lcs.result).toContainText('Please enter both strings.');

    // Case 2: first filled, second empty
    await lcs.fillStrings('ABC', '');
    await lcs.clickCalculate();
    await expect(lcs.result).toContainText('Please enter both strings.');

    // Case 3: second filled, first empty
    await lcs.fillStrings('', 'XYZ');
    await lcs.clickCalculate();
    await expect(lcs.result).toContainText('Please enter both strings.');

    // Ensure no fatal JS errors occurred during validation interactions
    const fatalErrors1 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test computing LCS for two typical strings and verify displayed length, LCS string, highlights and DP table
  test('Compute LCS for sample strings and verify outputs, highlights and DP table', async ({ page }) => {
    const consoleMessages1 = [];
    const pageErrors2 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const lcs2 = new LCSPage(page);
    await lcs.goto();

    const s1 = 'ABCBDAB';
    const s2 = 'BDCABA';
    // Known LCS length for these inputs is 4 (one LCS is "BCBA" or similar)
    await lcs.fillStrings(s1, s2);
    await lcs.clickCalculate();

    // The result area should show "Length of LCS: 4" and show an LCS string
    const resText = await lcs.getResultText();
    expect(resText).toMatch(/Length of LCS:\s*4/);

    // LCS label should show the LCS string (non-empty)
    expect(resText).toMatch(/LCS:\s*\S+/);

    // There should be highlight spans in both displayed strings; count should be equal to LCS length in each string display
    const highlightedCount = await lcs.countLCSCharSpans();
    // highlightedCount should be at least 1 and likely equal to 4; accept >=4 to be robust with potential duplicate highlighting
    expect(highlightedCount).toBeGreaterThanOrEqual(4);

    // DP table should be rendered and contain highlighted cells (path)
    const hasTable = await lcs.hasDPTable();
    expect(hasTable).toBeTruthy();
    const highlightedCells = await lcs.countHighlightedCells();
    // Highlighted path should exist when LCS length > 0
    expect(highlightedCells).toBeGreaterThan(0);

    // Sanity checks on table structure: header should include characters of s2
    const tableHeaderText = await page.locator('#result table thead tr').textContent();
    for (const ch of s2) {
      expect(tableHeaderText).toContain(ch);
    }

    // Ensure no fatal JS errors occurred while computing and rendering
    const fatalErrors2 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length, `Console messages: ${JSON.stringify(consoleMessages)}`).toBe(0);
  });

  // Test edge case: identical strings -> LCS equals the string and all characters should be highlighted
  test('Identical strings produce LCS equal to input and highlight all characters', async ({ page }) => {
    const pageErrors3 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const lcs3 = new LCSPage(page);
    await lcs.goto();

    const s = 'HELLOWORLD';
    await lcs.fillStrings(s, s);
    await lcs.clickCalculate();

    const resText1 = await lcs.getResultText();
    // Length should equal full length
    expect(resText).toMatch(new RegExp(`Length of LCS:\\s*${s.length}`));
    // LCS displayed should be the same string
    expect(resText).toMatch(new RegExp(`LCS:\\s*${s}`));

    // All characters in the displayed strings should be wrapped as .lcs-char (count *per both strings*)
    const highlightCount = await lcs.countLCSCharSpans();
    // Each character in both strings will be highlighted in the displayed HTML; since both strings are shown, expect at least s.length (could be twice)
    expect(highlightCount).toBeGreaterThanOrEqual(s.length);

    // DP table must be present and contain highlights
    expect(await lcs.hasDPTable()).toBeTruthy();
    expect(await lcs.countHighlightedCells()).toBeGreaterThan(0);

    // Ensure no fatal JS errors occurred
    const fatalErrors3 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Test edge case: no common characters -> length 0 and "(none)" displayed, no highlighted lcs-char spans.
  test('No common characters yields LCS length 0 and displays "(none)" with no highlighted characters', async ({ page }) => {
    const pageErrors4 = [];
    page.on('pageerror', err => pageErrors.push(err));

    const lcs4 = new LCSPage(page);
    await lcs.goto();

    const s11 = 'ABC';
    const s21 = 'DEF';
    await lcs.fillStrings(s1, s2);
    await lcs.clickCalculate();

    const resText2 = await lcs.getResultText();
    // Should contain length 0 and explicit "(none)"
    expect(resText).toMatch(/Length of LCS:\s*0/);
    expect(resText).toMatch(/LCS:\s*\(none\)/);

    // There should be no .lcs-char spans because there's no common subsequence
    const highlightCount1 = await lcs.countLCSCharSpans();
    expect(highlightCount).toBe(0);

    // DP table still should be rendered (shows zeros)
    expect(await lcs.hasDPTable()).toBeTruthy();

    // Ensure no fatal JS errors occurred
    const fatalErrors4 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(fatalErrors.length).toBe(0);
  });

  // Final test: ensure console and page errors do not include fatal JS exceptions during typical usage flows
  test('No ReferenceError/SyntaxError/TypeError should be emitted during typical usage flows', async ({ page }) => {
    const consoleMessages2 = [];
    const pageErrors5 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const lcs5 = new LCSPage(page);
    await lcs.goto();

    // Execute a sequence of interactions
    await lcs.fillStrings('XMJYAUZ', 'MZJAWXU');
    await lcs.clickCalculate();
    await lcs.fillStrings('ABC', 'ABC');
    await lcs.clickCalculate();
    await lcs.fillStrings('', '');
    await lcs.clickCalculate();

    // Gather fatal errors if any
    const fatalErrors5 = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));

    // Assert none of these fatal error types occurred; if they did, include console for debugging
    expect(fatalErrors.length, `Found fatal page errors: ${fatalErrors.map(e => e.stack).join('\n')} | console: ${JSON.stringify(consoleMessages)}`).toBe(0);
  });
});
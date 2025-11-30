import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a476c-cd32-11f0-a949-f901cf5609c9.html';

// Simple page object to encapsulate common selectors and actions for the Huffman demo page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputText');
    this.encodeBtn = page.locator('#encodeBtn');
    this.result = page.locator('#result');
    this.freqTable = page.locator('#freqTable');
    this.codeTable = page.locator('#codeTable');
    this.encodedOutput = page.locator('#encodedOutput');
    this.decodedOutput = page.locator('#decodedOutput');
    this.treeContainer = page.locator('#treeContainer');
    this.explanation = page.locator('#explanation');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterText(text) {
    await this.input.fill(text);
  }

  async clickEncode() {
    await this.encodeBtn.click();
  }
}

test.describe('Huffman Coding Demonstration - End-to-End', () => {
  // Arrays to capture console errors and page errors so tests can assert on them.
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test we assert there were no unexpected console or page errors.
    // This verifies the page executed without runtime exceptions.
    expect(consoleErrors, `console.error messages observed: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `page errors observed: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test('Initial page load: UI elements are present and result panel is hidden', async ({ page }) => {
    // Purpose: Verify initial state of the page and that the result area starts hidden.
    const app = new HuffmanPage(page);
    await app.goto();

    // Basic presence checks
    await expect(app.input).toBeVisible();
    await expect(app.encodeBtn).toBeVisible();

    // Result container should be hidden initially (style display:none)
    await expect(app.result).toHaveCSS('display', 'none');
  });

  test('Empty input triggers an alert and does not show result', async ({ page }) => {
    // Purpose: Ensure empty submissions produce the expected alert and no result is shown.
    const app1 = new HuffmanPage(page);
    await app.goto();

    // Intercept the dialog and verify message
    const dialogPromise = page.waitForEvent('dialog');
    await app.clickEncode(); // click without entering text
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Please enter some text to encode.');
    await dialog.dismiss();

    // Result should remain hidden
    await expect(app.result).toHaveCSS('display', 'none');
  });

  test('Encode and decode a sample string "hello huffman" and validate DOM updates', async ({ page }) => {
    // Purpose: Full flow test - enter text, encode, verify frequency table, codes table, encoded/decoded outputs, and tree visualization.
    const app2 = new HuffmanPage(page);
    await app.goto();

    const inputText = 'hello huffman';
    await app.enterText(inputText);

    // Click the encode button and wait for the result area to appear
    await app.clickEncode();
    await expect(app.result).toHaveCSS('display', 'block');

    // Validate decoded output equals the original input
    await expect(app.decodedOutput).toHaveText(inputText);

    // Validate encoded output contains only 0,1 and spaces (grouped in bytes)
    const encodedText = (await app.encodedOutput.textContent()) || '';
    expect(encodedText).toMatch(/^[01 ]+$/);

    // Validate frequency table rows correspond to unique characters in the input
    const uniqueChars = Array.from(new Set(inputText.split('')));
    // freqTable has a header row plus one row per unique character
    const freqRows = await app.freqTable.locator('tr').count();
    expect(freqRows).toBeGreaterThan(1); // at least header + one data row
    // Verify code table has header + same number of character rows
    const codeRows = await app.codeTable.locator('tr').count();
    expect(codeRows).toBe(freqRows);

    // Verify each character from the input appears in either freq or code table (display uses "(space)" for spaces)
    const freqText = await app.freqTable.textContent();
    for (const ch of uniqueChars) {
      const disp = ch === ' ' ? '(space)' : ch === '\n' ? '\\n' : ch === '\t' ? '\\t' : ch;
      expect(freqText).toContain(disp);
    }

    // Tree visualization should contain at least one node element
    const nodeCount = await app.treeContainer.locator('.tree-node').count();
    expect(nodeCount).toBeGreaterThan(0);

    // Codes table should include a monospace code cell for each character row (third column)
    const codeCells = app.codeTable.locator('tr >> td:nth-child(3)');
    const codesCount = await codeCells.count();
    // There will be codesCount === uniqueChars.length
    expect(codesCount).toBeGreaterThan(0);

    // Validate explanation text is present
    await expect(app.explanation).toContainText('How Huffman Coding Works');
  });

  test('Single-character input edge case assigns code "0" and decodes correctly', async ({ page }) => {
    // Purpose: Validate behavior when input contains only a single repeated character.
    const app3 = new HuffmanPage(page);
    await app.goto();

    const singleCharInput = 'aaaaaa';
    await app.enterText(singleCharInput);
    await app.clickEncode();

    // Result should be visible and decoded output equal input
    await expect(app.result).toHaveCSS('display', 'block');
    await expect(app.decodedOutput).toHaveText(singleCharInput);

    // Code table should contain exactly one character row (plus header)
    const rows = app.codeTable.locator('tr');
    const rowCount = await rows.count(); // header + 1
    expect(rowCount).toBe(2);

    // The code for the single character should be "0" (as implemented for lone node)
    const codeCellText = await app.codeTable.locator('tr >> nth=1 >> td:nth-child(3)').textContent();
    expect(codeCellText.trim()).toBe('0');

    // Encoded output should be a string of zeros grouped by 8 with spaces possible
    const encoded = (await app.encodedOutput.textContent()) || '';
    // Remove spaces and verify it's all zeros and length equals number of characters
    const encodedNoSpaces = encoded.replace(/\s+/g, '');
    expect(encodedNoSpaces).toMatch(/^0+$/);
    expect(encodedNoSpaces.length).toBe(singleCharInput.length);
  });

  test('Space character is displayed as "(space)" in frequency and code tables', async ({ page }) => {
    // Purpose: Ensure whitespace characters are displayed in a human-readable form in tables.
    const app4 = new HuffmanPage(page);
    await app.goto();

    const testInput = 'a a b'; // includes spaces
    await app.enterText(testInput);
    await app.clickEncode();

    // Frequency table text should include "(space)"
    const freqText1 = await app.freqTable.textContent();
    expect(freqText).toContain('(space)');

    // Code table text should also include "(space)"
    const codeText = await app.codeTable.textContent();
    expect(codeText).toContain('(space)');

    // Decoded output should reproduce the original input including spaces
    await expect(app.decodedOutput).toHaveText(testInput);
  });
});
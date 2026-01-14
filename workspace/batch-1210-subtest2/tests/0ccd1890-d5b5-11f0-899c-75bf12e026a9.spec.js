import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccd1890-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for the Huffman Coding Demonstration page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#inputText';
    this.encodeBtn = '#encodeBtn';
    this.results = '#results';
    this.freqTableBody = '#freqTable tbody';
    this.codesTableBody = '#codesTable tbody';
    this.treeDisplay = '#treeDisplay';
    this.compressedOutput = '#compressedOutput';
    this.origSize = '#origSize';
    this.encodedSize = '#encodedSize';
    this.compressionRatio = '#compressionRatio';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(text) {
    await this.page.fill(this.inputSelector, text);
  }

  async clickEncode() {
    await this.page.click(this.encodeBtn);
  }

  async isResultsVisible() {
    return await this.page.$eval(this.results, el => getComputedStyle(el).display !== 'none');
  }

  async getFreqRows() {
    return await this.page.$$eval(`${this.freqTableBody} tr`, rows =>
      rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim()))
    );
  }

  async getCodeRows() {
    return await this.page.$$eval(`${this.codesTableBody} tr`, rows =>
      rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim()))
    );
  }

  async getTreeText() {
    return await this.page.$eval(this.treeDisplay, el => el.innerText);
  }

  async getCompressedText() {
    return await this.page.$eval(this.compressedOutput, el => el.textContent.trim());
  }

  async getSizes() {
    const orig = await this.page.$eval(this.origSize, el => el.textContent.trim());
    const enc = await this.page.$eval(this.encodedSize, el => el.textContent.trim());
    const ratio = await this.page.$eval(this.compressionRatio, el => el.textContent.trim());
    return { orig, enc, ratio };
  }

  async clearInput() {
    await this.page.fill(this.inputSelector, '');
  }
}

test.describe('Huffman Coding Demonstration - FSM states & transitions', () => {
  // Collect console errors and pageerrors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  // Test initial state: Idle (S0_Idle)
  test('Initial state: Idle - page renders with Encode button and results hidden', async ({ page }) => {
    const app = new HuffmanPage(page);

    // Load the page exactly as served
    await app.goto();

    // Verify Encode button exists and is visible
    const encodeBtn = await page.$('#encodeBtn');
    expect(encodeBtn).not.toBeNull();
    expect(await encodeBtn.isVisible()).toBeTruthy();

    // Verify results div exists and is initially hidden (Idle state's evidence)
    const resultsHandle = await page.$('#results');
    expect(resultsHandle).not.toBeNull();
    const display = await page.$eval('#results', el => getComputedStyle(el).display);
    expect(display).toBe('none');

    // Assert that no runtime console errors or uncaught page errors occurred during initial render
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test transition: EncodeButtonClick from Idle -> ResultsVisible (S0_Idle -> S1_ResultsVisible)
  test('Transition: Encode with sample text populates frequency, tree, codes and shows results', async ({ page }) => {
    const app = new HuffmanPage(page);

    // Track console/page errors across the user interaction
    await app.goto();

    // Use a representative example from FSM description
    const sample = 'aaabbc';
    await app.setInput(sample);

    // Click Encode and wait for DOM updates
    await Promise.all([
      page.waitForSelector('#results', { state: 'attached' }), // ensure element exists
      page.click('#encodeBtn'),
      page.waitForTimeout(50) // small delay to allow JS to process and render
    ]);

    // Results should be visible (S1_ResultsVisible entry action: displayResults())
    expect(await app.isResultsVisible()).toBe(true);

    // Verify frequency table contains expected character counts
    const freqRows = await app.getFreqRows();
    // Convert to map for easier assertions
    const freqMap = new Map(freqRows.map(([char, freq]) => [char, Number(freq)]));
    expect(freqMap.get('a')).toBe(3);
    expect(freqMap.get('b')).toBe(2);
    expect(freqMap.get('c')).toBe(1);

    // Verify codes table contains an entry for each unique char and codes are binary strings
    const codeRows = await app.getCodeRows();
    const codes = {};
    for (const [char, code] of codeRows) {
      // code must be non-empty and consist of 0/1 characters
      expect(code).toMatch(/^[01]+$/);
      codes[char] = code;
    }
    expect(Object.keys(codes).sort()).toEqual(['a', 'b', 'c'].sort());

    // Verify compressed bitstring exists and its length matches sum of per-character code lengths
    const compressed = await app.getCompressedText();
    // Build expected concatenation using the codes read from table and original text
    let expectedBits = '';
    for (const ch of sample) {
      expectedBits += codes[ch];
    }
    expect(compressed).toBe(expectedBits);

    // Verify size calculations: original bits = sample.length * 8
    const sizes = await app.getSizes();
    expect(Number(sizes.orig)).toBe(sample.length * 8);
    expect(Number(sizes.enc)).toBe(expectedBits.length);
    // compression ratio is computed in page as ((1 - encoded/orig)*100).toFixed(2)
    const expectedRatio = ((1 - expectedBits.length / (sample.length * 8)) * 100).toFixed(2);
    expect(sizes.ratio).toBe(expectedRatio);

    // Verify Huffman tree DOM contains frequency numbers and leaf labels (basic sanity)
    const treeText = await app.getTreeText();
    expect(treeText.length).toBeGreaterThan(0);
    // It should contain the individual leaf characters a, b, c (or [space] if space used)
    expect(treeText).toContain('a');
    expect(treeText).toContain('b');
    expect(treeText).toContain('c');

    // Assert no console errors or uncaught exceptions occurred during this transition
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Edge case: single character input should use "0" as its code per implementation
  test('Edge case: Single-character input assigns code "0" and encodes accordingly', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    const sample = 'xxxx';
    await app.setInput(sample);

    // Click encode and wait for rendering
    await Promise.all([
      page.click('#encodeBtn'),
      page.waitForSelector('#results', { state: 'visible' })
    ]);

    // Codes table should contain the single char with code "0"
    const codes = await app.getCodeRows();
    expect(codes.length).toBe(1);
    const [char, code] = codes[0];
    expect(char).toBe('x');
    expect(code).toBe('0');

    // Compressed output should be '0' repeated sample.length times
    const compressed = await app.getCompressedText();
    expect(compressed).toBe('0'.repeat(sample.length));

    // Sizes should reflect encoded bits equal to sample.length
    const sizes = await app.getSizes();
    expect(Number(sizes.enc)).toBe(sample.length);
    expect(Number(sizes.orig)).toBe(sample.length * 8);

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Edge case: input containing spaces should display [space] label in tables and tree
  test('Edge case: Spaces are displayed as [space] in tables/tree and included in frequency', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    const sample = 'a a b';
    await app.setInput(sample);

    await Promise.all([
      page.click('#encodeBtn'),
      page.waitForSelector('#results', { state: 'visible' })
    ]);

    // Frequency table should include [space] entry
    const freqRows = await app.getFreqRows();
    const freqMap = new Map(freqRows.map(([char, freq]) => [char, Number(freq)]));
    // sample has characters: 'a' x2, ' ' x2, 'b' x1
    expect(freqMap.get('a')).toBe(2);
    expect(freqMap.get('[space]')).toBe(2);
    expect(freqMap.get('b')).toBe(1);

    // Codes table should include [space] as character label
    const codeRows = await app.getCodeRows();
    const labels = codeRows.map(r => r[0]);
    expect(labels).toContain('[space]');

    // Tree display should include "[space]" text (leaf representation)
    const treeText = await app.getTreeText();
    expect(treeText).toContain('[space]');

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Error scenario: clicking Encode with empty input should show an alert and keep results hidden
  test('Error scenario: Empty input triggers alert and results remain hidden', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Ensure input is empty
    await app.clearInput();

    // Capture dialog and assert its message
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.click('#encodeBtn');

    // The page's script should show an alert with this exact message
    expect(dialogMessage).toBe("Please enter some text to encode.");

    // Results div should remain hidden after clicking encode with empty input
    const visible = await app.isResultsVisible();
    expect(visible).toBe(false);

    // No console/page errors (alert is not an error)
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test.afterEach(async ({ page }) => {
    // Final safety: ensure there were no unexpected console errors or uncaught exceptions
    // If any test intentionally expected errors, they'd assert them specifically; here we expect none
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
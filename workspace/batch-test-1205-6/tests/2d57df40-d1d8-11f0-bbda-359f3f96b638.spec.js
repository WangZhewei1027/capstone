import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d57df40-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Huffman app
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#inputText');
    this.button = page.locator('button[onclick="generateHuffmanCodes()"]');
    this.result = page.locator('#result');
    this.resultTable = page.locator('#result table');
    this.resultHeader = page.locator('#result h2');
    this.encodedParagraph = page.locator('#result h3 + p');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setInput(text) {
    await this.textarea.fill(text);
  }

  async clickGenerate() {
    await this.button.click();
  }

  async getResultInnerHTML() {
    return await this.page.evaluate(() => document.getElementById('result').innerHTML);
  }

  async getUniqueInputChars() {
    const text = await this.textarea.inputValue();
    const set = new Set(text.split(''));
    return [...set].filter((c) => c !== ''); // filter out empty if any
  }

  async getTableRowsText() {
    // returns array of { char, code } for each data row
    return await this.page.$$eval('#result table tr', (rows) =>
      rows.slice(1).map(r => {
        const cells = r.querySelectorAll('td');
        return {
          char: cells[0]?.textContent ?? '',
          code: cells[1]?.textContent ?? ''
        };
      })
    );
  }

  async getEncodedText() {
    const p = await this.encodedParagraph.textContent();
    return p === null ? '' : p.trim();
  }
}

test.describe('Huffman Coding Demonstration - Structural and FSM tests', () => {
  // Capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    // navigate to the application page for each test
    const h = new HuffmanPage(page);
    await h.goto();
  });

  test('Initial render: elements present and expected global functions status', async ({ page }) => {
    // This test validates that the initial state (S0_Idle) is rendered:
    // - textarea present
    // - generate button present
    // - result div present and empty
    // - generateHuffmanCodes exists on window
    // - renderPage (mentioned by FSM entry action) is NOT defined in the page, so we assert it's undefined
    const h1 = new HuffmanPage(page);

    // Basic DOM presence
    await expect(h.textarea).toBeVisible();
    await expect(h.button).toBeVisible();
    await expect(h.result).toBeVisible();

    // result should be empty initially
    const initialResult = await h.getResultInnerHTML();
    expect(initialResult.trim()).toBe('', 'Expected #result to be empty on initial render');

    // generateHuffmanCodes should be defined (onclick handler exists in HTML)
    const hasGenerate = await page.evaluate(() => typeof generateHuffmanCodes === 'function');
    expect(hasGenerate).toBe(true);

    // FSM mentioned renderPage on entry; the HTML does not define renderPage.
    // Verify that renderPage is undefined (so onEnter if called would cause a ReferenceError).
    const renderPageType = await page.evaluate(() => (typeof window.renderPage));
    expect(renderPageType).toBe('undefined');

    // Ensure no uncaught page errors happened during load
    expect(pageErrors.length).toBe(0);

    // No console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking generate with empty input shows alert (edge case)', async ({ page }) => {
    // Validate edge case: when the textarea is empty and button is clicked, an alert dialog appears
    const h2 = new HuffmanPage(page);

    // Ensure textarea is empty
    await h.setInput('');
    const dialogPromise = page.waitForEvent('dialog');
    await h.clickGenerate();
    const dialog = await dialogPromise;
    try {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter some text to encode.');
    } finally {
      await dialog.dismiss();
    }

    // Confirm that result did NOT change
    const afterResult = await h.getResultInnerHTML();
    expect(afterResult.trim()).toBe('', 'Expected #result to remain empty after clicking generate on empty input');

    // Check no uncaught page errors triggered by that action
    expect(pageErrors.length).toBe(0);
  });

  test('Generating Huffman codes for multi-character input updates DOM and produces table & encoded text', async ({ page }) => {
    // This test validates the transition from S0_Idle -> S1_CodesGenerated:
    // - entering text and clicking the button updates #result.innerHTML with a table of character-to-code mappings
    // - the table contains one row per unique character (plus header)
    // - the encoded text paragraph is present and contains only 0/1 characters (or empty for degenerate cases)
    const h3 = new HuffmanPage(page);

    const sample = 'aabccc'; // sample with unique chars a,b,c
    await h.setInput(sample);

    // record previous innerHTML to detect change
    const before = await h.getResultInnerHTML();
    await h.clickGenerate();

    // Wait for header to appear indicating codes generated
    await expect(h.resultHeader).toHaveText('Huffman Codes:');

    // result.innerHTML must have changed
    const after = await h.getResultInnerHTML();
    expect(after).not.toBe(before);

    // Extract table rows and ensure header + one row per unique char
    const uniqueChars = Array.from(new Set(sample.split('')));
    const rows = await h.getTableRowsText();
    // rows array only contains data rows (we sliced header in helper)
    expect(rows.length).toBe(uniqueChars.length);

    // Ensure every unique char is present in the table
    const charsInTable = rows.map(r => r.char);
    for (const uc of uniqueChars) {
      expect(charsInTable).toContain(uc);
    }

    // Encoded text should exist and be composed only of 0/1 (non-empty for multi-char inputs)
    const encoded = await h.getEncodedText();
    expect(encoded.length).toBeGreaterThan(0);
    expect(/^[01]+$/.test(encoded)).toBe(true);

    // Ensure no uncaught page errors were thrown during generation
    expect(pageErrors.length).toBe(0);
  });

  test('Single-character input: table should list the character and encoded text may be empty (degenerate Huffman tree)', async ({ page }) => {
    // Validate edge case where the input contains only a single repeated character:
    // The implementation may produce an empty code for that character (prefix ""), so the encoded text may be empty.
    const h4 = new HuffmanPage(page);

    const sample1 = 'aaaaaa';
    await h.setInput(sample);
    await h.clickGenerate();

    // Wait for result header
    await expect(h.resultHeader).toHaveText('Huffman Codes:');

    const rows1 = await h.getTableRowsText();
    expect(rows.length).toBe(1);
    expect(rows[0].char).toBe('a');

    // The code cell may be empty string (implementation specific). Accept empty or binary string.
    expect(typeof rows[0].code).toBe('string');

    const encoded1 = await h.getEncodedText();
    // For single-character case, encoded may be empty string (implementation assigns empty code), assert only 0/1 allowed if non-empty
    expect(/^[01]*$/.test(encoded)).toBe(true);

    // Ensure no uncaught page errors were thrown during generation
    expect(pageErrors.length).toBe(0);
  });

  test('Special characters and whitespace are handled as distinct symbols', async ({ page }) => {
    // Ensure that non-alphanumeric characters and spaces are treated as distinct characters in the table.
    const h5 = new HuffmanPage(page);

    const sample2 = 'a a!!'; // includes space and punctuation
    await h.setInput(sample);
    await h.clickGenerate();

    // Wait for result
    await expect(h.resultHeader).toHaveText('Huffman Codes:');

    const uniqueChars1 = Array.from(new Set(sample.split('')));
    const rows2 = await h.getTableRowsText();
    expect(rows.length).toBe(uniqueChars.length);

    const charsInTable1 = rows.map(r => r.char);
    for (const uc of uniqueChars) {
      expect(charsInTable).toContain(uc);
    }

    // encoded text should be binary only (or empty in degenerate cases)
    const encoded2 = await h.getEncodedText();
    expect(/^[01]*$/.test(encoded)).toBe(true);

    // Ensure no uncaught page errors were thrown during generation
    expect(pageErrors.length).toBe(0);
  });

  test('Console and page error observation: verify clean runtime on normal interactions', async ({ page }) => {
    // This test intentionally observes the page console and errors while performing actions
    // to validate that no unexpected runtime errors (ReferenceError/SyntaxError/TypeError) happen during normal usage.
    const h6 = new HuffmanPage(page);

    // Perform a normal generation
    await h.setInput('testing console');
    await h.clickGenerate();

    // Allow some time for any asynchronous console logs or errors to surface
    await page.waitForTimeout(200);

    // Check console messages collected (log them as assertions rather than failing the test unhelpfully)
    // Ensure there are no console messages of type 'error'
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0, `Expected no console.error messages but found ${consoleErrors.length}: ${JSON.stringify(consoleErrors)}`);

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('FSM onEnter/onExit verification: renderPage not present and generateHuffmanCodes is the active transition handler', async ({ page }) => {
    // The FSM indicated an entry action renderPage(); it's not defined in the HTML.
    // Here we verify that:
    // - renderPage is undefined (so FSM entry action was not present / would cause ReferenceError if invoked)
    // - The actual event handler for the transition is generateHuffmanCodes and is callable
    const renderPageType1 = await page.evaluate(() => (typeof window.renderPage));
    expect(renderPageType).toBe('undefined');

    // generateHuffmanCodes must exist and be callable; do not call it directly here, but verify type
    const generateType = await page.evaluate(() => (typeof generateHuffmanCodes));
    expect(generateType).toBe('function');

    // To validate the transition wiring, perform user-level click and ensure result updates
    const h7 = new HuffmanPage(page);
    await h.setInput('xyz');
    await h.clickGenerate();
    await expect(h.resultHeader).toHaveText('Huffman Codes:');

    // No page errors
    expect(pageErrors.length).toBe(0);
  });
});
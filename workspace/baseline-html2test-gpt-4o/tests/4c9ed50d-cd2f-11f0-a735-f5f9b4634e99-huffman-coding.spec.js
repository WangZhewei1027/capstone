import { test, expect } from '@playwright/test';

// Page Object for the Huffman Coding demo page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#textInput');
    this.encodeButton = page.locator('button', { hasText: 'Encode' });
    this.huffmanTreePre = page.locator('#huffmanTree');
    this.encodedTextPre = page.locator('#encodedText');

    // Collect console and page errors for assertions
    this.consoleErrors = [];
    this.pageErrors = [];

    this._consoleListener = (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    };
    this._pageErrorListener = (error) => {
      this.pageErrors.push(String(error && error.message ? error.message : error));
    };
  }

  async initListeners() {
    this.page.on('console', this._consoleListener);
    this.page.on('pageerror', this._pageErrorListener);
  }

  async removeListeners() {
    this.page.off('console', this._consoleListener);
    this.page.off('pageerror', this._pageErrorListener);
  }

  async goto(url) {
    await this.page.goto(url);
    await this.initListeners();
  }

  async fillInput(text) {
    await this.textarea.fill(text);
  }

  async clickEncode() {
    await this.encodeButton.click();
  }

  async getHuffmanTreeText() {
    return (await this.huffmanTreePre.textContent()) ?? '';
  }

  async getEncodedText() {
    return (await this.encodedTextPre.textContent()) ?? '';
  }
}

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed50d-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Huffman Coding Demonstration - E2E', () => {
  // Ensure the server is reachable and page loads for each test
  test.beforeEach(async ({ page }) => {
    // nothing global here; each test will construct its own HuffmanPage and goto
  });

  test.afterEach(async ({ page }) => {
    // nothing global here
  });

  test('Initial page load - UI elements are present and default state is empty', async ({ page }) => {
    // Purpose: Verify initial rendering of the page and default empty results
    const hPage = new HuffmanPage(page);
    await hPage.goto(APP_URL);

    // Check main title
    await expect(page.locator('h1')).toHaveText('Huffman Coding Demonstration');

    // Textarea exists with placeholder
    await expect(hPage.textarea).toBeVisible();
    await expect(hPage.textarea).toHaveAttribute('placeholder', 'Enter text to encode');

    // Encode button present
    await expect(hPage.encodeButton).toBeVisible();
    await expect(hPage.encodeButton).toHaveText('Encode');

    // Results pre blocks exist and are empty initially
    await expect(hPage.huffmanTreePre).toBeVisible();
    await expect(hPage.encodedTextPre).toBeVisible();
    expect(await hPage.getHuffmanTreeText()).toBe('');
    expect(await hPage.getEncodedText()).toBe('');

    // Assert that no console errors or page errors occurred on load
    // (This captures runtime exceptions if any)
    expect(hPage.consoleErrors, 'No console.error on initial load').toHaveLength(0);
    expect(hPage.pageErrors, 'No page errors on initial load').toHaveLength(0);

    await hPage.removeListeners();
  });

  test('Encoding a sample text produces Huffman codes and encoded text that matches codes', async ({ page }) => {
    // Purpose: Validate that encoding works, that Huffman codes JSON is present,
    // and the encoded text is consistent with the codes produced.
    const hPage = new HuffmanPage(page);
    await hPage.goto(APP_URL);

    const sample = 'aabccc';
    await hPage.fillInput(sample);

    // Click the encode button and wait for results to appear in the DOM
    await hPage.clickEncode();

    // Get Huffman codes JSON and parse it
    const codesText = await hPage.getHuffmanTreeText();
    expect(codesText.length, 'Huffman codes area should get populated').toBeGreaterThan(0);

    let codes;
    try {
      codes = JSON.parse(codesText);
    } catch (e) {
      // If parsing fails, surface the failure explicitly
      throw new Error('Huffman codes area did not contain valid JSON');
    }

    // Check that codes include each character from the input
    for (const ch of Array.from(new Set(sample.split('')))) {
      expect(Object.prototype.hasOwnProperty.call(codes, ch), `Codes should include character "${ch}"`).toBe(true);
      // Codes should be string values (may be empty string for single-character cases)
      expect(typeof codes[ch]).toBe('string');
    }

    // Check encoded text exists and is composed of '0' and '1' (or empty in single-char edge case)
    const encoded = await hPage.getEncodedText();
    expect(encoded, 'Encoded text should be present').toHaveLength(encoded.length); // trivial check to ensure read
    if (encoded.length > 0) {
      expect(/^[01]+$/.test(encoded), 'Encoded text must be only 0s and 1s').toBe(true);
    }

    // Verify that the encoded output equals mapping each input char to the code
    const expectedEncoded = sample.split('').map(ch => codes[ch]).join('');
    expect(encoded, 'Encoded text should match applying codes to the input').toBe(expectedEncoded);

    // No console or page errors should have occurred during encoding
    expect(hPage.consoleErrors, 'No console.error during encoding').toHaveLength(0);
    expect(hPage.pageErrors, 'No page errors during encoding').toHaveLength(0);

    await hPage.removeListeners();
  });

  test('Empty input shows alert and does not update results', async ({ page }) => {
    // Purpose: Verify the application alerts when input is empty and prevents updates
    const hPage = new HuffmanPage(page);
    await hPage.goto(APP_URL);

    // Ensure fields are empty
    await hPage.fillInput('');

    // Intercept the dialog that should appear
    const dialogPromise = page.waitForEvent('dialog');

    // Click encode and handle dialog
    await hPage.clickEncode();
    const dialog = await dialogPromise;
    // The application uses alert("Please enter some text to encode.");
    expect(dialog.message()).toBe('Please enter some text to encode.');
    await dialog.accept();

    // Results should remain unchanged (empty)
    expect(await hPage.getHuffmanTreeText(), 'Huffman tree should remain empty after empty input').toBe('');
    expect(await hPage.getEncodedText(), 'Encoded text should remain empty after empty input').toBe('');

    // No runtime errors should be triggered by this invalid use-case
    expect(hPage.consoleErrors, 'No console.error after empty-input alert').toHaveLength(0);
    expect(hPage.pageErrors, 'No page errors after empty-input alert').toHaveLength(0);

    await hPage.removeListeners();
  });

  test('Single-character input produces a code mapping to empty string and encoded text is empty', async ({ page }) => {
    // Purpose: Edge-case: when the input contains only a single unique character,
    // Huffman implementation yields an empty code string for that character.
    const hPage = new HuffmanPage(page);
    await hPage.goto(APP_URL);

    const sample = 'aaaa';
    await hPage.fillInput(sample);
    await hPage.clickEncode();

    const codesText = await hPage.getHuffmanTreeText();
    expect(codesText.length, 'Huffman codes area should be populated').toBeGreaterThan(0);

    let codes = {};
    try {
      codes = JSON.parse(codesText);
    } catch (e) {
      throw new Error('Huffman codes area did not contain valid JSON for single-character input');
    }

    // There should be exactly one key equal to 'a' and its code should be a string (likely empty)
    expect(Object.keys(codes).length, 'Only one character code mapping expected').toBe(1);
    expect(Object.prototype.hasOwnProperty.call(codes, 'a'), 'Mapping should include "a"').toBe(true);
    expect(typeof codes['a'], 'Code for single char should be a string').toBe('string');

    // Encoded text should be the concatenation of codes for each character; since code may be '', encoded becomes ''
    const encoded = await hPage.getEncodedText();
    const expected = sample.split('').map(ch => codes[ch]).join('');
    expect(encoded, 'Encoded text should equal mapping of each char using the codes').toBe(expected);

    // If expected is empty string, ensure that this edge-case is acceptable and documented by the assertion
    if (expected === '') {
      expect(encoded.length, 'Encoded text length for single-character input should be 0').toBe(0);
    }

    // No console or page errors occurred
    expect(hPage.consoleErrors, 'No console.error during single-character encoding').toHaveLength(0);
    expect(hPage.pageErrors, 'No page errors during single-character encoding').toHaveLength(0);

    await hPage.removeListeners();
  });

  test('Multiple successive encodings update results accordingly and are consistent', async ({ page }) => {
    // Purpose: Ensure repeated usage updates the DOM with new results each time
    const hPage = new HuffmanPage(page);
    await hPage.goto(APP_URL);

    // First input
    const first = 'abc';
    await hPage.fillInput(first);
    await hPage.clickEncode();
    const codesFirst = JSON.parse(await hPage.getHuffmanTreeText());
    const encodedFirst = await hPage.getEncodedText();
    expect(encodedFirst).toBe(first.split('').map(ch => codesFirst[ch]).join(''));

    // Second input (different frequencies)
    const second = 'aabbc';
    await hPage.fillInput(second);
    await hPage.clickEncode();
    const codesSecond = JSON.parse(await hPage.getHuffmanTreeText());
    const encodedSecond = await hPage.getEncodedText();
    expect(encodedSecond).toBe(second.split('').map(ch => codesSecond[ch]).join(''));

    // Ensure that codes changed between runs when frequencies changed (likely true)
    // This is a soft assertion: if they are equal it's not necessarily a bug, but typically they differ.
    // We'll assert that the mapping objects are valid and include respective characters.
    for (const ch of ['a', 'b', 'c']) {
      expect(Object.prototype.hasOwnProperty.call(codesSecond, ch)).toBe(true);
    }

    // No runtime errors across successive runs
    expect(hPage.consoleErrors, 'No console.error across successive encodings').toHaveLength(0);
    expect(hPage.pageErrors, 'No page errors across successive encodings').toHaveLength(0);

    await hPage.removeListeners();
  });
});
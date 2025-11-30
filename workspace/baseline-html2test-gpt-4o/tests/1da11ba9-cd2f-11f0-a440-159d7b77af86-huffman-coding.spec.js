import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba9-cd2f-11f0-a440-159d7b77af86.html';

// Page Object for the Huffman Coding page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputString');
    this.button = page.locator('button', { hasText: 'Encode' });
    this.output = page.locator('#output');
    this.codes = page.locator('#codes');
  }

  // Fill the input and click the encode button
  async encode(text) {
    await this.input.fill(text);
    await Promise.all([
      this.page.waitForLoadState('networkidle'), // ensure any potential async tasks settle
      this.button.click()
    ]);
  }

  // Read the encoded output text
  async getEncodedOutput() {
    return (await this.output.textContent()) ?? '';
  }

  // Read the codes text (as displayed in the #codes pre element)
  async getCodesText() {
    return (await this.codes.textContent()) ?? '';
  }

  // Parse the codes display "{ 'a': 0, 'b': 10 }" into an object { a: '0', b: '10' }
  async parseCodes() {
    const text = await this.getCodesText();
    // Remove surrounding braces, then split entries by comma not inside quotes
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return {};

    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return {};

    const entries = inner.split(',').map(s => s.trim()).filter(Boolean);
    const codes = {};
    for (const entry of entries) {
      // Each entry is like:  "'a': 0" or "' ': 101"
      const parts = entry.split(':');
      if (parts.length < 2) continue;
      const rawKey = parts[0].trim();
      const rawValue = parts.slice(1).join(':').trim();
      // remove surrounding quotes from key
      const matchKey = rawKey.match(/^'(.*)'$/);
      const key = matchKey ? matchKey[1] : rawKey.replace(/^"(.+)"$/, '$1');
      // value is the code string, but might be empty ''
      const value = rawValue === '' ? '' : rawValue;
      codes[key] = value;
    }
    return codes;
  }

  // Decode an encoded string using codes mapping (codes: {char: code})
  // Returns decoded string. Handles single-character code that may be ''.
  decode(encoded, codes) {
    // Build reverse map code -> char
    const reverse = {};
    for (const [ch, code] of Object.entries(codes)) {
      reverse[code] = ch;
    }

    // Special-case: if there is a code that is empty string, then the encoded string will be ''
    if (encoded === '') {
      // If there's an empty code, we can't determine repetition count from encoded string alone.
      // For our tests we'll only use this when input is a known single-character input,
      // and we'll perform separate assertions. Here return empty string to indicate encoded had no bits.
      if ('' in reverse) {
        return ''; // signal empty encoded; caller should handle count comparison separately
      }
      return '';
    }

    let result = '';
    let buffer = '';
    for (const bit of encoded) {
      buffer += bit;
      if (buffer in reverse) {
        result += reverse[buffer];
        buffer = '';
      }
    }
    return result;
  }
}

test.describe('Huffman Coding Application', () => {
  // Ensure each test gets a fresh page and listeners
  test.beforeEach(async ({ page }) => {
    // No-op here, each test will navigate and set up its own listeners
  });

  // Test that the page loads and default elements are present and empty
  test('Initial page load shows input, button, and empty outputs', async ({ page }) => {
    // Collect console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    // Basic DOM element checks
    const huffman = new HuffmanPage(page);
    await expect(huffman.input).toBeVisible();
    await expect(huffman.button).toBeVisible();
    await expect(huffman.output).toBeVisible();
    await expect(huffman.codes).toBeVisible();

    // Default contents should be empty
    expect((await huffman.getEncodedOutput()).trim()).toBe('');
    expect((await huffman.getCodesText()).trim()).toBe('');
    
    // Assert there are no uncaught page errors and no console errors on initial load
    const errorConsoleCount = consoleMessages.filter(m => m.type === 'error').length;
    expect(pageErrors.length, `Expected no page errors on load, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(errorConsoleCount, `Expected no console.error messages on load, found ${errorConsoleCount}`).toBe(0);
  });

  test.describe('Encoding interactions and edge cases', () => {
    test('Encoding a typical string updates output and displays codes; decoded output matches input', async ({ page }) => {
      // Capture console and page errors for this interaction
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', err => pageErrors.push(err));

      await page.goto(APP_URL);
      const app = new HuffmanPage(page);

      const inputString = 'aabbc';
      // Perform encoding
      await app.encode(inputString);

      // Read results
      const encoded = await app.getEncodedOutput();
      const codes = await app.parseCodes();

      // Basic assertions: codes should include each character in input
      for (const ch of Array.from(new Set(inputString.split('')))) {
        expect(Object.prototype.hasOwnProperty.call(codes, ch)).toBeTruthy();
      }

      // Encoded string should be non-empty for multi-character input
      expect(encoded.length).toBeGreaterThan(0);

      // Decoding the encoded string using displayed codes should reproduce the original input
      const decoded = app.decode(encoded, codes);
      expect(decoded).toBe(inputString);

      // Ensure there were no page errors or console errors during encoding
      const errorConsoleCount = consoleMessages.filter(m => m.type === 'error').length;
      expect(pageErrors.length, `Expected no page errors during encoding, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
      expect(errorConsoleCount, `Expected no console.error messages during encoding, found ${errorConsoleCount}`).toBe(0);
    });

    test('Encoding a single repeated character results in empty encoded string and code is empty', async ({ page }) => {
      // Collect console and page errors
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', err => pageErrors.push(err));

      await page.goto(APP_URL);
      const app = new HuffmanPage(page);

      const inputString = 'aaaaaa';
      await app.encode(inputString);

      const encoded = await app.getEncodedOutput();
      const codes = await app.parseCodes();

      // For a single unique character, the algorithm assigns an empty path '' as code
      // Verify that the encoded string is indeed empty and the code exists and is ''
      expect(encoded).toBe(''); // encoded representation should be empty string for single symbol
      const uniqueChar = 'a';
      expect(Object.prototype.hasOwnProperty.call(codes, uniqueChar)).toBeTruthy();
      expect(codes[uniqueChar]).toBe('');

      // To verify roundtrip in this special case, since encoded is empty we can't infer count from bits.
      // Assert that the UI produced empty encoded string and that codes map includes empty code for the char.
      // No page errors should have occurred
      const errorConsoleCount = consoleMessages.filter(m => m.type === 'error').length;
      expect(pageErrors.length, `Expected no page errors for single-char encoding, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
      expect(errorConsoleCount, `Expected no console.error messages for single-char encoding, found ${errorConsoleCount}`).toBe(0);
    });

    test('Submitting empty input triggers an alert dialog with appropriate message', async ({ page }) => {
      // Capture console/page errors as well
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', err => pageErrors.push(err));

      await page.goto(APP_URL);
      const app = new HuffmanPage(page);

      // Listen for the dialog and assert its message
      let seenDialog = null;
      page.once('dialog', dialog => {
        seenDialog = dialog;
        // Accept the alert to allow the page to continue
        dialog.accept();
      });

      // Ensure input is empty and click Encode
      await app.input.fill('');
      await app.button.click();

      // Wait a small moment to allow dialog handling
      await page.waitForTimeout(100);

      expect(seenDialog, 'Expected an alert dialog to be shown for empty input').not.toBeNull();
      if (seenDialog) {
        expect(seenDialog.type()).toBe('alert');
        expect(seenDialog.message()).toBe('Please enter some text');
      }

      // No page errors should have occurred because of the dialog
      const errorConsoleCount = consoleMessages.filter(m => m.type === 'error').length;
      expect(pageErrors.length, `Expected no page errors after empty-submit, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
      expect(errorConsoleCount, `Expected no console.error messages after empty-submit, found ${errorConsoleCount}`).toBe(0);
    });

    test('Codes output contains entries for all distinct characters including spaces and special characters', async ({ page }) => {
      // Collect console and page errors
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', err => pageErrors.push(err));

      await page.goto(APP_URL);
      const app = new HuffmanPage(page);

      const inputString = 'a b!a b!';
      await app.encode(inputString);

      const codes = await app.parseCodes();

      // Ensure codes exist for space and exclamation and letters
      expect(Object.prototype.hasOwnProperty.call(codes, ' ')).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(codes, '!')).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(codes, 'a')).toBeTruthy();
      expect(Object.prototype.hasOwnProperty.call(codes, 'b')).toBeTruthy();

      // Ensure codes are strings (may be empty for degenerate single-char, but here expect non-empty)
      for (const ch of [' ', '!', 'a', 'b']) {
        expect(typeof codes[ch]).toBe('string');
      }

      // No page errors or console errors
      const errorConsoleCount = consoleMessages.filter(m => m.type === 'error').length;
      expect(pageErrors.length, `Expected no page errors for special-char test, found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
      expect(errorConsoleCount, `Expected no console.error messages for special-char test, found ${errorConsoleCount}`).toBe(0);
    });
  });

  test.describe('Robustness: console and runtime error observation', () => {
    test('Observes console messages and page errors during normal usage', async ({ page }) => {
      // This test focuses on observing console and page errors while exercising the app
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
      page.on('pageerror', err => pageErrors.push(err));

      await page.goto(APP_URL);
      const app = new HuffmanPage(page);

      // Perform several encodings with different inputs
      const samples = ['hello world', 'aaabbbccc', '123123', ''];
      // Handle dialog for empty case
      page.on('dialog', d => d.accept());

      for (const s of samples) {
        await app.input.fill(s);
        await app.button.click();
        // small pause to allow any potential runtime errors to surface
        await page.waitForTimeout(50);
      }

      // Now assert that there are no uncaught page errors and no console.error messages
      const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
      expect(pageErrors.length, `No uncaught page errors expected during multiple encodings; got ${pageErrors.length}`).toBe(0);
      expect(errorConsoleEntries.length, `No console.error messages expected; got ${errorConsoleEntries.length}`).toBe(0);

      // For debugging purposes, attach an informative message if anything appeared (kept in expectation messages above).
    });
  });
});
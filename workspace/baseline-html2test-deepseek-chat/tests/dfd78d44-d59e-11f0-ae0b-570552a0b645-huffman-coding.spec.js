import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d44-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Huffman Coding app
class HuffmanPage {
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#inputText');
    this.encodeBtn = page.locator('#encodeBtn');
    this.frequencyRows = page.locator('#frequencyTable tbody tr');
    this.huffmanCodesContainer = page.locator('#huffmanCodes');
    this.encodedOutput = page.locator('#encodedOutput');
    this.decodedOutput = page.locator('#decodedOutput');
    this.originalSize = page.locator('#originalSize');
    this.encodedSize = page.locator('#encodedSize');
    this.compressionRatio = page.locator('#compressionRatio');
    this.treeContainer = page.locator('#treeContainer');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  // Click encode and wait for encodedOutput to be updated
  async clickEncodeAndWaitForUpdate() {
    // Record previous encoded text to detect change (UI updates encodedOutput synchronously for valid input)
    const previous = await this.encodedOutput.textContent();
    await Promise.all([
      this.page.waitForFunction(
        ({ selector, prev }) => document.querySelector(selector).textContent !== prev,
        { selector: '#encodedOutput', prev: previous },
      ).catch(() => {}), // ignore timeout if no change expected (e.g., single-char encoding yields empty string)
      this.encodeBtn.click(),
    ]);
  }

  // Read frequency table into an object { char: freq }
  async getFrequencyMap() {
    return await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#frequencyTable tbody tr'));
      const map = {};
      for (const r of rows) {
        const cells = r.querySelectorAll('td');
        if (cells.length >= 2) {
          let charText = cells[0].textContent || '';
          const freq = parseInt((cells[1].textContent || '0').trim(), 10) || 0;
          // Normalize 'Space' back to actual space for tests' convenience
          if (charText === 'Space') charText = ' ';
          map[charText] = freq;
        }
      }
      return map;
    });
  }

  // Read codes mapping from UI into { char: code }
  async getCodesMap() {
    return await this.page.evaluate(() => {
      const container = document.getElementById('huffmanCodes');
      const maps = {};
      if (!container) return maps;
      const children = Array.from(container.children);
      for (const child of children) {
        // Expected structure: <div><strong>char:</strong> <span class="huffman-code">code</span></div>
        const strong = child.querySelector('strong');
        const span = child.querySelector('.huffman-code');
        if (strong && span) {
          let charText = strong.textContent || '';
          // strong may contain "X:" ; remove trailing colon
          charText = charText.replace(/:$/, '').trim();
          if (charText === 'Space') charText = ' ';
          maps[charText] = span.textContent || '';
        }
      }
      return maps;
    });
  }

  async getEncodedText() {
    return (await this.encodedOutput.textContent()) || '';
  }

  async getDecodedText() {
    return (await this.decodedOutput.textContent()) || '';
  }

  async getStats() {
    const original = (await this.originalSize.textContent()) || '';
    const encoded = (await this.encodedSize.textContent()) || '';
    const ratio = (await this.compressionRatio.textContent()) || '';
    return { original, encoded, ratio };
  }

  async setInputText(text) {
    await this.textarea.fill(text);
  }

  async getTextareaValue() {
    return await this.textarea.inputValue();
  }

  async treeContainsText(substring) {
    const html = await this.treeContainer.innerHTML();
    return html.includes(substring);
  }
}

// Tests
test.describe('Huffman Coding Application (dfd78d44-d59e-11f0-ae0b-570552a0b645)', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to uncaught page errors
    page.on('pageerror', (err) => {
      // Capture stack & message
      pageErrors.push(err);
    });
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and display default example text with valid results', async ({ page }) => {
      const app = new HuffmanPage(page);
      // Navigate and wait for DOMContentLoaded (the app also triggers updateUI on DOMContentLoaded)
      await app.goto();

      // Verify textarea prefilled with the example text
      const initialText = await app.getTextareaValue();
      expect(initialText).toBeTruthy();
      expect(initialText).toContain('Huffman coding');

      // Frequency table should be populated after initial UI update
      const freq = await app.getFrequencyMap();
      const totalEntries = Object.keys(freq).length;
      expect(totalEntries).toBeGreaterThan(0);

      // Huffman codes should be displayed for characters
      const codes = await app.getCodesMap();
      expect(Object.keys(codes).length).toBeGreaterThan(0);

      // Encoded output should be non-empty for multi-character input
      const encoded = await app.getEncodedText();
      expect(encoded.length).toBeGreaterThan(0);

      // Decoded output should match the original input (round-trip)
      const decoded = await app.getDecodedText();
      // Note: For the default example this should be a proper round-trip
      expect(decoded).toBe(initialText);

      // Stats should be updated and contain "bits" or "%" text
      const stats = await app.getStats();
      expect(stats.original).toMatch(/bits$/);
      expect(stats.encoded).toMatch(/bits$/);
      expect(stats.ratio).toMatch(/%$/);

      // Tree visualization should contain at least one node representation
      const treeHasNode = await app.treeContainsText(':');
      expect(treeHasNode).toBeTruthy();
    });
  });

  test.describe('Encoding flow and DOM updates', () => {
    test('should encode user-provided text, update table, codes, encoded/decoded outputs and stats', async ({ page }) => {
      const app = new HuffmanPage(page);
      await app.goto();

      // New input to test deterministic behavior
      const input = 'aaab';
      await app.setInputText(input);

      // Click encode and wait for UI update
      await app.clickEncodeAndWaitForUpdate();

      // Verify frequency map contains correct counts
      const freq = await app.getFrequencyMap();
      expect(freq['a']).toBe(3);
      expect(freq['b']).toBe(1);

      // Verify codes exist for both characters
      const codes = await app.getCodesMap();
      expect(Object.keys(codes)).toEqual(expect.arrayContaining(['a', 'b']));
      expect(codes['a'].length).toBeGreaterThanOrEqual(1);
      expect(codes['b'].length).toBeGreaterThanOrEqual(1);

      // Encoded text should be concatenation of codes
      const encoded = await app.getEncodedText();
      // Confirm encoded length equals sum of code lengths per character
      const expectedLength = input.split('').reduce((sum, ch) => sum + (codes[ch] ? codes[ch].length : 0), 0);
      expect(encoded.length).toBe(expectedLength);

      // Decoded text must equal the original input (round-trip)
      const decoded = await app.getDecodedText();
      expect(decoded).toBe(input);

      // Stats reflect sizes: original bits = input.length * 8
      const stats = await app.getStats();
      expect(stats.original).toBe(`${input.length * 8} bits`);
      expect(stats.encoded).toBe(`${encoded.length} bits`);
      // Compression ratio should be a percentage string
      expect(stats.ratio).toMatch(/-?\d+\.\d{2}%/);
    });

    test('should show "Space" label in frequency table and codes for spaces', async ({ page }) => {
      const app = new HuffmanPage(page);
      await app.goto();

      const input = 'A B A';
      await app.setInputText(input);
      await app.clickEncodeAndWaitForUpdate();

      // Frequency map keys include a space character mapped from 'Space' label
      const freq = await app.getFrequencyMap();
      expect(freq[' ']).toBeGreaterThan(0);

      // Codes map should contain mapping for space character
      const codes = await app.getCodesMap();
      expect(Object.keys(codes)).toContain(' ');
    });
  });

  test.describe('Edge cases and error handling', () => {
    test('should alert the user when trying to encode an empty string', async ({ page }) => {
      const app = new HuffmanPage(page);
      await app.goto();

      // Prepare dialog handler to capture alert message
      let alertMessage = null;
      page.once('dialog', async (dialog) => {
        alertMessage = dialog.message();
        await dialog.dismiss();
      });

      // Set empty and click encode
      await app.setInputText('');
      await app.encodeBtn.click();

      // Ensure alert was shown with expected message
      expect(alertMessage).toBe('Please enter some text to encode.');
    });

    test('single-character input produces an encoded output of length zero and decoded output empty (observed behavior)', async ({ page }) => {
      // This test documents the app behavior for a single unique character input.
      // According to the implementation, the single character may receive an empty code,
      // resulting in encoded output being an empty string and decoded output also empty.
      const app = new HuffmanPage(page);
      await app.goto();

      const input = 'kkkk';
      await app.setInputText(input);
      // Click encode and wait (encodedOutput will likely remain empty)
      await app.clickEncodeAndWaitForUpdate();

      const codes = await app.getCodesMap();
      // There should be a mapping for the single character (possibly empty string)
      expect(Object.keys(codes).length).toBe(1);
      expect(codes['k']).toBeDefined();

      const encoded = await app.getEncodedText();
      // Implementation may produce an empty encoded string for single-character alphabet
      expect(encoded).toBe('');

      const decoded = await app.getDecodedText();
      // As a consequence, decoded output is empty (this documents the current behavior)
      expect(decoded).toBe('');
      
      // Stats should still show original bits > 0 and encoded bits 0
      const stats = await app.getStats();
      expect(stats.original).toBe(`${input.length * 8} bits`);
      expect(stats.encoded).toBe(`0 bits`);
    });
  });

  test.describe('Console and runtime error monitoring', () => {
    test('should not emit uncaught page errors (no ReferenceError/SyntaxError/TypeError)', async ({ page }) => {
      // Navigate and perform a few interactions to ensure console/pageerror capture
      const app = new HuffmanPage(page);
      await app.goto();

      // Perform a few interactions
      await app.setInputText('test console capture');
      await app.clickEncodeAndWaitForUpdate();

      // Click encode with empty to trigger alert (dialog doesn't create pageerror)
      page.once('dialog', async (dialog) => dialog.dismiss());
      await app.setInputText('');
      await app.encodeBtn.click();

      // Assert we captured console messages but none of them are error severity related to runtime exceptions
      // Collect any console messages of type 'error'
      const errorConsole = consoleMessages.filter(m => m.type === 'error');
      if (errorConsole.length > 0) {
        // If there are error console messages, fail and print them
        // This assertion will surface unexpected console errors
        expect(errorConsole).toEqual([]);
      }

      // Assert no uncaught page errors were thrown during interactions
      expect(pageErrors.length).toBe(0);
    });
  });
});
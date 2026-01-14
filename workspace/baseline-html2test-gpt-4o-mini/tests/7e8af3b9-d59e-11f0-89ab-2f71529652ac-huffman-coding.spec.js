import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b9-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Huffman Coding demo page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#inputText';
    this.buttonSelector = 'button';
    this.outputSelector = '#output';
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input textarea
  async fillInput(text) {
    await this.page.fill(this.inputSelector, text);
  }

  // Click the Generate Huffman Code button
  async clickGenerate() {
    await this.page.click(this.buttonSelector);
  }

  // Get the raw output element innerHTML
  async getOutputHTML() {
    return await this.page.$eval(this.outputSelector, el => el.innerHTML);
  }

  // Get the output innerText (text content)
  async getOutputText() {
    return await this.page.$eval(this.outputSelector, el => el.innerText);
  }

  // Get the parsed codes object from the first <pre> inside output (if present)
  async getCodesObject() {
    // There may be zero or more <pre> elements. The first is expected to be the JSON codes.
    const pres = await this.page.$$(`${this.outputSelector} pre`);
    if (pres.length === 0) return null;
    const jsonText = await pres[0].innerText();
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      // If parsing fails, return raw text for debugging
      return { parseError: true, raw: jsonText };
    }
  }

  // Get the encoded text from the second <pre> inside output (if present)
  async getEncodedText() {
    const pres1 = await this.page.$$(`${this.outputSelector} pre`);
    if (pres.length < 2) return null;
    return await pres[1].innerText();
  }
}

test.describe('Huffman Coding Demo - UI and Behavior', () => {
  // Collect console messages and pageerrors for each test to assert runtime health
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events for analysis
    page.on('console', msg => {
      // store text and type for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Instantiate page object and navigate to app
    const huffmanPage = new HuffmanPage(page);
    await huffmanPage.goto();
  });

  test.afterEach(async () => {
    // After each test we assert that the page did not emit uncaught exceptions.
    // This verifies the runtime did not produce ReferenceError/SyntaxError/TypeError unexpectedly.
    expect(pageErrors.length, `No uncaught page errors expected, saw: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // Also ensure there were no console.error messages emitted during the test run.
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, `No console.error messages expected, saw: ${errorConsoleMessages.map(m => m.text).join('; ')}`).toBe(0);
  });

  test('Initial page load shows textarea, button, and an empty output area', async ({ page }) => {
    const huffmanPage1 = new HuffmanPage(page);

    // Verify textarea is present and has expected placeholder
    const textarea = await page.$('#inputText');
    expect(textarea, 'Textarea should exist on the page').not.toBeNull();
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toBe('Enter text here...');

    // Verify button exists and is wired to the expected onclick (verifies HTML structure)
    const button = await page.$(huffmanPage.buttonSelector);
    expect(button, 'Generate button should be present').not.toBeNull();
    const onclick = await button.getAttribute('onclick');
    expect(onclick, 'Button should call generateHuffmanCode() via onclick attribute').toBe('generateHuffmanCode()');

    // Output should be empty on initial load
    const outputText = await huffmanPage.getOutputText();
    expect(outputText, 'Output area should be empty initially').toBe('');

    // No runtime errors or console.error should have been emitted during load (checked in afterEach)
  });

  test('Clicking Generate with empty input shows validation message', async ({ page }) => {
    const huffmanPage2 = new HuffmanPage(page);

    // Ensure textarea is empty and click the button
    await huffmanPage.fillInput('');
    await huffmanPage.clickGenerate();

    // The app trims input and should show "Please enter some text."
    await page.waitForSelector('#output'); // wait for any output change
    const output = await huffmanPage.getOutputText();
    expect(output.trim()).toBe('Please enter some text.');

    // Verify no <pre> blocks are present for code/encoded output in this case
    const pres2 = await page.$$(`${huffmanPage.outputSelector} pre`);
    expect(pres.length).toBe(0);
  });

  test('Whitespace-only input is treated as empty and shows validation message', async ({ page }) => {
    const huffmanPage3 = new HuffmanPage(page);

    // Fill with spaces and click generate
    await huffmanPage.fillInput('    ');
    await huffmanPage.clickGenerate();

    // Expect same validation message as trimmed result is empty
    await page.waitForSelector('#output');
    const output1 = await huffmanPage.getOutputText();
    expect(output.trim()).toBe('Please enter some text.');
  });

  test('Single-character input produces a code map with empty code and empty encoded text', async ({ page }) => {
    const huffmanPage4 = new HuffmanPage(page);

    // Input single character 'a'
    await huffmanPage.fillInput('a');
    await huffmanPage.clickGenerate();

    // Wait for the pre elements (codes + encoded text) to appear
    await page.waitForSelector('#output pre');

    // Parse codes JSON from first <pre>
    const codes = await huffmanPage.getCodesObject();
    expect(codes, 'Codes object should be present and parseable').not.toBeNull();
    expect(Object.keys(codes).length, 'There should be exactly one code for single-character input').toBe(1);
    expect(codes).toHaveProperty('a');

    // For single-node Huffman tree the implementation produces an empty prefix string
    expect(codes['a']).toBe('', 'Single character should receive an empty string code in this implementation');

    // Encoded text should be empty as the code for 'a' is empty
    const encoded = await huffmanPage.getEncodedText();
    expect(encoded).toBe('', 'Encoded text should be empty when codes are empty strings for each character');
  });

  test('Multiple-character input generates codes for all characters and encoded text matches codes', async ({ page }) => {
    const huffmanPage5 = new HuffmanPage(page);

    const input = 'aabccc'; // frequencies: a:2, b:1, c:3

    await huffmanPage.fillInput(input);
    await huffmanPage.clickGenerate();

    // Wait for both pre elements (codes + encoded)
    await page.waitForSelector('#output pre');

    // Retrieve codes and encoded text
    const codes1 = await huffmanPage.getCodesObject();
    const encoded1 = await huffmanPage.getEncodedText();

    // Validate structure
    expect(codes, 'Codes should be a parsed object').not.toBeNull();
    // Expect codes for 'a','b','c'
    expect(Object.keys(codes).sort()).toEqual(['a', 'b', 'c'].sort());

    // Build expected encoded string by mapping each char to its code
    let reconstructed = '';
    for (const ch of input) {
      // Each code must exist
      expect(codes).toHaveProperty(ch);
      reconstructed += codes[ch];
    }

    // Compare reconstructed encoded string with the displayed encoded text
    // Note: encoded may be empty string in degenerate cases; we allow that but ensure exact match
    expect(encoded).toBe(reconstructed);

    // Additional sanity check: encoded length should equal sum of lengths of individual codes for each occurrence
    const expectedLength = input.split('').reduce((sum, ch) => sum + (codes[ch] ? codes[ch].length : 0), 0);
    expect(encoded.length).toBe(expectedLength);
  });

  test('Interacting multiple times updates output appropriately (idempotence and replacement)', async ({ page }) => {
    const huffmanPage6 = new HuffmanPage(page);

    // First interaction: valid input
    await huffmanPage.fillInput('ab');
    await huffmanPage.clickGenerate();
    await page.waitForSelector('#output pre');

    const codesFirst = await huffmanPage.getCodesObject();
    expect(codesFirst).not.toBeNull();
    expect(Object.keys(codesFirst).length).toBeGreaterThanOrEqual(2);

    // Second interaction: empty input should replace output with validation
    await huffmanPage.fillInput('');
    await huffmanPage.clickGenerate();
    await page.waitForSelector('#output'); // wait for update

    const outputAfterEmpty = await huffmanPage.getOutputText();
    expect(outputAfterEmpty.trim()).toBe('Please enter some text.');

    // Third interaction: different valid input should produce new codes
    await huffmanPage.fillInput('zzz');
    await huffmanPage.clickGenerate();
    await page.waitForSelector('#output pre');

    const codesSecond = await huffmanPage.getCodesObject();
    expect(codesSecond).not.toBeNull();
    expect(Object.keys(codesSecond)).toContain('z');
    // Ensure codes changed (not the same object as previous)
    expect(JSON.stringify(codesSecond)).not.toBe(JSON.stringify(codesFirst));
  });

  test('Accessibility and semantics: textarea is reachable and has a label role hint', async ({ page }) => {
    const huffmanPage7 = new HuffmanPage(page);

    // Check that textarea is focusable
    const textarea1 = await page.$('#inputText');
    await textarea.focus();
    const activeId = await page.evaluate(() => document.activeElement.id);
    expect(activeId).toBe('inputText');

    // Ensure button is reachable and contains human-readable text
    const buttonText = await page.$eval(huffmanPage.buttonSelector, el => el.textContent.trim());
    expect(buttonText.toLowerCase()).toContain('generate');
  });
});